import pool from '#db';
import currencyService from './currencyService.js';

/**
 * Subscription Renewal Worker
 * Automatically renews active subscriptions with auto_renew enabled
 */
export async function processRenewals() {
    console.log('🔄 [SubscriptionWorker] Starting renewal process...');

    const connection = await pool.getConnection();
    try {
        // 1. Find subscriptions expiring soon (in the next 24 hours) that haven't been processed
        // and have auto_renew = TRUE
        const [expiringSubs] = await connection.execute(
            `SELECT 
        us.id as sub_id, us.user_id, us.tier_id, us.billing_cycle, us.current_period_end,
        st.name as tier_name, st.display_name as tier_display_name, 
        st.price_monthly, st.price_yearly,
        uw.id as wallet_id, uw.balance, uw.currency as wallet_currency
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       JOIN user_wallets uw ON us.user_id = uw.user_id
       WHERE us.status = 'active'
         AND us.auto_renew = TRUE
         AND us.current_period_end <= NOW() + INTERVAL '1 hour'
         AND us.current_period_end > NOW() - INTERVAL '1 hour'`, // Only renew if very close to end
        );

        console.log(`[SubscriptionWorker] Found ${expiringSubs.length} subscriptions to renew`);

        for (const sub of expiringSubs) {
            try {
                await connection.beginTransaction();

                const priceUSD = sub.billing_cycle === 'yearly'
                    ? (sub.price_yearly || sub.price_monthly * 12)
                    : sub.price_monthly;

                let chargeAmount = priceUSD;
                if (sub.wallet_currency !== 'USD') {
                    chargeAmount = currencyService.convertCurrency(priceUSD, 'USD', sub.wallet_currency);
                }

                if (parseFloat(sub.balance) >= chargeAmount) {
                    // Sufficient balance - Renew
                    const newBalance = parseFloat(sub.balance) - chargeAmount;
                    const periodStart = new Date(sub.current_period_end);
                    const periodEnd = new Date(periodStart);

                    if (sub.billing_cycle === 'yearly') {
                        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                    } else {
                        periodEnd.setMonth(periodEnd.getMonth() + 1);
                    }

                    // Update wallet
                    await connection.execute(
                        'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                        [newBalance, sub.wallet_id]
                    );

                    // Log transaction
                    await connection.execute(
                        `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, status, payment_method, description, metadata)
             VALUES (?, ?, 'subscription', ?, ?, ?, 'completed', 'wallet', ?, ?)`,
                        [
                            sub.wallet_id,
                            sub.user_id,
                            -priceUSD,
                            sub.balance,
                            newBalance,
                            `Automatic renewal: ${sub.tier_display_name} (${sub.billing_cycle})`,
                            JSON.stringify({
                                action: 'auto_renew',
                                sub_id: sub.sub_id,
                                tier_name: sub.tier_name,
                                billing_cycle: sub.billing_cycle,
                                amount_deducted: chargeAmount,
                                currency: sub.wallet_currency
                            })
                        ]
                    );

                    // Update existing subscription to 'expired' and create new one
                    // OR just extend the existing one. Let's extend to keep history clean.
                    await connection.execute(
                        `UPDATE user_subscriptions 
             SET current_period_start = ?, current_period_end = ?, updated_at = NOW()
             WHERE id = ?`,
                        [periodStart, periodEnd, sub.sub_id]
                    );

                    console.log(`✅ [SubscriptionWorker] Renewed ${sub.tier_name} for user ${sub.user_id}`);
                } else {
                    // Insufficient balance - Cancel auto-renew
                    await connection.execute(
                        `UPDATE user_subscriptions 
             SET auto_renew = FALSE, status = 'expired', updated_at = NOW()
             WHERE id = ?`,
                        [sub.sub_id]
                    );
                    console.log(`❌ [SubscriptionWorker] Failed renewal for user ${sub.user_id} (Insufficient funds)`);
                }

                await connection.commit();
            } catch (error) {
                await connection.rollback();
                console.error(`❌ [SubscriptionWorker] Error processing renewal for sub ${sub.sub_id}:`, error);
            }
        }
    } catch (error) {
        console.error('❌ [SubscriptionWorker] Global error:', error);
    } finally {
        connection.release();
    }
}

/**
 * Start the background worker
 */
export function startSubscriptionWorker(intervalMs = 3600000) { // Default 1 hour
    processRenewals(); // Run once immediately
    setInterval(processRenewals, intervalMs);
    console.log(`🚀 [SubscriptionWorker] Registered to run every ${intervalMs / 60000} minutes`);
}

export default {
    processRenewals,
    startSubscriptionWorker
};
