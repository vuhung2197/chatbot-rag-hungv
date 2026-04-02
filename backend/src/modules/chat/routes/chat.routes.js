import express from 'express';
// Import verifyToken from shared middleware if needed, though chat currently handles guest mode (userId optional)
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import { validate } from '#shared/middlewares/validate.middleware.js';
import { chat, history, streamChat } from '../controllers/chat.controller.js';
import { suggest } from '../controllers/suggestion.controller.js';
import { deleteHistoryItem } from '../controllers/conversation.controller.js';
import { chatSchema, deleteHistoryItemSchema } from '../chat.schemas.js';

const router = express.Router();

// Middleware to populate user if token exists (optional auth)
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            await verifyToken(req, res, () => {});
            next();
        } catch (error) {
            // Token invalid, continue without user
            next();
        }
    } else {
        next();
    }
};

router.post('/', optionalAuth, validate(chatSchema), chat);
router.post('/stream', optionalAuth, validate(chatSchema), streamChat); // New streaming endpoint
router.get('/history', verifyToken, history);
router.delete('/history/:id', verifyToken, validate(deleteHistoryItemSchema), deleteHistoryItem);
router.get('/suggest', suggest);

export default router;
