import pool from '../../../../db.js';
import crypto from 'crypto';

class ConversationService {
    /**
     * Generate conversation ID
     */
    generateConversationId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Get or create conversation ID
     * @param {number} userId 
     * @param {string} conversationId 
     */
    async getOrCreateConversationId(userId, conversationId = null) {
        if (conversationId) {
            const [rows] = await pool.execute(
                'SELECT conversation_id FROM user_questions WHERE user_id = ? AND conversation_id = ? LIMIT 1',
                [userId, conversationId]
            );
            if (rows.length > 0) {
                return conversationId;
            }
        }
        return this.generateConversationId();
    }

    /**
     * Get user conversations
     * @param {number} userId 
     */
    async getUserConversations(userId) {
        const [rows] = await pool.execute(
            `SELECT 
        conversation_id,
        COALESCE(MAX(CASE WHEN conversation_title IS NOT NULL AND conversation_title != '' THEN conversation_title END), 
                 MAX(conversation_title)) as conversation_title,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at,
        MIN(created_at) as created_at,
        COALESCE(MAX(is_archived::int)::boolean, FALSE) as is_archived,
        COALESCE(MAX(is_pinned::int)::boolean, FALSE) as is_pinned
       FROM user_questions 
       WHERE user_id = ? AND conversation_id IS NOT NULL
       GROUP BY conversation_id
       ORDER BY is_pinned DESC, last_message_at DESC
       LIMIT 100`,
            [userId]
        );
        return rows;
    }

    /**
     * Rename conversation
     * @param {number} userId 
     * @param {string} conversationId 
     * @param {string} title 
     */
    async renameConversation(userId, conversationId, title) {
        const [result] = await pool.execute(
            `UPDATE user_questions 
       SET conversation_title = ?, updated_at = NOW()
       WHERE user_id = ? AND conversation_id = ?`,
            [title.trim(), userId, conversationId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Get conversation messages
     * @param {number} userId 
     * @param {string} conversationId 
     */
    async getConversationMessages(userId, conversationId) {
        const [rows] = await pool.execute(
            `SELECT id, question, bot_reply, is_answered, created_at, metadata
       FROM user_questions
       WHERE user_id = ? AND conversation_id = ?
       ORDER BY created_at ASC`,
            [userId, conversationId]
        );
        return rows;
    }

    /**
     * Archive conversation
     * @param {number} userId 
     * @param {string} conversationId 
     * @param {boolean} archived 
     */
    async archiveConversation(userId, conversationId, archived) {
        await pool.execute(
            `UPDATE user_questions 
       SET is_archived = ?, updated_at = NOW()
       WHERE user_id = ? AND conversation_id = ?`,
            [archived, userId, conversationId]
        );
    }

    /**
     * Pin conversation
     * @param {number} userId 
     * @param {string} conversationId 
     * @param {boolean} pinned 
     */
    async pinConversation(userId, conversationId, pinned) {
        await pool.execute(
            `UPDATE user_questions 
       SET is_pinned = ?, updated_at = NOW()
       WHERE user_id = ? AND conversation_id = ?`,
            [pinned, userId, conversationId]
        );
    }

    /**
     * Delete conversation
     * @param {number} userId 
     * @param {string} conversationId 
     */
    async deleteConversation(userId, conversationId) {
        await pool.execute(
            `DELETE FROM user_questions 
       WHERE user_id = ? AND conversation_id = ?`,
            [userId, conversationId]
        );
    }

    /**
     * Delete specific message
     * @param {number} userId 
     * @param {number} messageId 
     */
    async deleteMessage(userId, messageId) {
        const [result] = await pool.execute(
            'DELETE FROM user_questions WHERE id = ? AND user_id = ?',
            [messageId, userId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Check if conversation exists (by checking if it has messages)
     * @param {number} userId 
     * @param {string} conversationId 
     */
    async exists(userId, conversationId) {
        const [rows] = await pool.execute(
            'SELECT 1 FROM user_questions WHERE user_id = ? AND conversation_id = ? LIMIT 1',
            [userId, conversationId]
        );
        return rows.length > 0;
    }
}

export default new ConversationService();
