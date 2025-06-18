-- Tạo database chuẩn Unicode
CREATE DATABASE IF NOT EXISTS chatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE chatbot;

-- Bảng từ điển Anh-Việt
DROP TABLE IF EXISTS dictionary;
CREATE TABLE dictionary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    word_en VARCHAR(100) NOT NULL,
    word_vi VARCHAR(255) NOT NULL,
    type VARCHAR(20),         -- ví dụ: noun, verb, adj, adv
    example_en VARCHAR(255),
    example_vi VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Bảng câu ví dụ
DROP TABLE IF EXISTS sentence_examples;
CREATE TABLE sentence_examples (
    id INT AUTO_INCREMENT PRIMARY KEY,
    word_en VARCHAR(255) NOT NULL,
    sentence_en TEXT NOT NULL,
    sentence_vi TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Log các câu/từ chưa hiểu
DROP TABLE IF EXISTS unknown_queries;
CREATE TABLE unknown_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Lịch sử chat
DROP TABLE IF EXISTS chat_history;
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    reply TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
    user_id INT, -- nếu muốn đa user, không thì bỏ
    word_en VARCHAR(100) NOT NULL,
    word_vi VARCHAR(255),
    type VARCHAR(20),
    example_en VARCHAR(255),
    example_vi VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS user_highlighted_text;
CREATE TABLE user_highlighted_text (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE user_highlighted_text ADD COLUMN translated_text TEXT;

ALTER TABLE user_highlighted_text ADD COLUMN approved TINYINT(1) DEFAULT 0;

DROP TABLE IF EXISTS knowledge_base;
CREATE TABLE knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE knowledge_base
ADD FULLTEXT(title, content);

ALTER TABLE knowledge_base ADD COLUMN embedding JSON NULL;

CREATE TABLE important_keywords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE knowledge_chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT, -- trỏ về bảng knowledge_base nếu cần
  title TEXT,
  content TEXT,
  embedding JSON,
  token_count INT,
  hash VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE UNIQUE INDEX idx_chunk_hash ON knowledge_chunks(hash);

CREATE TABLE unanswered_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  answered BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE unanswered_questions ADD COLUMN hash CHAR(64) NOT NULL UNIQUE AFTER question;

CREATE TABLE conversation_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message TEXT,
    reply TEXT,
    mode_chat VARCHAR(32),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE user_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  question TEXT,
  bot_reply TEXT,
  is_answered BOOLEAN DEFAULT FALSE,
  is_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


