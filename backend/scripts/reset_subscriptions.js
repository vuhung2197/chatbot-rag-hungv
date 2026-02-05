import pool from '../db.js';

async function resetSubscriptions() {
    try {
        console.log('🔄 Starting reset of all user subscriptions to expired (returning everyone to Free tier)...');

        // Update all active or trial subscriptions to expired
        const [result] = await pool.execute(
            "UPDATE user_subscriptions SET status = 'expired', auto_renew = FALSE, updated_at = NOW() WHERE status IN ('active', 'trial')"
        );

        console.log(`✅ Successfully reset ${result.affectedRows} subscriptions.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting subscriptions:', error);
        process.exit(1);
    }
}

resetSubscriptions();
