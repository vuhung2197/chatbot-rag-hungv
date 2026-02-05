import express from 'express';
import { advancedChat, getAdvancedRAGStats } from './chat.controller.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../../../db.js';

const router = express.Router();

// Middleware for optional auth - rewritten to not block on error
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            // 1. Verify JWT signature
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 2. Hash token to check session
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            // 3. Check DB
            const [sessions] = await pool.execute(
                `SELECT id, user_id FROM user_sessions WHERE token_hash = ? AND expires_at > NOW()`,
                [tokenHash]
            );

            // 4. Validate
            if (sessions.length > 0 && sessions[0].user_id === decoded.id) {
                req.user = decoded;
                req.sessionId = sessions[0].id;
            }
        } catch (e) {
            // Silently ignore auth errors for optional route
            // User will be treated as guest
        }
    }
    next();
};

router.post('/', optionalAuth, advancedChat);
router.get('/stats', getAdvancedRAGStats);

export default router;
