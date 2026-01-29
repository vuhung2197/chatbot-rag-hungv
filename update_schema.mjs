
import pool from './backend/db.js';

async function updateSchema() {
    console.log("🛠️ Checking database schema for 'metadata' column...");
    const connection = await pool.getConnection();
    try {
        // PostgreSQL specific check
        const [columns] = await connection.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'game_bets' 
            AND column_name = 'metadata';
        `);

        if (columns.length === 0) {
            console.log("⚠️ Column 'metadata' missing in 'game_bets'. Adding it now...");
            // PostgreSQL syntax for adding JSONB column
            await connection.query(`
                ALTER TABLE game_bets
                ADD COLUMN metadata JSONB DEFAULT NULL;
            `);
            console.log("✅ Column 'metadata' added successfully!");
        } else {
            console.log("✅ Column 'metadata' already exists.");
        }

    } catch (error) {
        console.error("❌ Error updating schema:", error);
    } finally {
        if (connection) connection.release();
        console.log("👋 Done.");
        process.exit();
    }
}

updateSchema();
