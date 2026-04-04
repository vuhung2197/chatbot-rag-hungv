import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import { validate } from '#shared/middlewares/validate.middleware.js';
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
import {
    createDepositSchema,
    withdrawSchema,
    calculateFeeSchema,
    addBankAccountSchema,
    deleteBankAccountSchema,
    updateCurrencySchema,
    getTransactionsSchema,
    getFailedPendingSchema,
    queryVnpaySchema
} from '../wallet.schemas.js';

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
router.get('/transactions', validate(getTransactionsSchema), getTransactions);
router.get('/stats', getWalletStats);
router.get('/currencies', getCurrencies);
router.put('/currency', validate(updateCurrencySchema), updateWalletCurrency);
router.get('/payment-methods', getPaymentMethods);

// Deposit
router.post('/deposit', validate(createDepositSchema), createDeposit);
router.get('/deposits/failed-pending', validate(getFailedPendingSchema), getFailedAndPendingDeposits);

// Withdrawal & Banks
router.get('/bank-accounts', getBankAccounts);
router.post('/bank-accounts', validate(addBankAccountSchema), addBankAccount);
router.delete('/bank-accounts/:id', validate(deleteBankAccountSchema), deleteBankAccount);
router.post('/withdrawal/calculate-fee', validate(calculateFeeSchema), calculateWithdrawalFee);
router.post('/withdraw', validate(withdrawSchema), withdraw);
router.get('/withdrawals', getWithdrawals);

// Gateway Specific
router.get('/vnpay/query/:orderId', validate(queryVnpaySchema), queryVNPayTransaction);

export default router;
