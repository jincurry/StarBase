package service

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// HousekeepingService drops expired or aged-out rows so tables don't
// grow without bound. Runs periodically from the worker scheduler.
type HousekeepingService struct {
	db *pgxpool.Pool

	// Retention windows — overridable from the worker.
	EventRetention    time.Duration // delete events older than this
	AIOutputRetention time.Duration // re-generate AI outputs older than this
}

func NewHousekeeping(db *pgxpool.Pool) *HousekeepingService {
	return &HousekeepingService{
		db:                db,
		EventRetention:    90 * 24 * time.Hour, // 90 days
		AIOutputRetention: 30 * 24 * time.Hour, // 30 days
	}
}

// HousekeepingStats summarises one tick's worth of cleanup.
type HousekeepingStats struct {
	ExpiredSessions int64
	OldEvents       int64
	OldAIOutputs    int64
}

// Run executes one housekeeping pass.
func (s *HousekeepingService) Run(ctx context.Context) (HousekeepingStats, error) {
	var out HousekeepingStats

	if tag, err := s.db.Exec(ctx, `
		DELETE FROM sessions WHERE expires_at < now()
	`); err == nil {
		out.ExpiredSessions = tag.RowsAffected()
	} else {
		return out, err
	}

	if tag, err := s.db.Exec(ctx, `
		DELETE FROM events WHERE created_at < now() - ($1 || ' seconds')::interval
	`, intervalSecs(s.EventRetention)); err == nil {
		out.OldEvents = tag.RowsAffected()
	} else {
		return out, err
	}

	if tag, err := s.db.Exec(ctx, `
		DELETE FROM ai_outputs WHERE created_at < now() - ($1 || ' seconds')::interval
	`, intervalSecs(s.AIOutputRetention)); err == nil {
		out.OldAIOutputs = tag.RowsAffected()
	} else {
		return out, err
	}

	return out, nil
}

func intervalSecs(d time.Duration) int64 {
	secs := int64(d / time.Second)
	if secs < 1 {
		return 1
	}
	return secs
}
