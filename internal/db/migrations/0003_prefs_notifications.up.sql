CREATE TABLE user_preferences (
    user_id                 BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    stale_inbox_days        INTEGER NOT NULL DEFAULT 14,
    auto_archive_on_unstar  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind            VARCHAR(32) NOT NULL,
    star_id         BIGINT REFERENCES user_starred_repos(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    body            TEXT,
    tag             VARCHAR(64),
    unread          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, unread, created_at DESC);
CREATE INDEX idx_notifications_user_kind   ON notifications (user_id, kind, created_at DESC);
