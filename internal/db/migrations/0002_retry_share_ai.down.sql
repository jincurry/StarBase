DROP TABLE IF EXISTS ai_outputs;
DROP INDEX IF EXISTS idx_usr_share_token;
ALTER TABLE user_starred_repos DROP COLUMN IF EXISTS share_token;
DROP INDEX IF EXISTS idx_sync_jobs_claimable;
CREATE INDEX idx_sync_jobs_pending ON sync_jobs (created_at) WHERE status = 'pending';
ALTER TABLE sync_jobs
    DROP COLUMN IF EXISTS next_run_at,
    DROP COLUMN IF EXISTS attempts;
