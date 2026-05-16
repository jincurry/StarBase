package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jincurry/starbase/internal/github"
	"github.com/jincurry/starbase/internal/model"
)

const (
	JobInitial     = "initial"
	JobIncremental = "incremental"
	JobReconcile   = "reconcile"

	JobPending = "pending"
	JobRunning = "running"
	JobDone    = "done"
	JobFailed  = "failed"
)

type SyncService struct {
	db   *pgxpool.Pool
	gh   *github.Client
	auth *AuthService
}

func NewSync(db *pgxpool.Pool, gh *github.Client, auth *AuthService) *SyncService {
	return &SyncService{db: db, gh: gh, auth: auth}
}

type InitialPayload struct {
	InboxCount int `json:"inbox_count"` // -1 = all
}

// Enqueue creates a new pending sync job for the user. If a job of the same
// type is already running, returns its ID.
func (s *SyncService) Enqueue(ctx context.Context, userID int64, jobType string, payload any) (int64, error) {
	var raw []byte
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return 0, err
		}
		raw = b
	}
	var id int64
	// Reuse existing pending/running job for same type to avoid duplicates.
	err := s.db.QueryRow(ctx, `
		SELECT id FROM sync_jobs
		WHERE user_id=$1 AND job_type=$2 AND status IN ('pending','running')
		ORDER BY id DESC LIMIT 1
	`, userID, jobType).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	err = s.db.QueryRow(ctx, `
		INSERT INTO sync_jobs (user_id, job_type, payload) VALUES ($1,$2,$3)
		RETURNING id
	`, userID, jobType, raw).Scan(&id)
	return id, err
}

