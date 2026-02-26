import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import {
    createPaymentIntent,
    handlePaymentWebhook,
    confirmPayment,
    getPaymentMethods,
    addPaymentMethod,
    removePaymentMethod
} from '../controllers/gateways/payment.controller.js';

const router = express.Router();

// Webhook endpoint (no auth required)
router.post('/webhook', handlePaymentWebhook);

// Protected routes
router.use(verifyToken);
router.post('/intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/methods', getPaymentMethods);
router.post('/methods', addPaymentMethod);
router.delete('/methods/:paymentMethodId', removePaymentMethod);

export default router;
