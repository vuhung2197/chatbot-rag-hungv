-- Migration: add metadata column to user_questions
-- Run this on existing PostgreSQL databases that were created before this fix.

ALTER TABLE user_questions
    ADD COLUMN IF NOT EXISTS metadata JSONB NULL;

CREATE INDEX IF NOT EXISTS idx_user_questions_metadata_source
    ON user_questions USING gin (metadata);