// Claim atomically pulls the next pending job using FOR UPDATE SKIP LOCKED.
func (s *SyncService) Claim(ctx context.Context) (*model.SyncJob, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var job model.SyncJob
	err = tx.QueryRow(ctx, `
		SELECT id, user_id, job_type, status, COALESCE(payload, '{}'::jsonb), created_at
		FROM sync_jobs
		WHERE status = 'pending'
		ORDER BY created_at
		FOR UPDATE SKIP LOCKED
		LIMIT 1
	`).Scan(&job.ID, &job.UserID, &job.JobType, &job.Status, &job.Payload, &job.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	now := time.Now()
	_, err = tx.Exec(ctx, `
		UPDATE sync_jobs SET status='running', started_at=$2 WHERE id=$1
	`, job.ID, now)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	job.Status = JobRunning
	job.StartedAt = &now
	return &job, nil
}

func (s *SyncService) Finish(ctx context.Context, jobID int64, finalStatus, errMsg string) error {
	_, err := s.db.Exec(ctx, `
		UPDATE sync_jobs
		   SET status=$2,
		       finished_at=now(),
		       error_message=NULLIF($3,'')
		 WHERE id=$1
	`, jobID, finalStatus, errMsg)
	return err
}

func (s *SyncService) Progress(ctx context.Context, jobID int64, done, total int) {
	_, _ = s.db.Exec(ctx, `
		UPDATE sync_jobs SET progress_done=$2, progress_total=$3 WHERE id=$1
	`, jobID, done, total)
}

// CurrentJob returns the latest job for the user (pending/running first).
func (s *SyncService) CurrentJob(ctx context.Context, userID int64) (*model.SyncJob, error) {
	row := s.db.QueryRow(ctx, `
		SELECT id, user_id, job_type, status, progress_total, progress_done,
		       COALESCE(error_message,''), started_at, finished_at, created_at
		FROM sync_jobs
		WHERE user_id = $1
		ORDER BY (status IN ('pending','running')) DESC, id DESC
		LIMIT 1
	`, userID)
	var j model.SyncJob
	if err := row.Scan(&j.ID, &j.UserID, &j.JobType, &j.Status, &j.ProgressTotal,
		&j.ProgressDone, &j.ErrorMessage, &j.StartedAt, &j.FinishedAt, &j.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &j, nil
}

// Run executes a single job to completion. Used by the worker.
func (s *SyncService) Run(ctx context.Context, job *model.SyncJob) error {
	token, err := s.auth.AccessTokenFor(ctx, job.UserID)
	if err != nil {
		return fmt.Errorf("decrypt token: %w", err)
	}
	switch job.JobType {
	case JobInitial:
		var p InitialPayload
		if len(job.Payload) > 0 {
			_ = json.Unmarshal(job.Payload, &p)
		}
		if p.InboxCount == 0 {
			p.InboxCount = 30
		}
		return s.runInitial(ctx, job, token, p)
	case JobIncremental:
		return s.runIncremental(ctx, job, token)
	case JobReconcile:
		return s.runReconcile(ctx, job, token)
	}
	return fmt.Errorf("unknown job type %q", job.JobType)
}

// --- initial sync ------------------------------------------------------------

func (s *SyncService) runInitial(ctx context.Context, job *model.SyncJob, token string, p InitialPayload) error {
	// Collect entries; we need to know the global ordering to apply inbox/archived.
	entries := make([]github.StarredEntry, 0, 128)
	if err := s.gh.IterStarred(ctx, token, func(e github.StarredEntry) error {
		entries = append(entries, e)
		s.Progress(ctx, job.ID, len(entries), 0)
		return nil
	}); err != nil {
		if errors.Is(err, github.ErrUnauthorized) {
			s.auth.FlagTokenInvalid(ctx, job.UserID)
		}
		return err
	}
	s.Progress(ctx, job.ID, 0, len(entries))

	for i, e := range entries {
		status := model.StatusArchived
		if p.InboxCount < 0 || i < p.InboxCount {
			status = model.StatusInbox
		}
		if err := s.upsertStar(ctx, job.UserID, e, status, true); err != nil {
			return err
		}
		s.Progress(ctx, job.ID, i+1, len(entries))
	}

	_, err := s.db.Exec(ctx, `
		UPDATE user_sync_state
		   SET initial_sync_completed   = TRUE,
		       last_seen_starred_at     = (SELECT MAX(starred_at) FROM user_starred_repos WHERE user_id=$1),
		       last_incremental_synced_at = now(),
		       last_full_reconciled_at  = now(),
		       last_sync_status         = 'ok',
		       last_sync_error          = NULL,
		       updated_at               = now()
		 WHERE user_id = $1
	`, job.UserID)
	return err
}

// --- incremental sync --------------------------------------------------------

func (s *SyncService) runIncremental(ctx context.Context, job *model.SyncJob, token string) error {
	var since *time.Time
	_ = s.db.QueryRow(ctx, `SELECT last_seen_starred_at FROM user_sync_state WHERE user_id=$1`, job.UserID).Scan(&since)
	added := 0
	err := s.gh.IterStarred(ctx, token, func(e github.StarredEntry) error {
		if since != nil && !e.StarredAt.After(*since) {
			return errStopIter // sentinel: short-circuit, GitHub returns newest-first
		}
		if err := s.upsertStar(ctx, job.UserID, e, model.StatusInbox, false); err != nil {
			return err
		}
		added++
		s.Progress(ctx, job.ID, added, 0)
		return nil
	})
	if err != nil && !errors.Is(err, errStopIter) {
		if errors.Is(err, github.ErrUnauthorized) {
			s.auth.FlagTokenInvalid(ctx, job.UserID)
		}
		return err
	}
	_, err = s.db.Exec(ctx, `
		UPDATE user_sync_state
		   SET last_seen_starred_at     = COALESCE((SELECT MAX(starred_at) FROM user_starred_repos WHERE user_id=$1), last_seen_starred_at),
		       last_incremental_synced_at = now(),
		       last_sync_status         = 'ok',
		       last_sync_error          = NULL,
		       updated_at               = now()
		 WHERE user_id = $1
	`, job.UserID)
	return err
}

var errStopIter = errors.New("stop")

// --- reconcile ---------------------------------------------------------------

func (s *SyncService) runReconcile(ctx context.Context, job *model.SyncJob, token string) error {
	seen := map[int64]bool{}
	count := 0
	err := s.gh.IterStarred(ctx, token, func(e github.StarredEntry) error {
		seen[e.Repo.ID] = true
		if err := s.upsertStar(ctx, job.UserID, e, model.StatusInbox, false); err != nil {
			return err
		}
		count++
		s.Progress(ctx, job.ID, count, 0)
		return nil
	})
	if err != nil {
		if errors.Is(err, github.ErrUnauthorized) {
			s.auth.FlagTokenInvalid(ctx, job.UserID)
		}
		return err
	}

	// Mark unstarred everything we didn't see.
	rows, err := s.db.Query(ctx, `
		SELECT usr.id, r.github_repo_id
		FROM user_starred_repos usr
		JOIN repos r ON r.id = usr.repo_id
		WHERE usr.user_id = $1 AND usr.is_starred = TRUE
	`, job.UserID)
	if err != nil {
		return err
	}
	type pair struct{ rowID, ghID int64 }
	var unstarred []pair
	for rows.Next() {
		var p pair
		if err := rows.Scan(&p.rowID, &p.ghID); err != nil {
			rows.Close()
			return err
		}
		if !seen[p.ghID] {
			unstarred = append(unstarred, p)
		}
	}
	rows.Close()

	for _, p := range unstarred {
		_, err := s.db.Exec(ctx, `
			UPDATE user_starred_repos
			   SET is_starred=FALSE, unstarred_at=now(), updated_at=now()
			 WHERE id=$1
		`, p.rowID)
		if err != nil {
			return err
		}
	}

	_, err = s.db.Exec(ctx, `
		UPDATE user_sync_state
		   SET last_full_reconciled_at  = now(),
		       last_seen_starred_at     = (SELECT MAX(starred_at) FROM user_starred_repos WHERE user_id=$1 AND is_starred=TRUE),
		       last_sync_status         = 'ok',
		       last_sync_error          = NULL,
		       updated_at               = now()
		 WHERE user_id = $1
	`, job.UserID)
	return err
}

// --- helpers -----------------------------------------------------------------

// upsertStar makes sure the repo row exists, then upserts the join row. It
// never overwrites status / note / tags for existing rows.
func (s *SyncService) upsertStar(ctx context.Context, userID int64, e github.StarredEntry, fallbackStatus model.Status, force bool) error {
	repo := e.Repo
	license := ""
	if repo.License != nil {
		license = repo.License.SPDXID
	}
	var repoID int64
	err := s.db.QueryRow(ctx, `
		INSERT INTO repos (
		  github_repo_id, owner, name, full_name, description, html_url, homepage,
		  language, topics, stargazers_count, forks_count, open_issues_count, license,
		  archived, metadata_synced_at, repo_updated_at, repo_pushed_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now(), $15, $16)
		ON CONFLICT (github_repo_id) DO UPDATE
		   SET owner = EXCLUDED.owner,
		       name = EXCLUDED.name,
		       full_name = EXCLUDED.full_name,
		       description = EXCLUDED.description,
		       html_url = EXCLUDED.html_url,
		       homepage = EXCLUDED.homepage,
		       language = EXCLUDED.language,
		       topics = EXCLUDED.topics,
		       stargazers_count = EXCLUDED.stargazers_count,
		       forks_count = EXCLUDED.forks_count,
		       open_issues_count = EXCLUDED.open_issues_count,
		       license = EXCLUDED.license,
		       archived = EXCLUDED.archived,
		       repo_updated_at = EXCLUDED.repo_updated_at,
		       repo_pushed_at = EXCLUDED.repo_pushed_at,
		       metadata_synced_at = now()
		RETURNING id
	`,
		repo.ID, repo.Owner.Login, repo.Name, repo.FullName, repo.Description,
		repo.HTMLURL, repo.Homepage, repo.Language, repo.Topics,
		repo.StargazersCount, repo.ForksCount, repo.OpenIssuesCount, license,
		repo.Archived, repo.UpdatedAt, repo.PushedAt,
	).Scan(&repoID)
	if err != nil {
		return err
	}

	// Insert join row only if absent; we only update is_starred / starred_at
	// (never status / note / tags), so user-curated data is preserved.
	_, err = s.db.Exec(ctx, `
		INSERT INTO user_starred_repos (user_id, repo_id, starred_at, status)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, repo_id) DO UPDATE
		   SET starred_at = EXCLUDED.starred_at,
		       is_starred = TRUE,
		       unstarred_at = NULL,
		       updated_at = now()
	`, userID, repoID, e.StarredAt, fallbackStatus)
	return err
}
