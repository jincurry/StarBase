package worker

import (
	"context"
	"errors"
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
	db   *pgxpool.Pool
	sync *service.SyncService
	log  *slog.Logger

	IncrementalInterval time.Duration
	IncrementalMinAge   time.Duration
	ReconcileInterval   time.Duration
}

func NewScheduler(db *pgxpool.Pool, sync *service.SyncService, log *slog.Logger) *Scheduler {
	return &Scheduler{
		db:                  db,
		sync:                sync,
		log:                 log,
		IncrementalInterval: 30 * time.Minute,
		IncrementalMinAge:   2 * time.Hour,
		ReconcileInterval:   24 * time.Hour,
	}
}

func (s *Scheduler) Run(ctx context.Context) {
	// Stagger the first ticks slightly so a freshly-restarted worker
	// doesn't dogpile every user at once.
	go s.loop(ctx, "incremental", 5*time.Minute, s.IncrementalInterval, s.tickIncremental)
	go s.loop(ctx, "reconcile", 30*time.Minute, s.ReconcileInterval, s.tickReconcile)
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
	return formatSecs(secs)
}

func formatSecs(n int) string {
	// Tiny helper to avoid pulling fmt for one call site.
	const digits = "0123456789"
	if n == 0 {
		return "0 seconds"
	}
	buf := make([]byte, 0, 16)
	x := n
	for x > 0 {
		buf = append([]byte{digits[x%10]}, buf...)
		x /= 10
	}
	return string(buf) + " seconds"
}
