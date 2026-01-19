import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
    getWallet,
    getTransactions,
    createDeposit,
    processPaymentCallback,
    getWalletStats
} from '../controllers/walletController.js';

const router = express.Router();

// All wallet routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/wallet
 * @desc    Get user wallet information
 * @access  Private
 */
router.get('/', getWallet);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get wallet transaction history
 * @access  Private
 * @query   page, limit, type
 */
router.get('/transactions', getTransactions);

/**
 * @route   GET /api/wallet/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get('/stats', getWalletStats);

/**
 * @route   POST /api/wallet/deposit
 * @desc    Create deposit transaction
 * @access  Private
 * @body    { amount, currency, payment_method }
 */
router.post('/deposit', createDeposit);

/**
 * @route   POST /api/wallet/payment-callback
 * @desc    Process payment callback from gateway
 * @access  Public (but should verify signature)
 * @body    { transaction_id, status, gateway_id, signature }
 */
router.post('/payment-callback', processPaymentCallback);

export default router;
