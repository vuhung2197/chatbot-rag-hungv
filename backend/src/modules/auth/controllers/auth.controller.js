import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import '../../../../bootstrap/env.js';
import { makeStateCookie, verifyStateCookie } from '../../../../helpers/cookieState.js';
import authService from '../services/auth.service.js';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/google/callback`
);

export function authGoogle(req, res) {
    const state = makeStateCookie(res);

    const redirectBack = req.query.redirect;
    if (redirectBack) {
        res.cookie('oauth_redirect', redirectBack, {
            maxAge: 10 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax',
        });
    }

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ],
        state,
    });
    res.redirect(url);
}

export async function googleCallback(req, res) {
    const { code, state } = req.query;
    const oauthMode = req.cookies.oauth_mode;
    const linkUserId = req.cookies.oauth_link_user_id;

    if (!verifyStateCookie(req, state)) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=csrf`);
    }
    res.clearCookie('oauth_state');

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: profile } = await oauth2.userinfo.get();

        const email = profile.email.trim().toLowerCase();
        const name = profile.name || profile.email.split('@')[0];
        const googleId = profile.id;
        const picture = profile.picture;

        if (!email) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=no_email`);
        }

        // 4️⃣ Xử lý link mode hoặc login mode
        if (oauthMode === 'link' && linkUserId) {
            const userId = parseInt(linkUserId);

            // Check if user exists
            const user = await authService.findUserById(userId);
            if (!user) {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=user_not_found`);
            }

            // Check if Google ID already linked to another user
            const existingLink = await authService.findOAuthLink('google', googleId);
            if (existingLink && existingLink.user_id !== userId) {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=already_linked_to_another_account`);
            }

            // Link account
            await authService.linkOAuthProvider({
                userId,
                provider: 'google',
                providerUserId: googleId,
                email,
                tokens
            });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/profile?oauth_linked=google&success=true`);
        }

        // Login mode
        const user = await authService.upsertUser({ name, email, picture });
        await authService.createWalletIfNotExists(user.id);

        // Check if provider linked, create if not
        const isLinked = await authService.isUserLinkedToProvider(user.id, 'google');
        if (!isLinked) {
            await authService.linkOAuthProvider({
                userId: user.id,
                provider: 'google',
                providerUserId: googleId,
                email,
                tokens
            });
        }

        const hasPassword = user.password_hash && user.password_hash.trim() !== '';
        const isNewUser = !hasPassword;

        // Create JWT
        const jwtToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Create Session
        const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
        const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
        await authService.createSession(user.id, jwtToken, { userAgent: deviceInfo, ip: ipAddress });

        const redirectUrl = req.cookies.oauth_redirect || '/';
        res.clearCookie('oauth_redirect');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (isNewUser) {
            const separator = redirectUrl.includes('?') ? '&' : '?';
            const redirectTo = `${frontendUrl}/set-password${separator}token=${jwtToken}&role=${user.role}&id=${user.id}&newUser=true`;
            return res.redirect(redirectTo);
        }

        const separator = redirectUrl.includes('?') ? '&' : '?';
        const redirectTo = `${frontendUrl}${separator}token=${jwtToken}&role=${user.role}&id=${user.id}`;
        res.redirect(redirectTo);

    } catch (error) {
        console.error('❌ Error in Google OAuth callback:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
    }
}

