import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
    getWallet,
    getTransactions,
    createDeposit,
    processPaymentCallback,
    getWalletStats,
    getPaymentMethods,
    getCurrencies,
    updateWalletCurrency,
    getFailedAndPendingDeposits
} from '../controllers/walletController.js';
import { vnpayReturn, vnpayIPN } from '../controllers/vnpayController.js';
import { queryVNPayTransaction } from '../controllers/vnpayQueryController.js';
import { momoReturn, momoIPN } from '../controllers/momoController.js';

const router = express.Router();

/**
 * VNPay Callback Routes (Public - No authentication required)
 * These MUST be before verifyToken middleware
 */

/**
 * @route   GET /wallet/vnpay/return
 * @desc    VNPay return URL - User redirected here after payment
 * @access  Public
 */
router.get('/vnpay/return', vnpayReturn);

/**
 * @route   GET /wallet/vnpay/ipn
 * @desc    VNPay IPN (Instant Payment Notification)
 * @access  Public (VNPay server calls this)
 */
router.get('/vnpay/ipn', vnpayIPN);

/**
 * MoMo Callback Routes (Public - No authentication required)
 * These MUST be before verifyToken middleware
 */

/**
 * @route   GET /wallet/momo/return
 * @desc    MoMo return URL - User redirected here after payment
 * @access  Public
 */
router.get('/momo/return', momoReturn);

/**
 * @route   POST /wallet/momo/ipn
 * @desc    MoMo IPN (Instant Payment Notification)
 * @access  Public (MoMo server calls this)
 */
router.post('/momo/ipn', momoIPN);

// All other wallet routes require authentication
router.use(verifyToken);

/**
 * @route   GET /wallet
 * @desc    Get user wallet information
 * @access  Private
 */
router.get('/', getWallet);

/**
 * @route   GET /wallet/transactions
 * @desc    Get wallet transaction history
 * @access  Private
 * @query   page, limit, type
 */
router.get('/transactions', getTransactions);

/**
 * @route   GET /wallet/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get('/stats', getWalletStats);

/**
 * @route   GET /wallet/vnpay/query/:orderId
 * @desc    Query VNPay transaction status
 * @access  Private
 */
router.get('/vnpay/query/:orderId', queryVNPayTransaction);

/**
 * @route   POST /wallet/deposit
 * @desc    Create deposit transaction
 * @access  Private
 * @body    { amount, currency, payment_method }
 */
router.post('/deposit', createDeposit);

/**
 * @route   POST /wallet/payment-callback
 * @desc    Process payment callback from gateway
 * @access  Public (but should verify signature)
 * @body    { transaction_id, status, gateway_id, signature }
 */
router.post('/payment-callback', processPaymentCallback);

/**
 * @route   GET /wallet/payment-methods
 * @desc    Get available payment methods
 * @access  Private
 */
router.get('/payment-methods', getPaymentMethods);

/**
 * @route   GET /wallet/currencies
 * @desc    Get supported currencies and exchange rates
 * @access  Private
 */
router.get('/currencies', verifyToken, getCurrencies);

/**
 * @route   PUT /wallet/currency
 * @desc    Update wallet currency (converts balance)
 * @access  Private
 * @body    { currency }
 */
router.put('/currency', verifyToken, updateWalletCurrency);

/**
 * @route   GET /wallet/deposits/failed-pending
 * @desc    Get failed and pending deposit transactions
 * @access  Private
 * @query   status (optional: 'failed' or 'pending')
 */
router.get('/deposits/failed-pending', getFailedAndPendingDeposits);

export default router;

