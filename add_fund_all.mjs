
import pool from './backend/db.js';

const AMOUNT_TO_ADD = 10000000000; // 10 Billion

async function addFundToAll() {
    console.log("💰 Adding 10 BILLION to ALL users...");
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get all users
        const [users] = await connection.execute("SELECT id, name, email FROM users");

        if (users.length === 0) {
            console.log("⚠️ No users found in DB.");
            return;
        }

        console.log(`found ${users.length} users.`);

        for (const user of users) {
            // Find or Create Wallet
            let [wallets] = await connection.execute(
                "SELECT id, balance, currency FROM user_wallets WHERE user_id = ?",
                [user.id]
            );

            let walletId;
            let currentBalance = 0;

            if (wallets.length === 0) {
                const [res] = await connection.execute(
                    "INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0, 'VND', 'active') RETURNING id",
                    [user.id]
                );
                walletId = res[0].id;
            } else {
                walletId = wallets[0].id;
                currentBalance = parseFloat(wallets[0].balance);
            }

            // Update Balance
            const newBalance = currentBalance + AMOUNT_TO_ADD;
            await connection.execute(
                "UPDATE user_wallets SET balance = ? WHERE id = ?",
                [newBalance, walletId]
            );

            console.log(`✅ Added to ${user.name || user.email}: New Balance = ${newBalance.toLocaleString()}`);
        }

        await connection.commit();
        console.log("🎉 DONE! Everyone is rich now.");

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

addFundToAll();
