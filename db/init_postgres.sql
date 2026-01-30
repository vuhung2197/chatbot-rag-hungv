-- =============================================================================
-- PostgreSQL Initialization Script for English Chatbot
-- Based on MySQL schemas (Phase 1, 2, 3) + Game System
-- Excludes unused tables: chat_history, conversation_sessions, feedbacks, 
-- user_words, user_highlighted_text, writing_sessions, sentence_examples, unknown_queries
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Pgvector extension (optional, enabled for future proofing if image supports it)
-- CREATE EXTENSION IF NOT EXISTS vector; 

-- =============================================================================
-- 0. Shared Functions & Triggers
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- 1. Core Users & Authentication (Phase 1.2 Enhanced)
-- =============================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(255),
    email VARCHAR(150) NOT NULL UNIQUE,
    bio TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
    language VARCHAR(10) DEFAULT 'vi' NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    email_verification_token VARCHAR(64),
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    account_status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (account_status IN ('active','suspended','deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_account_status ON users(account_status);

-- User Sessions
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- OAuth Providers
CREATE TABLE user_oauth_providers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'github', 'microsoft')),
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token_encrypted BYTEA,
    refresh_token_encrypted BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

CREATE TRIGGER update_user_oauth_providers_updated_at
    BEFORE UPDATE ON user_oauth_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_oauth_providers_user_id ON user_oauth_providers(user_id);

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expires_at ON password_reset_tokens(expires_at);

-- Google Tokens (Legacy/Specific)
CREATE TABLE google_tokens (
    email VARCHAR(320) NOT NULL PRIMARY KEY,
    tokens_encrypted BYTEA NOT NULL,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_encrypted BYTEA,
    refresh_attempts INT DEFAULT 0,
    last_refresh_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_google_tokens_expiry ON google_tokens(access_token_expires_at);

CREATE TRIGGER update_google_tokens_updated_at
    BEFORE UPDATE ON google_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User Preferences
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. Chat & Knowledge System
-- =============================================================================

-- Knowledge Base
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    embedding JSONB
);
-- Note: FULLTEXT support in Postgres is done via tsvector/tsquery, not declared in CREATE TABLE.
-- CREATE INDEX idx_knowledge_base_fulltext ON knowledge_base USING GIN (to_tsvector('english', title || ' ' || content));

-- Knowledge Chunks
CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    parent_id INT, -- Could be FK to knowledge_base(id) if strict
    title TEXT,
    content TEXT,
    embedding JSONB,
    token_count INT,
    hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_chunk_hash ON knowledge_chunks(hash);

-- Important Keywords
CREATE TABLE important_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unanswered Questions
CREATE TABLE unanswered_questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    answered BOOLEAN DEFAULT FALSE
);

-- User Questions (Conversations)
CREATE TABLE user_questions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL, -- FK to users(id) not strictly enforced in MySQL schema but good practice
    conversation_id VARCHAR(36),
    conversation_title VARCHAR(255),
    question TEXT,
    bot_reply TEXT,
    is_answered BOOLEAN DEFAULT FALSE,
    is_reviewed BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_questions_conversation_id ON user_questions(conversation_id);
CREATE INDEX idx_user_questions_user_archived ON user_questions(user_id, is_archived);
CREATE INDEX idx_user_questions_user_pinned ON user_questions(user_id, is_pinned);

CREATE TRIGGER update_user_questions_updated_at
    BEFORE UPDATE ON user_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Dictionary (Minimal Schema based on usage)
CREATE TABLE dictionary (
    id SERIAL PRIMARY KEY,
    word_en VARCHAR(255) NOT NULL,
    word_vi VARCHAR(255),
    definition TEXT,
    type VARCHAR(50)
);
CREATE INDEX idx_dictionary_word_en ON dictionary(word_en);


-- =============================================================================
-- 3. Subscription & Usage (Phase 2)
-- =============================================================================

CREATE TABLE subscription_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    features JSONB NOT NULL,
    max_file_size_mb INT DEFAULT 1,
    max_chat_history_days INT DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_subscription_tiers_updated_at
    BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Default Tiers Data
