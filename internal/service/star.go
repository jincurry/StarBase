package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jincurry/starbase/internal/github"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/pkg/crypto"
)

type StarService struct {
	db   *pgxpool.Pool
	gh   *github.Client
	auth *AuthService

	// In-memory 5-minute repo metadata cache.
	metaCache *metaCache
}

func NewStar(db *pgxpool.Pool, gh *github.Client, auth *AuthService) *StarService {
	return &StarService{db: db, gh: gh, auth: auth, metaCache: newMetaCache(5 * time.Minute)}
}

type StarFilter struct {
	Status     string
	TagID      int64 // 0 = any
	Language   string
	Query      string
	HasNote    bool
	IsStarred  *bool
	Sort       string // starred-desc | starred-asc | stars-desc | pushed-desc
	Page       int
	PageSize   int
}

func (f *StarFilter) normalize() {
	if f.PageSize <= 0 {
		f.PageSize = 50
	}
	if f.PageSize > 1000 {
		f.PageSize = 1000
	}
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Sort == "" {
		f.Sort = "starred-desc"
	}
}

func (s *StarService) List(ctx context.Context, userID int64, f StarFilter) ([]model.Star, int, error) {
	f.normalize()
	args := []any{userID}
	conds := []string{"usr.user_id = $1"}

	// Default to "currently starred on GitHub". Callers who explicitly
	// want unstarred-but-retained rows can pass IsStarred = &false.
	if f.IsStarred == nil {
		conds = append(conds, "usr.is_starred = TRUE")
	}

	add := func(c string, v any) {
		args = append(args, v)
		conds = append(conds, fmt.Sprintf(c, len(args)))
	}

	if f.Status != "" && f.Status != "all" {
		if !model.ValidStatus(f.Status) {
			return nil, 0, fmt.Errorf("invalid status")
		}
		add("usr.status = $%d", f.Status)
	}
	if f.Language != "" && f.Language != "all" {
		add("r.language = $%d", f.Language)
	}
	if f.HasNote {
		conds = append(conds, "COALESCE(usr.note,'') <> ''")
	}
	if f.IsStarred != nil {
		add("usr.is_starred = $%d", *f.IsStarred)
	}
	if f.TagID > 0 {
		add("EXISTS (SELECT 1 FROM user_starred_repo_tags ut WHERE ut.user_starred_repo_id = usr.id AND ut.tag_id = $%d)", f.TagID)
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		i := len(args) + 1
		args = append(args, q)
		conds = append(conds, fmt.Sprintf(
			"(r.full_name ILIKE '%%'||$%d||'%%' OR COALESCE(r.description,'') ILIKE '%%'||$%d||'%%' OR COALESCE(usr.note,'') ILIKE '%%'||$%d||'%%')",
			i, i, i,
		))
	}

	order := "usr.starred_at DESC"
	switch f.Sort {
	case "starred-asc":
		order = "usr.starred_at ASC"
	case "stars-desc":
		order = "r.stargazers_count DESC NULLS LAST"
	case "pushed-desc":
		order = "r.repo_pushed_at DESC NULLS LAST"
	}

	where := strings.Join(conds, " AND ")

	// total count
	var total int
	countSQL := "SELECT COUNT(*) FROM user_starred_repos usr JOIN repos r ON r.id = usr.repo_id WHERE " + where
	if err := s.db.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := f.PageSize
	offset := (f.Page - 1) * f.PageSize
	args = append(args, limit, offset)
	listSQL := fmt.Sprintf(`
		SELECT usr.id, usr.repo_id, usr.status, COALESCE(usr.note,''), usr.watching,
		       usr.starred_at, usr.is_starred, usr.unstarred_at, usr.last_viewed_at,
		       usr.last_reviewed_at, usr.updated_at,
		       r.id, r.github_repo_id, r.owner, r.name, r.full_name, COALESCE(r.description,''),
		       r.html_url, COALESCE(r.homepage,''), COALESCE(r.language,''),
		       COALESCE(r.topics, '{}'::text[]),
		       r.stargazers_count, r.forks_count, r.open_issues_count,
		       COALESCE(r.license,''), r.archived, r.is_accessible,
		       r.metadata_synced_at, r.repo_updated_at, r.repo_pushed_at
		FROM user_starred_repos usr JOIN repos r ON r.id = usr.repo_id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, where, order, len(args)-1, len(args))

	rows, err := s.db.Query(ctx, listSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	stars := make([]model.Star, 0, limit)
	ids := make([]int64, 0, limit)
	for rows.Next() {
		var st model.Star
		st.UserID = userID
		if err := rows.Scan(
			&st.ID, &st.RepoID, &st.Status, &st.Note, &st.Watching,
			&st.StarredAt, &st.IsStarred, &st.UnstarredAt, &st.LastViewedAt,
			&st.LastReviewedAt, &st.UpdatedAt,
			&st.Repo.ID, &st.Repo.GitHubRepoID, &st.Repo.Owner, &st.Repo.Name,
			&st.Repo.FullName, &st.Repo.Description, &st.Repo.HTMLURL, &st.Repo.Homepage,
			&st.Repo.Language, &st.Repo.Topics,
			&st.Repo.StargazersCount, &st.Repo.ForksCount, &st.Repo.OpenIssuesCount,
			&st.Repo.License, &st.Repo.Archived, &st.Repo.IsAccessible,
			&st.Repo.MetadataSyncedAt, &st.Repo.RepoUpdatedAt, &st.Repo.RepoPushedAt,
		); err != nil {
			return nil, 0, err
		}
		st.Tags = []int64{}
		stars = append(stars, st)
		ids = append(ids, st.ID)
	}

	// hydrate tags
	if len(ids) > 0 {
		tagRows, err := s.db.Query(ctx, `
			SELECT user_starred_repo_id, tag_id
			FROM user_starred_repo_tags
			WHERE user_starred_repo_id = ANY($1)
		`, ids)
		if err != nil {
			return nil, 0, err
		}
		byID := map[int64]int{}
		for i, st := range stars {
			byID[st.ID] = i
		}
		for tagRows.Next() {
			var rid, tid int64
			if err := tagRows.Scan(&rid, &tid); err != nil {
				tagRows.Close()
				return nil, 0, err
			}
			if idx, ok := byID[rid]; ok {
				stars[idx].Tags = append(stars[idx].Tags, tid)
			}
		}
		tagRows.Close()
	}

	return stars, total, nil
}

func (s *StarService) Get(ctx context.Context, userID, starID int64) (*model.Star, error) {
	var st model.Star
	st.UserID = userID
	row := s.db.QueryRow(ctx, `
		SELECT usr.id, usr.repo_id, usr.status, COALESCE(usr.note,''), usr.watching,
		       usr.starred_at, usr.is_starred, usr.unstarred_at, usr.last_viewed_at,
		       usr.last_reviewed_at, usr.updated_at,
		       r.id, r.github_repo_id, r.owner, r.name, r.full_name, COALESCE(r.description,''),
		       r.html_url, COALESCE(r.homepage,''), COALESCE(r.language,''),
		       COALESCE(r.topics, '{}'::text[]),
		       r.stargazers_count, r.forks_count, r.open_issues_count,
		       COALESCE(r.license,''), r.archived, r.is_accessible,
		       r.metadata_synced_at, r.repo_updated_at, r.repo_pushed_at
		FROM user_starred_repos usr JOIN repos r ON r.id = usr.repo_id
		WHERE usr.user_id = $1 AND usr.id = $2
	`, userID, starID)
	if err := row.Scan(
		&st.ID, &st.RepoID, &st.Status, &st.Note, &st.Watching,
		&st.StarredAt, &st.IsStarred, &st.UnstarredAt, &st.LastViewedAt,
		&st.LastReviewedAt, &st.UpdatedAt,
		&st.Repo.ID, &st.Repo.GitHubRepoID, &st.Repo.Owner, &st.Repo.Name,
		&st.Repo.FullName, &st.Repo.Description, &st.Repo.HTMLURL, &st.Repo.Homepage,
		&st.Repo.Language, &st.Repo.Topics,
		&st.Repo.StargazersCount, &st.Repo.ForksCount, &st.Repo.OpenIssuesCount,
		&st.Repo.License, &st.Repo.Archived, &st.Repo.IsAccessible,
		&st.Repo.MetadataSyncedAt, &st.Repo.RepoUpdatedAt, &st.Repo.RepoPushedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("not found")
		}
		return nil, err
	}

	tagRows, err := s.db.Query(ctx, `
		SELECT tag_id FROM user_starred_repo_tags WHERE user_starred_repo_id = $1
	`, starID)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()
	st.Tags = []int64{}
	for tagRows.Next() {
		var t int64
		if err := tagRows.Scan(&t); err != nil {
			return nil, err
		}
		st.Tags = append(st.Tags, t)
	}

	// On-demand refresh: if metadata > 5 min old, fetch in the background.
	if st.Repo.MetadataSyncedAt == nil || time.Since(*st.Repo.MetadataSyncedAt) > 5*time.Minute {
		go s.refreshMetadata(context.Background(), userID, st.Repo.FullName)
	}

	return &st, nil
}

type Patch struct {
	Status   *string
	Note     *string
	Watching *bool
}

func (s *StarService) Patch(ctx context.Context, userID, starID int64, p Patch) (*model.Star, error) {
	sets := []string{"updated_at = now()"}
	args := []any{starID, userID}
	idx := 3
	if p.Status != nil {
		if !model.ValidStatus(*p.Status) {
			return nil, errors.New("invalid status")
		}
		sets = append(sets, fmt.Sprintf("status = $%d", idx))
		args = append(args, *p.Status)
		sets = append(sets, "last_reviewed_at = now()")
		idx++
	}
	if p.Note != nil {
		sets = append(sets, fmt.Sprintf("note = $%d", idx))
		args = append(args, *p.Note)
		idx++
	}
	if p.Watching != nil {
		sets = append(sets, fmt.Sprintf("watching = $%d", idx))
		args = append(args, *p.Watching)
		idx++
	}
	q := fmt.Sprintf(`UPDATE user_starred_repos SET %s WHERE id=$1 AND user_id=$2`, strings.Join(sets, ", "))
	tag, err := s.db.Exec(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, errors.New("not found")
	}
	return s.Get(ctx, userID, starID)
}

func (s *StarService) MarkViewed(ctx context.Context, userID, starID int64) error {
	_, err := s.db.Exec(ctx, `
		UPDATE user_starred_repos SET last_viewed_at = now(), updated_at = now()
		WHERE id=$1 AND user_id=$2
	`, starID, userID)
	return err
}

func (s *StarService) MarkReviewed(ctx context.Context, userID, starID int64) error {
	_, err := s.db.Exec(ctx, `
		UPDATE user_starred_repos SET last_reviewed_at = now(), updated_at = now()
		WHERE id=$1 AND user_id=$2
	`, starID, userID)
	return err
}

// Stats returns per-status counts for the user.
type Stats struct {
	Total              int            `json:"total"`
	Inbox              int            `json:"inbox"`
	Reviewing          int            `json:"reviewing"`
	Kept               int            `json:"kept"`
	Dropped            int            `json:"dropped"`
	Archived           int            `json:"archived"`
	WithNotes          int            `json:"with_notes"`
	NewThisWeek        int            `json:"new_this_week"`        // newly starred in the last 7d
	ProcessedThisWeek  int            `json:"processed_this_week"`  // status changed in the last 7d
	ByStatus           map[string]int `json:"by_status"`
}

func (s *StarService) Stats(ctx context.Context, userID int64) (*Stats, error) {
	rows, err := s.db.Query(ctx, `
		SELECT status, COUNT(*) FROM user_starred_repos
		WHERE user_id=$1 AND is_starred=TRUE
		GROUP BY status
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := &Stats{ByStatus: map[string]int{}}
	for rows.Next() {
		var st string
		var n int
		if err := rows.Scan(&st, &n); err != nil {
			return nil, err
		}
		out.ByStatus[st] = n
		switch model.Status(st) {
		case model.StatusInbox:
			out.Inbox = n
		case model.StatusReviewing:
			out.Reviewing = n
		case model.StatusKept:
			out.Kept = n
		case model.StatusDropped:
			out.Dropped = n
		case model.StatusArchived:
			out.Archived = n
		}
		out.Total += n
	}
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM user_starred_repos
		WHERE user_id=$1 AND COALESCE(note,'')<>'' AND is_starred=TRUE
	`, userID).Scan(&out.WithNotes)
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM user_starred_repos
		WHERE user_id=$1 AND starred_at > now() - interval '7 days' AND is_starred=TRUE
	`, userID).Scan(&out.NewThisWeek)
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM user_starred_repos
		WHERE user_id=$1 AND last_reviewed_at > now() - interval '7 days'
	`, userID).Scan(&out.ProcessedThisWeek)
	return out, nil
}

// CreateShareToken sets (or returns the existing) public share token for
// the given star. The returned token is opaque and URL-safe.
func (s *StarService) CreateShareToken(ctx context.Context, userID, starID int64) (string, error) {
	var existing string
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(share_token, '')
		FROM user_starred_repos WHERE id=$1 AND user_id=$2
	`, starID, userID).Scan(&existing)
	if err != nil {
		return "", err
	}
	if existing != "" {
		return existing, nil
	}
	tok, err := crypto.RandomToken(18) // 36-char URL-safe hex
	if err != nil {
		return "", err
	}
	_, err = s.db.Exec(ctx, `
		UPDATE user_starred_repos SET share_token=$3, updated_at=now()
		WHERE id=$1 AND user_id=$2
	`, starID, userID, tok)
	if err != nil {
		return "", err
	}
	return tok, nil
}

