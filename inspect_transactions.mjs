
import pool from './backend/db.js';

async function inspectTransactions() {
    console.log("🔍 Inspecting Transactions...");
    const connection = await pool.getConnection();

    try {
        const [rows] = await connection.query(`
            SELECT id, type, amount, balance_before, balance_after, description 
            FROM wallet_transactions 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log(JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

inspectTransactions();
