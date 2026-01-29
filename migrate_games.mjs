
import pool from './backend/db.js';

async function migrate() {
    console.log("🛠️ Starting Database Migration for New Games (PostgreSQL)...");
    const connection = await pool.getConnection();

    try {
        // Postgres syntax: ALTER COLUMN column_name TYPE new_type USING column_name::text
        await connection.query("ALTER TABLE game_sessions ALTER COLUMN result_type TYPE VARCHAR(50) USING result_type::text;");
        console.log("✅ Modified game_sessions.result_type to VARCHAR(50)");

        await connection.query("ALTER TABLE game_bets ALTER COLUMN bet_type TYPE VARCHAR(50) USING bet_type::text;");
        console.log("✅ Modified game_bets.bet_type to VARCHAR(50)");

        console.log("🎉 Migration Completed Successfully!");
    } catch (error) {
        console.error("❌ Migration Failed:", error.message);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
