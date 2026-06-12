package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jincurry/starbase/internal/model"
)

type ReviewService struct {
	db   *pgxpool.Pool
	star *StarService
}

func NewReview(db *pgxpool.Pool, star *StarService) *ReviewService {
	return &ReviewService{db: db, star: star}
}

type ReviewPayload struct {
	Recently    []model.Star `json:"recently"`
	StaleInbox  []model.Star `json:"stale_inbox"`
	Rediscover  []model.Star `json:"rediscover"`
}

func (s *ReviewService) Build(ctx context.Context, userID int64) (*ReviewPayload, error) {
	recently, err := s.byIDs(ctx, userID, `
		SELECT usr.id FROM user_starred_repos usr
		WHERE usr.user_id=$1 AND usr.is_starred=TRUE
		  AND usr.starred_at > now() - interval '7 days'
		  AND usr.status <> 'archived'
		ORDER BY usr.starred_at DESC
		LIMIT 20
	`)
	if err != nil {
		return nil, err
	}
	stale, err := s.byIDs(ctx, userID, `
		SELECT id FROM user_starred_repos
		WHERE user_id=$1 AND status='inbox' AND is_starred=TRUE
		  AND starred_at < now() - (COALESCE((
		      SELECT stale_inbox_days FROM user_preferences WHERE user_id=$1
		    ), 14) || ' days')::interval
		ORDER BY starred_at ASC
		LIMIT 20
	`)
	if err != nil {
		return nil, err
	}
	rediscover, err := s.byIDs(ctx, userID, `
		SELECT id FROM user_starred_repos
		WHERE user_id=$1 AND is_starred=TRUE AND status IN ('kept','archived')
		ORDER BY last_reviewed_at ASC NULLS FIRST, starred_at ASC
		LIMIT 5
	`)
	if err != nil {
		return nil, err
	}
	return &ReviewPayload{
		Recently:   recently,
		StaleInbox: stale,
		Rediscover: rediscover,
	}, nil
}

func (s *ReviewService) byIDs(ctx context.Context, userID int64, idQuery string) ([]model.Star, error) {
	rows, err := s.db.Query(ctx, idQuery, userID)
	if err != nil {
		return nil, err
	}
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	rows.Close()
	return s.star.GetByIDs(ctx, userID, ids)
}
