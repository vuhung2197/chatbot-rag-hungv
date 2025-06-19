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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE user_highlighted_text ADD COLUMN translated_text TEXT;

ALTER TABLE user_highlighted_text ADD COLUMN approved TINYINT(1) DEFAULT 0;

DROP TABLE IF EXISTS knowledge_base;
-- Bảng cơ sở tri thức, lưu trữ các bài viết, tài liệu
CREATE TABLE knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE knowledge_base
ADD FULLTEXT(title, content);

ALTER TABLE knowledge_base ADD COLUMN embedding JSON NULL;

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  answered BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE unanswered_questions ADD COLUMN hash CHAR(64) NOT NULL UNIQUE AFTER question;

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
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS user_questions;
-- Bảng lưu trữ các câu hỏi của người dùng, có thể là câu hỏi chưa được trả lời hoặc đã được trả lời
CREATE TABLE user_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  question TEXT,
  bot_reply TEXT,
  is_answered BOOLEAN DEFAULT FALSE,
  is_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


