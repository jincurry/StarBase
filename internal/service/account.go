package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AccountService struct {
	db *pgxpool.Pool
}

func NewAccount(db *pgxpool.Pool) *AccountService { return &AccountService{db: db} }

// Disconnect destroys the access token + sessions but keeps user data
// (notes, tags, statuses). The user can sign back in later and find
// everything still there. Sync state is marked token_invalid so the UI
// surfaces the "reconnect" banner.
func (s *AccountService) Disconnect(ctx context.Context, userID int64) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE users SET access_token='' WHERE id=$1`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM sessions WHERE user_id=$1`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE user_sync_state
		   SET last_sync_status='token_invalid',
		       last_sync_error='Disconnected by user',
		       updated_at=now()
		 WHERE user_id=$1
	`, userID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// DeleteAll cascades a full delete via ON DELETE CASCADE on the users row.
func (s *AccountService) DeleteAll(ctx context.Context, userID int64) error {
	_, err := s.db.Exec(ctx, `DELETE FROM users WHERE id=$1`, userID)
	return err
}
