import pool from '../../../../../db.js';

/**
 * Create payment intent for subscription upgrade
 */
export async function createPaymentIntent(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { tierName, billingCycle = 'monthly' } = req.body;
        if (!tierName) return res.status(400).json({ message: 'Tier name is required' });

        const [tiers] = await pool.execute(
            'SELECT * FROM subscription_tiers WHERE name = ?',
            [tierName]
        );

        if (tiers.length === 0) return res.status(404).json({ message: 'Tier not found' });
        const tier = tiers[0];
        const amount = billingCycle === 'yearly' && tier.price_yearly
            ? Number(tier.price_yearly)
            : Number(tier.price_monthly);

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
 */
export async function handlePaymentWebhook(req, res) {
    try {
        const { type, data } = req.body;
        console.log('Payment webhook received:', type);

        switch (type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailure(data.object);
                break;
            case 'subscription.updated':
                await handleSubscriptionUpdate(data.object);
                break;
            case 'subscription.deleted':
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
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        // Mock logic handled elsewhere usually
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
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
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
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
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
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
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
    console.log('Payment succeeded:', paymentIntent.id);
}

async function handlePaymentFailure(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);
}

async function handleSubscriptionUpdate(subscription) {
    console.log('Subscription updated:', subscription.id);
}

async function handleSubscriptionCancellation(subscription) {
    console.log('Subscription cancelled:', subscription.id);
}
