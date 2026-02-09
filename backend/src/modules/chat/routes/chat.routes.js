import express from 'express';
// Import verifyToken from shared middleware if needed, though chat currently handles guest mode (userId optional)
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import { chat, history, streamChat } from '../controllers/chat.controller.js';
import { suggest } from '../controllers/suggestion.controller.js';
import { deleteHistoryItem } from '../controllers/conversation.controller.js';

const router = express.Router();

// Middleware to populate user if token exists (optional auth)
// We reuse verifyToken but we need a "soft" version that doesn't reject if no token
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        verifyToken(req, res, next);
    } else {
        next();
    }
};

router.post('/', optionalAuth, chat);
router.post('/stream', optionalAuth, streamChat); // New streaming endpoint
router.get('/history', verifyToken, history);
router.delete('/history/:id', verifyToken, deleteHistoryItem);
router.get('/suggest', suggest);

export default router;
