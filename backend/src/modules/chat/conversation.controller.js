import pool from '../../../db.js';
import crypto from 'crypto';

/**
 * Generate conversation ID
 */
function generateConversationId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Get all conversations for a user
 */
export async function getConversations(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const [rows] = await pool.execute(
            `SELECT 
        conversation_id,
        COALESCE(MAX(CASE WHEN conversation_title IS NOT NULL AND conversation_title != '' THEN conversation_title END), 
                 MAX(conversation_title)) as conversation_title,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at,
        MIN(created_at) as created_at,
        COALESCE(MAX(is_archived), FALSE) as is_archived,
        COALESCE(MAX(is_pinned), FALSE) as is_pinned
       FROM user_questions 
       WHERE user_id = ? AND conversation_id IS NOT NULL
       GROUP BY conversation_id
       ORDER BY is_pinned DESC, last_message_at DESC
       LIMIT 100`,
            [userId]
        );

        res.json({ conversations: rows });
    } catch (error) {
        console.error('❌ Error getting conversations:', error);
        res.status(500).json({ message: 'Error getting conversations' });
    }
}

/**
 * Rename a conversation
 */
export async function renameConversation(req, res) {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;
        const { title } = req.body;

        if (!userId || !conversationId || !title) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Update all messages in the conversation
        const [result] = await pool.execute(
            `UPDATE user_questions 
       SET conversation_title = ?, updated_at = NOW()
       WHERE user_id = ? AND conversation_id = ?`,
            [title.trim(), userId, conversationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        res.json({ message: 'Conversation renamed successfully', title });
    } catch (error) {
        console.error('❌ Error renaming conversation:', error);
        res.status(500).json({ message: 'Error renaming conversation' });
    }
}

/**
 * Create or get conversation ID for a new message
 * @param {string} userId - User ID
 * @param {string} conversationId - Existing conversation ID (optional)
 * @returns {string} Conversation ID
 */
export async function getOrCreateConversationId(userId, conversationId = null) {
    try {
        // If conversationId is provided and exists, use it
        if (conversationId) {
            const [rows] = await pool.execute(
                'SELECT conversation_id FROM user_questions WHERE user_id = ? AND conversation_id = ? LIMIT 1',
                [userId, conversationId]
            );
            if (rows.length > 0) {
                return conversationId;
            }
        }
        // Otherwise, create a new conversation
        return generateConversationId();
    } catch (error) {
        console.error('❌ Error creating conversation ID:', error);
        return generateConversationId(); // Fallback
    }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(req, res) {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;

        if (!userId || !conversationId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const [rows] = await pool.execute(
            `SELECT id, question, bot_reply, is_answered, created_at, metadata
       FROM user_questions
       WHERE user_id = ? AND conversation_id = ?
       ORDER BY created_at ASC`,
            [userId, conversationId]
        );

        res.json({ messages: rows });
    } catch (error) {
        console.error('❌ Error getting conversation messages:', error);
        res.status(500).json({ message: 'Error getting conversation messages' });
    }
}

/**
 * Create a new conversation
 */
export async function createConversation(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const conversationId = generateConversationId();
        res.json({ conversationId });
    } catch (error) {
        console.error('❌ Error creating conversation:', error);
        res.status(500).json({ message: 'Error creating conversation' });
    }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(req, res) {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;
        const { archived = true } = req.body;

        if (!userId || !conversationId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        await pool.execute(
            `UPDATE user_questions 
       SET is_archived = ?, updated_at = NOW()
       WHERE user_id = ? AND conversation_id = ?`,
            [archived, userId, conversationId]
        );

        res.json({ message: `Conversation ${archived ? 'archived' : 'unarchived'} successfully` });
    } catch (error) {
        console.error('❌ Error archiving conversation:', error);
        res.status(500).json({ message: 'Error archiving conversation' });
    }
}

/**
 * Pin/unpin a conversation
 */
export async function pinConversation(req, res) {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;
        const { pinned = true } = req.body;

        if (!userId || !conversationId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        await pool.execute(
            `UPDATE user_questions 
       SET is_pinned = ?, updated_at = NOW()
       WHERE user_id = ? AND conversation_id = ?`,
            [pinned, userId, conversationId]
        );

        res.json({ message: `Conversation ${pinned ? 'pinned' : 'unpinned'} successfully` });
    } catch (error) {
        console.error('❌ Error pinning conversation:', error);
        res.status(500).json({ message: 'Error pinning conversation' });
    }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(req, res) {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;

        if (!userId || !conversationId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        await pool.execute(
            `DELETE FROM user_questions 
       WHERE user_id = ? AND conversation_id = ?`,
            [userId, conversationId]
        );

        res.json({ message: 'Conversation deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting conversation:', error);
        res.status(500).json({ message: 'Error deleting conversation' });
    }
}

/**
 * Xóa một câu hỏi (message) khỏi lịch sử chat của người dùng hiện tại theo id.
 * Chỉ xóa nếu câu hỏi thuộc về user đang đăng nhập.
 * (Moved from chatController.js)
 */
export async function deleteHistoryItem(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !userId) {
        return res
            .status(400)
            .json({ message: 'Thiếu ID hoặc thông tin người dùng.' });
    }

    try {
        const [result] = await pool.execute(
            'DELETE FROM user_questions WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ message: 'Không tìm thấy câu hỏi hoặc không có quyền xóa.' });
        }

        return res.json({ message: 'Đã xóa thành công.' });
    } catch (error) {
        console.error('❌ Lỗi khi xóa câu hỏi:', error);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
}
