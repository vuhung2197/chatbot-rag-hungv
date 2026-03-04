import pool from '#db';

// ─── Helper: Parse features JSON safely ───
function parseFeatures(rawFeatures) {
    if (typeof rawFeatures === 'string') {
        try {
            return JSON.parse(rawFeatures);
        } catch (e) {
            console.error('Error parsing features JSON:', e);
            return {};
        }
    }
    if (rawFeatures && typeof rawFeatures === 'object') {
        return rawFeatures;
    }
    return {};
}

// ─── Helper: Build limits object from features + tier row ───
function buildLimits(features, tierRow = {}) {
    return {
        queries_per_day: features.queries_per_day || 50,
        file_size_mb: tierRow.max_file_size_mb || 1,
        chat_history_days: tierRow.max_chat_history_days || 7,
        advanced_rag: features.advanced_rag || false,
        priority_support: features.priority_support || false,
        api_access: features.api_access || false,
        team_collaboration: features.team_collaboration || false
    };
}

// ─── Helper: Map usage type to DB column ───
const USAGE_TYPE_MAP = {
    query: 'queries_count',
    advanced_rag: 'advanced_rag_count',
    file_upload: 'file_uploads_count',
    file_size: 'file_uploads_size_mb',
    tokens: 'tokens_used'
};

// ─── Helper: Calculate date filter for stats ───
function getDateFilter(period) {
    const now = new Date();
    const daysMap = { day: 7, week: 30 };
    const monthsMap = { month: 12 };

    if (daysMap[period]) {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysMap[period]);
        return `AND date >= '${startDate.toISOString().split('T')[0]}'`;
    }
    if (monthsMap[period]) {
        const startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - monthsMap[period]);
        return `AND date >= '${startDate.toISOString().split('T')[0]}'`;
    }
    return '';
}

class UsageService {
    /**
     * Get usage for a specific user on a specific date
     */
    async getUserUsage(userId, date) {
        const [usage] = await pool.execute(
            `SELECT * FROM user_usage WHERE user_id = ? AND date = ?`,
            [userId, date]
        );
        return usage[0];
    }

    /**
     * Get user subscription features and limits
     */
    async getSubscriptionLimits(userId) {
        const [subscriptions] = await pool.execute(
            `SELECT st.features, st.max_file_size_mb, st.max_chat_history_days
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ? AND us.status IN ('active', 'trial')
       ORDER BY us.created_at DESC
       LIMIT 1`,
            [userId]
        );

        if (subscriptions.length > 0) {
            const features = parseFeatures(subscriptions[0].features);
            return buildLimits(features, subscriptions[0]);
        }

        // Fallback to free tier
        const [freeTier] = await pool.execute(
            'SELECT features, max_file_size_mb, max_chat_history_days FROM subscription_tiers WHERE name = ?',
            ['free']
        );

        if (freeTier.length > 0) {
            const features = parseFeatures(freeTier[0].features);
            return buildLimits(features, freeTier[0]);
        }

        // Default limits
        return buildLimits({});
    }

    /**
     * Get usage stats for period
     */
    async getUsageStats(userId, period) {
        const dateFilter = getDateFilter(period);

        const [stats] = await pool.execute(
            `SELECT 
        date,
        SUM(queries_count) as total_queries,
        SUM(advanced_rag_count) as total_advanced_rag,
        SUM(file_uploads_count) as total_file_uploads,
        SUM(file_uploads_size_mb) as total_file_size,
        SUM(tokens_used) as total_tokens
       FROM user_usage
       WHERE user_id = ? ${dateFilter}
       GROUP BY date
       ORDER BY date ASC`,
            [userId]
        );

        return stats;
    }

    /**
     * Get usage history
     */
    async getUsageHistory(userId, limit = 30) {
        const [history] = await pool.execute(
            `SELECT * FROM user_usage
       WHERE user_id = ?
       ORDER BY date DESC
       LIMIT ?`,
            [userId, parseInt(limit)]
        );
        return history;
    }

    /**
     * Increment usage
     */
    async incrementUsage(userId, type, value = 1) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const updateField = USAGE_TYPE_MAP[type];
            if (!updateField) return;

            const [existing] = await pool.execute(
                'SELECT * FROM user_usage WHERE user_id = ? AND date = ?',
                [userId, today]
            );

            if (existing.length > 0) {
                const finalValue = type === 'tokens' ? Math.round(value) : value;
                await pool.execute(
                    `UPDATE user_usage 
           SET ${updateField} = ${updateField} + ? 
           WHERE user_id = ? AND date = ?`,
                    [finalValue, userId, today]
                );
            } else {
                const initialValues = {
                    queries_count: 0,
                    advanced_rag_count: 0,
                    file_uploads_count: 0,
                    file_uploads_size_mb: 0,
                    tokens_used: 0
                };
                initialValues[updateField] = type === 'tokens' ? Math.round(value) : value;

                await pool.execute(
                    `INSERT INTO user_usage 
           (user_id, date, queries_count, advanced_rag_count, file_uploads_count, file_uploads_size_mb, tokens_used)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [userId, today, initialValues.queries_count, initialValues.advanced_rag_count,
                        initialValues.file_uploads_count, initialValues.file_uploads_size_mb, initialValues.tokens_used]
                );
            }
        } catch (error) {
            console.error('❌ Error incrementing usage:', error);
        }
    }

    /**
     * Track usage with optional tokens
     */
    async trackUsage(userId, type, options = {}) {
        try {
            const tokens = options.tokens || 0;
            await this.incrementUsage(userId, type, 1);

            if (tokens > 0) {
                await this.incrementUsage(userId, 'tokens', tokens);
            }
        } catch (error) {
            console.error('Error tracking usage:', error);
        }
    }

    /**
     * Đếm số lần Web Search hôm nay (cho rate limiting)
     */
    async getWebSearchCount(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [rows] = await pool.execute(
                `SELECT COUNT(*) as count FROM user_questions 
                 WHERE user_id = ? AND DATE(created_at) = ? 
                 AND (metadata LIKE '%"source":"web_search"%' OR metadata LIKE '%"source":"kb_fallback_web"%')`,
                [userId, today]
            );
            return rows[0]?.count || 0;
        } catch (error) {
            console.warn('⚠️ Error counting web searches:', error.message);
            return 0;
        }
    }
}

export default new UsageService();
