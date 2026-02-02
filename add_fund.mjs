
import pool from './backend/db.js';

const AMOUNT_TO_ADD = 10000000000; // 10 Billion

async function addAdminFund() {
    console.log("💰 Adding funds to Admin wallet...");
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Find Admin
        const [admins] = await connection.execute(
            "SELECT id, name, email FROM users WHERE role = 'admin' LIMIT 1"
        );

        if (admins.length === 0) {
            console.error("❌ No admin user found!");
            await connection.rollback();
            return;
        }

        const admin = admins[0];
        console.log(`👤 Found Admin: ${admin.name} (${admin.email}) (ID: ${admin.id})`);

        // 2. Find Admin Wallet
        const [wallets] = await connection.execute(
            "SELECT id, balance, currency FROM user_wallets WHERE user_id = ? FOR UPDATE",
            [admin.id]
        );

        let walletId;
        let currentBalance = 0;
        let currency = 'USD';

        if (wallets.length === 0) {
            console.log("⚠️ Admin has no wallet. Creating one...");
            const [result] = await connection.execute(
                "INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0, 'VND', 'active') RETURNING id",
                [admin.id]
            );
            walletId = result[0].id;
            currency = 'VND'; // Default to VND if creating new
        } else {
            const w = wallets[0];
            walletId = w.id;
            currentBalance = parseFloat(w.balance);
            currency = w.currency;
        }

        console.log(`💼 Wallet: ${currency} | Current Balance: ${currentBalance.toLocaleString()}`);

        // 3. Update Balance
        const newBalance = currentBalance + AMOUNT_TO_ADD;

        await connection.execute(
            "UPDATE user_wallets SET balance = ? WHERE id = ?",
            [newBalance, walletId]
        );

        // 4. Log Transaction
        await connection.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
             VALUES (?, ?, 'deposit', ?, ?, ?, ?, 'completed')`,
            [walletId, admin.id, AMOUNT_TO_ADD, currentBalance, newBalance, 'Admin System Deposit (10B)']
        );

        await connection.commit();
        console.log(`✅ SUCCESS! Added ${AMOUNT_TO_ADD.toLocaleString()} ${currency} to Admin.`);
        console.log(`💰 New Balance: ${newBalance.toLocaleString()} ${currency}`);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("❌ Error adding funds:", error.message);
        if (error.message.includes('Out of range') || error.message.includes('numeric field overflow')) {
            console.error("💡 Hint: The database column 'balance' might be too small (e.g., DECIMAL(10,2)). You need DECIMAL(20,2).");
        }
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

addAdminFund();
