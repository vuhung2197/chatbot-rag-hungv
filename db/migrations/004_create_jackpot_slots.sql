-- Create Jackpot Pool Table
CREATE TABLE IF NOT EXISTS jackpot_pools (
    id SERIAL PRIMARY KEY,
    game_type VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'SLOTS_CYBER'
    current_amount DECIMAL(20, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize Cyber Slots Jackpot if not exists (Seed: 1,000,000)
INSERT INTO jackpot_pools (game_type, current_amount)
VALUES ('SLOTS_CYBER', 1000000)
ON CONFLICT (game_type) DO NOTHING;

-- Create Game Sessions Table (Slots Specific)
-- game_sessions table (existing) assumes simple dice columns. 
-- Slots has a matrix (JSON), so we store it in metadata or extend table. 
-- Let's use 'metadata' column in game_sessions (if exists) or create a new dedicated table for detailed slot logs?
-- Let's stick to 'game_sessions' table, but slot result is complex.
-- The existing game_sessions table has dice1, dice2... specific to Dice games.
-- We can add a generic 'result_data' JSONB col to game_sessions or just create a specific slots table.
-- Let's create a specific table for cleaner architecture given the complexity of slots matrix.

CREATE TABLE IF NOT EXISTS game_slots_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(id),
    bet_amount DECIMAL(20, 2) NOT NULL,
    total_win DECIMAL(20, 2) NOT NULL,
    matrix JSONB NOT NULL, -- Store the 5x3 array
    is_jackpot BOOLEAN DEFAULT FALSE,
    server_seed VARCHAR(255),
    client_seed VARCHAR(255),
    nonce BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    currency VARCHAR(10) DEFAULT 'USD'
);

-- Index for history
CREATE INDEX IF NOT EXISTS idx_slots_user_created ON game_slots_sessions(user_id, created_at DESC);
