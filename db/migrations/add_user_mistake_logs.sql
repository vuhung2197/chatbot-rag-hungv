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
