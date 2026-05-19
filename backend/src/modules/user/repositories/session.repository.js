import pool from '#db';

const sessionRepository = {
    async getActiveSessions(userId, currentTokenHash) {
        const [rows] = await pool.execute(
            `SELECT id, device_info, ip_address, user_agent, expires_at, created_at,
             CASE WHEN token_hash = ? THEN 1 ELSE 0 END as is_current
             FROM user_sessions
             WHERE user_id = ? AND expires_at > NOW()
             ORDER BY created_at DESC`,
            [currentTokenHash, userId]
        );
        return rows;
    },

    async findSession(sessionId, userId) {
        const [rows] = await pool.execute(
            'SELECT id FROM user_sessions WHERE id = ? AND user_id = ?',
            [sessionId, userId]
        );
        return rows[0] || null;
    },

    async deleteSession(sessionId, userId) {
        await pool.execute(
            'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
            [sessionId, userId]
        );
    },

    async countOtherSessions(userId, currentTokenHash) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ? AND token_hash != ?',
            [userId, currentTokenHash]
        );
        return parseInt(rows[0].count);
    },

    async deleteOtherSessions(userId, currentTokenHash) {
        await pool.execute(
            'DELETE FROM user_sessions WHERE user_id = ? AND token_hash != ?',
            [userId, currentTokenHash]
        );
    },
};

export default sessionRepository;
