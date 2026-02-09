import usageService from '../services/usage.service.js';

/**
 * Get today's usage for current user
 */
export async function getTodayUsage(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const today = new Date().toISOString().split('T')[0];
        const usage = await usageService.getUserUsage(userId, today);
        const limits = await usageService.getSubscriptionLimits(userId);

        const todayUsage = usage || {
            queries_count: 0,
            advanced_rag_count: 0,
            file_uploads_count: 0,
            file_uploads_size_mb: 0,
            tokens_used: 0
        };

        res.json({
            usage: todayUsage,
            limits,
            percentage: {
                queries: limits.queries_per_day === -1 ? 0 :
                    Math.min(100, (todayUsage.queries_count / limits.queries_per_day) * 100),
                file_size: limits.file_size_mb === -1 ? 0 :
                    Math.min(100, (todayUsage.file_uploads_size_mb / limits.file_size_mb) * 100)
            }
        });
    } catch (error) {
        console.error('Error getting today usage:', error);
        res.status(500).json({ message: 'Error getting usage' });
    }
}

/**
 * Get usage statistics (daily/weekly/monthly)
 */
export async function getUsageStats(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { period = 'week' } = req.query;
        const stats = await usageService.getUsageStats(userId, period);

        res.json({ stats, period });
    } catch (error) {
        console.error('Error getting usage stats:', error);
        res.status(500).json({ message: 'Error getting usage statistics' });
    }
}

/**
 * Get usage limits for current user
 */
export async function getUsageLimits(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const limits = await usageService.getSubscriptionLimits(userId);
        res.json({ limits });
    } catch (error) {
        console.error('Error getting usage limits:', error);
        res.status(500).json({ message: 'Error getting usage limits' });
    }
}

/**
 * Get usage history
 */
export async function getUsageHistory(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { limit = 30 } = req.query;
        const history = await usageService.getUsageHistory(userId, limit);

        res.json({ history });
    } catch (error) {
        console.error('Error getting usage history:', error);
        res.status(500).json({ message: 'Error getting usage history' });
    }
}

/**
 * Track usage with optional tokens (called from chat controllers)
 */
export async function trackUsage(userId, type, options = {}) {
    return usageService.trackUsage(userId, type, options);
}

/**
 * Helper function to increment usage
 */
export async function incrementUsage(userId, type, value = 1) {
    return usageService.incrementUsage(userId, type, value);
}
