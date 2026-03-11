import pool from '#db';
import currencyService from '#services/currencyService.js';
import vnpayService from '#services/vnpayService.js';
import momoService from '#services/momoService.js';

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
        await updateTransactionOrderId(transactionId, orderId);
        return url;
    }

    if (paymentMethod === 'momo') {
        const url = await momoService.createPaymentUrl({ orderId, amount, orderInfo });
        await updateTransactionOrderId(transactionId, orderId);
        return url;
    }

    return `/payment/process?transaction_id=${transactionId}&method=${paymentMethod}`;
}

// ─── Helper: Update transaction with order ID ───
async function updateTransactionOrderId(transactionId, orderId) {
    await pool.execute(
        `UPDATE wallet_transactions 
         SET metadata = metadata || jsonb_build_object('order_id', ?::text)
         WHERE id = ?`,
        [orderId, transactionId]
    );
}

// ─── Helper: Get or create wallet ───
async function getOrCreateWallet(userId, currency) {
    let [wallets] = await pool.execute(
        'SELECT id, balance, currency FROM user_wallets WHERE user_id = ?',
        [userId]
    );

    if (wallets.length === 0) {
        const [result] = await pool.execute(
            'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?) RETURNING id',
            [userId, currency || 'USD', 'active']
        );
        return { id: result.insertId, balance: 0.00, currency: currency || 'USD' };
    }

    return wallets[0];
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
        const [methods] = await pool.execute(
            'SELECT name, display_name, provider, min_amount, max_amount, is_active FROM payment_methods WHERE is_active = TRUE'
        );
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
        let query = `
            SELECT 
                id, wallet_id, amount, balance_before, balance_after,
                description, payment_method, payment_gateway_id, 
                status, metadata, created_at
            FROM wallet_transactions
            WHERE user_id = ? AND type = 'deposit'
        `;
        const params = [userId];

        if (status === 'failed' || status === 'pending') {
            query += ' AND status = ?';
            params.push(status);
        } else {
            query += ' AND status IN (?, ?)';
            params.push('failed', 'pending');
        }

        query += ' ORDER BY created_at DESC';
        const [transactions] = await pool.execute(query, params);

        const [wallets] = await pool.execute(
            'SELECT currency FROM user_wallets WHERE user_id = ?', [userId]
        );
        const walletCurrency = wallets.length > 0 ? wallets[0].currency : 'USD';

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

        const { amount, currency, payment_method } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        // Validate payment method
        const [methods] = await pool.execute(
            'SELECT * FROM payment_methods WHERE name = ? AND is_active = TRUE',
            [payment_method]
        );
        if (methods.length === 0) return res.status(400).json({ message: 'Invalid or inactive payment method' });
        const method = methods[0];

        const inputCurrency = currency || 'USD';

        // Validate amount against limits
        const validation = validateAmount(amount, inputCurrency, payment_method, method);
        if (!validation.valid) return res.status(400).json(validation.error);

        // Get or create wallet
        const wallet = await getOrCreateWallet(userId, currency);

        // Store amount in USD
        const amountInUsd = inputCurrency !== 'USD'
            ? currencyService.convertCurrency(amount, inputCurrency, 'USD')
            : amount;

        // Create pending transaction
        const [rows] = await pool.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, 
              description, payment_method, status, metadata)
             VALUES (?, ?, 'deposit', ?, ?, ?, ?, ?, 'pending', ?) RETURNING id`,
            [
                wallet.id, userId, amountInUsd, wallet.balance, wallet.balance,
                `Deposit ${amount} ${inputCurrency}`, payment_method,
                JSON.stringify({ currency: inputCurrency, original_amount: amount, initiated_at: new Date() })
            ]
        );

        const transactionId = rows[0].id;

        // Create payment URL
        let paymentUrl;
        try {
            paymentUrl = await createPaymentUrl(payment_method, {
                transactionId, amount, inputCurrency, req
            });
        } catch (error) {
            console.error(`❌ Error creating ${payment_method} URL:`, error);
            await pool.execute('UPDATE wallet_transactions SET status = ? WHERE id = ?', ['failed', transactionId]);
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

        const [transactions] = await pool.execute(
            'SELECT * FROM wallet_transactions WHERE id = ?', [transaction_id]
        );
        if (transactions.length === 0) return res.status(404).json({ message: 'Transaction not found' });

        const transaction = transactions[0];
        if (transaction.status !== 'pending') {
            return res.json({ message: 'Transaction already processed', status: transaction.status });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const newStatus = status === 'success' ? 'completed' : 'failed';

            if (status === 'success') {
                await processSuccessfulDeposit(connection, transaction, gateway_id, transaction_id, newStatus);
            } else {
                await processFailedDeposit(connection, gateway_id, transaction_id, newStatus);
            }

            await connection.commit();
            res.json({ message: 'Payment processed successfully', transaction_id, status: newStatus });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('❌ Error processing payment callback:', error);
        res.status(500).json({ message: 'Error processing payment' });
    }
}

// ─── Helper: Process successful deposit ───
async function processSuccessfulDeposit(connection, transaction, gatewayId, transactionId, newStatus) {
    const [wallets] = await connection.execute(
        'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
        [transaction.wallet_id]
    );
    if (wallets.length === 0) throw new Error('Wallet not found');
    const wallet = wallets[0];

    let depositAmount = parseFloat(transaction.amount);
    if (wallet.currency !== 'USD') {
        depositAmount = currencyService.convertCurrency(depositAmount, 'USD', wallet.currency);
    }
    const newBalance = parseFloat(wallet.balance) + depositAmount;

    await connection.execute(
        'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
        [newBalance, wallet.id]
    );

    await connection.execute(
        `UPDATE wallet_transactions 
         SET status = ?, balance_after = ?, payment_gateway_id = ?, 
             metadata = metadata || jsonb_build_object('completed_at', ?::text, 'credited_amount', ?::text, 'credited_currency', ?::text)
         WHERE id = ?`,
        [newStatus, newBalance, gatewayId, new Date().toISOString(), depositAmount, wallet.currency, transactionId]
    );
}

// ─── Helper: Process failed deposit ───
async function processFailedDeposit(connection, gatewayId, transactionId, newStatus) {
    await connection.execute(
        `UPDATE wallet_transactions 
         SET status = ?, payment_gateway_id = ?,
             metadata = metadata || jsonb_build_object('failed_at', ?::text)
         WHERE id = ?`,
        [newStatus, gatewayId, new Date().toISOString(), transactionId]
    );
}
