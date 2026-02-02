
import pool from './backend/db.js';

async function updateSchema() {
    console.log("🛠️ Checking database schema...");
    const connection = await pool.getConnection();
    try {
        // Check if 'metadata' column exists in 'game_bets'
        // MySQL specific query
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'game_bets' 
            AND COLUMN_NAME = 'metadata';
        `);

        if (columns.length === 0) {
            console.log("⚠️ Column 'metadata' missing in 'game_bets'. Adding it now...");
            await connection.query(`
                ALTER TABLE game_bets
                ADD COLUMN metadata JSON DEFAULT NULL;
            `);
            console.log("✅ Column 'metadata' added successfully!");
        } else {
            console.log("✅ Column 'metadata' already exists.");
        }

    } catch (error) {
        console.error("❌ Error updating schema:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

updateSchema();