export async function register(req, res) {
    const { name, email, password } = req.body;

    try {
        const user = await authService.createUser({ name, email, password });
        await authService.createWalletIfNotExists(user.id);

        res.json({ message: 'Registered' });
    } catch (err) {
        console.error('❌ Lỗi khi đăng ký:', err);
        res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
}

export async function linkOAuthProvider(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { provider } = req.params;
        const supportedProviders = ['google', 'github', 'microsoft'];

        if (!supportedProviders.includes(provider)) {
            return res.status(400).json({ message: 'Provider không được hỗ trợ' });
        }

        const isLinked = await authService.isUserLinkedToProvider(userId, provider);
        if (isLinked) {
            return res.status(400).json({ message: `${provider} đã được liên kết với tài khoản này` });
        }

        if (provider === 'google') {
            const state = makeStateCookie(res);
            res.cookie('oauth_link_user_id', userId.toString(), {
                maxAge: 10 * 60 * 1000,
                httpOnly: true,
                sameSite: 'lax',
            });
            res.cookie('oauth_mode', 'link', {
                maxAge: 10 * 60 * 1000,
                httpOnly: true,
                sameSite: 'lax',
            });

            const url = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                prompt: 'consent',
                scope: [
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ],
                state,
            });

            return res.json({
                message: 'Redirecting to OAuth provider...',
                redirectUrl: url
            });
        }

        return res.status(501).json({ message: `Provider ${provider} chưa được triển khai` });
    } catch (error) {
        console.error('❌ Error linking OAuth provider:', error);
        res.status(500).json({ message: 'Error linking OAuth provider' });
    }
}

export async function unlinkOAuthProvider(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { provider } = req.params;
        const supportedProviders = ['google', 'github', 'microsoft'];

        if (!supportedProviders.includes(provider)) {
            return res.status(400).json({ message: 'Provider không được hỗ trợ' });
        }

        const isLinked = await authService.isUserLinkedToProvider(userId, provider);
        if (!isLinked) {
            return res.status(404).json({ message: `${provider} chưa được liên kết với tài khoản này` });
        }

        const { hasPassword, total: totalAuth } = await authService.countAuthMethods(userId);

        if (!hasPassword && totalAuth === 1) {
            return res.status(400).json({
                message: 'Không thể hủy liên kết. Bạn cần có mật khẩu hoặc ít nhất một phương thức đăng nhập khác.',
                suggestion: 'Vui lòng tạo mật khẩu trước khi hủy liên kết OAuth provider này.'
            });
        }

        await authService.unlinkOAuthProvider(userId, provider);

        const { total: remainingAuth } = await authService.countAuthMethods(userId);

        res.json({
            message: `${provider} đã được hủy liên kết thành công`,
            remainingAuthMethods: {
                hasPassword,
                oauthProvidersCount: remainingAuth - (hasPassword ? 1 : 0)
            }
        });
    } catch (error) {
        console.error('❌ Error unlinking OAuth provider:', error);
        res.status(500).json({ message: 'Error unlinking OAuth provider' });
    }
}

export async function logout(req, res) {
    try {
        const userId = req.user?.id;
        const sessionId = req.sessionId;

        if (!userId || !sessionId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await authService.deleteSession(sessionId, userId);

        res.json({
            message: 'Logged out successfully',
            sessionDeleted: true
        });
    } catch (error) {
        console.error('❌ Error in logout:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
}

export async function getLinkedOAuthProviders(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const providers = await authService.getLinkedProviders(userId);
        const { hasPassword, oauthCount, total } = await authService.countAuthMethods(userId);

        res.json({
            providers,
            authenticationMethods: {
                hasPassword,
                oauthProvidersCount: oauthCount,
                totalAuthMethods: total,
                canUnlinkAll: total > 1,
                warning: total === 1
                    ? 'Bạn chỉ có một phương thức đăng nhập. Vui lòng tạo mật khẩu trước khi hủy liên kết OAuth provider.'
                    : null
            }
        });
    } catch (error) {
        console.error('❌ Error getting linked OAuth providers:', error);
        res.status(500).json({ message: 'Error getting linked OAuth providers' });
    }
}

export async function login(req, res) {
    const { email, password } = req.body;

    // Manual verification calling DB is OK here or move to service verifyUser
    const user = await authService.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ message: 'Login failed' });
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    await authService.createSession(user.id, token, { userAgent: deviceInfo, ip: ipAddress });

    res.json({ token, role: user.role, id: user.id });
}
