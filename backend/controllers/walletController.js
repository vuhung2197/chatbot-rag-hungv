import pool from '../db.js';
import vnpayService from '../services/vnpayService.js';

/**
 * Get user wallet information
 */
export async function getWallet(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const [wallets] = await pool.execute(
            `SELECT id, user_id, balance, currency, status, created_at, updated_at
       FROM user_wallets
       WHERE user_id = ?`,
            [userId]
        );

        if (wallets.length === 0) {
            // Create wallet if not exists
            const [result] = await pool.execute(
                'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?)',
                [userId, 'USD', 'active']
            );

            const [newWallet] = await pool.execute(
                'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM user_wallets WHERE id = ?',
                [result.insertId]
            );

            return res.json({ wallet: newWallet[0] });
        }

        res.json({ wallet: wallets[0] });
    } catch (error) {
        console.error('❌ Error getting wallet:', error);
        res.status(500).json({ message: 'Error getting wallet information' });
    }
}

/**
 * Get wallet transaction history
 */
export async function getTransactions(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const type = req.query.type; // filter by type if provided

        let query = `
      SELECT 
        id, wallet_id, type, amount, balance_before, balance_after,
        description, reference_type, reference_id, payment_method,
        payment_gateway_id, status, metadata, created_at
      FROM wallet_transactions
      WHERE user_id = ?
    `;
        const params = [userId];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [transactions] = await pool.execute(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM wallet_transactions WHERE user_id = ?';
        const countParams = [userId];
        if (type) {
            countQuery += ' AND type = ?';
            countParams.push(type);
        }
        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Error getting transactions:', error);
        res.status(500).json({ message: 'Error getting transaction history' });
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

        // Validate amount
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

        // Check amount limits
        if (amount < method.min_amount || amount > method.max_amount) {
            return res.status(400).json({
                message: `Amount must be between ${method.min_amount} and ${method.max_amount}`,
                min: method.min_amount,
                max: method.max_amount
            });
        }

        // Get or create wallet
        let [wallets] = await pool.execute(
            'SELECT id, balance FROM user_wallets WHERE user_id = ?',
            [userId]
        );

        if (wallets.length === 0) {
            const [result] = await pool.execute(
                'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?)',
                [userId, currency || 'USD', 'active']
            );
            wallets = [{ id: result.insertId, balance: 0.00 }];
        }

        const wallet = wallets[0];

        // Create pending transaction
        const [result] = await pool.execute(
            `INSERT INTO wallet_transactions 
       (wallet_id, user_id, type, amount, balance_before, balance_after, 
        description, payment_method, status, metadata)
       VALUES (?, ?, 'deposit', ?, ?, ?, ?, ?, 'pending', ?)`,
            [
                wallet.id,
                userId,
                amount,
                wallet.balance,
                wallet.balance, // Will be updated when payment completes
                `Deposit ${amount} ${currency || 'USD'}`,
                payment_method,
                JSON.stringify({ currency: currency || 'USD', initiated_at: new Date() })
            ]
        );

        const transactionId = result.insertId;

        // Generate payment URL based on payment method
        let paymentUrl;

        if (payment_method === 'vnpay') {
            // VNPay integration
            const orderId = `DEPOSIT_${transactionId}_${Date.now()}`;
            const orderInfo = `Nap tien vao vi - Transaction ${transactionId}`;
            const ipAddr = req.ip || req.connection.remoteAddress || '127.0.0.1';

            try {
                paymentUrl = await vnpayService.createPaymentUrl({
                    orderId,
                    amount,
                    orderInfo,
                    ipAddr,
                    locale: 'vn'
                });

                // Update transaction with order ID
                await pool.execute(
                    `UPDATE wallet_transactions 
                     SET metadata = JSON_SET(metadata, '$.order_id', ?)
                     WHERE id = ?`,
                    [orderId, transactionId]
                );

                console.log(`✅ VNPay payment URL created for transaction ${transactionId}`);
            } catch (error) {
                console.error('❌ Error creating VNPay payment URL:', error);
                // Rollback transaction
                await pool.execute(
                    'UPDATE wallet_transactions SET status = ? WHERE id = ?',
                    ['failed', transactionId]
                );
                return res.status(500).json({
                    message: 'Error creating payment URL',
                    error: error.message
                });
            }
        } else {
            // Mock payment URL for other methods (to be implemented)
            paymentUrl = `/payment/process?transaction_id=${transactionId}&method=${payment_method}`;
            console.log(`⚠️  Using mock payment URL for ${payment_method}`);
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
 * This will be called by payment gateway
 */
export async function processPaymentCallback(req, res) {
    try {
        const { transaction_id, status, gateway_id, signature } = req.body;

        // TODO: Verify signature from payment gateway
        // For now, skip verification in development

        if (!transaction_id) {
            return res.status(400).json({ message: 'Missing transaction_id' });
        }

        // Get transaction
        const [transactions] = await pool.execute(
            'SELECT * FROM wallet_transactions WHERE id = ?',
            [transaction_id]
        );

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const transaction = transactions[0];

        // Check if already processed
        if (transaction.status !== 'pending') {
            return res.json({ message: 'Transaction already processed', status: transaction.status });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Update transaction status
            const newStatus = status === 'success' ? 'completed' : 'failed';

            if (status === 'success') {
                // Get wallet with lock
                const [wallets] = await connection.execute(
                    'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
                    [transaction.wallet_id]
                );

                if (wallets.length === 0) {
                    throw new Error('Wallet not found');
                }

                const wallet = wallets[0];
                const newBalance = parseFloat(wallet.balance) + parseFloat(transaction.amount);

                // Update wallet balance
                await connection.execute(
                    'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                    [newBalance, wallet.id]
                );

                // Update transaction
                await connection.execute(
                    `UPDATE wallet_transactions 
           SET status = ?, balance_after = ?, payment_gateway_id = ?, 
               metadata = JSON_SET(metadata, '$.completed_at', ?)
           WHERE id = ?`,
                    [newStatus, newBalance, gateway_id, new Date().toISOString(), transaction_id]
                );
            } else {
                // Just update transaction status to failed
                await connection.execute(
                    `UPDATE wallet_transactions 
           SET status = ?, payment_gateway_id = ?,
               metadata = JSON_SET(metadata, '$.failed_at', ?)
           WHERE id = ?`,
                    [newStatus, gateway_id, new Date().toISOString(), transaction_id]
                );
            }

            await connection.commit();

            res.json({
                message: 'Payment processed successfully',
                transaction_id,
                status: newStatus
            });
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

/**
 * Get wallet statistics
 */
export async function getWalletStats(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const [stats] = await pool.execute(
            `SELECT 
        w.balance,
        w.currency,
        COUNT(DISTINCT wt.id) as total_transactions,
        SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' THEN wt.amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' THEN ABS(wt.amount) ELSE 0 END) as total_spent,
        MAX(wt.created_at) as last_transaction_at
       FROM user_wallets w
       LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
       WHERE w.user_id = ?
       GROUP BY w.id, w.balance, w.currency`,
            [userId]
        );

        if (stats.length === 0) {
            return res.json({
                balance: 0,
                currency: 'USD',
                total_transactions: 0,
                total_deposits: 0,
                total_spent: 0,
                last_transaction_at: null
            });
        }

        res.json(stats[0]);
    } catch (error) {
        console.error('❌ Error getting wallet stats:', error);
        res.status(500).json({ message: 'Error getting wallet statistics' });
    }
}
