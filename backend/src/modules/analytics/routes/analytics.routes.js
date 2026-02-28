import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import AnalyticsController from '../controllers/analytics.controller.js';
import express from 'express';

const router = express.Router();

// GET /api/analytics/weaknesses
router.get('/weaknesses', verifyToken, AnalyticsController.getTopWeaknesses);

// GET /api/analytics/mistakes/recent
router.get('/mistakes/recent', verifyToken, AnalyticsController.getRecentMistakes);

// POST /api/analytics/mistakes
router.post('/mistakes', verifyToken, AnalyticsController.logMistake);

export default router;
