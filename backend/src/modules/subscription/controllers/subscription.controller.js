import subscriptionService from '../services/subscription.service.js';

/**
 * Get all available subscription tiers
 */
export async function getTiers(req, res) {
    try {
        const tiers = await subscriptionService.getTiers();
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

        const result = await subscriptionService.getCurrentSubscription(userId);

        if (!result) {
            return res.status(404).json({ message: 'No subscription found' });
        }

        res.json(result);
    } catch (error) {
        console.error('Error getting current subscription:', error);
        res.status(500).json({ message: 'Error getting subscription' });
    }
}

/**
 * Upgrade subscription with wallet payment
 */
export async function upgradeSubscription(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { tierName, billingCycle = 'monthly' } = req.body;

        if (!tierName) {
            return res.status(400).json({ message: 'Tier name is required' });
        }

        const result = await subscriptionService.upgradeSubscription(userId, tierName, billingCycle);
        res.json(result);

    } catch (error) {
        console.error('❌ Error upgrading subscription:', error);

        if (error.message === 'Insufficient balance' && error.details) {
            const { required, available, currency } = error.details;
            const locale = currency === 'VND' ? 'vi-VN' : 'en-US';
            const formattedRequired = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(required);
            const formattedAvailable = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(available);

            return res.status(400).json({
                message: `Insufficient balance. Required: ${formattedRequired}, Available: ${formattedAvailable}`,
                required,
                available
            });
        }

        if (error.code === 409) {
            return res.status(409).json({ message: error.message });
        }

        if (error.message === 'User not found' || error.message === 'Tier not found' || error.message === 'Wallet not found') {
            return res.status(404).json({ message: error.message });
        }

        if (error.message === 'Cannot downgrade. Please cancel your current subscription first.') {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({
            message: error.message || 'Error upgrading subscription',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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

        const result = await subscriptionService.cancelSubscription(userId);
        console.log(`✅ User ${userId} cancelled subscription`);
        res.json(result);
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

        const result = await subscriptionService.renewSubscription(userId);
        console.log(`✅ User ${userId} renewed subscription`);
        res.json(result);
    } catch (error) {
        console.error('Error renewing subscription:', error);
        res.status(500).json({ message: 'Error renewing subscription' });
    }
}

/**
 * Get billing history (invoices)
 */
export async function getInvoices(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const invoices = await subscriptionService.getInvoices(userId);
        res.json({ invoices });
    } catch (error) {
        console.error('Error getting invoices:', error);
        res.status(500).json({ message: 'Error getting billing history' });
    }
}

/**
 * Enable or disable auto-renewal
 */
export async function setAutoRenew(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { autoRenew } = req.body;
        if (typeof autoRenew === 'undefined') {
            return res.status(400).json({ message: 'autoRenew parameter is required' });
        }

        const result = await subscriptionService.setAutoRenew(userId, autoRenew);
        console.log(`✅ User ${userId} set auto_renew to ${autoRenew}`);
        res.json(result);
    } catch (error) {
        console.error('Error setting auto-renewal:', error);
        res.status(500).json({ message: 'Error setting auto-renewal' });
    }
}
