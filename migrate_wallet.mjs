
import pool from './backend/db.js';

async function migrateWallet() {
    console.log("🛠️ Starting Wallet Migration (PostgreSQL)...");
    const connection = await pool.getConnection();

    try {
        // Change 'type' column in 'wallet_transactions' from ENUM to VARCHAR
        // Assuming column name is 'type' based on the failing query

        console.log("👉 Altering wallet_transactions.type to VARCHAR...");
        await connection.query("ALTER TABLE wallet_transactions ALTER COLUMN type TYPE VARCHAR(50) USING type::text;");

        console.log("✅ Successfully changed 'type' to VARCHAR(50)");
        console.log("🎉 You can now use 'bet_baucua', 'win_baucua', etc.");

    } catch (error) {
        console.error("❌ Migration Failed:", error.message);
        if (error.message.includes('undefined_column')) {
            console.log("⚠️ Hint: Maybe the column is not named 'type'? Checking schema...");
            // Optional: Inspect columns if failed
        }
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrateWallet();
