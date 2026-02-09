import pool from '#db';

class UsageService {
    /**
     * Get usage for a specific user on a specific date
     * @param {number} userId 
     * @param {string} date 
     */
    async getUserUsage(userId, date) {
        const [usage] = await pool.execute(
            `SELECT * FROM user_usage 
       WHERE user_id = ? AND date = ?`,
            [userId, date]
        );
        return usage[0];
    }

    /**
     * Get user subscription features and limits
     * @param {number} userId 
     */
    async getSubscriptionLimits(userId) {
        // Get user's subscription to get limits
        const [subscriptions] = await pool.execute(
            `SELECT st.features, st.max_file_size_mb, st.max_chat_history_days
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ? AND us.status IN ('active', 'trial')
       ORDER BY us.created_at DESC
       LIMIT 1`,
            [userId]
        );

        let limits = {
            queries_per_day: 50,
            file_size_mb: 1,
            chat_history_days: 7,
            advanced_rag: false,
            priority_support: false,
            api_access: false,
            team_collaboration: false
        };

        if (subscriptions.length > 0) {
            let features = subscriptions[0].features;
            if (typeof features === 'string') {
                try {
                    features = JSON.parse(features);
                } catch (e) {
                    console.error('Error parsing features JSON:', e);
                    features = {};
                }
            } else if (!features || typeof features !== 'object') {
                features = {};
            }

            limits = {
                queries_per_day: features.queries_per_day || 50,
                file_size_mb: subscriptions[0].max_file_size_mb || 1,
                chat_history_days: subscriptions[0].max_chat_history_days || 7,
                advanced_rag: features.advanced_rag || false,
                priority_support: features.priority_support || false,
                api_access: features.api_access || false,
                team_collaboration: features.team_collaboration || false
            };
        } else {
            const [freeTier] = await pool.execute(
                'SELECT features, max_file_size_mb, max_chat_history_days FROM subscription_tiers WHERE name = ?',
                ['free']
            );
            if (freeTier.length > 0) {
                let features = freeTier[0].features;
                if (typeof features === 'string') {
                    try {
                        features = JSON.parse(features);
                    } catch (e) {
                        console.error('Error parsing features JSON:', e);
                        features = {};
                    }
                } else if (!features || typeof features !== 'object') {
                    features = {};
                }

                limits = {
                    queries_per_day: features.queries_per_day || 50,
                    file_size_mb: freeTier[0].max_file_size_mb || 1,
                    chat_history_days: freeTier[0].max_chat_history_days || 7,
                    advanced_rag: features.advanced_rag || false,
                    priority_support: features.priority_support || false,
                    api_access: features.api_access || false,
                    team_collaboration: features.team_collaboration || false
                };
            }
        }
        return limits;
    }

    /**
     * Get usage stats for period
     */
    async getUsageStats(userId, period) {
        let dateFilter = '';
        const now = new Date();

        if (period === 'day') {
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            dateFilter = `AND date >= '${startDate.toISOString().split('T')[0]}'`;
        } else if (period === 'week') {
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
            dateFilter = `AND date >= '${startDate.toISOString().split('T')[0]}'`;
        } else if (period === 'month') {
            const startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 12);
            dateFilter = `AND date >= '${startDate.toISOString().split('T')[0]}'`;
        }

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

            const [existing] = await pool.execute(
                'SELECT * FROM user_usage WHERE user_id = ? AND date = ?',
                [userId, today]
            );

            if (existing.length > 0) {
                const updateField = type === 'query' ? 'queries_count' :
                    type === 'advanced_rag' ? 'advanced_rag_count' :
                        type === 'file_upload' ? 'file_uploads_count' :
                            type === 'file_size' ? 'file_uploads_size_mb' :
                                type === 'tokens' ? 'tokens_used' : null;

                if (updateField) {
                    await pool.execute(
                        `UPDATE user_usage 
           SET ${updateField} = ${updateField} + ? 
           WHERE user_id = ? AND date = ?`,
                        [value, userId, today]
                    );
                }
            } else {
                const initialValues = {
                    queries_count: type === 'query' ? value : 0,
                    advanced_rag_count: type === 'advanced_rag' ? value : 0,
                    file_uploads_count: type === 'file_upload' ? value : 0,
                    file_uploads_size_mb: type === 'file_size' ? value : 0,
                    tokens_used: type === 'tokens' ? value : 0
                };

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
}

export default new UsageService();
