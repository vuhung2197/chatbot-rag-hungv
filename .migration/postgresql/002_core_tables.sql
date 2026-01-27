-- ============================================
-- PostgreSQL Schema: 002 - Core Tables
-- Converted from MySQL init.sql
-- ============================================

-- ============================================
-- Feedback/Training Tables
-- ============================================

DROP TABLE IF EXISTS feedbacks CASCADE;
CREATE TABLE feedbacks (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    suggested_reply TEXT NOT NULL,
    explanation TEXT,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- User Dictionary Tables
-- ============================================

DROP TABLE IF EXISTS user_words CASCADE;
CREATE TABLE user_words (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    word_en VARCHAR(100) NOT NULL,
    word_vi VARCHAR(255),
    type VARCHAR(20),
    example_en VARCHAR(255),
    example_vi VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS user_highlighted_text CASCADE;
CREATE TABLE user_highlighted_text (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    translated_text TEXT,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Knowledge Base Tables
-- ============================================

DROP TABLE IF EXISTS knowledge_base CASCADE;
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    embedding JSONB NULL  -- Changed from JSON to JSONB for better performance
);

-- Full-text search index (PostgreSQL way)
-- Create tsvector column for full-text search
ALTER TABLE knowledge_base ADD COLUMN title_content_tsvector tsvector;

-- Create index on tsvector column
CREATE INDEX idx_knowledge_base_fts ON knowledge_base USING GIN(title_content_tsvector);

-- Create trigger to auto-update tsvector
CREATE OR REPLACE FUNCTION knowledge_base_tsvector_update() RETURNS trigger AS $$
BEGIN
    NEW.title_content_tsvector :=
        setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.content,'')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update_knowledge_base
BEFORE INSERT OR UPDATE ON knowledge_base
FOR EACH ROW EXECUTE FUNCTION knowledge_base_tsvector_update();

-- ============================================
-- Keywords Table
-- ============================================

DROP TABLE IF EXISTS important_keywords CASCADE;
CREATE TABLE important_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Knowledge Chunks (for RAG)
-- ============================================

DROP TABLE IF EXISTS knowledge_chunks CASCADE;
CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER,
    title TEXT,
    content TEXT,
    embedding JSONB,  -- JSONB for better performance
    token_count INTEGER,
    hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_chunk_hash ON knowledge_chunks(hash);

-- ============================================
-- Unanswered Questions
-- ============================================

DROP TABLE IF EXISTS unanswered_questions CASCADE;
CREATE TABLE unanswered_questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered BOOLEAN DEFAULT FALSE
);

-- ============================================
-- Conversation Sessions
-- ============================================

DROP TABLE IF EXISTS conversation_sessions CASCADE;
CREATE TABLE conversation_sessions (
    id SERIAL PRIMARY KEY,
    message TEXT,
    reply TEXT,
    mode_chat VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Writing Sessions
-- ============================================

DROP TABLE IF EXISTS writing_sessions CASCADE;
CREATE TABLE writing_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    topic VARCHAR(255),
    content TEXT NOT NULL,
    feedback TEXT,
    score SMALLINT,  -- TINYINT -> SMALLINT (1-10)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN writing_sessions.score IS 'Score from 1 to 10';

-- ============================================
-- Notes:
-- - Replaced AUTO_INCREMENT with SERIAL
-- - Changed TINYINT(1) to BOOLEAN
-- - Changed JSON to JSONB for better performance
-- - Replaced FULLTEXT with tsvector/GIN index
-- - Removed ENGINE and CHARSET (not needed in PostgreSQL)
-- - Changed DATETIME to TIMESTAMP
-- ============================================
