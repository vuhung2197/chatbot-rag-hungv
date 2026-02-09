import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import {
    getTiers,
    getCurrentSubscription,
    upgradeSubscription,
    cancelSubscription,
    renewSubscription,
    getInvoices,
    setAutoRenew,
} from '../controllers/subscription.controller.js';

const router = express.Router();

router.get('/tiers', getTiers);
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/invoices', verifyToken, getInvoices);
router.post('/upgrade', verifyToken, upgradeSubscription);
router.post('/cancel', verifyToken, cancelSubscription);
router.post('/renew', verifyToken, renewSubscription);
router.post('/auto-renew', verifyToken, setAutoRenew);

export default router;
