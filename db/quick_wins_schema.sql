-- Quick Wins Database Schema
-- Usage Counter và Conversation Rename

-- 1. Usage Counter Table
CREATE TABLE IF NOT EXISTS user_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  queries_count INT DEFAULT 0,
  advanced_rag_count INT DEFAULT 0,
  file_uploads_count INT DEFAULT 0,
  file_uploads_size_mb DECIMAL(10, 2) DEFAULT 0,
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, date),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Conversation Management (Rename)
ALTER TABLE user_questions 
  ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(36) NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS conversation_title VARCHAR(255) NULL AFTER conversation_id,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE AFTER is_reviewed,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE AFTER is_archived,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Add indexes for conversation management
CREATE INDEX IF NOT EXISTS idx_conversation_id ON user_questions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_archived ON user_questions(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_user_pinned ON user_questions(user_id, is_pinned);

-- 3. User Preferences (for Dark Mode and other settings)
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  preferences JSON NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Default preferences structure:
-- {
--   "theme": "auto", // "light" | "dark" | "auto"
--   "font_size": "medium",
--   "layout": "comfortable"
-- }

