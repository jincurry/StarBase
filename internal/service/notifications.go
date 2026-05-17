package service

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Notification struct {
	ID        int64     `json:"id"`
	Kind      string    `json:"kind"`
	StarID    *int64    `json:"star_id,omitempty"`
	Title     string    `json:"title"`
	Body      string    `json:"body,omitempty"`
	Tag       string    `json:"tag,omitempty"`
	Unread    bool      `json:"unread"`
	CreatedAt time.Time `json:"created_at"`
}

type NotificationService struct {
	db *pgxpool.Pool
}

func NewNotifications(db *pgxpool.Pool) *NotificationService {
	return &NotificationService{db: db}
}

func (s *NotificationService) List(ctx context.Context, userID int64) ([]Notification, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, kind, star_id, title, COALESCE(body,''), COALESCE(tag,''),
		       unread, created_at
		FROM notifications
		WHERE user_id=$1
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Notification{}
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.Kind, &n.StarID, &n.Title, &n.Body, &n.Tag, &n.Unread, &n.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

func (s *NotificationService) MarkRead(ctx context.Context, userID, id int64) error {
	_, err := s.db.Exec(ctx, `
		UPDATE notifications SET unread=FALSE WHERE id=$1 AND user_id=$2
	`, id, userID)
	return err
}

func (s *NotificationService) MarkAllRead(ctx context.Context, userID int64) error {
	_, err := s.db.Exec(ctx, `
		UPDATE notifications SET unread=FALSE WHERE user_id=$1 AND unread=TRUE
	`, userID)
	return err
}

// CreateStaleSummary inserts a "N items going stale" notification, but only
// once per calendar day per user (idempotent over multiple scheduler ticks).
func (s *NotificationService) CreateStaleSummary(ctx context.Context, userID int64, count int) error {
	if count <= 0 {
		return nil
	}
	// Skip if we already wrote one today.
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS (
		  SELECT 1 FROM notifications
		  WHERE user_id=$1 AND kind='stale'
		    AND created_at::date = current_date
		)
	`, userID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO notifications (user_id, kind, title, body)
		VALUES ($1, 'stale', $2, $3)
	`, userID,
		// title
		joinCount(count, "inbox items going stale"),
		// body
		"They've been waiting too long — triage on the Review page.",
	)
	return err
}

func joinCount(n int, label string) string {
	if n == 1 {
		return "1 " + label
	}
	return intToStr(n) + " " + label
}

func intToStr(n int) string {
	if n == 0 {
		return "0"
	}
	const digits = "0123456789"
	buf := make([]byte, 0, 12)
	x := n
	neg := false
	if x < 0 {
		neg = true
		x = -x
	}
	for x > 0 {
		buf = append([]byte{digits[x%10]}, buf...)
		x /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}
