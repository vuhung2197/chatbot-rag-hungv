-- ============================================
-- PostgreSQL Schema: 003 - Users & Authentication
-- Converted from MySQL init.sql
-- ============================================

-- ============================================
-- Users Table (Main)
-- ============================================

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NULL,
    avatar_url VARCHAR(255) NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    bio TEXT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    language VARCHAR(10) NOT NULL DEFAULT 'vi',
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token VARCHAR(64) NULL,
    password_hash TEXT NOT NULL,
    role user_role DEFAULT 'user',  -- Using ENUM type
    last_login_at TIMESTAMP NULL,
    account_status account_status_type NOT NULL DEFAULT 'active',  -- Using ENUM type
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_email ON users(email);

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- User Questions
-- ============================================

DROP TABLE IF EXISTS user_questions CASCADE;
CREATE TABLE user_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    conversation_id VARCHAR(36) NULL,
    conversation_title VARCHAR(255) NULL,
    question TEXT,
    bot_reply TEXT,
    is_answered BOOLEAN DEFAULT FALSE,
    is_reviewed BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_conversation_id ON user_questions(conversation_id);
CREATE INDEX idx_user_archived ON user_questions(user_id, is_archived);
CREATE INDEX idx_user_pinned ON user_questions(user_id, is_pinned);

-- Trigger for updated_at
CREATE TRIGGER update_user_questions_updated_at
    BEFORE UPDATE ON user_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Google Tokens (OAuth)
-- ============================================

DROP TABLE IF EXISTS google_tokens CASCADE;
CREATE TABLE google_tokens (
    email VARCHAR(320) NOT NULL PRIMARY KEY,  -- RFC-5321 max
    tokens_encrypted BYTEA NOT NULL,  -- BLOB -> BYTEA in PostgreSQL
    access_token_expires_at TIMESTAMP NULL,
    refresh_token_encrypted BYTEA NULL,
    refresh_attempts INTEGER DEFAULT 0,
    last_refresh_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_token_expiry ON google_tokens(access_token_expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_google_tokens_updated_at
    BEFORE UPDATE ON google_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- User Sessions (JWT Sessions)
-- ============================================

DROP TABLE IF EXISTS user_sessions CASCADE;
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================
-- User OAuth Providers
-- ============================================

DROP TABLE IF EXISTS user_oauth_providers CASCADE;
CREATE TABLE user_oauth_providers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    provider oauth_provider NOT NULL,  -- Using ENUM type
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255) NULL,
    access_token_encrypted BYTEA NULL,
    refresh_token_encrypted BYTEA NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id)
);

-- Indexes
CREATE INDEX idx_oauth_user_id ON user_oauth_providers(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_oauth_providers_updated_at
    BEFORE UPDATE ON user_oauth_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Password Reset Tokens
-- ============================================

DROP TABLE IF EXISTS password_reset_tokens CASCADE;
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_token_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_expires_at ON password_reset_tokens(expires_at);

-- ============================================
-- User Preferences
-- ============================================

DROP TABLE IF EXISTS user_preferences CASCADE;
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    preferences JSONB NULL,  -- JSON -> JSONB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Notes:
-- - Replaced AUTO_INCREMENT with SERIAL
-- - Changed TINYINT(1) to BOOLEAN
-- - Changed BLOB to BYTEA
-- - Changed JSON to JSONB
-- - Added named constraints for better debugging
-- - Created triggers for updated_at columns
-- - Used ENUM types defined in 001_enums_and_functions.sql
-- ============================================
