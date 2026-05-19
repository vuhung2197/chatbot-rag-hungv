import bcrypt from 'bcrypt';
import crypto from 'crypto';
import authRepository from '../repositories/auth.repository.js';

class AuthService {
    async findUserById(userId) {
        return authRepository.findUserById(userId);
    }

    async findUserByEmail(email) {
        return authRepository.findUserByEmail(email);
    }

    async createUser({ name, email, password, role = 'user', picture = null, emailVerified = false }) {
        const passwordHash = password ? await bcrypt.hash(password, 10) : '';
        return authRepository.createUser({ name, email, passwordHash, role, picture, emailVerified });
    }

    async upsertUser({ name, email, picture }) {
        return authRepository.upsertUser({ name, email, picture });
    }

    async createSession(userId, token, { userAgent, ip }) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await authRepository.createSession(userId, tokenHash, {
            deviceInfo: userAgent || 'Unknown Device',
            ipAddress: ip || 'Unknown',
            userAgent: userAgent || null,
            expiresAt,
        });
    }

    async deleteSession(sessionId, userId) {
        return authRepository.deleteSession(sessionId, userId);
    }

    async findOAuthLink(provider, providerUserId) {
        return authRepository.findOAuthLink(provider, providerUserId);
    }

    async isUserLinkedToProvider(userId, provider) {
        const link = await authRepository.findUserOAuthProvider(userId, provider);
        return link !== null;
    }

    async linkOAuthProvider({ userId, provider, providerUserId, email, tokens }) {
        const accessTokenEncrypted = Buffer.from(tokens.access_token || '').toString('base64');
        const refreshTokenEncrypted = tokens.refresh_token
            ? Buffer.from(tokens.refresh_token).toString('base64')
            : null;

        await authRepository.upsertOAuthProvider({
            userId, provider, providerUserId, email,
            accessTokenEncrypted, refreshTokenEncrypted,
        });
    }

    async unlinkOAuthProvider(userId, provider) {
        return authRepository.deleteOAuthProvider(userId, provider);
    }

    async getLinkedProviders(userId) {
        return authRepository.getOAuthProviders(userId);
    }

    async countAuthMethods(userId) {
        const passwordHash = await authRepository.findUserPasswordHash(userId);
        const hasPassword = Boolean(passwordHash && passwordHash.trim() !== '');
        const oauthCount = await authRepository.countOAuthProviders(userId);

        return {
            hasPassword,
            oauthCount,
            total: (hasPassword ? 1 : 0) + oauthCount,
        };
    }

    async createWalletIfNotExists(userId) {
        const wallet = await authRepository.findWalletByUserId(userId);
        if (!wallet) {
            try {
                await authRepository.createWallet(userId);
                console.log(`✅ Wallet created for user ${userId}`);
            } catch (walletError) {
                console.error('⚠️ Wallet creation warning:', walletError.message);
            }
        }
    }
}

export default new AuthService();
