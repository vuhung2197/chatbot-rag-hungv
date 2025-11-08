import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  getConversations,
  renameConversation,
  archiveConversation,
  pinConversation,
  deleteConversation,
  getConversationMessages,
  createConversation
} from '../controllers/conversationController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:conversationId/messages', getConversationMessages);
router.put('/:conversationId/rename', renameConversation);
router.put('/:conversationId/archive', archiveConversation);
router.put('/:conversationId/pin', pinConversation);
router.delete('/:conversationId', deleteConversation);

export default router;

