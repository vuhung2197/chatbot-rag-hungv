import pool from '#db';
import crypto from 'crypto';

class SessionService {
    async getSessions(userId, currentToken) {
        const currentTokenHash = currentToken ? crypto.createHash('sha256').update(currentToken).digest('hex') : null;

        const [sessions] = await pool.execute(
            `SELECT 
        id, 
        device_info, 
        ip_address, 
        user_agent, 
        expires_at, 
        created_at,
        CASE WHEN token_hash = ? THEN 1 ELSE 0 END as is_current
      FROM user_sessions 
      WHERE user_id = ? AND expires_at > NOW()
      ORDER BY created_at DESC`,
            [currentTokenHash, userId]
        );

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
        const [rows] = await pool.execute(
            'SELECT id FROM user_sessions WHERE id = ? AND user_id = ?',
            [sessionId, userId]
        );

        if (rows.length === 0) throw new Error('Session not found');

        await pool.execute(
            'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
            [sessionId, userId]
        );

        return { message: 'Session revoked successfully' };
    }

    async revokeAllOtherSessions(userId, currentToken) {
        if (!currentToken) throw new Error('No current session found');

        const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');

        const [sessionsToDelete] = await pool.execute(
            'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ? AND token_hash != ?',
            [userId, currentTokenHash]
        );

        const deletedCount = sessionsToDelete[0].count;

        await pool.execute(
            'DELETE FROM user_sessions WHERE user_id = ? AND token_hash != ?',
            [userId, currentTokenHash]
        );

        return {
            message: 'All other sessions revoked successfully',
            revokedCount: deletedCount,
            messageDetail: `${deletedCount} session(s) đã bị hủy. Các thiết bị khác sẽ bị đăng xuất tự động.`
        };
    }
}

export default new SessionService();
