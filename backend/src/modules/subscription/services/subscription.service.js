import currencyService from '#services/currencyService.js';
import subscriptionRepository from '../repositories/subscription.repository.js';

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

    if (activeSub && activeSub.tier_id === tier.id) {
        const existingEnd = new Date(activeSub.current_period_end);
        if (existingEnd > periodStart) periodStart = existingEnd;
    }

    const periodEnd = new Date(periodStart);
    if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return { periodStart, periodEnd };
}

class SubscriptionService {
    async getTiers() {
        return subscriptionRepository.getAllTiers();
    }

    async getCurrentSubscription(userId) {
        const subscription = await subscriptionRepository.getActiveSubscription(userId);

        if (!subscription) {
            const freeTier = await subscriptionRepository.getTierByName('free');
            if (freeTier) return { subscription: null, tier: freeTier, isFree: true };
            return null;
        }

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
                max_chat_history_days: subscription.max_chat_history_days,
            },
            isFree: subscription.tier_name === 'free',
        };
    }

    async getInvoices(userId) {
        const subscriptions = await subscriptionRepository.getSubscriptionHistory(userId);

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
                stripe_customer_id: sub.stripe_customer_id,
            };
        });
    }

    async setAutoRenew(userId, autoRenew) {
        await subscriptionRepository.setAutoRenew(userId, autoRenew);
        return { message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`, autoRenew };
    }

    async cancelSubscription(userId) {
        await subscriptionRepository.cancelSubscription(userId);
        return { message: 'Subscription will be cancelled at period end' };
    }

    async renewSubscription(userId) {
        await subscriptionRepository.renewSubscription(userId);
        return { message: 'Subscription renewed successfully' };
    }

    async upgradeSubscription(userId, tierName, billingCycle = 'monthly') {
        // ── Reads & validation (outside transaction) ──
        const tier = await subscriptionRepository.getTierByName(tierName);
        if (!tier) throw new Error('Tier not found');

        const price = billingCycle === 'yearly'
            ? (tier.price_yearly || tier.price_monthly * 12)
            : tier.price_monthly;

        const activeSub = await subscriptionRepository.getActiveSubscription(userId);
        const currentTierName = activeSub?.tier_name ?? 'free';

        if (!activeSub) {
            const user = await subscriptionRepository.findUserById(userId);
            if (!user) throw new Error('User not found');
        }

        if ((TIER_ORDER[tierName] || 0) < (TIER_ORDER[currentTierName] || 0)) {
            throw new Error('Cannot downgrade. Please cancel your current subscription first.');
        }

        const wallet = await subscriptionRepository.getWalletByUserId(userId);
        if (!wallet) throw new Error('Wallet not found');

        const purchaseAmount = wallet.currency !== 'USD'
            ? currencyService.convertCurrency(price, 'USD', wallet.currency)
            : price;

        if (parseFloat(wallet.balance) < purchaseAmount) {
            const error = new Error('Insufficient balance');
            error.details = { required: purchaseAmount, available: parseFloat(wallet.balance), currency: wallet.currency };
            throw error;
        }

        const { periodStart, periodEnd } = calculatePeriodDates(billingCycle, activeSub, tier);

        // ── Atomic transaction ──
        try {
            const { newBalance } = await subscriptionRepository.upgradeSubscription({
                userId, tier, billingCycle, wallet, price, purchaseAmount, periodStart, periodEnd,
            });

            console.log(`✅ User ${userId} upgraded to tier: ${tierName}`);

            return {
                message: 'Subscription upgraded successfully',
                tier: { name: tier.name, display_name: tier.display_name, features: parseFeatures(tier.features) },
                payment: {
                    amount: purchaseAmount,
                    currency: wallet.currency,
                    new_balance: newBalance,
                    billing_cycle: billingCycle,
                },
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062 || error.code === '23505') {
                const e = new Error('Subscription already exists. Please refresh the page.');
                e.code = 409;
                throw e;
            }
            throw error;
        }
    }
}

export default new SubscriptionService();
