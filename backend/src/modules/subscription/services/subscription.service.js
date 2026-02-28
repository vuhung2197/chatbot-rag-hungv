import pool from '#db';
import currencyService from '#services/currencyService.js';

class SubscriptionService {
    async getTiers() {
        const [tiers] = await pool.execute(
            'SELECT * FROM subscription_tiers ORDER BY price_monthly ASC'
        );
        return tiers;
    }

    async getCurrentSubscription(userId) {
        const [subscriptions] = await pool.execute(
            `SELECT 
        us.*,
        st.name as tier_name,
        st.display_name as tier_display_name,
        st.price_monthly,
        st.price_yearly,
        st.features,
        st.max_file_size_mb,
        st.max_chat_history_days
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ? AND us.status IN ('active', 'trial')
       ORDER BY us.created_at DESC
       LIMIT 1`,
            [userId]
        );

        if (subscriptions.length === 0) {
            // Return free tier as default
            const [freeTier] = await pool.execute(
                'SELECT * FROM subscription_tiers WHERE name = ?',
                ['free']
            );

            if (freeTier.length > 0) {
                return {
                    subscription: null,
                    tier: freeTier[0],
                    isFree: true
                };
            }

            return null; // No subscription found
        }

        const subscription = subscriptions[0];
        // Handle both JSON string and object
        if (typeof subscription.features === 'string') {
            try {
                subscription.features = JSON.parse(subscription.features || '{}');
            } catch (e) {
                console.error('Error parsing features JSON:', e);
                subscription.features = {};
            }
        } else if (!subscription.features || typeof subscription.features !== 'object') {
            subscription.features = {};
        }

        return {
            subscription,
            tier: {
                name: subscription.tier_name,
                display_name: subscription.tier_display_name,
                price_monthly: subscription.price_monthly,
                price_yearly: subscription.price_yearly,
                features: subscription.features,
                max_file_size_mb: subscription.max_file_size_mb,
                max_chat_history_days: subscription.max_chat_history_days
            },
            isFree: subscription.tier_name === 'free'
        };
    }

    async getInvoices(userId) {
        const [subscriptions] = await pool.execute(
            `SELECT 
        us.*,
        st.name as tier_name,
        st.display_name as tier_display_name,
        st.price_monthly,
        st.price_yearly,
        st.features
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ?
       ORDER BY us.created_at DESC
       LIMIT 50`,
            [userId]
        );

        const invoices = subscriptions.map((sub) => {
            const price = sub.billing_cycle === 'yearly'
                ? (sub.price_yearly || sub.price_monthly * 12)
                : sub.price_monthly;

            return {
                id: sub.id,
                invoice_number: `INV-${sub.id.toString().padStart(6, '0')}`,
                tier_name: sub.tier_name,
                tier_display_name: sub.tier_display_name,
                amount: Number(price) || 0,
                billing_cycle: sub.billing_cycle,
                status: sub.status,
                period_start: sub.current_period_start,
                period_end: sub.current_period_end,
                created_at: sub.created_at,
                paid_at: sub.status === 'active' ? sub.created_at : null,
                stripe_subscription_id: sub.stripe_subscription_id,
                stripe_customer_id: sub.stripe_customer_id
            };
        });

        return invoices;
    }