func (s *StarService) RevokeShareToken(ctx context.Context, userID, starID int64) error {
	_, err := s.db.Exec(ctx, `
		UPDATE user_starred_repos SET share_token=NULL, updated_at=now()
		WHERE id=$1 AND user_id=$2
	`, starID, userID)
	return err
}

// PublicStar represents the read-only public view of a shared star.
// Notice: no user identifying info.
type PublicStar struct {
	Owner       string    `json:"owner"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Note        string    `json:"note"`
	Status      string    `json:"status"`
	Language    string    `json:"language"`
	Stars       int       `json:"stars"`
	Topics      []string  `json:"topics"`
	StarredAt   time.Time `json:"starred_at"`
}

// PublicByToken fetches the public view of a shared star.
func (s *StarService) PublicByToken(ctx context.Context, token string) (*PublicStar, error) {
	var p PublicStar
	err := s.db.QueryRow(ctx, `
		SELECT r.owner, r.name, COALESCE(r.description,''),
		       COALESCE(usr.note,''), usr.status,
		       COALESCE(r.language,''), r.stargazers_count,
		       COALESCE(r.topics, '{}'::text[]), usr.starred_at
		FROM user_starred_repos usr JOIN repos r ON r.id = usr.repo_id
		WHERE usr.share_token = $1
	`, token).Scan(
		&p.Owner, &p.Name, &p.Description, &p.Note, &p.Status,
		&p.Language, &p.Stars, &p.Topics, &p.StarredAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("not found")
		}
		return nil, err
	}
	return &p, nil
}

// Readme returns the rendered README content for a starred repo. Falls
// back to an empty string if GitHub returns 404 (rare — repo without one).
func (s *StarService) Readme(ctx context.Context, userID, starID int64) (string, error) {
	var fullName string
	err := s.db.QueryRow(ctx, `
		SELECT r.full_name
		FROM user_starred_repos usr JOIN repos r ON r.id = usr.repo_id
		WHERE usr.id=$1 AND usr.user_id=$2
	`, starID, userID).Scan(&fullName)
	if err != nil {
		return "", err
	}
	token, err := s.auth.AccessTokenFor(ctx, userID)
	if err != nil {
		return "", err
	}
	md, err := s.gh.GetReadme(ctx, token, fullName)
	if err != nil {
		if errors.Is(err, github.ErrNotFound) {
			return "", nil
		}
		return "", err
	}
	return md, nil
}

// refreshMetadata pulls fresh repo info from GitHub and updates the repos row.
func (s *StarService) refreshMetadata(ctx context.Context, userID int64, fullName string) {
	if s.metaCache.seenRecently(fullName) {
		return
	}
	s.metaCache.mark(fullName)
	token, err := s.auth.AccessTokenFor(ctx, userID)
	if err != nil {
		return
	}
	repo, err := s.gh.GetRepo(ctx, token, fullName)
	if err != nil {
		return
	}
	license := ""
	if repo.License != nil {
		license = repo.License.SPDXID
	}
	_, _ = s.db.Exec(ctx, `
		UPDATE repos SET
			description = $2, language = $3, topics = $4,
			stargazers_count = $5, forks_count = $6, open_issues_count = $7,
			license = $8, archived = $9,
			repo_updated_at = $10, repo_pushed_at = $11,
			metadata_synced_at = now()
		WHERE github_repo_id = $1
	`, repo.ID, repo.Description, repo.Language, repo.Topics,
		repo.StargazersCount, repo.ForksCount, repo.OpenIssuesCount,
		license, repo.Archived, repo.UpdatedAt, repo.PushedAt)
}
