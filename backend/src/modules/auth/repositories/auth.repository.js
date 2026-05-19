import pool from '#db';

const authRepository = {
    async findUserById(userId) {
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        return rows[0] || null;
    },

    async findUserByEmail(email) {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    },

    async createUser({ name, email, passwordHash, role, picture, emailVerified }) {
        const [rows] = await pool.execute(
            'INSERT INTO users (name, email, password_hash, role, avatar_url, email_verified) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
            [name, email, passwordHash, role, picture, emailVerified]
        );
        return rows[0];
    },

    async upsertUser({ name, email, picture }) {
        const [rows] = await pool.execute(
            `INSERT INTO users (name, email, password_hash, role, email_verified, avatar_url, last_login_at)
             VALUES (?, ?, '', 'user', ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (email)
             DO UPDATE SET
                last_login_at = CURRENT_TIMESTAMP,
                avatar_url = CASE WHEN users.avatar_url IS NULL OR users.avatar_url = '' THEN EXCLUDED.avatar_url ELSE users.avatar_url END
             RETURNING *`,
            [name, email, true, picture]
        );
        return rows[0];
    },

    async createSession(userId, tokenHash, { deviceInfo, ipAddress, userAgent, expiresAt }) {
        await pool.execute(
            `INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, tokenHash, deviceInfo, ipAddress, userAgent, expiresAt]
        );
    },

    async deleteSession(sessionId, userId) {
        await pool.execute(
            'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
            [sessionId, userId]
        );
    },

    async findOAuthLink(provider, providerUserId) {
        const [rows] = await pool.execute(
            'SELECT user_id FROM user_oauth_providers WHERE provider = ? AND provider_user_id = ?',
            [provider, providerUserId]
        );
        return rows[0] || null;
    },

    async findUserOAuthProvider(userId, provider) {
        const [rows] = await pool.execute(
            'SELECT * FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
            [userId, provider]
        );
        return rows[0] || null;
    },

    async upsertOAuthProvider({ userId, provider, providerUserId, email, accessTokenEncrypted, refreshTokenEncrypted }) {
        await pool.execute(
            `INSERT INTO user_oauth_providers
             (user_id, provider, provider_user_id, provider_email, access_token_encrypted, refresh_token_encrypted)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (user_id, provider) DO UPDATE SET
                provider_user_id = EXCLUDED.provider_user_id,
                provider_email = EXCLUDED.provider_email,
                access_token_encrypted = EXCLUDED.access_token_encrypted,
                refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, provider, providerUserId, email, accessTokenEncrypted, refreshTokenEncrypted]
        );
    },

    async deleteOAuthProvider(userId, provider) {
        await pool.execute(
            'DELETE FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
            [userId, provider]
        );
    },

    async getOAuthProviders(userId) {
        const [rows] = await pool.execute(
            'SELECT provider, provider_email, created_at, updated_at FROM user_oauth_providers WHERE user_id = ?',
            [userId]
        );
        return rows;
    },

    async countOAuthProviders(userId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM user_oauth_providers WHERE user_id = ?',
            [userId]
        );
        return parseInt(rows[0].count);
    },

    async findUserPasswordHash(userId) {
        const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
        return rows[0]?.password_hash ?? null;
    },

    async findWalletByUserId(userId) {
        const [rows] = await pool.execute('SELECT id FROM user_wallets WHERE user_id = ?', [userId]);
        return rows[0] || null;
    },

    async createWallet(userId) {
        await pool.execute(
            'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?)',
            [userId, 'USD', 'active']
        );
    },
};

export default authRepository;