INSERT INTO subscription_tiers (name, display_name, price_monthly, price_yearly, features, max_file_size_mb, max_chat_history_days) VALUES
('free', 'Free', 0.00, 0.00, 
 '{"queries_per_day": 50, "advanced_rag": false, "file_upload_mb": 1, "chat_history_days": 7, "priority_support": false, "api_access": false, "team_collaboration": false}'::jsonb,
 1, 7),
('pro', 'Pro', 9.99, 99.99, 
 '{"queries_per_day": -1, "advanced_rag": true, "file_upload_mb": 10, "chat_history_days": -1, "priority_support": true, "api_access": false, "team_collaboration": false}'::jsonb,
 10, -1),
('team', 'Team', 29.99, 299.99, 
 '{"queries_per_day": -1, "advanced_rag": true, "file_upload_mb": 50, "chat_history_days": -1, "priority_support": true, "api_access": true, "team_collaboration": true}'::jsonb,
 50, -1);

-- User Subscriptions (Ref Table for payments added later, creating base first)
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier_id INT NOT NULL REFERENCES subscription_tiers(id),
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    payment_source VARCHAR(20) DEFAULT 'wallet' CHECK (payment_source IN ('wallet', 'card', 'external')),
    auto_renew BOOLEAN DEFAULT FALSE,
    last_payment_transaction_id INT, -- Will verify FK later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User Usage
CREATE TABLE user_usage (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    queries_count INT DEFAULT 0,
    advanced_rag_count INT DEFAULT 0,
    file_uploads_count INT DEFAULT 0,
    file_uploads_size_mb DECIMAL(10, 2) DEFAULT 0,
    tokens_used INT DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, date)
);
CREATE INDEX idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX idx_user_usage_date ON user_usage(date);

CREATE TRIGGER update_user_usage_updated_at
    BEFORE UPDATE ON user_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Usage Limits
CREATE TABLE usage_limits (
    id SERIAL PRIMARY KEY,
    tier_id INT NOT NULL REFERENCES subscription_tiers(id),
    limit_type VARCHAR(50) NOT NULL,
    limit_value INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tier_id, limit_type)
);

-- Default Limits Data
INSERT INTO usage_limits (tier_id, limit_type, limit_value)
SELECT id, 'queries_per_day', (features->>'queries_per_day')::int
FROM subscription_tiers;

INSERT INTO usage_limits (tier_id, limit_type, limit_value)
SELECT id, 'file_size_mb', max_file_size_mb
FROM subscription_tiers;


-- =============================================================================
-- 4. Wallet & Payments (Phase 3)
-- =============================================================================

