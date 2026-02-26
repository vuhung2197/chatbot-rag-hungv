-- =============================================================================
-- Writing Practice Feature - Database Migration
-- Created: 2026-02-26
-- Description: Tables for writing exercises, submissions, streaks, vocabulary
-- =============================================================================

-- 1. Writing Exercises (Ngân hàng đề bài)
CREATE TABLE IF NOT EXISTS writing_exercises (
    id SERIAL PRIMARY KEY,
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('sentence','email','story','opinion','report','essay')),
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    hints JSONB DEFAULT '[]',
    min_words INT DEFAULT 10,
    max_words INT DEFAULT 500,
    sample_answer TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_we_level ON writing_exercises(level);
CREATE INDEX IF NOT EXISTS idx_we_type ON writing_exercises(type);
CREATE INDEX IF NOT EXISTS idx_we_active ON writing_exercises(is_active);

CREATE TRIGGER update_writing_exercises_updated_at
    BEFORE UPDATE ON writing_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Writing Submissions (Bài nộp của user)
CREATE TABLE IF NOT EXISTS writing_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES writing_exercises(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    word_count INT NOT NULL DEFAULT 0,
    -- AI Scores (0-100)
    score_total DECIMAL(5,2),
    score_grammar DECIMAL(5,2),
    score_vocabulary DECIMAL(5,2),
    score_coherence DECIMAL(5,2),
    score_task DECIMAL(5,2),
    -- AI Feedback
    feedback JSONB DEFAULT '{}',
    new_words JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted','grading','graded','error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ws_user ON writing_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_exercise ON writing_submissions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_ws_user_created ON writing_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_status ON writing_submissions(status);

-- 3. Writing Streaks (Streak tracking)
CREATE TABLE IF NOT EXISTS writing_streaks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_writing_date DATE,
    streak_freezes_remaining INT DEFAULT 1,
    streak_freezes_used INT DEFAULT 0,
    total_writings INT DEFAULT 0,
    total_words_written INT DEFAULT 0,
    avg_score DECIMAL(5,2) DEFAULT 0,
    badges JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_writing_streaks_updated_at
    BEFORE UPDATE ON writing_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. User Vocabulary (Sổ từ vựng)
CREATE TABLE IF NOT EXISTS user_vocabulary (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    source_id INT,
    level VARCHAR(2) CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    mastery INT DEFAULT 0 CHECK (mastery >= 0 AND mastery <= 5),
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_uv_user ON user_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_uv_review ON user_vocabulary(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_uv_mastery ON user_vocabulary(user_id, mastery);

CREATE TRIGGER update_user_vocabulary_updated_at
    BEFORE UPDATE ON user_vocabulary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- End of Writing Practice Migration
