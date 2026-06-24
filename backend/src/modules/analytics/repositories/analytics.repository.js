import pool from '#db';

const analyticsRepository = {
    async insertMistakeLog({ userId, sourceModule, errorCategory, errorDetail, contextText, sessionId }) {
        const [rows] = await pool.query(
            `INSERT INTO user_mistake_logs
             (user_id, source_module, error_category, error_detail, context_text, session_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, sourceModule, errorCategory, errorDetail, contextText, sessionId]
        );
        return rows[0];
    },

    // days is sanitized to integer by the service before being passed here
    async getTopWeaknesses(userId, limit, days) {
        const [rows] = await pool.query(
            `SELECT
                error_category,
                error_detail,
                COUNT(*) as error_count,
                MAX(created_at) as last_occurred
             FROM user_mistake_logs
             WHERE user_id = $1
               AND created_at >= NOW() - ($3 * INTERVAL '1 day')
             GROUP BY error_category, error_detail
             ORDER BY error_count DESC
             LIMIT $2`,
            [userId, limit, parseInt(days, 10)]
        );
        return rows;
    },

    async getRecentMistakes(userId, limit) {
        const [rows] = await pool.query(
            `SELECT * FROM user_mistake_logs
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [userId, limit]
        );
        return rows;
    },
};

export default analyticsRepository;
