import pool from '../../../../db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

class AuthService {
    /**
     * Finds a user by ID
     * @param {number} userId 
     */
    async findUserById(userId) {
        const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        return users[0];
    }

    /**
     * Finds a user by email
     * @param {string} email 
     */
    async findUserByEmail(email) {
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        return users[0];
    }

    /**
     * Create a new user
     * @param {Object} userData 
     */
    async createUser({ name, email, password, role = 'user', picture = null, emailVerified = false }) {
        let passwordHash = '';
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        } else {
            // For OAuth users without password initially
            passwordHash = '';
        }

        const [rows] = await pool.execute(
            'INSERT INTO users (name, email, password_hash, role, avatar_url, email_verified) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
            [name, email, passwordHash, role, picture, emailVerified]
        );

        return rows[0];
    }

    /**
     * Upsert user for OAuth login (Find or Create)
     * @param {Object} userData 
     */
    async upsertUser({ name, email, picture }) {
        const [upsertRows] = await pool.execute(
            `INSERT INTO users (name, email, password_hash, role, email_verified, avatar_url, last_login_at) 
             VALUES (?, ?, '', 'user', ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (email) 
             DO UPDATE SET 
                last_login_at = CURRENT_TIMESTAMP,
                avatar_url = CASE WHEN users.avatar_url IS NULL OR users.avatar_url = '' THEN EXCLUDED.avatar_url ELSE users.avatar_url END
             RETURNING *`,
            [name, email, true, picture]
        );
        return upsertRows[0];
    }

    /**
     * Create user session
     * @param {number} userId 
     * @param {string} token 
     * @param {Object} reqInfo { userAgent, ip }
     */
    async createSession(userId, token, { userAgent, ip }) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        const deviceInfo = userAgent || 'Unknown Device';
        const ipAddress = ip || 'Unknown';

        await pool.execute(
            `INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, tokenHash, deviceInfo, ipAddress, userAgent || null, expiresAt]
        );
    }

    /**
     * Delete session
     * @param {string} sessionId 
     * @param {number} userId 
     */
    async deleteSession(sessionId, userId) {
        await pool.execute(
            'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
            [sessionId, userId]
        );
    }

    /**
     * Find existing OAuth link
     * @param {string} provider 
     * @param {string} providerUserId 
     */
    async findOAuthLink(provider, providerUserId) {
        const [existingLink] = await pool.execute(
            'SELECT user_id FROM user_oauth_providers WHERE provider = ? AND provider_user_id = ?',
            [provider, providerUserId]
        );
        return existingLink[0];
    }

    /**
     * Check if user is linked to a provider
     * @param {number} userId 
     * @param {string} provider 
     */
    async isUserLinkedToProvider(userId, provider) {
        const [links] = await pool.execute(
            'SELECT * FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
            [userId, provider]
        );
        return links.length > 0;
    }

    /**
     * Link OAuth provider to user
     * @param {Object} linkData 
     */
    async linkOAuthProvider({ userId, provider, providerUserId, email, tokens }) {
        const accessTokenEncrypted = Buffer.from(tokens.access_token || '').toString('base64');
        const refreshTokenEncrypted = tokens.refresh_token
            ? Buffer.from(tokens.refresh_token).toString('base64')
            : null;

        const isLinked = await this.isUserLinkedToProvider(userId, provider);

        if (isLinked) {
            await pool.execute(
                `UPDATE user_oauth_providers 
                 SET provider_user_id = ?, provider_email = ?, access_token_encrypted = ?, refresh_token_encrypted = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND provider = ?`,
                [providerUserId, email, accessTokenEncrypted, refreshTokenEncrypted, userId, provider]
            );
        } else {
            await pool.execute(
                `INSERT INTO user_oauth_providers 
                 (user_id, provider, provider_user_id, provider_email, access_token_encrypted, refresh_token_encrypted)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, provider, providerUserId, email, accessTokenEncrypted, refreshTokenEncrypted]
            );
        }
    }

    /**
     * Unlink OAuth provider
     * @param {number} userId 
     * @param {string} provider 
     */
    async unlinkOAuthProvider(userId, provider) {
        await pool.execute(
            'DELETE FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
            [userId, provider]
        );
    }

    /**
     * Get linked providers for user
     * @param {number} userId 
     */
    async getLinkedProviders(userId) {
        const [providers] = await pool.execute(
            'SELECT provider, provider_email, created_at, updated_at FROM user_oauth_providers WHERE user_id = ?',
            [userId]
        );
        return providers;
    }

    /**
     * Count auth methods for user
     * @param {number} userId 
     */
    async countAuthMethods(userId) {
        const [user] = await pool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        const hasPassword = user.length > 0 && user[0].password_hash && user[0].password_hash.trim() !== '';

        const [providers] = await pool.execute(
            'SELECT COUNT(*) as count FROM user_oauth_providers WHERE user_id = ?',
            [userId]
        );
        const oauthCount = providers[0].count;

        return {
            hasPassword,
            oauthCount,
            total: (hasPassword ? 1 : 0) + oauthCount
        };
    }

    /**
     * Create wallet for user if not exists
     * @param {number} userId 
     */
    async createWalletIfNotExists(userId) {
        const [wallets] = await pool.execute('SELECT id FROM user_wallets WHERE user_id = ?', [userId]);
        if (wallets.length === 0) {
            try {
                await pool.execute(
                    'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?)',
                    [userId, 'USD', 'active']
                );
                console.log(`✅ Wallet created for user ${userId}`);
            } catch (walletError) {
                console.error('⚠️ Wallet creation warning:', walletError.message);
            }
        }
    }
}

export default new AuthService();
