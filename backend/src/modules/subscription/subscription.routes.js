import express from 'express';
import { verifyToken } from '../../shared/middlewares/auth.middleware.js';
import {
    getTiers,
    getCurrentSubscription,
    upgradeSubscription,
    cancelSubscription,
    renewSubscription,
    getInvoices,
} from './subscription.controller.js';

const router = express.Router();

router.get('/tiers', getTiers);
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/invoices', verifyToken, getInvoices);
router.post('/upgrade', verifyToken, upgradeSubscription);
router.post('/cancel', verifyToken, cancelSubscription);
router.post('/renew', verifyToken, renewSubscription);

export default router;
