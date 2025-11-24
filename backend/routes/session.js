import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
} from '../controllers/sessionController.js';

const router = express.Router();

// All routes require authentication
router.get('/', verifyToken, getSessions);
router.delete('/:sessionId', verifyToken, revokeSession);
router.delete('/all/others', verifyToken, revokeAllOtherSessions);

export default router;

