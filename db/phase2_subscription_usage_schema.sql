-- Phase 2: Subscription & Usage Tracking Schema
-- Created: 2024

-- ============================================
-- SUBSCRIPTION TIERS
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_tiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NULL,
  features JSON NOT NULL, -- {"queries_per_day": 50, "advanced_rag": false, ...}
  max_file_size_mb INT DEFAULT 1,
  max_chat_history_days INT DEFAULT 7,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default tiers
INSERT INTO subscription_tiers (name, display_name, price_monthly, price_yearly, features, max_file_size_mb, max_chat_history_days) VALUES
('free', 'Free', 0.00, 0.00, 
 '{"queries_per_day": 50, "advanced_rag": false, "file_upload_mb": 1, "chat_history_days": 7, "priority_support": false, "api_access": false, "team_collaboration": false}',
 1, 7),
('pro', 'Pro', 9.99, 99.99, 
 '{"queries_per_day": -1, "advanced_rag": true, "file_upload_mb": 10, "chat_history_days": -1, "priority_support": true, "api_access": false, "team_collaboration": false}',
 10, -1),
('team', 'Team', 29.99, 299.99, 
 '{"queries_per_day": -1, "advanced_rag": true, "file_upload_mb": 50, "chat_history_days": -1, "priority_support": true, "api_access": true, "team_collaboration": true}',
 50, -1)
ON DUPLICATE KEY UPDATE 
  display_name = VALUES(display_name),
  price_monthly = VALUES(price_monthly),
  price_yearly = VALUES(price_yearly),
  features = VALUES(features),
  max_file_size_mb = VALUES(max_file_size_mb),
  max_chat_history_days = VALUES(max_chat_history_days);

-- ============================================
-- USER SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tier_id INT NOT NULL,
  status ENUM('active', 'cancelled', 'expired', 'trial') DEFAULT 'trial',
  billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id VARCHAR(255) NULL,
  stripe_customer_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_period_end (current_period_end),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id)
);

-- Set default free tier for existing users
INSERT INTO user_subscriptions (user_id, tier_id, status, billing_cycle, current_period_start, current_period_end)
SELECT 
  id as user_id,
  (SELECT id FROM subscription_tiers WHERE name = 'free' LIMIT 1) as tier_id,
  'active' as status,
  'monthly' as billing_cycle,
  NOW() as current_period_start,
  DATE_ADD(NOW(), INTERVAL 1 YEAR) as current_period_end
FROM users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================
-- USAGE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS user_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  queries_count INT DEFAULT 0,
  advanced_rag_count INT DEFAULT 0,
  file_uploads_count INT DEFAULT 0,
  file_uploads_size_mb DECIMAL(10, 2) DEFAULT 0,
  tokens_used INT DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, date),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- USAGE LIMITS (for reference, limits are also in subscription_tiers.features)
-- ============================================

CREATE TABLE IF NOT EXISTS usage_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tier_id INT NOT NULL,
  limit_type VARCHAR(50) NOT NULL, -- 'queries_per_day', 'file_size_mb', ...
  limit_value INT NOT NULL, -- -1 means unlimited
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tier_limit (tier_id, limit_type),
  FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id)
);

-- Insert default limits (for easy querying, though limits are also in features JSON)
INSERT INTO usage_limits (tier_id, limit_type, limit_value)
SELECT id, 'queries_per_day', JSON_EXTRACT(features, '$.queries_per_day')
FROM subscription_tiers
ON DUPLICATE KEY UPDATE limit_value = VALUES(limit_value);

INSERT INTO usage_limits (tier_id, limit_type, limit_value)
SELECT id, 'file_size_mb', max_file_size_mb
FROM subscription_tiers
ON DUPLICATE KEY UPDATE limit_value = VALUES(limit_value);

-- ============================================
-- HELPER VIEW: Current User Subscription with Tier Info
-- ============================================

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

