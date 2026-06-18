import pool from '#db';

const usageRepository = {
    async getUserUsage(userId, date) {
        const [rows] = await pool.execute(
            'SELECT * FROM user_usage WHERE user_id = ? AND date = ?',
            [userId, date]
        );
        return rows[0] || null;
    },

    async getActiveSubscriptionWithTier(userId) {
        const [rows] = await pool.execute(
            `SELECT st.features, st.max_file_size_mb, st.max_chat_history_days
             FROM user_subscriptions us
             JOIN subscription_tiers st ON us.tier_id = st.id
             WHERE us.user_id = ? AND us.status IN ('active', 'trial')
             ORDER BY us.created_at DESC
             LIMIT 1`,
            [userId]
        );
        return rows[0] || null;
    },

    async getFreeTier() {
        const [rows] = await pool.execute(
            'SELECT features, max_file_size_mb, max_chat_history_days FROM subscription_tiers WHERE name = ?',
            ['free']
        );
        return rows[0] || null;
    },

    // dateFrom: ISO date string 'YYYY-MM-DD', or null for all time
    async getUsageStats(userId, dateFrom) {
        const params = [userId];
        const dateClause = dateFrom ? `AND date >= ?` : '';
        if (dateFrom) params.push(dateFrom);

        const [rows] = await pool.execute(
            `SELECT
                date,
                SUM(queries_count) as total_queries,
                SUM(advanced_rag_count) as total_advanced_rag,
                SUM(file_uploads_count) as total_file_uploads,
                SUM(file_uploads_size_mb) as total_file_size,
                SUM(tokens_used) as total_tokens
             FROM user_usage
             WHERE user_id = ? ${dateClause}
             GROUP BY date
             ORDER BY date ASC`,
            params
        );
        return rows;
    },

    async getUsageHistory(userId, limit) {
        const [rows] = await pool.execute(
            'SELECT * FROM user_usage WHERE user_id = ? ORDER BY date DESC LIMIT ?',
            [userId, limit]
        );
        return rows;
    },

    // field must come from USAGE_TYPE_MAP — never from user input
    async incrementUsageField(userId, date, field, value) {
        await pool.execute(
            `UPDATE user_usage SET ${field} = ${field} + ? WHERE user_id = ? AND date = ?`,
            [value, userId, date]
        );
    },

    async insertUsageRow(userId, date, initialValues) {
        await pool.execute(
            `INSERT INTO user_usage
             (user_id, date, queries_count, advanced_rag_count, file_uploads_count, file_uploads_size_mb, tokens_used)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, date,
                initialValues.queries_count,
                initialValues.advanced_rag_count,
                initialValues.file_uploads_count,
                initialValues.file_uploads_size_mb,
                initialValues.tokens_used,
            ]
        );
    },

    async countWebSearchesToday(userId, today) {
        const [rows] = await pool.execute(
            `SELECT COUNT(*) as count FROM user_questions
             WHERE user_id = ? AND DATE(created_at) = ?
             AND (metadata->>'source' = 'web_search' OR metadata->>'source' = 'kb_fallback_web')`,
            [userId, today]
        );
        return parseInt(rows[0]?.count ?? 0);
    },
};

export default usageRepository;
