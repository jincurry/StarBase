CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    github_id       BIGINT NOT NULL UNIQUE,
    username        VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    access_token    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repos (
    id                    BIGSERIAL PRIMARY KEY,
    github_repo_id        BIGINT NOT NULL UNIQUE,
    owner                 VARCHAR(255) NOT NULL,
    name                  VARCHAR(255) NOT NULL,
    full_name             VARCHAR(512) NOT NULL,
    description           TEXT,
    html_url              TEXT NOT NULL,
    homepage              TEXT,
    language              VARCHAR(64),
    topics                TEXT[] DEFAULT '{}',
    stargazers_count      INTEGER DEFAULT 0,
    forks_count           INTEGER DEFAULT 0,
    open_issues_count     INTEGER DEFAULT 0,
    license               VARCHAR(128),
    archived              BOOLEAN DEFAULT FALSE,
    is_accessible         BOOLEAN DEFAULT TRUE,
    metadata_synced_at    TIMESTAMPTZ,
    repo_updated_at       TIMESTAMPTZ,
    repo_pushed_at        TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_repos_full_name      ON repos USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_repos_description    ON repos USING gin (description gin_trgm_ops);
CREATE INDEX idx_repos_language       ON repos (language);
CREATE INDEX idx_repos_topics         ON repos USING gin (topics);

CREATE TABLE user_starred_repos (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_id             BIGINT NOT NULL REFERENCES repos(id),
    starred_at          TIMESTAMPTZ NOT NULL,
    is_starred          BOOLEAN NOT NULL DEFAULT TRUE,
    unstarred_at        TIMESTAMPTZ,
    status              VARCHAR(32) NOT NULL DEFAULT 'inbox',
    note                TEXT DEFAULT '',
    watching            BOOLEAN NOT NULL DEFAULT FALSE,
    last_viewed_at      TIMESTAMPTZ,
    last_reviewed_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, repo_id)
);
CREATE INDEX idx_usr_user_status      ON user_starred_repos (user_id, status) WHERE is_starred = TRUE;
CREATE INDEX idx_usr_user_starred_at  ON user_starred_repos (user_id, starred_at DESC);
CREATE INDEX idx_usr_last_reviewed    ON user_starred_repos (user_id, last_reviewed_at NULLS FIRST);
CREATE INDEX idx_usr_note_search      ON user_starred_repos USING gin (note gin_trgm_ops);

CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(64) NOT NULL,
    color       VARCHAR(16),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_tags_user_name ON tags (user_id, LOWER(name));

CREATE TABLE user_starred_repo_tags (
    user_starred_repo_id BIGINT NOT NULL REFERENCES user_starred_repos(id) ON DELETE CASCADE,
    tag_id               BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_starred_repo_id, tag_id)
);

CREATE TABLE user_sync_state (
    user_id                     BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_seen_starred_at        TIMESTAMPTZ,
    last_incremental_synced_at  TIMESTAMPTZ,
    last_full_reconciled_at     TIMESTAMPTZ,
    last_sync_status            VARCHAR(32),
    last_sync_error             TEXT,
    initial_sync_completed      BOOLEAN DEFAULT FALSE,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_jobs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_type        VARCHAR(32) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'pending',
    progress_total  INTEGER DEFAULT 0,
    progress_done   INTEGER DEFAULT 0,
    payload         JSONB,
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_jobs_pending ON sync_jobs (created_at) WHERE status = 'pending';

CREATE TABLE events (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    event_name  VARCHAR(64) NOT NULL,
    properties  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_user_event ON events (user_id, event_name, created_at DESC);

CREATE TABLE sessions (
    token       VARCHAR(128) PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions (user_id);
