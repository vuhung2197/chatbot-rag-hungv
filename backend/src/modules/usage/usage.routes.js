import express from 'express';
import { verifyToken } from '../../shared/middlewares/auth.middleware.js';
import {
    getTodayUsage,
    getUsageStats,
    getUsageLimits,
    getUsageHistory
} from './usage.controller.js';

const router = express.Router();

router.use(verifyToken);
router.get('/today', getTodayUsage);
router.get('/stats', getUsageStats);
router.get('/limits', getUsageLimits);
router.get('/history', getUsageHistory);

export default router;
