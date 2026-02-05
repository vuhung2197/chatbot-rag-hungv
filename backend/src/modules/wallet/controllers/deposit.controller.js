import pool from '../../../../db.js';
import currencyService from '../../../../services/currencyService.js';
import vnpayService from '../../../../services/vnpayService.js';
import momoService from '../../../../services/momoService.js';

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
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

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

        // Get wallet currency for conversion
        const [wallets] = await pool.execute(
            'SELECT currency FROM user_wallets WHERE user_id = ?',
            [userId]
        );
        const walletCurrency = wallets.length > 0 ? wallets[0].currency : 'USD';

        // Convert amounts to wallet currency
        const convertedTransactions = transactions.map(tx => {
            const transaction = { ...tx };
            if (walletCurrency === 'VND') {
                transaction.amount = currencyService.convertCurrency(
                    parseFloat(transaction.amount) || 0,
                    'USD',
                    'VND'
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
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { amount, currency, payment_method } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        // Validate payment method
        const [methods] = await pool.execute(
            'SELECT * FROM payment_methods WHERE name = ? AND is_active = TRUE',
            [payment_method]
        );

        if (methods.length === 0) {
            return res.status(400).json({ message: 'Invalid or inactive payment method' });
        }
        const method = methods[0];

        // Get or create wallet
        let [wallets] = await pool.execute(
            'SELECT id, balance, currency FROM user_wallets WHERE user_id = ?',
            [userId]
        );

        if (wallets.length === 0) {
            const [result] = await pool.execute(
                'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?) RETURNING id',
                [userId, currency || 'USD', 'active']
            );
            wallets = [{ id: result.insertId, balance: 0.00, currency: currency || 'USD' }];
        }
        const wallet = wallets[0];

        // Store amount in USD
        let amountInUsd = amount;
        const inputCurrency = currency || 'USD';
        if (inputCurrency !== 'USD') {
            amountInUsd = currencyService.convertCurrency(amount, inputCurrency, 'USD');
        }

        // Validation amount logic (VND for VNPay/MoMo)
        let amountForValidation = amount;
        if (payment_method === 'vnpay' || payment_method === 'momo') {
            if (inputCurrency !== 'VND') {
                amountForValidation = currencyService.convertCurrency(amount, inputCurrency, 'VND');
            }
        }

        if (amountForValidation < method.min_amount || amountForValidation > method.max_amount) {
            const currencyForLimit = (payment_method === 'vnpay' || payment_method === 'momo') ? 'VND' : inputCurrency;
            return res.status(400).json({
                message: `Amount must be between ${method.min_amount.toLocaleString()} and ${method.max_amount.toLocaleString()} ${currencyForLimit}`,
                min: method.min_amount,
                max: method.max_amount,
                currency: currencyForLimit
            });
        }

        // Create pending transaction in USD
        const [rows] = await pool.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, 
              description, payment_method, status, metadata)
             VALUES (?, ?, 'deposit', ?, ?, ?, ?, ?, 'pending', ?) RETURNING id`,
            [
                wallet.id,
                userId,
                amountInUsd,
                wallet.balance,
                wallet.balance, // unchanged until completed
                `Deposit ${amount} ${inputCurrency}`,
                payment_method,
                JSON.stringify({
                    currency: inputCurrency,
                    original_amount: amount,
                    initiated_at: new Date()
                })
            ]
        );

        const transactionId = rows[0].id;
        let paymentUrl;

        if (payment_method === 'vnpay') {
            const orderId = `DEPOSIT_${transactionId}_${Date.now()}`;
            const orderInfo = `Nap tien vao vi - Transaction ${transactionId}`;
            // IP Handling
            let ipAddr = req.ip || req.connection.remoteAddress || '127.0.0.1';
            if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') ipAddr = '127.0.0.1';
            if (ipAddr.startsWith('::ffff:')) ipAddr = ipAddr.substring(7);

            try {
                let amountForPayment = amount;
                if (inputCurrency !== 'VND') {
                    amountForPayment = currencyService.convertCurrency(amount, inputCurrency, 'VND');
                }
                amountForPayment = Math.round(amountForPayment);

                // VNPay limits check
                if (amountForPayment < 10000 || amountForPayment > 50000000) {
                    throw new Error(`Amount ${amountForPayment.toLocaleString()} VND out of VNPay limits`);
                }

                paymentUrl = await vnpayService.createPaymentUrl({
                    orderId,
                    amount: amountForPayment,
                    orderInfo,
                    ipAddr,
                    locale: 'vn'
                });

                await pool.execute(
                    `UPDATE wallet_transactions 
                     SET metadata = metadata || jsonb_build_object('order_id', ?::text)
                     WHERE id = ?`,
                    [orderId, transactionId]
                );
            } catch (error) {
                console.error('❌ Error creating VNPay URL:', error);
                await pool.execute('UPDATE wallet_transactions SET status = ? WHERE id = ?', ['failed', transactionId]);
                return res.status(500).json({ message: 'Error creating payment URL', error: error.message });
            }
        } else if (payment_method === 'momo') {
            const orderId = `DEPOSIT_${transactionId}_${Date.now()}`;
            const orderInfo = `Nap tien vao vi - Transaction ${transactionId}`;
            try {
                paymentUrl = await momoService.createPaymentUrl({ orderId, amount, orderInfo });
                await pool.execute(
                    `UPDATE wallet_transactions 
                     SET metadata = metadata || jsonb_build_object('order_id', ?::text)
                     WHERE id = ?`,
                    [orderId, transactionId]
                );
            } catch (error) {
                console.error('❌ Error creating MoMo URL:', error);
                await pool.execute('UPDATE wallet_transactions SET status = ? WHERE id = ?', ['failed', transactionId]);
                return res.status(500).json({ message: 'Error creating payment URL', error: error.message });
            }
        } else {
            paymentUrl = `/payment/process?transaction_id=${transactionId}&method=${payment_method}`;
        }

        res.json({
            message: 'Deposit initiated',
            transaction_id: transactionId,
            payment_url: paymentUrl,
            amount,
            currency: currency || 'USD',
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
            'SELECT * FROM wallet_transactions WHERE id = ?',
            [transaction_id]
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
                const [wallets] = await connection.execute(
                    'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
                    [transaction.wallet_id]
                );
                if (wallets.length === 0) throw new Error('Wallet not found');
                const wallet = wallets[0];

                let depositAmount = parseFloat(transaction.amount); // USD
                // Convert to wallet currency if needed for balance update calculation
                // Note: The wallet balance update logic relies on transaction.amount which IS USD.
                // Wait, if transaction.amount is USD, and wallet is VND, we need to convert before adding to balance.
                // But wallet.balance might store VND? Yes.

                // Wait, logic in walletController.js checked wallet.currency.
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
                    [newStatus, newBalance, gateway_id, new Date().toISOString(), depositAmount, wallet.currency, transaction_id]
                );
            } else {
                await connection.execute(
                    `UPDATE wallet_transactions 
                     SET status = ?, payment_gateway_id = ?,
                         metadata = metadata || jsonb_build_object('failed_at', ?::text)
                     WHERE id = ?`,
                    [newStatus, gateway_id, new Date().toISOString(), transaction_id]
                );
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
