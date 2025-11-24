import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { 
  getTodayUsage, 
  getUsageStats, 
  getUsageLimits, 
  getUsageHistory 
} from '../controllers/usageController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.get('/today', getTodayUsage);
router.get('/stats', getUsageStats);
router.get('/limits', getUsageLimits);
router.get('/history', getUsageHistory);

export default router;

