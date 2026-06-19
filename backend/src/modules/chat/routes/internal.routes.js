import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import { buildProgressContext } from '../handlers/progress.handler.js';

/**
 * Internal API — cho ai-service (Python) gọi ngược lấy dữ liệu nghiệp vụ.
 * Business logic vẫn ở Node (1 nơi); Python chỉ tiêu thụ. Yêu cầu JWT (forward từ user).
 */
const router = express.Router();

// GET /internal/user-progress/:id -> { user_id, context }
// context: chuỗi tiến độ đã format (ai-service đưa cho LLM diễn giải).
router.get('/user-progress/:id', verifyToken, async (req, res) => {
    const requestedId = parseInt(req.params.id, 10);
    // Chỉ cho lấy tiến độ của CHÍNH user trong token (tránh lộ dữ liệu người khác).
    if (!req.user?.id || req.user.id !== requestedId) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const context = await buildProgressContext(requestedId);
        res.json({ user_id: requestedId, context });
    } catch (err) {
        console.error('❌ internal user-progress error:', err);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

export default router;
