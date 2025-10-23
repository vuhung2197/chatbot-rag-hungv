import express from 'express';
import { advancedChat, getAdvancedRAGStats } from '../controllers/advancedChatController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Advanced Chat Routes
 * Sử dụng Multi-Chunk Reasoning cho câu hỏi phức tạp
 */

// POST /advanced-chat - Advanced chat với multi-chunk reasoning
router.post('/advanced-chat', verifyToken, advancedChat);

// GET /advanced-chat/stats - Thống kê advanced RAG
router.get('/advanced-chat/stats', verifyToken, getAdvancedRAGStats);

export default router;
