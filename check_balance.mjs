
import pool from './backend/db.js';

async function checkBalances() {
    console.log("💰 Checking All Wallet Balances...");
    const connection = await pool.getConnection();

    try {
        // Removed u.username
        const [rows] = await connection.query(`
            SELECT u.id, u.email, u.name, uw.balance, uw.currency 
            FROM users u 
            JOIN user_wallets uw ON u.id = uw.user_id
        `);

        console.table(rows.map(row => ({
            ID: row.id,
            Name: row.name,
            Email: row.email,
            Balance: parseFloat(row.balance).toLocaleString('vi-VN') + ' ' + row.currency
        })));

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

checkBalances();
