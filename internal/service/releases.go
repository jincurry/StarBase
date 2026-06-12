package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jincurry/starbase/internal/github"
)

// ReleaseService closes the "Watch" loop: for every repo at least one
// user is watching, poll GitHub's latest-release endpoint and fan out a
// notification to all watchers when the tag changes.
//
// Dedup is repo-global via repos.last_release_tag — one API call per
// watched repo per tick regardless of watcher count. On the very first
// observation (stored tag is NULL) we record the tag silently so a
// fresh deployment doesn't blast everyone with stale releases.
type ReleaseService struct {
	db   *pgxpool.Pool
	gh   *github.Client
	auth *AuthService
}

func NewReleases(db *pgxpool.Pool, gh *github.Client, auth *AuthService) *ReleaseService {
	return &ReleaseService{db: db, gh: gh, auth: auth}
}

// CheckWatched polls up to maxRepos watched repos. Returns how many were
// checked and how many produced notifications.
func (s *ReleaseService) CheckWatched(ctx context.Context, maxRepos int) (checked, notified int, err error) {
	if maxRepos <= 0 {
		maxRepos = 100
	}
	rows, err := s.db.Query(ctx, `
		SELECT r.id, r.full_name, COALESCE(r.last_release_tag, ''),
		       (SELECT usr.user_id FROM user_starred_repos usr
		         WHERE usr.repo_id = r.id AND usr.watching AND usr.is_starred
		         LIMIT 1)
		FROM repos r
		WHERE EXISTS (
		  SELECT 1 FROM user_starred_repos usr
		  WHERE usr.repo_id = r.id AND usr.watching AND usr.is_starred
		)
		ORDER BY r.id
		LIMIT $1
	`, maxRepos)
	if err != nil {
		return 0, 0, err
	}
	type watched struct {
		repoID    int64
		fullName  string
		seenTag   string
		tokenUser int64
	}
	var repos []watched
	for rows.Next() {
		var w watched
		if err := rows.Scan(&w.repoID, &w.fullName, &w.seenTag, &w.tokenUser); err != nil {
			rows.Close()
			return 0, 0, err
		}
		repos = append(repos, w)
	}
	rows.Close()

	for _, w := range repos {
		if ctx.Err() != nil {
			return checked, notified, ctx.Err()
		}
		token, err := s.auth.AccessTokenFor(ctx, w.tokenUser)
		if err != nil {
			// Disconnected or broken token — another watcher's tick may
			// pick a different user next time. Skip quietly.
			continue
		}
		rel, err := s.gh.GetLatestRelease(ctx, token, w.fullName)
		if err != nil {
			if errors.Is(err, github.ErrNotFound) {
				continue // repo has no releases — normal
			}
			// Rate limits / 5xx: stop the tick early rather than burn quota.
			return checked, notified, err
		}
		checked++
		if rel.TagName == "" || rel.TagName == w.seenTag {
			continue
		}
		if _, err := s.db.Exec(ctx,
			`UPDATE repos SET last_release_tag=$2 WHERE id=$1`,
			w.repoID, rel.TagName,
		); err != nil {
			return checked, notified, err
		}
		if w.seenTag == "" {
			continue // first observation — record silently
		}
		body := rel.Name
		if body == "" {
			body = fmt.Sprintf("New release %s", rel.TagName)
		}
		tag, err := s.db.Exec(ctx, `
			INSERT INTO notifications (user_id, kind, star_id, title, body, tag)
			SELECT usr.user_id, 'release', usr.id, $2, $3, $4
			FROM user_starred_repos usr
			WHERE usr.repo_id = $1 AND usr.watching AND usr.is_starred
		`, w.repoID, w.fullName, body, rel.TagName)
		if err != nil {
			return checked, notified, err
		}
		notified += int(tag.RowsAffected())
	}
	return checked, notified, nil
}
