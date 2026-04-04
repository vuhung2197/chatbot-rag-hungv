import currencyService from '#services/currencyService.js';
import vnpayService from '#services/vnpayService.js';
import momoService from '#services/momoService.js';
import walletService from '../services/wallet.service.js';
import walletRepository from '../repositories/wallet.repository.js';

// ─── Helper: Get client IP address ───
function getClientIp(req) {
    let ipAddr = req.ip || req.connection.remoteAddress || '127.0.0.1';
    if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') return '127.0.0.1';
    if (ipAddr.startsWith('::ffff:')) return ipAddr.substring(7);
    return ipAddr;
}

// ─── Helper: Convert amount for VNPay/MoMo gateway (always VND) ───
function getGatewayAmount(amount, inputCurrency) {
    let amountVnd = inputCurrency !== 'VND'
        ? currencyService.convertCurrency(amount, inputCurrency, 'VND')
        : amount;
    return Math.round(amountVnd);
}

// ─── Helper: Create payment URL based on method ───
async function createPaymentUrl(paymentMethod, { transactionId, amount, inputCurrency, req }) {
    const orderId = `DEPOSIT_${transactionId}_${Date.now()}`;
    const orderInfo = `Nap tien vao vi - Transaction ${transactionId}`;

    if (paymentMethod === 'vnpay') {
        const amountForPayment = getGatewayAmount(amount, inputCurrency);
        if (amountForPayment < 10000 || amountForPayment > 50000000) {
            throw new Error(`Amount ${amountForPayment.toLocaleString()} VND out of VNPay limits`);
        }
        const ipAddr = getClientIp(req);
        const url = await vnpayService.createPaymentUrl({
            orderId, amount: amountForPayment, orderInfo, ipAddr, locale: 'vn'
        });
        await walletRepository.updateTransactionOrderId(transactionId, orderId);
        return url;
    }

    if (paymentMethod === 'momo') {
        const url = await momoService.createPaymentUrl({ orderId, amount, orderInfo });
        await walletRepository.updateTransactionOrderId(transactionId, orderId);
        return url;
    }

    return `/payment/process?transaction_id=${transactionId}&method=${paymentMethod}`;
}

// ─── Helper: Validate deposit amount against payment method limits ───
function validateAmount(amount, inputCurrency, paymentMethod, method) {
    const isVnGateway = paymentMethod === 'vnpay' || paymentMethod === 'momo';
    let amountForValidation = amount;

    if (isVnGateway && inputCurrency !== 'VND') {
        amountForValidation = currencyService.convertCurrency(amount, inputCurrency, 'VND');
    }

    if (amountForValidation < method.min_amount || amountForValidation > method.max_amount) {
        const currencyForLimit = isVnGateway ? 'VND' : inputCurrency;
        return {
            valid: false,
            error: {
                message: `Amount must be between ${method.min_amount.toLocaleString()} and ${method.max_amount.toLocaleString()} ${currencyForLimit}`,
                min: method.min_amount,
                max: method.max_amount,
                currency: currencyForLimit
            }
        };
    }

    return { valid: true };
}

/**
 * Get available payment methods
 */
export async function getPaymentMethods(req, res) {
    try {
        const methods = await walletRepository.getActivePaymentMethods();
        res.json(methods);
    } catch (error) {
        console.error('❌ Error getting payment methods:', error);
        res.status(500).json({ message: 'Error getting payment methods' });
    }
}

/**
 * Get failed and pending deposit transactions
 */
export async function getFailedAndPendingDeposits(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const status = req.query.status;
        const transactions = await walletRepository.getFailedPendingDeposits(userId, status);

        const wallet = await walletRepository.findByUserId(userId);
        const walletCurrency = wallet ? wallet.currency : 'USD';

        const convertedTransactions = transactions.map(tx => {
            const transaction = { ...tx };
            if (walletCurrency === 'VND') {
                transaction.amount = currencyService.convertCurrency(
                    parseFloat(transaction.amount) || 0, 'USD', 'VND'
                );
            }
            transaction.currency = walletCurrency;
            return transaction;
        });

        res.json({
            transactions: convertedTransactions,
            total: convertedTransactions.length,
            currency: walletCurrency
        });
    } catch (error) {
        console.error('❌ Error getting failed/pending deposits:', error);
        res.status(500).json({ message: 'Error getting failed/pending deposits' });
    }
}

/**
 * Create deposit transaction (initiate payment)
 */
export async function createDeposit(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { amount, payment_method } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        // Validate payment method
        const method = await walletRepository.findPaymentMethodByName(payment_method);
        if (!method) return res.status(400).json({ message: 'Invalid or inactive payment method' });

        // Lấy currency từ wallet của user (không tin currency từ frontend)
        const wallet = await walletService.getOrCreateWallet(userId);
        const inputCurrency = wallet.currency || 'USD';

        // Validate amount against limits
        const validation = validateAmount(amount, inputCurrency, payment_method, method);
        if (!validation.valid) return res.status(400).json(validation.error);

        // Store amount in USD
        const amountInUsd = inputCurrency !== 'USD'
            ? currencyService.convertCurrency(amount, inputCurrency, 'USD')
            : amount;

        // Create pending transaction
        const txResult = await walletRepository.createTransaction({
                walletId: wallet.id,
                userId,
                type: 'deposit',
                amount: amountInUsd,
                balanceBefore: wallet.balance,
                balanceAfter: wallet.balance,
                description: `Deposit ${amount} ${inputCurrency}`,
                status: 'pending',
                paymentMethod: payment_method,
                metadata: { currency: inputCurrency, original_amount: amount, initiated_at: new Date() }
            }
        );

        const transactionId = txResult.id;

        // Create payment URL
        let paymentUrl;
        try {
            paymentUrl = await createPaymentUrl(payment_method, {
                transactionId, amount, inputCurrency, req
            });
        } catch (error) {
            console.error(`❌ Error creating ${payment_method} URL:`, error);
            await walletRepository.markTransactionFailed(transactionId);
            return res.status(500).json({ message: 'Error creating payment URL', error: error.message });
        }

        res.json({
            message: 'Deposit initiated',
            transaction_id: transactionId,
            payment_url: paymentUrl,
            amount,
            currency: inputCurrency,
            payment_method
        });
    } catch (error) {
        console.error('❌ Error creating deposit:', error);
        res.status(500).json({ message: 'Error creating deposit' });
    }
}

/**
 * Process payment callback (webhook)
 */
export async function processPaymentCallback(req, res) {
    try {
        const { transaction_id, status, gateway_id } = req.body;
        if (!transaction_id) return res.status(400).json({ message: 'Missing transaction_id' });

        if (status === 'success') {
            const result = await walletService.creditDeposit({
                transactionId: transaction_id,
                gatewayId: gateway_id,
                gatewayMetadata: {}
            });

            if (!result.success && result.alreadyProcessed) {
                return res.json({ message: 'Transaction already processed', status: result.status });
            }

            res.json({ message: 'Payment processed successfully', transaction_id, status: 'completed' });
        } else {
            await walletService.failDeposit(transaction_id, gateway_id);
            res.json({ message: 'Payment processed successfully', transaction_id, status: 'failed' });
        }
    } catch (error) {
        console.error('❌ Error processing payment callback:', error);
        res.status(500).json({ message: 'Error processing payment' });
    }
}
