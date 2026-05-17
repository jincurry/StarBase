-- Retry bookkeeping: how many times has this job been attempted,
-- when should we try it again? Workers skip jobs whose next_run_at is
-- still in the future.
ALTER TABLE sync_jobs
    ADD COLUMN attempts     INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN next_run_at  TIMESTAMPTZ;

-- Replace the partial index so pending+retryable rows are claimable.
DROP INDEX IF EXISTS idx_sync_jobs_pending;
CREATE INDEX idx_sync_jobs_claimable ON sync_jobs (next_run_at NULLS FIRST, created_at)
    WHERE status IN ('pending');

-- Per-star opaque share token; enables a public read-only view of a
-- single repo's note + tags + status.
ALTER TABLE user_starred_repos
    ADD COLUMN share_token VARCHAR(48) UNIQUE;

CREATE INDEX idx_usr_share_token ON user_starred_repos (share_token)
    WHERE share_token IS NOT NULL;

-- Cached AI outputs so we don't burn tokens on every detail-panel open.
CREATE TABLE ai_outputs (
    id              BIGSERIAL PRIMARY KEY,
    repo_id         BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    kind            VARCHAR(32) NOT NULL,  -- 'summary' | 'tag_suggestions'
    content         JSONB NOT NULL,
    model           VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (repo_id, kind)
);
