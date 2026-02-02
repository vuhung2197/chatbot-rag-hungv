
import pool from './backend/db.js';

async function testInsertBauCua() {
    console.log("🧪 Testing Bau Cua Insert...");
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Try Insert Session
        console.log("👉 Inserting Session...");
        const sqlSession = `
            INSERT INTO game_sessions (game_type, dice1, dice2, dice3, total_score, result_type)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `;
        // Postgres uses $1, $2... NOT ?
        // MySQL uses ?

        // Check which DB driver is being used. 
        // If 'pg' driver, use $1. If 'mysql2', use ?.
        // backend/db.js will tell us.

        // Let's assume the previous code in controller used `?` ???
        // Wait! If the DB is Postgres, using `?` in queries will FAIL or be interpreted differently depending on library.
        // Let's check backend/db.js!

    } catch (error) {
        console.error("❌ Error:", error);
        await connection.rollback();
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}
