import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import {
    getWallet,
    getTransactions,
    getWalletStats,
    getCurrencies,
    updateWalletCurrency
} from '../controllers/wallet.controller.js';
import {
    createDeposit,
    processPaymentCallback,
    getFailedAndPendingDeposits,
    getPaymentMethods
} from '../controllers/deposit.controller.js';
import {
    addBankAccount,
    getBankAccounts,
    deleteBankAccount,
    calculateWithdrawalFee,
    withdraw,
    getWithdrawals
} from '../controllers/withdrawal.controller.js';
import {
    vnpayReturn,
    vnpayIPN,
    queryVNPayTransaction
} from '../controllers/gateways/vnpay.controller.js';
import {
    momoReturn,
    momoIPN
} from '../controllers/gateways/momo.controller.js';

const router = express.Router();

/**
 * Public Callback Routes (Must be before verifyToken)
 */

// VNPay
router.get('/vnpay/return', vnpayReturn);
router.get('/vnpay/ipn', vnpayIPN);

// MoMo
router.get('/momo/return', momoReturn);
router.post('/momo/ipn', momoIPN);

// Payment Callback (General)
router.post('/payment-callback', processPaymentCallback);

/**
 * Private Routes
 */
router.use(verifyToken);

// Core Wallet
router.get('/', getWallet);
router.get('/transactions', getTransactions);
router.get('/stats', getWalletStats);
router.get('/currencies', getCurrencies);
router.put('/currency', updateWalletCurrency);
router.get('/payment-methods', getPaymentMethods);

// Deposit
router.post('/deposit', createDeposit);
router.get('/deposits/failed-pending', getFailedAndPendingDeposits);

// Withdrawal & Banks
router.get('/bank-accounts', getBankAccounts);
router.post('/bank-accounts', addBankAccount);
router.delete('/bank-accounts/:id', deleteBankAccount);
router.post('/withdrawal/calculate-fee', calculateWithdrawalFee);
router.post('/withdraw', withdraw);
router.get('/withdrawals', getWithdrawals);

// Gateway Specific
router.get('/vnpay/query/:orderId', queryVNPayTransaction);

export default router;
