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
