import express from 'express';
import {
  chat,
  history,
  suggest,
  deleteHistoryItem,
} from '../controllers/chatController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, chat);
router.get('/history', verifyToken, history);
router.delete('/history/:id', verifyToken, deleteHistoryItem);
router.get('/suggest', suggest);

export default router;
