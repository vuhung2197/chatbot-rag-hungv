import crypto from 'crypto';
import pool from '../db.js';
import '../bootstrap/env.js';

/**
 * Lấy danh sách active sessions của user
 */
export async function getSessions(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get current token hash from request (if available)
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    const currentTokenHash = currentToken ? crypto.createHash('sha256').update(currentToken).digest('hex') : null;

    // Get all active sessions
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

    // Format sessions
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      deviceInfo: session.device_info || 'Unknown Device',
      ipAddress: session.ip_address || 'Unknown',
      userAgent: session.user_agent || 'Unknown',
      isCurrent: Boolean(session.is_current),
      expiresAt: session.expires_at,
      createdAt: session.created_at,
    }));

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

    // Check if session belongs to user
    const [rows] = await pool.execute(
      'SELECT id FROM user_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Delete session
    await pool.execute(
      'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('❌ Error revoking session:', error);
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

    // Get current token hash
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    if (!currentToken) {
      return res.status(400).json({ message: 'No current session found' });
    }

    const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');

    // Get count of sessions to be deleted
    const [sessionsToDelete] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ? AND token_hash != ?',
      [userId, currentTokenHash]
    );
    
    const deletedCount = sessionsToDelete[0].count;

    // Delete all sessions except current
    await pool.execute(
      'DELETE FROM user_sessions WHERE user_id = ? AND token_hash != ?',
      [userId, currentTokenHash]
    );

    console.log(`✅ Revoked ${deletedCount} other session(s) for user ${userId}. Current session kept.`);

    res.json({ 
      message: 'All other sessions revoked successfully',
      revokedCount: deletedCount,
      messageDetail: `${deletedCount} session(s) đã bị hủy. Các thiết bị khác sẽ bị đăng xuất tự động.`
    });
  } catch (error) {
    console.error('❌ Error revoking all other sessions:', error);
    res.status(500).json({ message: 'Error revoking sessions' });
  }
}

