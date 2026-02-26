import sessionService from '../services/session.service.js';

/**
 * Lấy danh sách active sessions của user
 */
export async function getSessions(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const currentToken = req.headers.authorization?.replace('Bearer ', '');
        const formattedSessions = await sessionService.getSessions(userId, currentToken);

        res.json({ sessions: formattedSessions });
    } catch (error) {
        console.error('❌ Error getting sessions:', error);
        res.status(500).json({ message: 'Error getting sessions' });
    }
}

/**
 * Revoke (xóa) một session
 */
export async function revokeSession(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { sessionId } = req.params;
        const result = await sessionService.revokeSession(userId, sessionId);
        res.json(result);
    } catch (error) {
        console.error('❌ Error revoking session:', error);
        if (error.message === 'Session not found') return res.status(404).json({ message: error.message });
        res.status(500).json({ message: 'Error revoking session' });
    }
}

/**
 * Revoke all other sessions (keep current one)
 */
export async function revokeAllOtherSessions(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const currentToken = req.headers.authorization?.replace('Bearer ', '');
        const result = await sessionService.revokeAllOtherSessions(userId, currentToken);

        console.log(`✅ Revoked ${result.revokedCount} other session(s) for user ${userId}. Current session kept.`);
        res.json(result);
    } catch (error) {
        console.error('❌ Error revoking all other sessions:', error);
        if (error.message === 'No current session found') return res.status(400).json({ message: error.message });
        res.status(500).json({ message: 'Error revoking sessions' });
    }
}

