-- Tạo database chuẩn Unicode
CREATE DATABASE IF NOT EXISTS chatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE chatbot;

-- Góp ý/training
DROP TABLE IF EXISTS feedbacks;
CREATE TABLE feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    suggested_reply TEXT NOT NULL,
    explanation TEXT,
    approved BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS user_words;
-- Bảng từ vựng của người dùng (nếu cần)
CREATE TABLE user_words (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    word_en VARCHAR(100) NOT NULL,
    word_vi VARCHAR(255),
    type VARCHAR(20),
    example_en VARCHAR(255),
    example_vi VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS user_highlighted_text;
-- Bảng lưu trữ đoạn văn bản được người dùng đánh dấu
CREATE TABLE user_highlighted_text (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text TEXT NOT NULL,
    translated_text TEXT,
    approved TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS knowledge_base;
-- Bảng cơ sở tri thức, lưu trữ các bài viết, tài liệu
CREATE TABLE knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    embedding JSON NULL,
    FULLTEXT(title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS important_keywords;
-- Bảng từ khóa quan trọng, lưu trữ các từ khóa cần thiết cho việc tìm
CREATE TABLE important_keywords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS knowledge_chunks;
-- Bảng lưu trữ các đoạn văn bản nhỏ hơn từ cơ sở tri thức, có thể là các đoạn trích dẫn, câu hỏi thường gặp, v.v.
-- Mỗi chunk có thể liên kết với một bài viết trong knowledge_base
CREATE TABLE knowledge_chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT,
  title TEXT,
  content TEXT,
  embedding JSON,
  token_count INT,
  hash VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE UNIQUE INDEX idx_chunk_hash ON knowledge_chunks(hash);

DROP TABLE IF EXISTS unanswered_questions;
-- Bảng lưu trữ các câu hỏi chưa được trả lời, có thể là câu hỏi từ người dùng hoặc từ hệ thống
CREATE TABLE unanswered_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  hash CHAR(64) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  answered BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS conversation_sessions;
-- Bảng lưu trữ các phiên trò chuyện, mỗi phiên có thể chứa nhiều tin nhắn và phản hồi
CREATE TABLE conversation_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message TEXT,
    reply TEXT,
    mode_chat VARCHAR(32),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS users;
-- Bảng người dùng, lưu trữ thông tin người dùng, có thể là người dùng thường hoặc quản trị viên
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NULL,
  avatar_url VARCHAR(255) NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  bio TEXT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  language VARCHAR(10) NOT NULL DEFAULT 'vi',
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  email_verification_token VARCHAR(64) NULL,
  password_hash TEXT NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  last_login_at TIMESTAMP NULL,
  account_status ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email_verified (email_verified),
  INDEX idx_users_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS user_questions;
-- Bảng lưu trữ các câu hỏi của người dùng, có thể là câu hỏi chưa được trả lời hoặc đã được trả lời
CREATE TABLE user_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  conversation_id VARCHAR(36) NULL,
  conversation_title VARCHAR(255) NULL,
  question TEXT,
  bot_reply TEXT,
  is_answered BOOLEAN DEFAULT FALSE,
  is_reviewed BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_user_archived (user_id, is_archived),
  INDEX idx_user_pinned (user_id, is_pinned)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS writing_sessions;
-- Bảng lưu trữ các phiên viết của người dùng, có thể là các bài viết, đoạn văn bản, v.v.
CREATE TABLE writing_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  topic VARCHAR(255),
  content TEXT NOT NULL,
  feedback TEXT,            -- phản hồi của bot
  score TINYINT,            -- điểm từ 1 đến 10
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE google_tokens (
  email            VARCHAR(320) NOT NULL PRIMARY KEY,        -- RFC-5321 max
  tokens_encrypted BLOB         NOT NULL,                    -- ~65 KB, dư cho token
  access_token_expires_at TIMESTAMP NULL,
  refresh_token_encrypted BLOB NULL,
  refresh_attempts INT DEFAULT 0,
  last_refresh_at TIMESTAMP NULL,
  updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_token_expiry (access_token_expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ==========================================
-- Phase 1.2: Enhanced Authentication Schema
-- ==========================================

-- 1. User Sessions Table
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `device_info` VARCHAR(255) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_token_hash` (`token_hash`),
  INDEX `idx_expires_at` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. User OAuth Providers Table
CREATE TABLE IF NOT EXISTS `user_oauth_providers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `provider` ENUM('google', 'github', 'microsoft') NOT NULL,
  `provider_user_id` VARCHAR(255) NOT NULL,
  `provider_email` VARCHAR(255) NULL,
  `access_token_encrypted` BLOB NULL,
  `refresh_token_encrypted` BLOB NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_provider_user` (`provider`, `provider_user_id`),
  INDEX `idx_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `expires_at` TIMESTAMP NOT NULL,
  `used` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_token` (`token`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_expires_at` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

-- 3. User Preferences (for Dark Mode and other settings)
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  preferences JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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



-- ============================================
-- GAME SYSTEM: SIC BO
-- ============================================


