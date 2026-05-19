package worker

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jincurry/starbase/internal/service"
)

// Scheduler enqueues background incremental + reconcile jobs on a schedule.
//   - Every IncrementalInterval, queue an incremental sync for every user
//     whose initial sync is complete and who hasn't synced recently.
//   - Every ReconcileInterval, queue a full reconcile (less frequent).
//
// Both kick off using the same sync_jobs queue, so multiple workers across
// processes still get exactly-once semantics via FOR UPDATE SKIP LOCKED.
type Scheduler struct {
	db     *pgxpool.Pool
	sync   *service.SyncService
	notif  *service.NotificationService
	keep   *service.HousekeepingService
	log    *slog.Logger

	IncrementalInterval  time.Duration
	IncrementalMinAge    time.Duration
	ReconcileInterval    time.Duration
	StaleScanInterval    time.Duration
	HousekeepingInterval time.Duration
}

func NewScheduler(db *pgxpool.Pool, sync *service.SyncService, notif *service.NotificationService, keep *service.HousekeepingService, log *slog.Logger) *Scheduler {
	return &Scheduler{
		db:                   db,
		sync:                 sync,
		notif:                notif,
		keep:                 keep,
		log:                  log,
		IncrementalInterval:  30 * time.Minute,
		IncrementalMinAge:    2 * time.Hour,
		ReconcileInterval:    24 * time.Hour,
		StaleScanInterval:    6 * time.Hour,
		HousekeepingInterval: 12 * time.Hour,
	}
}

func (s *Scheduler) Run(ctx context.Context) {
	// Stagger the first ticks slightly so a freshly-restarted worker
	// doesn't dogpile every user at once.
	go s.loop(ctx, "incremental", 5*time.Minute, s.IncrementalInterval, s.tickIncremental)
	go s.loop(ctx, "reconcile", 30*time.Minute, s.ReconcileInterval, s.tickReconcile)
	go s.loop(ctx, "stale", 10*time.Minute, s.StaleScanInterval, s.tickStale)
	go s.loop(ctx, "housekeeping", 2*time.Minute, s.HousekeepingInterval, s.tickHousekeeping)
}

func (s *Scheduler) tickHousekeeping(ctx context.Context) error {
	stats, err := s.keep.Run(ctx)
	if err != nil {
		return err
	}
	if stats.ExpiredSessions+stats.OldEvents+stats.OldAIOutputs > 0 {
		s.log.Info("housekeeping",
			"expired_sessions", stats.ExpiredSessions,
			"old_events", stats.OldEvents,
			"old_ai_outputs", stats.OldAIOutputs,
		)
	}
	return nil
}

// tickStale scans every user whose inbox contains items older than their
// stale_inbox_days threshold, and writes one "N items going stale"
// notification per day per user.
func (s *Scheduler) tickStale(ctx context.Context) error {
	rows, err := s.db.Query(ctx, `
		SELECT usr.user_id,
		       COUNT(*) FILTER (
		         WHERE usr.starred_at < now() - (COALESCE(p.stale_inbox_days, 14) || ' days')::interval
		       )
		FROM user_starred_repos usr
		LEFT JOIN user_preferences p ON p.user_id = usr.user_id
		WHERE usr.is_starred = TRUE AND usr.status = 'inbox'
		GROUP BY usr.user_id
		HAVING COUNT(*) FILTER (
		         WHERE usr.starred_at < now() - (COALESCE(p.stale_inbox_days, 14) || ' days')::interval
		       ) > 0
	`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var uid int64
		var n int
		if err := rows.Scan(&uid, &n); err != nil {
			return err
		}
		if err := s.notif.CreateStaleSummary(ctx, uid, n); err != nil {
			s.log.Error("write stale notif", "user", uid, "err", err)
		}
	}
	return nil
}

func (s *Scheduler) loop(ctx context.Context, name string, initial, interval time.Duration, fn func(context.Context) error) {
	timer := time.NewTimer(initial)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			if err := fn(ctx); err != nil && !errors.Is(err, context.Canceled) {
				s.log.Error("scheduler tick", "name", name, "err", err)
			}
			timer.Reset(interval)
		}
	}
}

// tickIncremental enqueues an incremental sync for every user whose last
// incremental finished more than IncrementalMinAge ago (and that doesn't
// already have a pending/running sync job).
func (s *Scheduler) tickIncremental(ctx context.Context) error {
	rows, err := s.db.Query(ctx, `
		SELECT s.user_id
		FROM user_sync_state s
		WHERE s.initial_sync_completed = TRUE
		  AND COALESCE(s.last_sync_status, 'ok') <> 'token_invalid'
		  AND (s.last_incremental_synced_at IS NULL
		       OR s.last_incremental_synced_at < now() - $1::interval)
		  AND NOT EXISTS (
		    SELECT 1 FROM sync_jobs j
		    WHERE j.user_id = s.user_id
		      AND j.status IN ('pending', 'running')
		  )
	`, formatInterval(s.IncrementalMinAge))
	if err != nil {
		return err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var uid int64
		if err := rows.Scan(&uid); err != nil {
			return err
		}
		if _, err := s.sync.Enqueue(ctx, uid, service.JobIncremental, nil); err != nil {
			s.log.Error("enqueue incremental", "user", uid, "err", err)
			continue
		}
		count++
	}
	if count > 0 {
		s.log.Info("scheduled incremental syncs", "count", count)
	}
	return nil
}

func (s *Scheduler) tickReconcile(ctx context.Context) error {
	rows, err := s.db.Query(ctx, `
		SELECT s.user_id
		FROM user_sync_state s
		WHERE s.initial_sync_completed = TRUE
		  AND COALESCE(s.last_sync_status, 'ok') <> 'token_invalid'
		  AND (s.last_full_reconciled_at IS NULL
		       OR s.last_full_reconciled_at < now() - $1::interval)
		  AND NOT EXISTS (
		    SELECT 1 FROM sync_jobs j
		    WHERE j.user_id = s.user_id
		      AND j.status IN ('pending', 'running')
		  )
	`, formatInterval(s.ReconcileInterval))
	if err != nil {
		return err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var uid int64
		if err := rows.Scan(&uid); err != nil {
			return err
		}
		if _, err := s.sync.Enqueue(ctx, uid, service.JobReconcile, nil); err != nil {
			s.log.Error("enqueue reconcile", "user", uid, "err", err)
			continue
		}
		count++
	}
	if count > 0 {
		s.log.Info("scheduled reconciles", "count", count)
	}
	return nil
}

func formatInterval(d time.Duration) string {
	// Postgres parses "N seconds" just fine.
	secs := int(d.Seconds())
	if secs < 1 {
		secs = 1
	}
	return fmt.Sprintf("%d seconds", secs)
}