CREATE TABLE user_wallets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(30, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_wallets_status ON user_wallets(status);

CREATE TRIGGER update_user_wallets_updated_at
    BEFORE UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'refund', 'subscription', 'bet_baucua', 'win_baucua', 'bet_taixiu', 'win_taixiu')),
    amount DECIMAL(30, 2) NOT NULL,
    balance_before DECIMAL(30, 2) NOT NULL,
    balance_after DECIMAL(30, 2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id INT,
    payment_method VARCHAR(50),
    payment_gateway_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

-- Payment Methods
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB,
    supported_currencies JSONB,
    min_amount DECIMAL(10, 2) DEFAULT 1.00,
    max_amount DECIMAL(10, 2) DEFAULT 10000.00,
    fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
    fee_fixed DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Default Payment Methods
INSERT INTO payment_methods (name, display_name, provider, is_active, supported_currencies, min_amount, max_amount, fee_percentage, fee_fixed) VALUES
('vnpay', 'VNPay', 'vnpay', TRUE, '["VND"]'::jsonb, 10000.00, 50000000.00, 1.50, 0.00),
('momo', 'MoMo', 'momo', TRUE, '["VND"]'::jsonb, 10000.00, 50000000.00, 1.00, 0.00),
('stripe', 'Stripe', 'stripe', TRUE, '["USD", "VND"]'::jsonb, 1.00, 10000.00, 2.90, 0.30),
('paypal', 'PayPal', 'paypal', FALSE, '["USD"]'::jsonb, 1.00, 10000.00, 3.40, 0.30);

-- Wallet Audit Log
CREATE TABLE wallet_audit_log (
    id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL, -- references user_wallets(id) loose coupling often preferred for logs, but can enforce
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_balance DECIMAL(30, 2),
    new_balance DECIMAL(30, 2),
    changed_by VARCHAR(100),
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Audit Trigger
CREATE OR REPLACE FUNCTION audit_wallet_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.balance != NEW.balance THEN
        INSERT INTO wallet_audit_log (wallet_id, user_id, action, old_balance, new_balance, changed_by)
        VALUES (NEW.id, NEW.user_id, 'balance_update', OLD.balance, NEW.balance, 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallet_balance_update
    AFTER UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION audit_wallet_balance_change();

-- Add circular FK for user_subscriptions -> wallet_transactions
-- Postgres allows adding FK even if data exists as long as it satisfies, but in Init script tables are empty so fine.
ALTER TABLE user_subscriptions ADD CONSTRAINT fk_last_payment_transaction FOREIGN KEY (last_payment_transaction_id) REFERENCES wallet_transactions(id);

-- =============================================================================
-- 5. Helper Views (For completeness with MySQL schema)
-- =============================================================================

-- View: Current User Subscription with Tier Info
CREATE OR REPLACE VIEW v_user_subscriptions AS
SELECT 
  us.id,
  us.user_id,
  us.tier_id,
  st.name as tier_name,
  st.display_name as tier_display_name,
  st.price_monthly,
  st.price_yearly,
  st.features,
  st.max_file_size_mb,
  st.max_chat_history_days,
  us.status,
  us.billing_cycle,
  us.current_period_start,
  us.current_period_end,
  us.cancel_at_period_end,
  us.created_at,
  us.updated_at
FROM user_subscriptions us
JOIN subscription_tiers st ON us.tier_id = st.id
WHERE us.status IN ('active', 'trial');

-- View: User wallet with transaction summary
CREATE OR REPLACE VIEW v_user_wallet_summary AS
SELECT 
  w.id as wallet_id,
  w.user_id,
  u.name as user_name,
  u.email as user_email,
  w.balance,
  w.currency,
  w.status,
  COUNT(DISTINCT wt.id) as total_transactions,
  SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' THEN wt.amount ELSE 0 END) as total_deposits,
  SUM(CASE WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' THEN ABS(wt.amount) ELSE 0 END) as total_spent,
  MAX(wt.created_at) as last_transaction_at,
  w.created_at as wallet_created_at
FROM user_wallets w
JOIN users u ON w.user_id = u.id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY w.id, w.user_id, u.name, u.email, w.balance, w.currency, w.status, w.created_at;

-- View: Recent transactions
CREATE OR REPLACE VIEW v_recent_transactions AS
SELECT 
  wt.id,
  wt.user_id,
  u.name as user_name,
  u.email as user_email,
  wt.type,
  wt.amount,
  wt.balance_before,
  wt.balance_after,
  wt.description,
  wt.payment_method,
  wt.status,
  wt.created_at
FROM wallet_transactions wt
JOIN users u ON wt.user_id = u.id
ORDER BY wt.created_at DESC
LIMIT 100;

-- =============================================================================
-- 6. Game System (Sic Bo / Tai Xiu)
-- =============================================================================

CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    game_type VARCHAR(50) DEFAULT 'TAI_XIU',
    dice1 SMALLINT NOT NULL,
    dice2 SMALLINT NOT NULL,
    dice3 SMALLINT NOT NULL,
    total_score SMALLINT NOT NULL,
    result_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_bets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INT NOT NULL REFERENCES game_sessions(id),
    bet_type VARCHAR(50) NOT NULL,
    bet_amount DECIMAL(30, 2) NOT NULL,
    win_amount DECIMAL(30, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_game_bets_user_id ON game_bets(user_id);
CREATE INDEX idx_game_bets_session_id ON game_bets(session_id);
