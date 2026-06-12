-- Tracks the most recent release tag we've seen per repo, so the
-- release watcher only notifies on changes (and stays silent on the
-- very first observation).
ALTER TABLE repos ADD COLUMN last_release_tag VARCHAR(128);