    async setAutoRenew(userId, autoRenew) {
        await pool.execute(
            `UPDATE user_subscriptions 
             SET auto_renew = ? 
             WHERE user_id = ? AND status IN ('active', 'trial')`,
            [autoRenew ? 1 : 0, userId]
        );
        return { message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`, autoRenew };
    }

    async cancelSubscription(userId) {
        await pool.execute(
            `UPDATE user_subscriptions 
       SET cancel_at_period_end = TRUE
       WHERE user_id = ? AND status = 'active'`,
            [userId]
        );
        return { message: 'Subscription will be cancelled at period end' };
    }

    async renewSubscription(userId) {
        await pool.execute(
            `UPDATE user_subscriptions 
       SET cancel_at_period_end = FALSE
       WHERE user_id = ? AND status = 'active'`,
            [userId]
        );
        return { message: 'Subscription renewed successfully' };
    }

    /**
     * Upgrade subscription with wallet payment (Transactional)
     */
    async upgradeSubscription(userId, tierName, billingCycle = 'monthly') {
        const connection = await pool.getConnection();

        try {
            // Get tier
            const [tiers] = await connection.execute(
                'SELECT * FROM subscription_tiers WHERE name = ?',
                [tierName]
            );

            if (tiers.length === 0) {
                throw new Error('Tier not found');
            }

            const tier = tiers[0];

            // Calculate price based on billing cycle
            const price = billingCycle === 'yearly'
                ? (tier.price_yearly || tier.price_monthly * 12)
                : tier.price_monthly;

            // Get current subscription to check tier order and stacking
            const [currentSubs] = await connection.execute(
                `SELECT st.name as tier_name, st.price_monthly, us.current_period_end, us.tier_id
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ? AND us.status IN ('active', 'trial')
       ORDER BY us.current_period_end DESC
       LIMIT 1`,
                [userId]
            );

            const tierOrder = {
                'free': 0,
                'pro': 1,
                'team': 2,
                'enterprise': 3
            };

            let currentTierName = 'free';
            let activeSub = null;
            if (currentSubs.length > 0) {
                activeSub = currentSubs[0];
                currentTierName = activeSub.tier_name;
            } else {
                const [users] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
                if (users.length === 0) {
                    throw new Error('User not found');
                }
            }

            const currentTierOrder = tierOrder[currentTierName] || 0;
            const newTierOrder = tierOrder[tierName] || 0;

            // Allow same tier (extension/cycle change) but block downgrade
            if (newTierOrder < currentTierOrder) {
                throw new Error('Cannot downgrade. Please cancel your current subscription first.');
            }

            // ===== WALLET PAYMENT INTEGRATION =====

            // Get user wallet
            const [wallets] = await connection.execute(
                'SELECT * FROM user_wallets WHERE user_id = ?',
                [userId]
            );

            if (wallets.length === 0) {
                throw new Error('Wallet not found');
            }

            const wallet = wallets[0];

            // Check if wallet has sufficient balance
            let purchaseAmount = price; // Tier price is in USD
            if (wallet.currency !== 'USD') {
                purchaseAmount = currencyService.convertCurrency(price, 'USD', wallet.currency);
            }

            if (parseFloat(wallet.balance) < purchaseAmount) {
                // Return structured error
                const error = new Error('Insufficient balance');
                error.details = {
                    required: purchaseAmount,
                    available: parseFloat(wallet.balance),
                    currency: wallet.currency
                };
                throw error;
            }

            // Begin database transaction
            await connection.beginTransaction();

            try {
                // Lock wallet for update
                const [lockedWallets] = await connection.execute(
                    'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
                    [wallet.id]
                );

                const lockedWallet = lockedWallets[0];
                const newBalance = parseFloat(lockedWallet.balance) - purchaseAmount;

                // Update wallet balance
                await connection.execute(
                    'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                    [newBalance, wallet.id]
                );

                // Create wallet transaction record
                await connection.execute(
                    `INSERT INTO wallet_transactions 
         (wallet_id, user_id, type, amount, balance_before, balance_after, status, payment_method, description, metadata)
         VALUES (?, ?, 'subscription', ?, ?, ?, 'completed', 'wallet', ?, ?)`,
                    [
                        wallet.id,
                        userId,
                        -price, // Save base price in USD to amount column for consistency
                        lockedWallet.balance,
                        newBalance,
                        `Subscription upgrade to ${tier.display_name} (${billingCycle})`,
                        JSON.stringify({
                            tier_name: tierName,
                            tier_display_name: tier.display_name,
                            billing_cycle: billingCycle,
                            price_usd: price,
                            amount_deducted: purchaseAmount,
                            currency: wallet.currency,
                            upgraded_at: new Date().toISOString()
                        })
                    ]
                );

                // Cancel existing subscription if any
                if (currentSubs.length > 0) {
                    await connection.execute(
                        `UPDATE user_subscriptions 
           SET status = 'cancelled', cancel_at_period_end = FALSE
           WHERE user_id = ? AND status IN ('active', 'trial')`,
                        [userId]
                    );
                }

                // Period calculation logic
                let periodStart = new Date();

                // If stacking (same tier), start from the end of the current period
                if (activeSub && activeSub.tier_id === tier.id) {
                    const existingEnd = new Date(activeSub.current_period_end);
                    // If current subscription is still active, start new period after it ends
                    if (existingEnd > periodStart) {
                        periodStart = existingEnd;
                    }
                }

                const periodEnd = new Date(periodStart);
                if (billingCycle === 'yearly') {
                    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                } else {
                    periodEnd.setMonth(periodEnd.getMonth() + 1);
                }

                await connection.execute(
                    `INSERT INTO user_subscriptions 
                 (user_id, tier_id, status, billing_cycle, current_period_start, current_period_end, auto_renew)
                 VALUES (?, ?, 'active', ?, ?, ?, TRUE)`,
                    [userId, tier.id, billingCycle, periodStart, periodEnd]
                );

                await connection.commit();

                console.log(`✅ User ${userId} upgraded to tier: ${tierName}`);

                let features = {};
                if (tier.features) {
                    if (typeof tier.features === 'string') {
                        try {
                            features = JSON.parse(tier.features);
                        } catch (e) {
                            features = {};
                        }
                    } else if (typeof tier.features === 'object') {
                        features = tier.features;
                    }
                }

                return {
                    message: 'Subscription upgraded successfully',
                    tier: {
                        name: tier.name,
                        display_name: tier.display_name,
                        features
                    },
                    payment: {
                        amount: purchaseAmount,
                        currency: wallet.currency,
                        new_balance: newBalance,
                        billing_cycle: billingCycle
                    }
                };

            } catch (dbError) {
                await connection.rollback();
                if (dbError.code === 'ER_DUP_ENTRY' || dbError.errno === 1062 || dbError.code === '23505') {
                    const error = new Error('Subscription already exists. Please refresh the page.');
                    error.code = 409;
                    throw error;
                }
                throw dbError;
            }

        } finally {
            connection.release();
        }
    }
}

export default new SubscriptionService();
