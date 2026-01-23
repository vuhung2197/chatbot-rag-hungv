-- ============================================
-- PostgreSQL Schema: 004 - Subscriptions & Usage
-- Converted from MySQL init.sql
-- ============================================

-- ============================================
-- Subscription Tiers
-- ============================================

DROP TABLE IF EXISTS subscription_tiers CASCADE;
CREATE TABLE subscription_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2) NULL,
    features JSONB NOT NULL,  -- JSON -> JSONB for better indexing
    max_file_size_mb INTEGER DEFAULT 1,
    max_chat_history_days INTEGER DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER update_subscription_tiers_updated_at
    BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- GIN index for JSONB features column (enables fast queries on JSON properties)
CREATE INDEX idx_subscription_tiers_features ON subscription_tiers USING GIN(features);

-- ============================================
-- Insert Default Tiers
-- ============================================

INSERT INTO subscription_tiers (name, display_name, price_monthly, price_yearly, features, max_file_size_mb, max_chat_history_days)
VALUES
('free', 'Free', 0.00, 0.00, 
 '{"queries_per_day": 50, "advanced_rag": false, "file_upload_mb": 1, "chat_history_days": 7, "priority_support": false, "api_access": false, "team_collaboration": false}'::jsonb,
 1, 7),
('pro', 'Pro', 9.99, 99.99, 
 '{"queries_per_day": -1, "advanced_rag": true, "file_upload_mb": 10, "chat_history_days": -1, "priority_support": true, "api_access": false, "team_collaboration": false}'::jsonb,
 10, -1),
('team', 'Team', 29.99, 299.99, 
 '{"queries_per_day": -1, "advanced_rag": true, "file_upload_mb": 50, "chat_history_days": -1, "priority_support": true, "api_access": true, "team_collaboration": true}'::jsonb,
 50, -1)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    features = EXCLUDED.features,
    max_file_size_mb = EXCLUDED.max_file_size_mb,
    max_chat_history_days = EXCLUDED.max_chat_history_days;

-- ============================================
-- User Subscriptions
-- ============================================

DROP TABLE IF EXISTS user_subscriptions CASCADE;
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tier_id INTEGER NOT NULL,
    status subscription_status DEFAULT 'trial',  -- Using ENUM type
    billing_cycle billing_cycle_type DEFAULT 'monthly',  -- Using ENUM type
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_subscription_id VARCHAR(255) NULL,
    stripe_customer_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_subscription_tier FOREIGN KEY (tier_id) 
        REFERENCES subscription_tiers(id)
);

-- Indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- User Usage Tracking
-- ============================================

DROP TABLE IF EXISTS user_usage CASCADE;
CREATE TABLE user_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    queries_count INTEGER DEFAULT 0,
    advanced_rag_count INTEGER DEFAULT 0,
    file_uploads_count INTEGER DEFAULT 0,
    file_uploads_size_mb DECIMAL(10, 2) DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usage_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Indexes
CREATE INDEX idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX idx_user_usage_date ON user_usage(date);

-- Trigger for updated_at
CREATE TRIGGER update_user_usage_updated_at
    BEFORE UPDATE ON user_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Usage Limits (Reference table)
-- ============================================

DROP TABLE IF EXISTS usage_limits CASCADE;
CREATE TABLE usage_limits (
    id SERIAL PRIMARY KEY,
    tier_id INTEGER NOT NULL,
    limit_type VARCHAR(50) NOT NULL,  -- 'queries_per_day', 'file_size_mb', etc.
    limit_value INTEGER NOT NULL,  -- -1 means unlimited
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_limits_tier FOREIGN KEY (tier_id) 
        REFERENCES subscription_tiers(id),
    CONSTRAINT unique_tier_limit UNIQUE (tier_id, limit_type)
);

-- ============================================
-- Populate Usage Limits from Subscription Tiers
-- ============================================

-- Note: In PostgreSQL, we need to cast JSONB to text/int for extraction
INSERT INTO usage_limits (tier_id, limit_type, limit_value)
SELECT 
    id, 
    'queries_per_day', 
    (features->>'queries_per_day')::int
FROM subscription_tiers
ON CONFLICT (tier_id, limit_type) DO UPDATE 
    SET limit_value = EXCLUDED.limit_value;

INSERT INTO usage_limits (tier_id, limit_type, limit_value)
SELECT 
    id, 
    'file_size_mb', 
    max_file_size_mb
FROM subscription_tiers
ON CONFLICT (tier_id, limit_type) DO UPDATE 
    SET limit_value = EXCLUDED.limit_value;

-- ============================================
-- View: Current User Subscriptions
-- ============================================

DROP VIEW IF EXISTS v_user_subscriptions CASCADE;
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

-- ============================================
-- Function: Auto-assign free tier to new users
-- ============================================

CREATE OR REPLACE FUNCTION assign_free_tier_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_tier_id INTEGER;
BEGIN
    -- Get free tier ID
    SELECT id INTO free_tier_id 
    FROM subscription_tiers 
    WHERE name = 'free' 
    LIMIT 1;
    
    -- Insert subscription for new user
    IF free_tier_id IS NOT NULL THEN
        INSERT INTO user_subscriptions 
            (user_id, tier_id, status, billing_cycle, current_period_start, current_period_end)
        VALUES 
            (NEW.id, free_tier_id, 'active', 'monthly', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year')
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign free tier when user is created
CREATE TRIGGER assign_free_tier_on_user_create
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION assign_free_tier_to_new_user();

-- ============================================
-- Notes:
-- - Changed ON DUPLICATE KEY UPDATE to ON CONFLICT DO UPDATE (PostgreSQL syntax)
-- - Used JSONB instead of JSON for better performance
-- - Added GIN index on JSONB column for faster queries
-- - Changed ENUM to proper PostgreSQL ENUM types
-- - Created trigger to auto-assign free tier (replaces INSERT...SELECT)
-- - Added proper foreign key naming
-- - JSON extraction syntax: features->>'key' (returns text) or features->'key' (returns jsonb)
-- ============================================
