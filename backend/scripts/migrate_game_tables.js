
import pool from '../db.js';

async function migrate() {
    const client = await pool.getConnection();
    try {
        console.log('Starting migration for Game Tables...');

        // 1. Create game_sessions table
        const createSessionsQuery = `
            CREATE TABLE IF NOT EXISTS game_sessions (
                id SERIAL PRIMARY KEY,
                game_type VARCHAR(50) DEFAULT 'TAI_XIU',
                dice1 SMALLINT NOT NULL,
                dice2 SMALLINT NOT NULL,
                dice3 SMALLINT NOT NULL,
                total_score SMALLINT NOT NULL,
                result_type VARCHAR(20) NOT NULL CHECK (result_type IN ('TAI', 'XIU', 'TRIPLE')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await client.query(createSessionsQuery);
        console.log('✅ Checked/Created game_sessions table.');

        // 2. Create game_bets table
        const createBetsQuery = `
            CREATE TABLE IF NOT EXISTS game_bets (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                session_id INT NOT NULL,
                bet_type VARCHAR(10) NOT NULL CHECK (bet_type IN ('TAI', 'XIU')),
                bet_amount DECIMAL(15, 2) NOT NULL,
                win_amount DECIMAL(15, 2) DEFAULT 0.00,
                status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_session FOREIGN KEY(session_id) REFERENCES game_sessions(id)
            );
        `;
        await client.query(createBetsQuery);
        console.log('✅ Checked/Created game_bets table.');

        // 3. Create indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_bets_user_id ON game_bets(user_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_bets_session_id ON game_bets(session_id);');
        console.log('✅ Indexes created.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        if (client) client.release();
        pool.end(); // Close connection to exit script
    }
}

migrate();
