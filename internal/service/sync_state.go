package service

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jincurry/starbase/internal/model"
)

func (s *SyncService) State(ctx context.Context, userID int64) (*model.SyncState, error) {
	var ss model.SyncState
	err := s.db.QueryRow(ctx, `
		SELECT user_id, last_seen_starred_at, last_incremental_synced_at,
		       last_full_reconciled_at, COALESCE(last_sync_status,''),
		       COALESCE(last_sync_error,''), COALESCE(initial_sync_completed, FALSE), updated_at
		FROM user_sync_state WHERE user_id=$1
	`, userID).Scan(
		&ss.UserID, &ss.LastSeenStarredAt, &ss.LastIncrementalSyncedAt,
		&ss.LastFullReconciledAt, &ss.LastSyncStatus, &ss.LastSyncError,
		&ss.InitialSyncCompleted, &ss.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &model.SyncState{UserID: userID}, nil
		}
		return nil, err
	}
	return &ss, nil
}
