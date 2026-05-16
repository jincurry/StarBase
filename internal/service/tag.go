package service

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jincurry/starbase/internal/model"
)

type TagService struct {
	db *pgxpool.Pool
}

func NewTag(db *pgxpool.Pool) *TagService { return &TagService{db: db} }

func (s *TagService) List(ctx context.Context, userID int64) ([]model.Tag, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, user_id, name, COALESCE(color,''), created_at
		FROM tags WHERE user_id=$1
		ORDER BY LOWER(name)
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.Tag{}
	for rows.Next() {
		var t model.Tag
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, nil
}

func (s *TagService) Create(ctx context.Context, userID int64, name, color string) (*model.Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("name required")
	}
	if len(name) > 64 {
		return nil, errors.New("name too long")
	}
	var t model.Tag
	err := s.db.QueryRow(ctx, `
		INSERT INTO tags (user_id, name, color) VALUES ($1, $2, NULLIF($3,''))
		ON CONFLICT (user_id, LOWER(name)) DO UPDATE SET color = COALESCE(EXCLUDED.color, tags.color)
		RETURNING id, user_id, name, COALESCE(color,''), created_at
	`, userID, name, color).Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *TagService) Delete(ctx context.Context, userID, tagID int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM tags WHERE id=$1 AND user_id=$2`, tagID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("not found")
	}
	return nil
}

func (s *TagService) Attach(ctx context.Context, userID, starID, tagID int64) error {
	// Verify ownership.
	var ok bool
	if err := s.db.QueryRow(ctx, `
		SELECT EXISTS (
		  SELECT 1 FROM user_starred_repos WHERE id=$1 AND user_id=$2
		) AND EXISTS (
		  SELECT 1 FROM tags WHERE id=$3 AND user_id=$2
		)
	`, starID, userID, tagID).Scan(&ok); err != nil {
		return err
	}
	if !ok {
		return errors.New("not found")
	}
	_, err := s.db.Exec(ctx, `
		INSERT INTO user_starred_repo_tags (user_starred_repo_id, tag_id) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, starID, tagID)
	return err
}

func (s *TagService) Detach(ctx context.Context, userID, starID, tagID int64) error {
	if err := s.db.QueryRow(ctx, `SELECT 1 FROM user_starred_repos WHERE id=$1 AND user_id=$2`,
		starID, userID).Scan(new(int)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("not found")
		}
		return err
	}
	_, err := s.db.Exec(ctx, `
		DELETE FROM user_starred_repo_tags WHERE user_starred_repo_id=$1 AND tag_id=$2
	`, starID, tagID)
	return err
}
