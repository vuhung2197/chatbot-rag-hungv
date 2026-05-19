import pool from '#db';

const subscriptionRepository = {
    async getAllTiers() {
        const [rows] = await pool.execute(
            'SELECT * FROM subscription_tiers ORDER BY price_monthly ASC'
        );
        return rows;
    },

    async getTierByName(name) {
        const [rows] = await pool.execute(
            'SELECT * FROM subscription_tiers WHERE name = ?',
            [name]
        );
        return rows[0] || null;
    },

    async getActiveSubscription(userId) {
        const [rows] = await pool.execute(
            `SELECT us.*, st.name as tier_name, st.display_name as tier_display_name,
             st.price_monthly, st.price_yearly, st.features,
             st.max_file_size_mb, st.max_chat_history_days
             FROM user_subscriptions us
             JOIN subscription_tiers st ON us.tier_id = st.id
             WHERE us.user_id = ? AND us.status IN ('active', 'trial')
             ORDER BY us.created_at DESC
             LIMIT 1`,
            [userId]
        );
        return rows[0] || null;
    },

    async getSubscriptionHistory(userId, limit = 50) {
        const [rows] = await pool.execute(
            `SELECT us.*, st.name as tier_name, st.display_name as tier_display_name,
             st.price_monthly, st.price_yearly, st.features
             FROM user_subscriptions us
             JOIN subscription_tiers st ON us.tier_id = st.id
             WHERE us.user_id = ?
             ORDER BY us.created_at DESC
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    },

    async setAutoRenew(userId, autoRenew) {
        await pool.execute(
            `UPDATE user_subscriptions SET auto_renew = ? WHERE user_id = ? AND status IN ('active', 'trial')`,
            [autoRenew ? 1 : 0, userId]
        );
    },

    async cancelSubscription(userId) {
        await pool.execute(
            `UPDATE user_subscriptions SET cancel_at_period_end = TRUE WHERE user_id = ? AND status = 'active'`,
            [userId]
        );
    },

    async renewSubscription(userId) {
        await pool.execute(
            `UPDATE user_subscriptions SET cancel_at_period_end = FALSE WHERE user_id = ? AND status = 'active'`,
            [userId]
        );
    },

    // Full atomic upgrade: lock wallet, deduct, cancel old, create new subscription
    async upgradeSubscription({ userId, tier, billingCycle, wallet, price, purchaseAmount, periodStart, periodEnd }) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Lock wallet row to prevent race conditions
            const [lockedWallets] = await connection.execute(
                'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
                [wallet.id]
            );
            const lockedWallet = lockedWallets[0];
            const newBalance = parseFloat(lockedWallet.balance) - purchaseAmount;

            await connection.execute(
                'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newBalance, wallet.id]
            );

            await connection.execute(
                `INSERT INTO wallet_transactions
                 (wallet_id, user_id, type, amount, balance_before, balance_after, status, payment_method, description, metadata)
                 VALUES (?, ?, 'subscription', ?, ?, ?, 'completed', 'wallet', ?, ?)`,
                [
                    wallet.id, userId, -price,
                    lockedWallet.balance, newBalance,
                    `Subscription upgrade to ${tier.display_name} (${billingCycle})`,
                    JSON.stringify({
                        tier_name: tier.name,
                        tier_display_name: tier.display_name,
                        billing_cycle: billingCycle,
                        price_usd: price,
                        amount_deducted: purchaseAmount,
                        currency: wallet.currency,
                        upgraded_at: new Date().toISOString(),
                    }),
                ]
            );

            await connection.execute(
                `UPDATE user_subscriptions SET status = 'cancelled', cancel_at_period_end = FALSE
                 WHERE user_id = ? AND status IN ('active', 'trial')`,
                [userId]
            );

            await connection.execute(
                `INSERT INTO user_subscriptions
                 (user_id, tier_id, status, billing_cycle, current_period_start, current_period_end, auto_renew)
                 VALUES (?, ?, 'active', ?, ?, ?, TRUE)`,
                [userId, tier.id, billingCycle, periodStart, periodEnd]
            );

            await connection.commit();
            return { newBalance };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async getWalletByUserId(userId) {
        const [rows] = await pool.execute(
            'SELECT * FROM user_wallets WHERE user_id = ?',
            [userId]
        );
        return rows[0] || null;
    },

    async findUserById(userId) {
        const [rows] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
        return rows[0] || null;
    },

    // Used inside upgradeSubscription flow to read active sub within connection scope
};

export default subscriptionRepository;
