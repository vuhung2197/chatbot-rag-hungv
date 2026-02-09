import express from 'express';
import { verifyToken } from '../../../shared/middlewares/auth.middleware.js';
import {
    getSessions,
    revokeSession,
    revokeAllOtherSessions,
} from '../controllers/session.controller.js';

const router = express.Router();

// All routes require authentication
router.get('/', verifyToken, getSessions);
router.delete('/:sessionId', verifyToken, revokeSession);
router.delete('/all/others', verifyToken, revokeAllOtherSessions);

export default router;
