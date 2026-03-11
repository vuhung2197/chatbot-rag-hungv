-- =============================================================================
-- PostgreSQL Initialization Script for English Chatbot
-- Based on MySQL schemas (Phase 1, 2, 3) + Game System
-- Excludes unused tables: chat_history, conversation_sessions, feedbacks, 
-- user_words, user_highlighted_text, writing_sessions, sentence_examples, unknown_queries
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Pgvector extension
CREATE EXTENSION IF NOT EXISTS vector; 

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
    embedding vector(1536)
);
-- Note: FULLTEXT support in Postgres is done via tsvector/tsquery, not declared in CREATE TABLE.
-- CREATE INDEX idx_knowledge_base_fulltext ON knowledge_base USING GIN (to_tsvector('english', title || ' ' || content));

-- Knowledge Chunks
CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    parent_id INT, -- Could be FK to knowledge_base(id) if strict
    title TEXT,
    content TEXT,
    embedding vector(1536),
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
('pro', 'Pro', 10.00, 100.00, 
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
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'withdraw', 'purchase', 'refund', 'subscription')),
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
-- 4.1 Withdrawal & Bank Management
-- =============================================================================

CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_code VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE withdrawal_requests (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL REFERENCES wallet_transactions(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_account_id INT NOT NULL REFERENCES bank_accounts(id),
    amount DECIMAL(30, 2) NOT NULL,
    fee DECIMAL(30, 2) NOT NULL,
    net_amount DECIMAL(30, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    admin_note TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for withdrawal history
CREATE OR REPLACE VIEW v_withdrawal_history AS
SELECT 
    wr.id,
    wr.user_id,
    wr.transaction_id,
    wr.amount,
    wr.fee,
    wr.net_amount,
    wr.status,
    ba.bank_name,
    ba.account_number,
    wr.created_at
FROM withdrawal_requests wr
JOIN bank_accounts ba ON wr.bank_account_id = ba.id;

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

-- End of Script


-- =============================================
-- RECENTLY APPLIED MIGRATIONS
-- =============================================

-- Migration: add_pronunciation_tables.sql
-- =============================================
-- Migration: Add Pronunciation Practice
-- Description:
-- 1. Updates speaking_topics.type to allow 'pronunciation'
-- 2. Creates ipa_phonemes table to store 44 IPA sounds
-- 3. Seeds minimal/initial phoneme data
-- =============================================

-- 1. Update Constraint on speaking_topics
-- PostgreSQL doesn't allow direct alteration of CHECK constraints, we drop it and re-add.
ALTER TABLE speaking_topics DROP CONSTRAINT speaking_topics_type_check;
ALTER TABLE speaking_topics ADD CONSTRAINT speaking_topics_type_check CHECK (type IN ('shadowing', 'topic', 'reflex', 'pronunciation'));

-- 2. Create IPA Phonemes reference table
CREATE TABLE IF NOT EXISTS ipa_phonemes (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('vowel', 'consonant', 'diphthong')),
    is_voiced BOOLEAN NOT NULL,
    example_words VARCHAR(255),
    description TEXT,
    audio_url VARCHAR(255),
    video_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update timestamp
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ipa_phonemes_updated_at') THEN
        CREATE TRIGGER update_ipa_phonemes_updated_at
            BEFORE UPDATE ON ipa_phonemes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 3. Seed some basic phonemes to get started
INSERT INTO ipa_phonemes (symbol, category, is_voiced, example_words, description)
VALUES 
-- Vowels
('i:', 'vowel', true, 'sheep, eagle, field', 'Âm i dài. Miệng căng sang 2 bên như đang mỉm cười, đầu lưỡi nâng cao.'),
('ɪ', 'vowel', true, 'ship, big, listen', 'Âm i ngắn. Môi mở tự nhiên, lưỡi hạ thấp. Giọng phát ra dứt khoát (nửa i nửa ê).'),
('ʊ', 'vowel', true, 'book, put, could', 'Âm u ngắn. Môi hơi tròn, đẩy nhẹ ra phía trước. Phát âm dứt khoát, âm phát ra trong khoang miệng.'),
('u:', 'vowel', true, 'shoot, boot, blue', 'Âm u dài. Môi chu tròn về phía trước, căng. Giữ âm kéo dài ra.'),
('e', 'vowel', true, 'bed, head, left', 'Âm e ngắn. Miệng mở hẹp vừa phải, lưỡi hạ thấp, âm dứt khoát giống chữ "e".'),
('ə', 'vowel', true, 'teacher, about, sister', 'Âm ơ ngắn (Schwa). Môi và lưỡi hoàn toàn thả lỏng. Âm cực kỳ phổ biến trong nói lướt, âm tiết không trọng âm. Nghe như chữ ơ nghẹn.'),
('ɜ:', 'vowel', true, 'bird, learn, word', 'Âm ơ dài. Khẩu hình tự nhiên, cong đầu lưỡi lên (gần ngạc cứng). Giữ âm kéo dài ra.'),
('ɔ:', 'vowel', true, 'door, walk, saw', 'Âm o dài. Môi hơi tròn, mở rộng, cong đầu lưỡi nhẹ. Giữ âm kéo dài.'),
('æ', 'vowel', true, 'cat, apple, black', 'Âm a bẹt. Mở rất rộng miệng căng sang 2 bên, cằm hạ thấp nhất có thể. Âm pha giữa miệng chữ "a" nhưng đọc chữ "e".'),
('ʌ', 'vowel', true, 'up, cup, money', 'Âm ă ngắn. Miệng hơi mở, lưỡi hạ cực thấp. Đọc dứt khoát, lai giữa chữ "ă" và chữ "ơ" tiếng Việt.'),
('ɑ:', 'vowel', true, 'far, part, father', 'Âm a dài. Miệng mở rất to, cằm hạ thấp, lưỡi nằm bẹt xuống. Kéo dài âm.'),
('ɒ', 'vowel', true, 'on, got, watch', 'Âm o ngắn. Môi tròn, mở rộng, lưỡi hạ thấp. Phát âm một cách dứt khoát.'),

-- Consonants
('p', 'consonant', false, 'pen, copy, happen', 'Âm vô thanh. Hai môi ngậm chặt để chặn hơi, sau đó bật bung mạnh hơi ra khỏi miệng. Cổ họng KHÔNG rung.'),
('b', 'consonant', true, 'back, baby, job', 'Âm hữu thanh. Khẩu hình giống âm /p/, chặn hơi ở môi nhưng bật ra nhẹ. Cổ họng RUNG.'),
('t', 'consonant', false, 'tea, tight, button', 'Âm vô thanh. Răng khép hờ, chạm đầu lưỡi vào sau chân răng cửa trên. Bật mạnh luồng hơi ra, cổ họng KHÔNG rung.'),
('d', 'consonant', true, 'day, ladder, odd', 'Âm hữu thanh. Khẩu hình giống /t/, chạm lưỡi chân răng hàm trên rồi bật ra. Cổ họng RUNG (giống chữ đ tiếng Việt).'),
('k', 'consonant', false, 'key, clock, school', 'Âm vô thanh. Nâng cuống lưỡi lên chạm ngạc mềm (trong cùng hàm) để chặn khí. Bật khí ra (nghe như chữ kh), cổ vị trí KHÔNG rung.'),
('g', 'consonant', true, 'get, giggle, ghost', 'Âm hữu thanh. Khẩu hình giống /k/, nâng cuống lưỡi, nhưng thay vì bật hơi, cổ họng RUNG mạnh để phát ra tiếng.'),
('θ', 'consonant', false, 'think, both, math', 'Âm TH vô thanh. Thè hẳn một đoạn đầu lưỡi ra giữa 2 hàm răng, đẩy luồng hơi đều liên tục qua khe răng. Cổ họng KHÔNG rung.'),
('ð', 'consonant', true, 'this, mother, breathe', 'Âm TH hữu thanh. Khẩu hình giống /θ/ (đặt hẳn đầu lưỡi giữa răng) nhưng tạo tiếng d z d z. Cổ họng RUNG mạnh.'),
('ʃ', 'consonant', false, 'shirt, rush, shop', 'Âm s nặng (vô thanh). Chu môi, môi uốn cong về phía trước. Hai hàm răng khép. Đẩy hơi xì mạnh ra liên tục (như chép miệng đuổi vịt).'),
('ʒ', 'consonant', true, 'vision, measure, casual', 'Âm zh (hữu thanh). Khẩu hình y hệt âm /ʃ/ (chu tròn môi tống hơi). Nhưng thay vì âm xì thì cổ họng RUNG mạnh.')

ON CONFLICT (symbol) DO UPDATE SET 
    description = EXCLUDED.description,
    example_words = EXCLUDED.example_words;


-- Migration: add_system_vocabulary.sql
-- 1. Create system vocabulary dictionary
CREATE TABLE IF NOT EXISTS system_vocabulary (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL UNIQUE,
    pos VARCHAR(20), -- noun, verb, adj, adv
    phonetic VARCHAR(50),
    definition TEXT,
    translation TEXT,
    example_sentence TEXT,
    level VARCHAR(2) CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    topic VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update timestamp
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_vocabulary_updated_at') THEN
        CREATE TRIGGER update_system_vocabulary_updated_at
            BEFORE UPDATE ON system_vocabulary
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Fix user_vocabulary: Add missing columns if any
ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS translation TEXT;
ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS phonetic VARCHAR(50);
ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS pos VARCHAR(20);

-- 2. Seed system vocabulary data (A1-C1)
INSERT INTO system_vocabulary (word, pos, phonetic, definition, translation, example_sentence, level, topic)
VALUES
-- A1 - Basic Words (20 words)
('apple', 'noun', '/ˈæpl/', 'A round fruit with red or green skin and a whitish interior.', 'Quả táo', 'I eat an apple every morning.', 'A1', 'Food'),
('beautiful', 'adj', '/ˈbjuːtɪfl/', 'Pleasing the senses or mind aesthetically.', 'Đẹp', 'She wore a beautiful dress to the party.', 'A1', 'Adjectives'),
('cat', 'noun', '/kæt/', 'A small domesticated carnivorous mammal with soft fur.', 'Con mèo', 'My cat likes to sleep on the sofa.', 'A1', 'Animals'),
('dog', 'noun', '/dɒɡ/', 'A domesticated carnivorous mammal that typically has a long snout.', 'Con chó', 'The dog barked at the stranger.', 'A1', 'Animals'),
('eat', 'verb', '/iːt/', 'Put (food) into the mouth and chew and swallow it.', 'Ăn', 'We usually eat dinner at 7 PM.', 'A1', 'Daily Routine'),
('family', 'noun', '/ˈfæməli/', 'A group of one or more parents and their children.', 'Gia đình', 'My family is very important to me.', 'A1', 'People'),
('good', 'adj', '/ɡʊd/', 'To be desired or approved of.', 'Tốt, giỏi', 'He is a good student.', 'A1', 'Adjectives'),
('house', 'noun', '/haʊs/', 'A building for human habitation.', 'Ngôi nhà', 'They live in a beautiful house.', 'A1', 'Places'),
('important', 'adj', '/ɪmˈpɔːtnt/', 'Of great significance or value.', 'Quan trọng', 'It is important to study hard.', 'A1', 'Adjectives'),
('job', 'noun', '/dʒɒb/', 'A paid position of regular employment.', 'Công việc', 'She has a good job at the bank.', 'A1', 'Work'),
('know', 'verb', '/nəʊ/', 'Be aware of through observation, inquiry, or information.', 'Biết', 'I don''t know the answer.', 'A1', 'Verbs'),
('love', 'verb', '/lʌv/', 'Feel a deep romantic or sexual attachment to (someone).', 'Yêu, Thích', 'I love reading books in my free time.', 'A1', 'Emotions'),
('money', 'noun', '/ˈmʌni/', 'A current medium of exchange in the form of coins and banknotes.', 'Tiền', 'I don''t have enough money to buy this.', 'A1', 'Finance'),
('new', 'adj', '/njuː/', 'Produced, introduced, or discovered recently.', 'Mới', 'I bought a new car yesterday.', 'A1', 'Adjectives'),
('often', 'adv', '/ˈɒfn/', 'Frequently; many times.', 'Thường xuyên', 'I often go to the gym after work.', 'A1', 'Adverbs'),
('people', 'noun', '/ˈpiːpl/', 'Human beings in general or considered collectively.', 'Mọi người', 'Many people attended the concert.', 'A1', 'People'),
('question', 'noun', '/ˈkwestʃən/', 'A sentence worded or expressed so as to elicit information.', 'Câu hỏi', 'Can I ask you a question?', 'A1', 'Communication'),
('read', 'verb', '/riːd/', 'Look at and comprehend the meaning of (written or printed matter).', 'Đọc', 'I read a book every week.', 'A1', 'Hobbies'),
('school', 'noun', '/skuːl/', 'An institution for educating children.', 'Trường học', 'Children start school at age five.', 'A1', 'Places'),
('time', 'noun', '/taɪm/', 'The indefinite continued progress of existence and events.', 'Thời gian', 'What time is it?', 'A1', 'Concepts'),

-- A2 - Pre-Intermediate (15 words)
('achieve', 'verb', '/əˈtʃiːv/', 'Object successfully bring about or reach by effort, skill.', 'Đạt được', 'She achieved her goal of becoming a doctor.', 'A2', 'Verbs'),
('believe', 'verb', '/bɪˈliːv/', 'Accept that (something) is true, especially without proof.', 'Tin tưởng', 'I believe that everything will be fine.', 'A2', 'Emotions'),
('culture', 'noun', '/ˈkʌltʃə(r)/', 'The arts and other manifestations of human intellectual achievement.', 'Văn hóa', 'Learning a new language helps you understand its culture.', 'A2', 'Society'),
('decide', 'verb', '/dɪˈsaɪd/', 'Come to a resolution in the mind as a result of consideration.', 'Quyết định', 'I decided to stay home instead of going out.', 'A2', 'Verbs'),
('experience', 'noun', '/ɪkˈspɪəriəns/', 'Practical contact with and observation of facts or events.', 'Kinh nghiệm, trải nghiệm', 'She has a lot of experience in teaching.', 'A2', 'Concepts'),
('forget', 'verb', '/fəˈɡet/', 'Fail to remember.', 'Quên', 'Don''t forget to lock the door.', 'A2', 'Verbs'),
('government', 'noun', '/ˈɡʌvənmənt/', 'The group of people with the authority to govern a country.', 'Chính phủ', 'The government announced new tax policies.', 'A2', 'Society'),
('happen', 'verb', '/ˈhæpən/', 'Take place; occur.', 'Xảy ra', 'What happened here last night?', 'A2', 'Verbs'),
('improve', 'verb', '/ɪmˈpruːv/', 'Make or become better.', 'Cải thiện', 'I want to improve my English speaking skills.', 'A2', 'Verbs'),
('journey', 'noun', '/ˈdʒɜːni/', 'An act of travelling from one place to another.', 'Chuyến đi, hành trình', 'The journey took us three hours by car.', 'A2', 'Travel'),
('knowledge', 'noun', '/ˈnɒlɪdʒ/', 'Facts, information, and skills acquired through experience.', 'Kiến thức', 'Reading books helps you acquire more knowledge.', 'A2', 'Concepts'),
('language', 'noun', '/ˈlæŋɡwɪdʒ/', 'The method of human communication, either spoken or written.', 'Ngôn ngữ', 'How many languages do you speak?', 'A2', 'Communication'),
('measure', 'verb', '/ˈmeʒə(r)/', 'Ascertain the size, amount, or degree of (something).', 'Đo lường', 'We need to measure the room before buying furniture.', 'A2', 'Actions'),
('necessary', 'adj', '/ˈnesəsəri/', 'Needed to be done, achieved, or present; essential.', 'Cần thiết', 'It is necessary to bring your passport.', 'A2', 'Adjectives'),
('opportunity', 'noun', '/ˌɒpəˈtjuːnəti/', 'A time or set of circumstances that makes it possible to do something.', 'Cơ hội', 'This is a great opportunity for my career.', 'A2', 'Concepts'),

-- B1 - Intermediate (15 words)
('abundance', 'noun', '/əˈbʌndəns/', 'A very large quantity of something.', 'Sự phong phú, dồi dào', 'There is an abundance of food at the party.', 'B1', 'Concepts'),
('benevolent', 'adj', '/bəˈnevələnt/', 'Well meaning and kindly.', 'Nhân từ, tốt bụng', 'The benevolent gentleman donated to the orphanage.', 'B1', 'Adjectives'),
('character', 'noun', '/ˈkærəktə(r)/', 'The mental and moral qualities distinctive to an individual.', 'Tính cách, nhân vật', 'He is a man of strong character.', 'B1', 'People'),
('determine', 'verb', '/dɪˈtɜːmɪn/', 'Ascertain or establish exactly by research or calculation.', 'Xác định, quyết tâm', 'We need to determine the cause of the problem.', 'B1', 'Verbs'),
('efficient', 'adj', '/ɪˈfɪʃnt/', 'Achieving maximum productivity with minimum wasted effort.', 'Hiệu quả', 'The new system is much more efficient.', 'B1', 'Adjectives'),
('frequent', 'adj', '/ˈfriːkwənt/', 'Occurring or done many times at short intervals.', 'Thường xuyên', 'He is a frequent visitor to the museum.', 'B1', 'Adjectives'),
('generate', 'verb', '/ˈdʒenəreɪt/', 'Produce or create.', 'Tạo ra', 'The wind farm can generate enough electricity for the town.', 'B1', 'Verbs'),
('hesitate', 'verb', '/ˈhezɪteɪt/', 'Pause in indecision before saying or doing something.', 'Do dự, ngập ngừng', 'Don''t hesitate to contact me if you need help.', 'B1', 'Verbs'),
('identify', 'verb', '/aɪˈdentɪfaɪ/', 'Establish or indicate who or what (someone or something) is.', 'Nhận diện, xác định', 'Can you identify the man in this photo?', 'B1', 'Verbs'),
('justify', 'verb', '/ˈdʒʌstɪfaɪ/', 'Show or prove to be right or reasonable.', 'Biện minh, bào chữa', 'He tried to justify his bad behavior.', 'B1', 'Verbs'),
('maintain', 'verb', '/meɪnˈteɪn/', 'Cause or enable (a condition or situation) to continue.', 'Duy trì', 'It is important to maintain a healthy diet.', 'B1', 'Verbs'),
('negotiate', 'verb', '/nɪˈɡəʊʃieɪt/', 'Obtain or bring about by discussion.', 'Đàm phán', 'We need to negotiate a better price.', 'B1', 'Business'),
('observe', 'verb', '/əbˈzɜːv/', 'Notice or perceive (something) and register it as being significant.', 'Quan sát', 'The children were observing the birds in the tree.', 'B1', 'Actions'),
('persuade', 'verb', '/pəˈsweɪd/', 'Induce (someone) to do something through reasoning or argument.', 'Thuyết phục', 'I finally persuaded her to join us.', 'B1', 'Communication'),
('relevant', 'adj', '/ˈreləvənt/', 'Closely connected or appropriate to the matter in hand.', 'Có liên quan', 'Please provide only relevant information.', 'B1', 'Adjectives'),

-- B2 - Upper-Intermediate (10 words)
('ambiguity', 'noun', '/ˌæmbɪˈɡjuːəti/', 'The quality of being open to more than one interpretation.', 'Sự mơ hồ', 'We must eliminate any ambiguity in the contract.', 'B2', 'Concepts'),
('comprehensible', 'adj', '/ˌkɒmprɪˈhensəbl/', 'Able to be understood; intelligible.', 'Có thể hiểu được', 'His explanation was completely comprehensible.', 'B2', 'Adjectives'),
('deliberate', 'adj', '/dɪˈlɪbərət/', 'Done consciously and intentionally.', 'Cố ý, có chủ đích', 'It was a deliberate attempt to sabotage the project.', 'B2', 'Adjectives'),
('exaggerate', 'verb', '/ɪɡˈzædʒəreɪt/', 'Represent (something) as being larger, better, or worse than it really is.', 'Phóng đại', 'He tends to exaggerate his achievements.', 'B2', 'Verbs'),
('fascinate', 'verb', '/ˈfæsɪneɪt/', 'Draw irresistibly the attention and interest of (someone).', 'Gây quyến rũ, mê hoặc', 'The structure of the universe fascinates me.', 'B2', 'Verbs'),
('implement', 'verb', '/ˈɪmplɪment/', 'Put (a decision, plan, agreement, etc.) into effect.', 'Thiết lập, triển khai', 'The new policy will be implemented next month.', 'B2', 'Business'),
('inevitable', 'adj', '/ɪnˈevɪtəbl/', 'Certain to happen; unavoidable.', 'Không thể tránh khỏi', 'Conflict is inevitable when so many people work together.', 'B2', 'Adjectives'),
('manipulate', 'verb', '/məˈnɪpjuleɪt/', 'Handle or control typically in a skillful manner.', 'Thao túng, điều khiển', 'She knows how to manipulate people to get what she wants.', 'B2', 'Social'),
('profound', 'adj', '/prəˈfaʊnd/', 'Very great or intense.', 'Sâu sắc', 'The book had a profound impact on my thinking.', 'B2', 'Adjectives'),
('resilient', 'adj', '/rɪˈzɪliənt/', 'Able to withstand or recover quickly from difficult conditions.', 'Kiên cường', 'Children are often more resilient than adults.', 'B2', 'Adjectives'),

-- C1 - Advanced (5 words)
('cacophony', 'noun', '/kəˈkɒfəni/', 'A harsh discordant mixture of sounds.', 'Âm thanh chói tai, tạp âm', 'The classroom was a cacophony of shouting children.', 'C1', 'Sounds'),
('ephemeral', 'adj', '/ɪˈfemərəl/', 'Lasting for a very short time.', 'Phù du, chóng tàn', 'Fame is often ephemeral.', 'C1', 'Concepts'),
('loquacious', 'adj', '/ləˈkweɪʃəs/', 'Tending to talk a great deal; talkative.', 'Nói nhiều, ba hoa', 'He is a loquacious and extremely charming host.', 'C1', 'People'),
('obfuscate', 'verb', '/ˈɒbfʌskeɪt/', 'Render obscure, unclear, or unintelligible.', 'Làm lu mờ, làm khó hiểu', 'The new rules only obfuscate the process further.', 'C1', 'Verbs'),
('ubiquitous', 'adj', '/juːˈbɪkwɪtəs/', 'Present, appearing, or found everywhere.', 'Có mặt ở khắp mọi nơi', 'Smartphones have become ubiquitous in modern society.', 'C1', 'Technology')

ON CONFLICT (word) DO UPDATE SET
    definition = EXCLUDED.definition,
    translation = EXCLUDED.translation,
    example_sentence = EXCLUDED.example_sentence,
    phonetic = EXCLUDED.phonetic,
    pos = EXCLUDED.pos,
    level = EXCLUDED.level,
    topic = EXCLUDED.topic,
    updated_at = NOW();


-- Migration: add_user_mistake_logs.sql
-- Migration: Thêm bảng user_mistake_logs để lưu trữ điểm yếu người dùng
-- Goal: Tracking weaknesses from multiple modules (speaking, writing, roleplay, etc)

CREATE TABLE IF NOT EXISTS user_mistake_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Nơi xảy ra lỗi (speaking, writing, roleplay, grammar_quiz)
    source_module VARCHAR(50) NOT NULL, 
    
    -- Loại lỗi (pronunciation, grammar, vocabulary, spelling)
    error_category VARCHAR(50) NOT NULL, 
    
    -- Chi tiết lỗi (VD: 'phoneme_th', 'present_perfect', 'subject_verb_agreement')
    error_detail VARCHAR(100) NOT NULL,
    
    -- Bối cảnh (Câu gốc người dùng nói/viết chứa lỗi)
    context_text TEXT,
    
    -- (Tùy chọn) ID của bài học hoặc phiên học liên quan
    session_id INTEGER, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index để truy vấn thống kê nhanh theo user và thời gian
CREATE INDEX IF NOT EXISTS idx_mistake_logs_user_time ON user_mistake_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mistake_logs_category ON user_mistake_logs(user_id, error_category);

-- Comment to record table usage
COMMENT ON TABLE user_mistake_logs IS 'Stores detailed error logs from user practice sessions to analyze weaknesses.';


-- Migration: add_withdrawal_tables.sql
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_code VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bank_accounts_updated_at') THEN
        CREATE TRIGGER update_bank_accounts_updated_at
            BEFORE UPDATE ON bank_accounts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL REFERENCES wallet_transactions(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_account_id INT NOT NULL REFERENCES bank_accounts(id),
    amount DECIMAL(30, 2) NOT NULL,
    fee DECIMAL(30, 2) NOT NULL,
    net_amount DECIMAL(30, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    admin_note TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_withdrawal_requests_updated_at') THEN
        CREATE TRIGGER update_withdrawal_requests_updated_at
            BEFORE UPDATE ON withdrawal_requests
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

CREATE OR REPLACE VIEW v_withdrawal_history AS
SELECT 
    wr.id,
    wr.user_id,
    wr.transaction_id,
    wr.amount,
    wr.fee,
    wr.net_amount,
    wr.status,
    ba.bank_name,
    ba.account_number,
    wr.created_at
FROM withdrawal_requests wr
JOIN bank_accounts ba ON wr.bank_account_id = ba.id;


-- Migration: learning_hub_schema.sql
-- =============================================================================
-- Learning Hub Feature - Database Migration
-- Created: 2026-02-26
-- Description: Tracking micro-learning lessons generated by AI
-- =============================================================================

CREATE TABLE IF NOT EXISTS learning_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('grammar', 'pattern', 'pronunciation')),
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    title VARCHAR(255) NOT NULL,
    score INT DEFAULT 0, -- Score from follow-up quiz
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lh_user ON learning_history(user_id);
CREATE INDEX IF NOT EXISTS idx_lh_user_category ON learning_history(user_id, category);

-- End of Learning Hub Migration


-- Migration: listening_practice_schema.sql
-- =============================================================================
-- Listening Practice Feature - Database Migration
-- Created: 2026-02-26
-- Description: Tables for listening exercises, submissions, strengths
-- =============================================================================

-- 1. Listening Exercises (Ngân hàng đề bài nghe)
CREATE TABLE IF NOT EXISTS listening_exercises (
    id SERIAL PRIMARY KEY,
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('dictation', 'multiple_choice')),
    title VARCHAR(255) NOT NULL,
    audio_text TEXT NOT NULL, 
    audio_url VARCHAR(255), 
    hints JSONB DEFAULT '[]',
    questions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_le_level ON listening_exercises(level);
CREATE INDEX IF NOT EXISTS idx_le_type ON listening_exercises(type);
CREATE INDEX IF NOT EXISTS idx_le_active ON listening_exercises(is_active);

-- Ensure update trigger exists (assuming update_updated_at_column is configured globally)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_listening_exercises_updated_at') THEN
        CREATE TRIGGER update_listening_exercises_updated_at
            BEFORE UPDATE ON listening_exercises
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 2. Listening Submissions (Bài nộp của user)
CREATE TABLE IF NOT EXISTS listening_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES listening_exercises(id) ON DELETE SET NULL,
    user_answers JSONB NOT NULL,
    -- AI Scores (0-100)
    score_total DECIMAL(5,2),
    -- AI Feedback (Chữa lỗi dictation, giải thích câu hỏi MCQ)
    feedback JSONB DEFAULT '{}',
    new_words JSONB DEFAULT '[]', 
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted','grading','graded','error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ls_user ON listening_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ls_exercise ON listening_submissions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_ls_status ON listening_submissions(status);

-- Seed Initial Exercises for Dictation
INSERT INTO listening_exercises (level, type, title, audio_text, hints, is_active)
VALUES 
('A1', 'dictation', 'Greetings at the Airport', 'Hello, my name is John. I am from the United States.', '["listen carefully to the country"]', TRUE),
('A2', 'dictation', 'Ordering Food', 'I would like to order a large pizza and two bottles of water, please.', '["focus on numbers and food items"]', TRUE),
('B1', 'dictation', 'A Busy Weekend', 'Although the weather was terrible on Saturday, we still managed to enjoy our hiking trip in the mountains.', '["note the concession clause"]', TRUE)
ON CONFLICT DO NOTHING;


-- Migration: reading_practice_schema.sql
-- =============================================
-- READING PRACTICE MODULE - DATABASE SCHEMA
-- =============================================

-- 1. Bảng kho bài đọc (AI sinh hoặc nhập tay)
CREATE TABLE IF NOT EXISTS reading_passages (
    id SERIAL PRIMARY KEY,
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    topic VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    word_count INT DEFAULT 0,
    summary TEXT,
    questions JSONB DEFAULT '[]',
    difficulty_words JSONB DEFAULT '[]',
    is_generated BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_level ON reading_passages(level);
CREATE INDEX IF NOT EXISTS idx_reading_topic ON reading_passages(topic);
CREATE INDEX IF NOT EXISTS idx_reading_active ON reading_passages(is_active);

-- 2. Bảng lưu lịch sử đọc + quiz của user
CREATE TABLE IF NOT EXISTS reading_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    passage_id INT REFERENCES reading_passages(id) ON DELETE SET NULL,
    quiz_answers JSONB DEFAULT '[]',
    score_total DECIMAL(5,2),
    feedback JSONB DEFAULT '{}',
    words_looked_up JSONB DEFAULT '[]',
    reading_time_seconds INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'reading' CHECK (status IN ('reading','quiz','completed','error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rs_user ON reading_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_rs_passage ON reading_submissions(passage_id);

-- 3. Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION update_reading_passages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trigger_reading_passages_updated ON reading_passages;
CREATE TRIGGER trigger_reading_passages_updated
    BEFORE UPDATE ON reading_passages
    FOR EACH ROW EXECUTE FUNCTION update_reading_passages_updated_at();

-- =============================================
-- SEED: Bài đọc mẫu để test (2 bài mỗi level)
-- =============================================

INSERT INTO reading_passages (level, topic, title, content, word_count, summary, questions, difficulty_words) VALUES

-- A1
('A1', 'daily_life', 'My Morning Routine',
'Every morning, I wake up at 7 o''clock. I brush my teeth and wash my face. Then I eat breakfast. I usually have bread and milk. After breakfast, I put on my school uniform. I take my bag and walk to school. My school is near my house. It takes about 10 minutes. I like mornings because the air is fresh and cool.',
60, 'A simple description of a student''s morning routine.',
'[{"id":1,"type":"multiple_choice","question":"What time does the person wake up?","options":["A. 6 o''clock","B. 7 o''clock","C. 8 o''clock","D. 9 o''clock"],"correctAnswer":"B","explanation":"The text says: I wake up at 7 o''clock."},{"id":2,"type":"true_false_ng","statement":"The person goes to school by bus.","correctAnswer":"False","explanation":"The text says: I walk to school."},{"id":3,"type":"multiple_choice","question":"What does the person eat for breakfast?","options":["A. Rice and soup","B. Eggs and juice","C. Bread and milk","D. Cereal and fruit"],"correctAnswer":"C","explanation":"The text says: I usually have bread and milk."}]',
'[{"word":"routine","definition":"a regular way of doing things","translation":"thói quen hàng ngày"},{"word":"uniform","definition":"special clothes for school or work","translation":"đồng phục"},{"word":"fresh","definition":"clean and new","translation":"trong lành"}]'),

-- A2
('A2', 'travel', 'A Weekend Trip to the Beach',
'Last weekend, my family went to the beach. We left home early in the morning and drove for two hours. The weather was sunny and warm. When we arrived, my sister and I ran to the water. We swam and played in the waves for a long time. My father made a sandcastle with us. My mother sat under an umbrella and read a book. For lunch, we ate seafood at a small restaurant near the beach. The food was delicious and cheap. In the afternoon, we collected beautiful shells. We took many photos together. We went home tired but very happy. It was a wonderful day!',
110, 'A family''s fun day trip to the beach.',
'[{"id":1,"type":"multiple_choice","question":"How long was the drive to the beach?","options":["A. One hour","B. Two hours","C. Three hours","D. Thirty minutes"],"correctAnswer":"B","explanation":"The text says they drove for two hours."},{"id":2,"type":"true_false_ng","statement":"The mother swam in the sea.","correctAnswer":"False","explanation":"The text says the mother sat under an umbrella and read a book."},{"id":3,"type":"true_false_ng","statement":"They had dinner at a restaurant.","correctAnswer":"Not Given","explanation":"The text only mentions lunch, not dinner."},{"id":4,"type":"multiple_choice","question":"How did the family feel at the end of the day?","options":["A. Sad and bored","B. Angry and tired","C. Tired but happy","D. Excited but cold"],"correctAnswer":"C","explanation":"The text says: We went home tired but very happy."}]',
'[{"word":"waves","definition":"moving lines of water in the sea","translation":"sóng biển"},{"word":"sandcastle","definition":"a castle shape made from sand","translation":"lâu đài cát"},{"word":"shells","definition":"hard covers from sea animals","translation":"vỏ sò"},{"word":"delicious","definition":"very good tasting","translation":"ngon"}]'),

-- B1
('B1', 'technology', 'How Social Media Changed Communication',
'Social media has completely changed the way people communicate with each other. Before platforms like Facebook, Instagram, and Twitter existed, people relied on phone calls, text messages, and face-to-face conversations. Today, millions of people share their thoughts, photos, and experiences online every single day. One of the biggest advantages of social media is that it allows people to stay connected regardless of distance. A person living in Vietnam can easily chat with a friend in the United States in real time. Businesses also use social media to reach customers and promote their products. However, social media is not without its problems. Many experts worry about the effects of excessive screen time on mental health, particularly among young people. Cyberbullying and the spread of misinformation are also significant concerns. Despite these challenges, social media continues to grow and evolve, shaping the way we interact with the world around us.',
150, 'An analysis of how social media has transformed modern communication.',
'[{"id":1,"type":"multiple_choice","question":"What is the main topic of the passage?","options":["A. The history of the internet","B. How social media changed communication","C. Why people should stop using social media","D. The best social media platforms"],"correctAnswer":"B","explanation":"The passage discusses how social media has transformed the way people communicate."},{"id":2,"type":"true_false_ng","statement":"Social media only has positive effects on society.","correctAnswer":"False","explanation":"The passage mentions problems like cyberbullying and misinformation."},{"id":3,"type":"multiple_choice","question":"What concern do experts have about social media?","options":["A. It is too expensive","B. It is hard to use","C. Excessive screen time affects mental health","D. It makes people travel more"],"correctAnswer":"C","explanation":"The text states that experts worry about excessive screen time on mental health."},{"id":4,"type":"true_false_ng","statement":"Businesses use social media for advertising.","correctAnswer":"True","explanation":"The passage says businesses use social media to reach customers and promote products."},{"id":5,"type":"true_false_ng","statement":"Social media usage is decreasing worldwide.","correctAnswer":"False","explanation":"The passage says social media continues to grow and evolve."}]',
'[{"word":"regardless","definition":"without being affected by something","translation":"bất kể"},{"word":"excessive","definition":"more than is necessary or normal","translation":"quá mức"},{"word":"cyberbullying","definition":"bullying that takes place online","translation":"bắt nạt trực tuyến"},{"word":"misinformation","definition":"false or inaccurate information","translation":"thông tin sai lệch"},{"word":"evolve","definition":"to develop gradually","translation":"tiến hóa, phát triển"}]'),

-- B2
('B2', 'environment', 'The Hidden Cost of Fast Fashion',
'The fashion industry is one of the largest polluters in the world, yet most consumers remain unaware of the environmental damage caused by their clothing choices. Fast fashion — the rapid production of cheap, trendy clothing — has made it possible for people to buy new outfits every week at remarkably low prices. However, this convenience comes at a devastating cost to the environment. The production of a single cotton T-shirt requires approximately 2,700 liters of water, enough for one person to drink for two and a half years. Furthermore, the textile industry produces about 10% of global carbon emissions, more than international flights and maritime shipping combined. Synthetic fabrics like polyester release microplastics into waterways when washed, contaminating oceans and eventually entering the food chain. Perhaps most alarmingly, around 85% of all textiles end up in landfills each year, where they can take up to 200 years to decompose. Sustainable alternatives do exist. Consumers can choose to buy second-hand clothing, support ethical brands, or simply purchase fewer items of higher quality. The key lies in shifting our mindset from viewing clothing as disposable to treating it as a long-term investment.',
200, 'An exploration of the environmental impact of the fast fashion industry.',
'[{"id":1,"type":"multiple_choice","question":"What is the main argument of the passage?","options":["A. Fast fashion is affordable and beneficial","B. The fashion industry causes significant environmental harm","C. People should only wear expensive clothes","D. Cotton farming is the biggest environmental problem"],"correctAnswer":"B","explanation":"The passage focuses on the environmental damage caused by the fashion industry."},{"id":2,"type":"true_false_ng","statement":"A cotton T-shirt requires about 2,700 liters of water to produce.","correctAnswer":"True","explanation":"This is directly stated in the passage."},{"id":3,"type":"multiple_choice","question":"What happens to synthetic fabrics when washed?","options":["A. They become softer","B. They release microplastics","C. They shrink significantly","D. They lose their color"],"correctAnswer":"B","explanation":"The passage states that synthetic fabrics release microplastics into waterways."},{"id":4,"type":"true_false_ng","statement":"The textile industry produces less carbon emissions than international flights.","correctAnswer":"False","explanation":"The passage says the textile industry produces MORE than international flights and maritime shipping combined."},{"id":5,"type":"multiple_choice","question":"What solution does the author suggest?","options":["A. Stop buying clothes entirely","B. Only buy designer brands","C. Buy second-hand or higher quality items","D. Wear the same outfit every day"],"correctAnswer":"C","explanation":"The author suggests buying second-hand clothing, supporting ethical brands, or purchasing fewer items of higher quality."}]',
'[{"word":"devastating","definition":"causing great damage or harm","translation":"tàn phá"},{"word":"contaminating","definition":"making something impure or polluted","translation":"gây ô nhiễm"},{"word":"decompose","definition":"to break down naturally over time","translation":"phân hủy"},{"word":"sustainable","definition":"able to continue without causing damage","translation":"bền vững"},{"word":"disposable","definition":"intended to be thrown away after use","translation":"dùng một lần"}]')

ON CONFLICT DO NOTHING;


-- Migration: speaking_practice_schema.sql
-- =============================================
-- SPEAKING PRACTICE MODULE - DATABASE SCHEMA
-- =============================================

-- 1. Bảng kho chủ đề / câu luyện nói
CREATE TABLE IF NOT EXISTS speaking_topics (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('shadowing', 'topic')),
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    prompt_text TEXT NOT NULL,
    audio_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speaking_level ON speaking_topics(level);
CREATE INDEX IF NOT EXISTS idx_speaking_type ON speaking_topics(type);

-- 2. Bảng lưu lịch sử ghi âm + chấm điểm của user
CREATE TABLE IF NOT EXISTS speaking_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id INT REFERENCES speaking_topics(id) ON DELETE SET NULL,
    audio_url VARCHAR(255),
    transcript TEXT,
    score_total DECIMAL(5,2),
    feedback JSONB DEFAULT '{}',
    new_words JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'grading' CHECK (status IN ('grading', 'completed', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ss_user ON speaking_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ss_topic ON speaking_submissions(topic_id);

-- 3. Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION update_speaking_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trigger_speaking_topics_updated ON speaking_topics;
CREATE TRIGGER trigger_speaking_topics_updated
    BEFORE UPDATE ON speaking_topics
    FOR EACH ROW EXECUTE FUNCTION update_speaking_topics_updated_at();

-- =============================================
-- SEED: Bài mẫu để test (Shadowing + Topic)
-- =============================================

INSERT INTO speaking_topics (type, level, prompt_text) VALUES

-- Shadowing (A1-B1)
('shadowing', 'A1', 'I go to school every day by bus.'),
('shadowing', 'A2', 'He usually has pizza for dinner on Fridays.'),
('shadowing', 'B1', 'One of the most important things in my life is having a healthy work-life balance.'),
('shadowing', 'B2', 'Despite the heavy rain, they decided to continue their journey through the mountains.'),

-- Topic / IELTS Part 1,2 (B1-C1)
('topic', 'B1', 'Describe a place you visited recently on vacation. Why did you choose to go there?'),
('topic', 'B2', 'What are the main advantages and disadvantages of using public transportation in your city?'),
('topic', 'C1', 'Some people believe that technology has made us less socially active. To what extent do you agree?')

ON CONFLICT DO NOTHING;


-- Migration: writing_practice_schema.sql
-- =============================================================================
-- Writing Practice Feature - Database Migration
-- Created: 2026-02-26
-- Description: Tables for writing exercises, submissions, streaks, vocabulary
-- =============================================================================

-- 1. Writing Exercises (Ngân hàng đề bài)
CREATE TABLE IF NOT EXISTS writing_exercises (
    id SERIAL PRIMARY KEY,
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('sentence','email','story','opinion','report','essay')),
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    hints JSONB DEFAULT '[]',
    min_words INT DEFAULT 10,
    max_words INT DEFAULT 500,
    sample_answer TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_we_level ON writing_exercises(level);
CREATE INDEX IF NOT EXISTS idx_we_type ON writing_exercises(type);
CREATE INDEX IF NOT EXISTS idx_we_active ON writing_exercises(is_active);

CREATE TRIGGER update_writing_exercises_updated_at
    BEFORE UPDATE ON writing_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Writing Submissions (Bài nộp của user)
CREATE TABLE IF NOT EXISTS writing_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES writing_exercises(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    word_count INT NOT NULL DEFAULT 0,
    -- AI Scores (0-100)
    score_total DECIMAL(5,2),
    score_grammar DECIMAL(5,2),
    score_vocabulary DECIMAL(5,2),
    score_coherence DECIMAL(5,2),
    score_task DECIMAL(5,2),
    -- AI Feedback
    feedback JSONB DEFAULT '{}',
    new_words JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted','grading','graded','error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ws_user ON writing_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_exercise ON writing_submissions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_ws_user_created ON writing_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_status ON writing_submissions(status);

-- 3. Writing Streaks (Streak tracking)
CREATE TABLE IF NOT EXISTS learning_streaks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date DATE,
    streak_freezes_remaining INT DEFAULT 1,
    streak_freezes_used INT DEFAULT 0,
    total_exercises INT DEFAULT 0,
    total_words_learned INT DEFAULT 0,
    avg_score DECIMAL(5,2) DEFAULT 0,
    badges JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_learning_streaks_updated_at
    BEFORE UPDATE ON learning_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. User Vocabulary (Sổ từ vựng)
CREATE TABLE IF NOT EXISTS user_vocabulary (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    source_id INT,
    level VARCHAR(2) CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    mastery INT DEFAULT 0 CHECK (mastery >= 0 AND mastery <= 5),
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_uv_user ON user_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_uv_review ON user_vocabulary(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_uv_mastery ON user_vocabulary(user_id, mastery);
CREATE INDEX IF NOT EXISTS idx_uv_item_type ON user_vocabulary(item_type);

CREATE TRIGGER update_user_vocabulary_updated_at
    BEFORE UPDATE ON user_vocabulary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- End of Writing Practice Migration


-- Migration: seed_reflex_topics.sql
ALTER TABLE speaking_topics DROP CONSTRAINT IF EXISTS speaking_topics_type_check;
ALTER TABLE speaking_topics ADD CONSTRAINT speaking_topics_type_check CHECK (type IN ('shadowing', 'topic', 'reflex'));

INSERT INTO speaking_topics (type, level, prompt_text, is_active)
VALUES 
    ('reflex', 'A1', 'Xin chào, tôi tên là Anna. Rất vui được gặp bạn.', true),
    ('reflex', 'A1', 'Bạn đang làm nghề gì?', true),
    ('reflex', 'A1', 'Tôi thích ăn phở và uống cà phê.', true),
    ('reflex', 'A2', 'Cuối tuần này bạn có rảnh không? Chơi game nhé.', true),
    ('reflex', 'A2', 'Tôi đã không gặp cô ấy từ tuần trước.', true),
    ('reflex', 'B1', 'Bạn đã từng đến Nhật Bản chưa? Đất nước đó rất đẹp.', true),
    ('reflex', 'B1', 'Nếu trời mưa, chúng ta sẽ ở nhà xem phim.', true),
    ('reflex', 'B2', 'Kinh tế đang đối mặt với lạm phát nghiêm trọng.', true),
    ('reflex', 'B2', 'Mặc dù anh ấy làm việc rất chăm chỉ, anh ấy vẫn chưa được thăng chức.', true),
    ('reflex', 'C1', 'Việc ứng dụng trí tuệ nhân tạo sẽ tạo ra một cuộc cách mạng trong y tế.', true);


-- Migration: fix_balance_precision.sql
-- Fix wallet balance precision for multi-currency support
-- This migration increases balance precision to support both VND and USD

-- Backup existing data first (recommended)
-- CREATE TABLE user_wallets_backup AS SELECT * FROM user_wallets;

-- Modify balance column to support more decimal places
-- DECIMAL(15, 2) allows up to 999,999,999,999.99
-- This supports:
-- - VND: up to 999 billion (no decimals needed)
-- - USD: up to 999 billion with 2 decimal places
ALTER TABLE user_wallets 
ALTER COLUMN balance TYPE DECIMAL(15, 2),
ALTER COLUMN balance SET NOT NULL,
ALTER COLUMN balance SET DEFAULT 0.00;

-- Also update wallet_transactions table
ALTER TABLE wallet_transactions
ALTER COLUMN amount TYPE DECIMAL(15, 2),
ALTER COLUMN amount SET NOT NULL,
ALTER COLUMN balance_before TYPE DECIMAL(15, 2),
ALTER COLUMN balance_after TYPE DECIMAL(15, 2);

-- Verify changes
SELECT 
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('user_wallets', 'wallet_transactions')
  AND column_name IN ('balance', 'amount', 'balance_before', 'balance_after')
ORDER BY table_name, ordinal_position;

-- Recreate dropped views
CREATE OR REPLACE VIEW v_user_wallet_summary AS
SELECT 
    uw.user_id,
    u.name,
    u.email,
    uw.balance,
    uw.currency,
    uw.status,
    COUNT(wt.id) as total_transactions,
    SUM(CASE WHEN wt.type = 'deposit' THEN wt.amount ELSE 0 END) as total_deposited,
    SUM(CASE WHEN wt.type = 'withdrawal' THEN wt.amount ELSE 0 END) as total_withdrawn,
    SUM(CASE WHEN wt.type IN ('bet_baucua', 'bet_slots') THEN wt.amount ELSE 0 END) as total_bet,
    SUM(CASE WHEN wt.type IN ('win_baucua', 'win_slots') THEN wt.amount ELSE 0 END) as total_won
FROM user_wallets uw
JOIN users u ON uw.user_id = u.id
LEFT JOIN wallet_transactions wt ON uw.id = wt.wallet_id AND wt.status = 'completed'
GROUP BY uw.user_id, u.name, u.email, uw.balance, uw.currency, uw.status;

CREATE OR REPLACE VIEW v_recent_transactions AS
SELECT 
    wt.id,
    wt.user_id,
    u.name,
    wt.type,
    wt.amount,
    uw.currency,
    wt.status,
    wt.created_at
FROM wallet_transactions wt
JOIN users u ON wt.user_id = u.id
JOIN user_wallets uw ON wt.wallet_id = uw.id
ORDER BY wt.created_at DESC;

-- =============================================
-- SEED: Bài mẫu để test Writing Practice (A1-C1)
-- =============================================

INSERT INTO writing_exercises (level, type, title, prompt, hints, min_words, max_words, sample_answer, is_active) VALUES

-- A1
('A1', 'sentence', 'Introduce Yourself', 'Write 3-4 simple sentences introducing your name, age, and where you are from.', '["Use I am...", "Use My name is..."]', 10, 50, 'Hello. My name is John. I am 25 years old. I am from New York. I like playing soccer.', TRUE),
('A1', 'email', 'A Short Message', 'Write a short message to a friend to say thank you for a gift.', '["Start with Dear...", "Say Thank you for..."]', 15, 60, 'Dear Anna,\nThank you very much for the book you gave me on my birthday. I really like it.\nBest,\nJohn', TRUE),

-- A2
('A2', 'story', 'A Weekend Trip', 'Write a short paragraph about what you did last weekend.', '["Use past tense verbs like went, saw, ate", "Mention who you were with"]', 30, 100, 'Last weekend, I went to the park with my friends. The weather was beautiful and sunny. We played volleyball and had a picnic under a big tree. After that, we ate ice cream. It was a very fun day.', TRUE),
('A2', 'email', 'Inviting a Friend', 'Write an email inviting your friend to a movie on Saturday night.', '["Suggest a time and place", "Ask if they are free"]', 30, 100, 'Hi Mark,\nAre you free this Saturday night? I am planning to go see the new action movie at the City Cinema at 7 PM. Would you like to come with me? Let me know!\nCheers,\nAlex', TRUE),

-- B1
('B1', 'opinion', 'City vs Countryside', 'Do you prefer living in the city or the countryside? Write a short essay explaining your reasons.', '["Give at least two reasons", "Use linking words like However, Furthermore"]', 80, 200, 'Personally, I prefer living in the city for several reasons. First, cities offer better job opportunities and career growth compared to rural areas. Furthermore, public transportation is very convenient, making it easy to travel without owning a car. However, I agree that the countryside is much quieter and has fresher air, which is better for health. Despite the noise and traffic, the city provides a more exciting lifestyle with cinemas, restaurants, and shopping malls.', TRUE),

-- B2
('B2', 'essay', 'Technology in Education', 'Some people think technology has a negative impact on students. Do you agree or disagree?', '["State your opinion clearly in the introduction", "Provide examples to support your points"]', 150, 300, 'The role of technology in education is a highly debated topic. While some argue that devices distract students, I firmly believe that technology has revolutionized learning in a positive way.\n\nFirst and foremost, the internet provides students with unlimited access to information. In the past, learning was restricted to textbooks and libraries, but today, learners can access thousands of educational videos, articles, and courses online. This enables them to explore subjects beyond the standard curriculum.\n\nSecondly, technology makes learning more interactive and engaging. Rather than just listening to lectures, students can use educational apps and simulations that clarify complex concepts. For instance, science students can perform virtual experiments that would be difficult or dangerous in a real lab.\n\nAdmittedly, excessive screen time and social media can be distracting. However, this issue can be managed if schools and parents teach students digital responsibility rather than banning technology altogether.\n\nIn conclusion, despite the potential for distraction, the benefits of technology in education far outweigh the drawbacks. It empowers students to learn more effectively and prepares them for a digital future.', TRUE),
('B2', 'report', 'Describing a Graph', 'Write a short report describing the main trends shown in a line graph about global temperatures over the last 50 years.', '["Use vocabulary for trends: increase, decrease, fluctuate", "Include specific data points"]', 100, 250, 'The line graph illustrates the changes in average global temperatures from 1970 to 2020. Overall, there has been a clear upward trend in global temperatures over the 50-year period.\n\nIn 1970, the average temperature stood at approximately 13.9°C. Over the next two decades, the temperature fluctuated slightly but showed a gradual rise, reaching about 14.1°C by 1990.\n\nHowever, from 1990 onwards, the increase became significantly steeper. By 2010, the global average had surged to 14.5°C. At the end of the period in 2020, the temperature hit a peak of nearly 14.8°C, representing an overall increase of almost 1 degree Celsius since 1970.\n\nIn summary, while the initial 20 years saw modest growth, the latter 30 years experienced a sharp acceleration in global warming.', TRUE),

-- C1
('C1', 'essay', 'The gig economy', 'The "gig economy" (freelance, short-term contracts) is replacing traditional full-time jobs. Discuss the advantages and disadvantages of this trend and give your own opinion.', '["Use advanced vocabulary", "Ensure a clear, logical structure with complex sentences"]', 250, 500, 'The modern workforce is undergoing a profound transformation, moving away from traditional permanent employment towards the "gig economy," characterized by short-term contracts and freelance work. This paradigm shift presents significant benefits for both workers and businesses, yet it also raises substantial concerns regarding job security.\n\nOne of the most compelling advantages of the gig economy is the unprecedented flexibility it affords individuals. Freelancers can dictate their own schedules, choose projects that align with their interests, and often work remotely from anywhere in the world. This autonomy allows for a much healthier work-life balance compared to the rigid constraints of a conventional nine-to-five job. Concurrently, businesses benefit from this model as it provides them with an agile workforce. Companies can scale up or down rapidly depending on market demands without the long-term financial commitments associated with full-time staff.\n\nConversely, the most glaring detriment of the gig economy is the alarming lack of stability. Independent contractors are not entitled to standard employment benefits, such as paid sick leave, employer-sponsored health insurance, or pension contributions. The unpredictability of income can lead to financial anxiety, as individuals must constantly hustle to secure their next contract. Furthermore, the absence of collective bargaining power leaves gig workers vulnerable to exploitation and stagnation in wage growth.\n\nIn my view, while the gig economy champions flexibility and entrepreneurial spirit, it currently shifts too much risk onto the individual. Unless policymakers intervene to create a new regulatory framework that provides a safety net—perhaps through portable benefits that follow the worker rather than the job—the long-term viability of this model remains questionable. Ultimately, an ideal workforce should harmonize the agility of freelance work with the security of traditional employment.', TRUE)

ON CONFLICT DO NOTHING;
