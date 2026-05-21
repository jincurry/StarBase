ALTER TABLE user_preferences
    ADD COLUMN locale VARCHAR(8) NOT NULL DEFAULT 'en';
