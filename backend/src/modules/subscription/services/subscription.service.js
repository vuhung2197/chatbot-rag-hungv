import pool from '#db';
import currencyService from '#services/currencyService.js';

// ─── Helper: Safe parse features JSON ───
function parseFeatures(rawFeatures) {
    if (typeof rawFeatures === 'string') {
        try { return JSON.parse(rawFeatures || '{}'); }
        catch (e) { console.error('Error parsing features JSON:', e); return {}; }
    }
    if (rawFeatures && typeof rawFeatures === 'object') return rawFeatures;
    return {};
}

// ─── Helper: Tier ordering ───
const TIER_ORDER = { free: 0, pro: 1, team: 2, enterprise: 3 };

// ─── Helper: Calculate period dates ───
function calculatePeriodDates(billingCycle, activeSub, tier) {
    let periodStart = new Date();

    // If stacking (same tier), start from end of current period
    if (activeSub && activeSub.tier_id === tier.id) {
        const existingEnd = new Date(activeSub.current_period_end);
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

    return { periodStart, periodEnd };
}

// ─── Helper: Calculate purchase amount in wallet currency ───
function calculatePurchaseAmount(price, walletCurrency) {
    if (walletCurrency !== 'USD') {
        return currencyService.convertCurrency(price, 'USD', walletCurrency);
    }
    return price;
}

// ─── Helper: Validate sufficient balance ───
function validateBalance(walletBalance, purchaseAmount, walletCurrency) {
    if (parseFloat(walletBalance) < purchaseAmount) {
        const error = new Error('Insufficient balance');
        error.details = {
            required: purchaseAmount,
            available: parseFloat(walletBalance),
            currency: walletCurrency
        };
        throw error;
    }
}

// ─── Helper: Process wallet deduction and create transaction ───
async function processWalletPayment(connection, { wallet, userId, price, purchaseAmount, tier, tierName, billingCycle }) {
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

    return { lockedWallet, newBalance };
}

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
            const [freeTier] = await pool.execute(
                'SELECT * FROM subscription_tiers WHERE name = ?', ['free']
            );
            if (freeTier.length > 0) {
                return { subscription: null, tier: freeTier[0], isFree: true };
            }
            return null;
        }

        const subscription = subscriptions[0];
        subscription.features = parseFeatures(subscription.features);

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

        return subscriptions.map((sub) => {
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
                'SELECT * FROM subscription_tiers WHERE name = ?', [tierName]
            );
            if (tiers.length === 0) throw new Error('Tier not found');
            const tier = tiers[0];

            // Calculate price
            const price = billingCycle === 'yearly'
                ? (tier.price_yearly || tier.price_monthly * 12)
                : tier.price_monthly;

            // Get current subscription
            const [currentSubs] = await connection.execute(
                `SELECT st.name as tier_name, st.price_monthly, us.current_period_end, us.tier_id
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ? AND us.status IN ('active', 'trial')
       ORDER BY us.current_period_end DESC
       LIMIT 1`,
                [userId]
            );

            let activeSub = null;
            let currentTierName = 'free';
            if (currentSubs.length > 0) {
                activeSub = currentSubs[0];
                currentTierName = activeSub.tier_name;
            } else {
                const [users] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
                if (users.length === 0) throw new Error('User not found');
            }

            // Validate tier order (block downgrade)
            if ((TIER_ORDER[tierName] || 0) < (TIER_ORDER[currentTierName] || 0)) {
                throw new Error('Cannot downgrade. Please cancel your current subscription first.');
            }

            // Get wallet and validate balance
            const [wallets] = await connection.execute(
                'SELECT * FROM user_wallets WHERE user_id = ?', [userId]
            );
            if (wallets.length === 0) throw new Error('Wallet not found');
            const wallet = wallets[0];

            const purchaseAmount = calculatePurchaseAmount(price, wallet.currency);
            validateBalance(wallet.balance, purchaseAmount, wallet.currency);

            // Begin transaction
            await connection.beginTransaction();

            try {
                // Process wallet payment
                const { newBalance } = await processWalletPayment(connection, {
                    wallet, userId, price, purchaseAmount, tier, tierName, billingCycle
                });

                // Cancel existing subscription
                if (currentSubs.length > 0) {
                    await connection.execute(
                        `UPDATE user_subscriptions 
           SET status = 'cancelled', cancel_at_period_end = FALSE
           WHERE user_id = ? AND status IN ('active', 'trial')`,
                        [userId]
                    );
                }

                // Create new subscription
                const { periodStart, periodEnd } = calculatePeriodDates(billingCycle, activeSub, tier);

                await connection.execute(
                    `INSERT INTO user_subscriptions 
                 (user_id, tier_id, status, billing_cycle, current_period_start, current_period_end, auto_renew)
                 VALUES (?, ?, 'active', ?, ?, ?, TRUE)`,
                    [userId, tier.id, billingCycle, periodStart, periodEnd]
                );

                await connection.commit();
                console.log(`✅ User ${userId} upgraded to tier: ${tierName}`);

                const features = parseFeatures(tier.features);

                return {
                    message: 'Subscription upgraded successfully',
                    tier: { name: tier.name, display_name: tier.display_name, features },
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
