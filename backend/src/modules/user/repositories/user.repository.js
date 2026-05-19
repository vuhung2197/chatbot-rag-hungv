import pool from '#db';

const userRepository = {
    async findById(userId) {
        const [rows] = await pool.execute(
            `SELECT id, name, email, role, created_at, avatar_url, display_name, bio, timezone, language,
             email_verified, last_login_at, account_status, updated_at, password_hash
             FROM users WHERE id = ?`,
            [userId]
        );
        return rows[0] || null;
    },

    async findEmailById(userId) {
        const [rows] = await pool.execute('SELECT email FROM users WHERE id = ?', [userId]);
        return rows[0]?.email ?? null;
    },

    // Returns existing user with this email (excluding excludeId if given)
    async findByEmail(email, excludeId = null) {
        if (excludeId !== null) {
            const [rows] = await pool.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, excludeId]
            );
            return rows[0] || null;
        }
        const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    },

    // data: plain object { column_name: value } — only the fields that should change
    async update(userId, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return;
        const setClauses = keys.map(k => `${k} = ?`);
        const values = [...keys.map(k => data[k]), userId];
        await pool.execute(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, values);
    },

    async findAvatarUrl(userId) {
        const [rows] = await pool.execute('SELECT avatar_url FROM users WHERE id = ?', [userId]);
        return rows[0]?.avatar_url ?? null;
    },

    async findEmailVerificationStatus(userId) {
        const [rows] = await pool.execute(
            'SELECT email_verified, email FROM users WHERE id = ?',
            [userId]
        );
        return rows[0] || null;
    },

    async findByVerificationToken(token) {
        const [rows] = await pool.execute(
            'SELECT id, email_verified FROM users WHERE email_verification_token = ?',
            [token]
        );
        return rows[0] || null;
    },

    async findPasswordHash(userId) {
        const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
        return rows[0]?.password_hash ?? null;
    },
};

export default userRepository;
