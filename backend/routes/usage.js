import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { getTodayUsage, getUsageStats } from '../controllers/usageController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.get('/today', getTodayUsage);
router.get('/stats', getUsageStats);

export default router;

