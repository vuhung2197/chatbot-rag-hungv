import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  createPaymentIntent,
  handlePaymentWebhook,
  confirmPayment,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod
} from '../controllers/paymentController.js';

const router = express.Router();

// Webhook endpoint (no auth required, but should verify signature)
router.post('/webhook', handlePaymentWebhook);

// Protected routes
router.post('/intent', verifyToken, createPaymentIntent);
router.post('/confirm', verifyToken, confirmPayment);
router.get('/methods', verifyToken, getPaymentMethods);
router.post('/methods', verifyToken, addPaymentMethod);
router.delete('/methods/:paymentMethodId', verifyToken, removePaymentMethod);

export default router;

