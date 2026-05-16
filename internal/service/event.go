package service

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type EventService struct {
	db *pgxpool.Pool
}

func NewEvent(db *pgxpool.Pool) *EventService { return &EventService{db: db} }

func (s *EventService) Record(ctx context.Context, userID int64, name string, props map[string]any) error {
	var raw []byte
	if props != nil {
		b, err := json.Marshal(props)
		if err != nil {
			return err
		}
		raw = b
	}
	_, err := s.db.Exec(ctx, `
		INSERT INTO events (user_id, event_name, properties) VALUES ($1,$2,$3)
	`, userID, name, raw)
	return err
}
