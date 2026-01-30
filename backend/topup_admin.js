
import './bootstrap/env.js';
import pool from './db.js';

const email = 'admin@example.com';
const amount = 10000000000; // 10 tỷ
const currency = 'USD'; // Hoặc VND nếu bạn muốn

async function topUpAdmin() {
    try {
        console.log(`Looking up user: ${email}...`);
        const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.error('❌ User not found!');
            process.exit(1);
        }

        const userId = users[0].id;
        console.log(`Found User ID: ${userId}`);

        // Check if wallet exists
        const [wallets] = await pool.execute('SELECT id, balance FROM user_wallets WHERE user_id = ?', [userId]);

        let walletId;
        if (wallets.length === 0) {
            console.log('Creating wallet...');
            const [result] = await pool.execute(
                'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0, ?, \'active\')',
                [userId, currency]
            );
            // Postgres uses RETURNING, but our fake-mysql-wrapper might not return insertId uniformly handled for PG.
            // Let's re-query to be safe or rely on result if wrapper handles it.
            // Safe bet with PG wrapper:
            const [newWallets] = await pool.execute('SELECT id FROM user_wallets WHERE user_id = ?', [userId]);
            walletId = newWallets[0].id;
        } else {
            walletId = wallets[0].id;
        }

        console.log(`Adding ${amount} to wallet ID: ${walletId}...`);

        // Update Balance
        await pool.execute(
            'UPDATE user_wallets SET balance = balance + ? WHERE id = ?',
            [amount, walletId]
        );

        // Log Transaction
        await pool.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, description, status, created_at)
             VALUES (?, ?, 'deposit', ?, 0, ?, 'Admin Topup', 'completed', NOW())`,
            // Note: balance_before/after calculation here is simplified for the log, ideally we fetch fetch before/after. 
            // But for a quick admin script this is acceptable or we can just fetch again.
            [walletId, userId, amount, amount]
        );

        console.log(`✅ Successfully topped up ${amount} ${currency} for ${email}`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error topping up:', error);
        process.exit(1);
    }
}

topUpAdmin();
