import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  getTiers,
  getCurrentSubscription,
  upgradeSubscription,
  cancelSubscription,
  renewSubscription,
  getInvoices,
} from '../controllers/subscriptionController.js';

const router = express.Router();

// Public: Get all tiers
router.get('/tiers', getTiers);

// Protected: User subscription management
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/invoices', verifyToken, getInvoices);
router.post('/upgrade', verifyToken, upgradeSubscription);
router.post('/cancel', verifyToken, cancelSubscription);
router.post('/renew', verifyToken, renewSubscription);

export default router;

