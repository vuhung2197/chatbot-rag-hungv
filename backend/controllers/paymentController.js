import pool from '../db.js';

/**
 * Create payment intent for subscription upgrade
 * This will be integrated with Stripe/PayPal later
 */
export async function createPaymentIntent(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { tierName, billingCycle = 'monthly' } = req.body;

    if (!tierName) {
      return res.status(400).json({ message: 'Tier name is required' });
    }

    // Get tier information
    const [tiers] = await pool.execute(
      'SELECT * FROM subscription_tiers WHERE name = ?',
      [tierName]
    );

    if (tiers.length === 0) {
      return res.status(404).json({ message: 'Tier not found' });
    }

    const tier = tiers[0];
    const amount = billingCycle === 'yearly' && tier.price_yearly
      ? Number(tier.price_yearly)
      : Number(tier.price_monthly);

    // TODO: Integrate with Stripe/PayPal
    // For now, return mock payment intent
    res.json({
      paymentIntentId: `pi_mock_${Date.now()}`,
      clientSecret: `mock_secret_${Date.now()}`,
      amount,
      currency: 'usd',
      tierName,
      billingCycle,
      message: 'Payment integration pending. This is a mock response.'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
}

/**
 * Handle payment webhook from Stripe/PayPal
 * This will process payment confirmations
 */
export async function handlePaymentWebhook(req, res) {
  try {
    // TODO: Verify webhook signature from Stripe/PayPal
    const { type, data } = req.body;

    console.log('Payment webhook received:', type);

    // Handle different webhook events
    switch (type) {
      case 'payment_intent.succeeded':
        // Update subscription status
        await handlePaymentSuccess(data.object);
        break;
      case 'payment_intent.payment_failed':
        // Handle payment failure
        await handlePaymentFailure(data.object);
        break;
      case 'subscription.updated':
        // Handle subscription updates
        await handleSubscriptionUpdate(data.object);
        break;
      case 'subscription.deleted':
        // Handle subscription cancellation
        await handleSubscriptionCancellation(data.object);
        break;
      default:
        console.log('Unhandled webhook type:', type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling payment webhook:', error);
    res.status(500).json({ message: 'Error processing webhook' });
  }
}

/**
 * Confirm payment and activate subscription
 */
export async function confirmPayment(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { paymentIntentId, tierName, billingCycle } = req.body;

    // TODO: Verify payment with Stripe/PayPal
    // For now, this is a placeholder

    // After payment confirmation, upgrade subscription
    // This logic is already in subscriptionController.upgradeSubscription
    // We can call it here or refactor

    res.json({
      success: true,
      message: 'Payment confirmed. Subscription will be activated.'
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Error confirming payment' });
  }
}

/**
 * Get payment methods for current user
 */
export async function getPaymentMethods(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // TODO: Fetch from Stripe/PayPal
    // For now, return empty array
    res.json({
      paymentMethods: [],
      message: 'Payment integration pending'
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ message: 'Error getting payment methods' });
  }
}

/**
 * Add payment method
 */
export async function addPaymentMethod(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // TODO: Integrate with Stripe/PayPal to add payment method
    res.json({
      success: true,
      message: 'Payment method added (mock)'
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ message: 'Error adding payment method' });
  }
}

/**
 * Remove payment method
 */
export async function removePaymentMethod(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { paymentMethodId } = req.params;

    // TODO: Remove from Stripe/PayPal
    res.json({
      success: true,
      message: 'Payment method removed (mock)'
    });
  } catch (error) {
    console.error('Error removing payment method:', error);
    res.status(500).json({ message: 'Error removing payment method' });
  }
}

// Helper functions for webhook handling
async function handlePaymentSuccess(paymentIntent) {
  // TODO: Update subscription status in database
  console.log('Payment succeeded:', paymentIntent.id);
}

async function handlePaymentFailure(paymentIntent) {
  // TODO: Handle payment failure
  console.log('Payment failed:', paymentIntent.id);
}

async function handleSubscriptionUpdate(subscription) {
  // TODO: Update subscription in database
  console.log('Subscription updated:', subscription.id);
}

async function handleSubscriptionCancellation(subscription) {
  // TODO: Cancel subscription in database
  console.log('Subscription cancelled:', subscription.id);
}

