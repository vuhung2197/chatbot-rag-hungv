import conversationService from '../services/conversation.service.js';

/**
 * Get all conversations for a user
 */
export async function getConversations(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const conversations = await conversationService.getUserConversations(userId);
        res.json({ conversations });
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

        const success = await conversationService.renameConversation(userId, conversationId, title);

        if (!success) {
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
 * (Kept for backward compatibility if any other module uses it, but it should be used via Service from now on)
 */
export async function getOrCreateConversationId(userId, conversationId = null) {
    return conversationService.getOrCreateConversationId(userId, conversationId);
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

        const messages = await conversationService.getConversationMessages(userId, conversationId);
        res.json({ messages });
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

        const conversationId = conversationService.generateConversationId();
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

        await conversationService.archiveConversation(userId, conversationId, archived);
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

        await conversationService.pinConversation(userId, conversationId, pinned);
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

        await conversationService.deleteConversation(userId, conversationId);
        res.json({ message: 'Conversation deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting conversation:', error);
        res.status(500).json({ message: 'Error deleting conversation' });
    }
}

/**
 * Xóa một câu hỏi (message) khỏi lịch sử chat của người dùng hiện tại theo id.
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
        const success = await conversationService.deleteMessage(userId, id);

        if (!success) {
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
