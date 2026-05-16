package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
	githuboauth "golang.org/x/oauth2/github"

	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/github"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/pkg/crypto"
)

const SessionTTL = 30 * 24 * time.Hour

type AuthService struct {
	db   *pgxpool.Pool
	cfg  *config.Config
	gh   *github.Client
	aead *crypto.AEAD
	oauth *oauth2.Config
}

func NewAuth(cfg *config.Config, db *pgxpool.Pool, gh *github.Client, aead *crypto.AEAD) *AuthService {
	return &AuthService{
		db:   db,
		cfg:  cfg,
		gh:   gh,
		aead: aead,
		oauth: &oauth2.Config{
			ClientID:     cfg.GitHubClientID,
			ClientSecret: cfg.GitHubClientSecret,
			RedirectURL:  cfg.GitHubCallback,
			Scopes:       []string{"read:user", "user:email", "repo"},
			Endpoint:     githuboauth.Endpoint,
		},
	}
}

func (a *AuthService) OAuthURL(state string) string {
	return a.oauth.AuthCodeURL(state, oauth2.AccessTypeOnline)
}

// HandleCallback exchanges the OAuth code for a token, upserts the user, and
// returns a fresh session token + the user record.
func (a *AuthService) HandleCallback(ctx context.Context, code string) (string, *model.User, error) {
	tok, err := a.oauth.Exchange(ctx, code)
	if err != nil {
		return "", nil, fmt.Errorf("oauth exchange: %w", err)
	}
	id, login, avatar, err := a.gh.GetMe(ctx, tok.AccessToken)
	if err != nil {
		return "", nil, fmt.Errorf("get me: %w", err)
	}
	enc, err := a.aead.Encrypt(tok.AccessToken)
	if err != nil {
		return "", nil, err
	}

	var user model.User
	err = a.db.QueryRow(ctx, `
		INSERT INTO users (github_id, username, avatar_url, access_token, updated_at)
		VALUES ($1,$2,$3,$4,now())
		ON CONFLICT (github_id) DO UPDATE
		   SET username     = EXCLUDED.username,
		       avatar_url   = EXCLUDED.avatar_url,
		       access_token = EXCLUDED.access_token,
		       updated_at   = now()
		RETURNING id, github_id, username, COALESCE(avatar_url,''), created_at, updated_at
	`, id, login, avatar, enc).Scan(
		&user.ID, &user.GitHubID, &user.Username, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return "", nil, err
	}

	// Ensure sync state row exists.
	_, _ = a.db.Exec(ctx, `
		INSERT INTO user_sync_state (user_id, updated_at) VALUES ($1, now())
		ON CONFLICT (user_id) DO NOTHING
	`, user.ID)

	session, err := crypto.RandomToken(32)
	if err != nil {
		return "", nil, err
	}
	if _, err := a.db.Exec(ctx, `
		INSERT INTO sessions (token, user_id, expires_at) VALUES ($1,$2,$3)
	`, session, user.ID, time.Now().Add(SessionTTL)); err != nil {
		return "", nil, err
	}
	return session, &user, nil
}

func (a *AuthService) UserFromSession(ctx context.Context, token string) (*model.User, error) {
	if token == "" {
		return nil, errors.New("no session")
	}
	var u model.User
	err := a.db.QueryRow(ctx, `
		SELECT u.id, u.github_id, u.username, COALESCE(u.avatar_url,''), u.created_at, u.updated_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token = $1 AND s.expires_at > now()
	`, token).Scan(&u.ID, &u.GitHubID, &u.Username, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("invalid session")
		}
		return nil, err
	}
	return &u, nil
}

func (a *AuthService) Logout(ctx context.Context, token string) error {
	_, err := a.db.Exec(ctx, `DELETE FROM sessions WHERE token = $1`, token)
	return err
}

// AccessTokenFor decrypts the GitHub access token for the given user.
func (a *AuthService) AccessTokenFor(ctx context.Context, userID int64) (string, error) {
	var enc string
	if err := a.db.QueryRow(ctx, `SELECT access_token FROM users WHERE id=$1`, userID).Scan(&enc); err != nil {
		return "", err
	}
	return a.aead.Decrypt(enc)
}

// FlagTokenInvalid records that the stored token failed on GitHub.
func (a *AuthService) FlagTokenInvalid(ctx context.Context, userID int64) {
	_, _ = a.db.Exec(ctx, `
		UPDATE user_sync_state SET last_sync_status='token_invalid',
		    last_sync_error='GitHub token rejected — please reconnect',
		    updated_at=now()
		WHERE user_id=$1
	`, userID)
}
