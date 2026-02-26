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
