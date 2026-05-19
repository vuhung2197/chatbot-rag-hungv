import pool from '#db';

const passwordRepository = {
    async deleteUnusedResetTokens(userId) {
        await pool.execute(
            'DELETE FROM password_reset_tokens WHERE user_id = ? AND used = FALSE',
            [userId]
        );
    },

    async createResetToken(userId, token, expiresAt) {
        await pool.execute(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, token, expiresAt]
        );
    },

    async findResetToken(token) {
        const [rows] = await pool.execute(
            'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?',
            [token]
        );
        return rows[0] || null;
    },

    async markResetTokenUsed(token) {
        await pool.execute(
            'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
            [token]
        );
    },
};

export default passwordRepository;
