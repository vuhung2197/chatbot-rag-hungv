import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import { validate } from '#shared/middlewares/validate.middleware.js';
import {
    getConversations,
    getArchivedConversations,
    renameConversation,
    archiveConversation,
    pinConversation,
    deleteConversation,
    getConversationMessages,
    createConversation
} from '../controllers/conversation.controller.js';
import {
    conversationIdSchema,
    renameConversationSchema,
    archiveConversationSchema,
    pinConversationSchema
} from '../chat.schemas.js';

const router = express.Router();

// All conversation routes require authentication
router.use(verifyToken);

router.get('/', getConversations);
router.get('/archived', getArchivedConversations);
router.post('/', createConversation);
router.get('/:conversationId/messages', validate(conversationIdSchema), getConversationMessages);
router.put('/:conversationId/rename', validate(renameConversationSchema), renameConversation);
router.put('/:conversationId/archive', validate(archiveConversationSchema), archiveConversation);
router.put('/:conversationId/pin', validate(pinConversationSchema), pinConversation);
router.delete('/:conversationId', validate(conversationIdSchema), deleteConversation);

export default router;
