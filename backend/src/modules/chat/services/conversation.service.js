import crypto from 'crypto';
import conversationRepository from '../repositories/conversation.repository.js';

class ConversationService {
    generateConversationId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async getOrCreateConversationId(userId, conversationId = null) {
        if (conversationId) {
            const existing = await conversationRepository.findConversation(userId, conversationId);
            if (existing) return conversationId;
        }
        return this.generateConversationId();
    }

    async getUserConversations(userId) {
        return conversationRepository.getUserConversations(userId);
    }

    async getArchivedConversations(userId) {
        return conversationRepository.getArchivedConversations(userId);
    }

    async renameConversation(userId, conversationId, title) {
        return conversationRepository.renameConversation(userId, conversationId, title);
    }

    async getConversationMessages(userId, conversationId) {
        return conversationRepository.getConversationMessages(userId, conversationId);
    }

    async archiveConversation(userId, conversationId, archived) {
        return conversationRepository.archiveConversation(userId, conversationId, archived);
    }

    async pinConversation(userId, conversationId, pinned) {
        return conversationRepository.pinConversation(userId, conversationId, pinned);
    }

    async deleteConversation(userId, conversationId) {
        return conversationRepository.deleteConversation(userId, conversationId);
    }

    async deleteMessage(userId, messageId) {
        return conversationRepository.deleteMessage(userId, messageId);
    }

    async exists(userId, conversationId) {
        const row = await conversationRepository.findConversation(userId, conversationId);
        return row !== null;
    }
}

export default new ConversationService();
