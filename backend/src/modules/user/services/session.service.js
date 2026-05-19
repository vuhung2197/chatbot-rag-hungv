import crypto from 'crypto';
import sessionRepository from '../repositories/session.repository.js';

class SessionService {
    async getSessions(userId, currentToken) {
        const currentTokenHash = currentToken
            ? crypto.createHash('sha256').update(currentToken).digest('hex')
            : null;

        const sessions = await sessionRepository.getActiveSessions(userId, currentTokenHash);

        return sessions.map(session => ({
            id: session.id,
            deviceInfo: session.device_info || 'Unknown Device',
            ipAddress: session.ip_address || 'Unknown',
            userAgent: session.user_agent || 'Unknown',
            isCurrent: Boolean(session.is_current),
            expiresAt: session.expires_at,
            createdAt: session.created_at,
        }));
    }

    async revokeSession(userId, sessionId) {
        const session = await sessionRepository.findSession(sessionId, userId);
        if (!session) throw new Error('Session not found');

        await sessionRepository.deleteSession(sessionId, userId);
        return { message: 'Session revoked successfully' };
    }

    async revokeAllOtherSessions(userId, currentToken) {
        if (!currentToken) throw new Error('No current session found');

        const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
        const deletedCount = await sessionRepository.countOtherSessions(userId, currentTokenHash);
        await sessionRepository.deleteOtherSessions(userId, currentTokenHash);

        return {
            message: 'All other sessions revoked successfully',
            revokedCount: deletedCount,
            messageDetail: `${deletedCount} session(s) đã bị hủy. Các thiết bị khác sẽ bị đăng xuất tự động.`,
        };
    }
}

export default new SessionService();
