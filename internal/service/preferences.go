package service

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Preferences struct {
	StaleInboxDays      int       `json:"stale_inbox_days"`
	AutoArchiveOnUnstar bool      `json:"auto_archive_on_unstar"`
	Locale              string    `json:"locale"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type PreferencesService struct {
	db *pgxpool.Pool
}

func NewPreferences(db *pgxpool.Pool) *PreferencesService { return &PreferencesService{db: db} }

func (s *PreferencesService) Get(ctx context.Context, userID int64) (*Preferences, error) {
	var p Preferences
	err := s.db.QueryRow(ctx, `
		SELECT stale_inbox_days, auto_archive_on_unstar, COALESCE(locale,'en'), updated_at
		FROM user_preferences WHERE user_id=$1
	`, userID).Scan(&p.StaleInboxDays, &p.AutoArchiveOnUnstar, &p.Locale, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &Preferences{StaleInboxDays: 14, AutoArchiveOnUnstar: true, Locale: "en"}, nil
		}
		return nil, err
	}
	return &p, nil
}

// Update overrides any provided fields; nil pointers are left alone.
func (s *PreferencesService) Update(ctx context.Context, userID int64, staleDays *int, autoArchive *bool, locale *string) (*Preferences, error) {
	cur, err := s.Get(ctx, userID)
	if err != nil {
		return nil, err
	}
	if staleDays != nil {
		if *staleDays < 1 || *staleDays > 365 {
			return nil, errors.New("stale_inbox_days must be between 1 and 365")
		}
		cur.StaleInboxDays = *staleDays
	}
	if autoArchive != nil {
		cur.AutoArchiveOnUnstar = *autoArchive
	}
	if locale != nil {
		// Only accept locales we actually ship — silently coerce others.
		switch *locale {
		case "en", "zh":
			cur.Locale = *locale
		default:
			return nil, errors.New("unsupported locale")
		}
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO user_preferences (user_id, stale_inbox_days, auto_archive_on_unstar, locale, updated_at)
		VALUES ($1, $2, $3, $4, now())
		ON CONFLICT (user_id) DO UPDATE
		   SET stale_inbox_days       = EXCLUDED.stale_inbox_days,
		       auto_archive_on_unstar = EXCLUDED.auto_archive_on_unstar,
		       locale                 = EXCLUDED.locale,
		       updated_at             = now()
	`, userID, cur.StaleInboxDays, cur.AutoArchiveOnUnstar, cur.Locale)
	if err != nil {
		return nil, err
	}
	return s.Get(ctx, userID)
}
