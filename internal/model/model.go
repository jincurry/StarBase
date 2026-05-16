package model

import "time"

type Status string

const (
	StatusInbox     Status = "inbox"
	StatusReviewing Status = "reviewing"
	StatusKept      Status = "kept"
	StatusDropped   Status = "dropped"
	StatusArchived  Status = "archived"
)

func ValidStatus(s string) bool {
	switch Status(s) {
	case StatusInbox, StatusReviewing, StatusKept, StatusDropped, StatusArchived:
		return true
	}
	return false
}

type User struct {
	ID         int64     `json:"id"`
	GitHubID   int64     `json:"github_id"`
	Username   string    `json:"username"`
	AvatarURL  string    `json:"avatar_url"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Repo struct {
	ID               int64      `json:"id"`
	GitHubRepoID     int64      `json:"github_repo_id"`
	Owner            string     `json:"owner"`
	Name             string     `json:"name"`
	FullName         string     `json:"full_name"`
	Description      string     `json:"description"`
	HTMLURL          string     `json:"html_url"`
	Homepage         string     `json:"homepage"`
	Language         string     `json:"language"`
	Topics           []string   `json:"topics"`
	StargazersCount  int        `json:"stargazers_count"`
	ForksCount       int        `json:"forks_count"`
	OpenIssuesCount  int        `json:"open_issues_count"`
	License          string     `json:"license"`
	Archived         bool       `json:"archived"`
	IsAccessible     bool       `json:"is_accessible"`
	MetadataSyncedAt *time.Time `json:"metadata_synced_at,omitempty"`
	RepoUpdatedAt    *time.Time `json:"repo_updated_at,omitempty"`
	RepoPushedAt     *time.Time `json:"repo_pushed_at,omitempty"`
}

// Star is a row from user_starred_repos joined with repos, plus tag IDs.
type Star struct {
	ID             int64      `json:"id"`
	UserID         int64      `json:"user_id"`
	RepoID         int64      `json:"repo_id"`
	Status         Status     `json:"status"`
	Note           string     `json:"note"`
	Watching       bool       `json:"watching"`
	StarredAt      time.Time  `json:"starred_at"`
	IsStarred      bool       `json:"is_starred"`
	UnstarredAt    *time.Time `json:"unstarred_at,omitempty"`
	LastViewedAt   *time.Time `json:"last_viewed_at,omitempty"`
	LastReviewedAt *time.Time `json:"last_reviewed_at,omitempty"`
	UpdatedAt      time.Time  `json:"updated_at"`

	Repo Repo    `json:"repo"`
	Tags []int64 `json:"tags"`
}

type Tag struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

type SyncState struct {
	UserID                  int64      `json:"user_id"`
	LastSeenStarredAt       *time.Time `json:"last_seen_starred_at,omitempty"`
	LastIncrementalSyncedAt *time.Time `json:"last_incremental_synced_at,omitempty"`
	LastFullReconciledAt    *time.Time `json:"last_full_reconciled_at,omitempty"`
	LastSyncStatus          string     `json:"last_sync_status"`
	LastSyncError           string     `json:"last_sync_error"`
	InitialSyncCompleted    bool       `json:"initial_sync_completed"`
	UpdatedAt               time.Time  `json:"updated_at"`
}

type SyncJob struct {
	ID            int64      `json:"id"`
	UserID        int64      `json:"user_id"`
	JobType       string     `json:"job_type"` // initial | incremental | reconcile
	Status        string     `json:"status"`   // pending | running | done | failed
	ProgressTotal int        `json:"progress_total"`
	ProgressDone  int        `json:"progress_done"`
	Payload       []byte     `json:"-"`
	ErrorMessage  string     `json:"error_message,omitempty"`
	StartedAt     *time.Time `json:"started_at,omitempty"`
	FinishedAt    *time.Time `json:"finished_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type Notification struct {
	ID     int64  `json:"id"`
	Type   string `json:"type"`
	StarID *int64 `json:"star_id,omitempty"`
	Tag    string `json:"tag,omitempty"`
	Title  string `json:"title"`
	Body   string `json:"body"`
	When   time.Time `json:"when"`
	Unread bool   `json:"unread"`
}
