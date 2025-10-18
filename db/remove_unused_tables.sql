-- Script để loại bỏ các bảng không cần thiết cho RAG thuần
USE chatbot;

-- Xóa bảng important_keywords (không cần cho RAG thuần)
DROP TABLE IF EXISTS important_keywords;

-- Xóa bảng algorithm_selections (nếu tồn tại)
DROP TABLE IF EXISTS algorithm_selections;

-- Xóa bảng algorithm_stats (nếu tồn tại) 
DROP TABLE IF EXISTS algorithm_stats;

-- Xóa cột mode từ user_questions (không cần nữa)
ALTER TABLE user_questions DROP COLUMN IF EXISTS mode;

-- Xóa cột embedding từ knowledge_base (chỉ dùng trong knowledge_chunks)
ALTER TABLE knowledge_base DROP COLUMN IF EXISTS embedding;

-- Xóa cột mode_chat từ conversation_sessions (nếu tồn tại)
ALTER TABLE conversation_sessions DROP COLUMN IF EXISTS mode_chat;

-- Tạo index cho performance
CREATE INDEX idx_knowledge_chunks_parent_id ON knowledge_chunks(parent_id);
CREATE INDEX idx_knowledge_chunks_created_at ON knowledge_chunks(created_at);
CREATE INDEX idx_user_questions_user_id ON user_questions(user_id);
CREATE INDEX idx_user_questions_created_at ON user_questions(created_at);

-- Xóa FULLTEXT index từ knowledge_base (không cần cho RAG thuần)
ALTER TABLE knowledge_base DROP INDEX title;
