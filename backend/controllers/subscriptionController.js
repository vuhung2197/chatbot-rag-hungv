import pool from '../db.js';

/**
 * Get all available subscription tiers
 */
export async function getTiers(req, res) {
  try {
    const [tiers] = await pool.execute(
      'SELECT * FROM subscription_tiers ORDER BY price_monthly ASC'
    );

    res.json({ tiers });
  } catch (error) {
    console.error('Error getting tiers:', error);
    res.status(500).json({ message: 'Error getting subscription tiers' });
  }
}

/**
 * Get current user's subscription
 */
export async function getCurrentSubscription(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

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
        return res.json({
          subscription: null,
          tier: freeTier[0],
          isFree: true
        });
      }

      return res.status(404).json({ message: 'No subscription found' });
    }

    const subscription = subscriptions[0];
    // Handle both JSON string and object (MySQL might return object)
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

    res.json({
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
    });
  } catch (error) {
    console.error('Error getting current subscription:', error);
    res.status(500).json({ message: 'Error getting subscription' });
  }
}

/**
 * Upgrade subscription with wallet payment
 */
export async function upgradeSubscription(req, res) {
  const connection = await pool.getConnection();

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { tierName, billingCycle = 'monthly' } = req.body;

    if (!tierName) {
      return res.status(400).json({ message: 'Tier name is required' });
    }

    // Get tier
    const [tiers] = await connection.execute(
      'SELECT * FROM subscription_tiers WHERE name = ?',
      [tierName]
    );

    if (tiers.length === 0) {
      return res.status(404).json({ message: 'Tier not found' });
    }

    const tier = tiers[0];

    // Calculate price based on billing cycle
    const price = billingCycle === 'yearly'
      ? (tier.price_yearly || tier.price_monthly * 12)
      : tier.price_monthly;

    // Get current subscription to check tier order
    const [currentSubs] = await connection.execute(
      `SELECT st.name as tier_name, st.price_monthly
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ? AND us.status IN ('active', 'trial')
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId]
    );

    // Define tier order (lower number = lower tier)
    const tierOrder = {
      'free': 0,
      'pro': 1,
      'team': 2,
      'enterprise': 3
    };

    // Determine current tier
    let currentTierName = 'free';
    if (currentSubs.length > 0) {
      currentTierName = currentSubs[0].tier_name;
    } else {
      // User doesn't have subscription record, assume free tier
      const [users] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    const currentTierOrder = tierOrder[currentTierName] || 0;
    const newTierOrder = tierOrder[tierName] || 0;

    // Check if already on this tier
    if (currentTierName === tierName) {
      return res.status(400).json({ message: 'Already subscribed to this tier' });
    }

    // Only allow upgrade (higher tier), not downgrade
    if (newTierOrder <= currentTierOrder) {
      return res.status(400).json({
        message: 'Cannot downgrade. Please cancel your current subscription first.'
      });
    }

    // ===== WALLET PAYMENT INTEGRATION =====

    // Get user wallet
    const [wallets] = await connection.execute(
      'SELECT * FROM user_wallets WHERE user_id = ?',
      [userId]
    );

    if (wallets.length === 0) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const wallet = wallets[0];

    // Check if wallet has sufficient balance
    if (parseFloat(wallet.balance) < parseFloat(price)) {
      return res.status(400).json({
        message: `Insufficient balance. Required: ${price.toLocaleString('vi-VN')} đ, Available: ${parseFloat(wallet.balance).toLocaleString('vi-VN')} đ`,
        required: price,
        available: parseFloat(wallet.balance)
      });
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
      const newBalance = parseFloat(lockedWallet.balance) - parseFloat(price);

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
          price,
          lockedWallet.balance,
          newBalance,
          `Subscription upgrade to ${tier.display_name} (${billingCycle})`,
          JSON.stringify({
            tier_name: tierName,
            tier_display_name: tier.display_name,
            billing_cycle: billingCycle,
            price: price,
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

      // Create new subscription
      const periodStart = new Date();
      const periodEnd = new Date();
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await connection.execute(
        `INSERT INTO user_subscriptions 
         (user_id, tier_id, status, billing_cycle, current_period_start, current_period_end)
         VALUES (?, ?, 'active', ?, ?, ?)`,
        [userId, tier.id, billingCycle, periodStart, periodEnd]
      );

      // Commit transaction
      await connection.commit();

      console.log(`✅ User ${userId} upgraded to tier: ${tierName}`);
      console.log(`   Price: ${price} VND`);
      console.log(`   New balance: ${newBalance} VND`);

      // Parse features safely
      let features = {};
      if (tier.features) {
        if (typeof tier.features === 'string') {
          try {
            features = JSON.parse(tier.features);
          } catch (e) {
            console.error('Error parsing tier features:', e);
            features = {};
          }
        } else if (typeof tier.features === 'object') {
          features = tier.features;
        }
      }

      res.json({
        message: 'Subscription upgraded successfully',
        tier: {
          name: tier.name,
          display_name: tier.display_name,
          features: features
        },
        payment: {
          amount: price,
          new_balance: newBalance,
          billing_cycle: billingCycle
        }
      });

    } catch (dbError) {
      await connection.rollback();
      console.error('❌ Database error upgrading subscription:', dbError);

      if (dbError.code === 'ER_DUP_ENTRY' || dbError.errno === 1062) {
        return res.status(409).json({
          message: 'Subscription already exists. Please refresh the page.'
        });
      }
      throw dbError;
    }

  } catch (error) {
    console.error('❌ Error upgrading subscription:', error);
    res.status(500).json({
      message: error.response?.data?.message || 'Error upgrading subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
}

/**
 * Cancel subscription (set to cancel at period end)
 */
export async function cancelSubscription(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.execute(
      `UPDATE user_subscriptions 
       SET cancel_at_period_end = TRUE
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    console.log(`✅ User ${userId} cancelled subscription`);

    res.json({ message: 'Subscription will be cancelled at period end' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Error cancelling subscription' });
  }
}

/**
 * Renew subscription (remove cancel flag)
 */
export async function renewSubscription(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.execute(
      `UPDATE user_subscriptions 
       SET cancel_at_period_end = FALSE
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    console.log(`✅ User ${userId} renewed subscription`);

    res.json({ message: 'Subscription renewed successfully' });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({ message: 'Error renewing subscription' });
  }
}

/**
 * Get billing history (invoices) for current user
 * Note: For now, we'll return subscription history as "invoices"
 * In production, this should integrate with Stripe/PayPal
 */
export async function getInvoices(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

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

    // Format as invoices
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

    res.json({ invoices });
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({ message: 'Error getting billing history' });
  }
}

