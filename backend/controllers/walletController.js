import pool from '../db.js';
import vnpayService from '../services/vnpayService.js';
import momoService from '../services/momoService.js';
import currencyService from '../services/currencyService.js';

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
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20)); // Between 1-100
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

        // Use string interpolation for LIMIT/OFFSET (MySQL2 issue with integer params)
        query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

        console.log('📊 Query params:', { userId, limit, offset, type, paramsLength: params.length });

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
        // Use RETURNING id for PostgreSQL compatibility
        const [rows] = await pool.execute(
            `INSERT INTO wallet_transactions 
       (wallet_id, user_id, type, amount, balance_before, balance_after, 
        description, payment_method, status, metadata)
       VALUES (?, ?, 'deposit', ?, ?, ?, ?, ?, 'pending', ?) RETURNING id`,
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

        const transactionId = rows[0].id;

        // Generate payment URL based on payment method
        let paymentUrl;

        if (payment_method === 'vnpay') {
            // VNPay integration
            const orderId = `DEPOSIT_${transactionId}_${Date.now()}`;
            const orderInfo = `Nap tien vao vi - Transaction ${transactionId}`;
            // Get IP address and convert IPv6 localhost to IPv4
            let ipAddr = req.ip || req.connection.remoteAddress || '127.0.0.1';
            // Convert ::1 (IPv6 localhost) to 127.0.0.1 (IPv4)
            if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
                ipAddr = '127.0.0.1';
            }
            // Remove IPv6 prefix if present
            if (ipAddr.startsWith('::ffff:')) {
                ipAddr = ipAddr.substring(7);
            }

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
                     SET metadata = metadata || jsonb_build_object('order_id', ?::text)
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
        } else if (payment_method === 'momo') {
            // MoMo integration
            const orderId = `DEPOSIT_${transactionId}_${Date.now()}`;
            const orderInfo = `Nap tien vao vi - Transaction ${transactionId}`;

            try {
                paymentUrl = await momoService.createPaymentUrl({
                    orderId,
                    amount,
                    orderInfo
                });

                // Update transaction with order ID
                await pool.execute(
                    `UPDATE wallet_transactions 
                     SET metadata = metadata || jsonb_build_object('order_id', ?::text)
                     WHERE id = ?`,
                    [orderId, transactionId]
                );

                console.log(`✅ MoMo payment URL created for transaction ${transactionId}`);
            } catch (error) {
                console.error('❌ Error creating MoMo payment URL:', error);
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
               metadata = metadata || jsonb_build_object('completed_at', ?::text)
           WHERE id = ?`,
                    [newStatus, newBalance, gateway_id, new Date().toISOString(), transaction_id]
                );
            } else {
                // Just update transaction status to failed
                await connection.execute(
                    `UPDATE wallet_transactions 
           SET status = ?, payment_gateway_id = ?,
               metadata = metadata || jsonb_build_object('failed_at', ?::text)
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
        SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'failed' THEN wt.amount ELSE 0 END) as failed_deposit_amount,
        SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'pending' THEN wt.amount ELSE 0 END) as pending_deposit_amount,
        COUNT(CASE WHEN wt.type = 'deposit' AND wt.status = 'failed' THEN 1 END) as total_failed_deposits,
        COUNT(CASE WHEN wt.type = 'deposit' AND wt.status = 'pending' THEN 1 END) as total_pending_deposits,
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
                failed_deposit_amount: 0,
                pending_deposit_amount: 0,
                total_failed_deposits: 0,
                total_pending_deposits: 0,
                last_transaction_at: null
            });
        }

        const result = stats[0];

        // Convert amounts to wallet currency if needed
        // Transactions are stored in USD, so convert to VND if wallet is in VND
        if (result.currency === 'VND') {
            result.total_deposits = currencyService.convertCurrency(
                parseFloat(result.total_deposits) || 0,
                'USD',
                'VND'
            );
            result.total_spent = currencyService.convertCurrency(
                parseFloat(result.total_spent) || 0,
                'USD',
                'VND'
            );
            result.failed_deposit_amount = currencyService.convertCurrency(
                parseFloat(result.failed_deposit_amount) || 0,
                'USD',
                'VND'
            );
            result.pending_deposit_amount = currencyService.convertCurrency(
                parseFloat(result.pending_deposit_amount) || 0,
                'USD',
                'VND'
            );
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Error getting wallet stats:', error);
        res.status(500).json({ message: 'Error getting wallet statistics' });
    }
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
 * Get supported currencies and exchange rates
 */
export async function getCurrencies(req, res) {
    try {
        const currencies = currencyService.getSupportedCurrencies();
        const rates = currencyService.getAllExchangeRates();

        res.json({
            currencies,
            exchangeRates: rates
        });
    } catch (error) {
        console.error('❌ Error getting currencies:', error);
        res.status(500).json({ message: 'Error getting currencies' });
    }
}

/**
 * Update wallet currency
 * Converts existing balance to new currency
 */
export async function updateWalletCurrency(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { currency } = req.body;

        // Validate currency
        const supportedCurrencies = currencyService.getSupportedCurrencies();
        const isSupported = supportedCurrencies.some(c => c.code === currency);

        if (!isSupported) {
            return res.status(400).json({
                message: 'Unsupported currency',
                supportedCurrencies: supportedCurrencies.map(c => c.code)
            });
        }

        // Get wallet
        const [wallets] = await pool.execute(
            'SELECT id, balance, currency FROM user_wallets WHERE user_id = ?',
            [userId]
        );

        if (wallets.length === 0) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const wallet = wallets[0];

        // If currency is the same, no need to update
        if (wallet.currency === currency) {
            return res.json({
                message: 'Currency already set',
                wallet: {
                    balance: wallet.balance,
                    currency: wallet.currency
                }
            });
        }

        // Convert balance to new currency
        const oldCurrency = wallet.currency;
        const oldBalance = parseFloat(wallet.balance);
        const newBalance = currencyService.convertCurrency(oldBalance, oldCurrency, currency);

        // Update wallet
        await pool.execute(
            'UPDATE user_wallets SET currency = ?, balance = ?, updated_at = NOW() WHERE id = ?',
            [currency, newBalance, wallet.id]
        );

        // Log the currency change in transactions
        await pool.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, 
              description, status, metadata)
             VALUES (?, ?, 'deposit', 0, ?, ?, ?, 'completed', ?)`,
            [
                wallet.id,
                userId,
                oldBalance,
                newBalance,
                `Currency changed from ${oldCurrency} to ${currency}`,
                JSON.stringify({
                    action: 'currency_change',
                    old_currency: oldCurrency,
                    new_currency: currency,
                    old_balance: oldBalance,
                    new_balance: newBalance,
                    exchange_rate: currencyService.getExchangeRate(oldCurrency, currency),
                    changed_at: new Date().toISOString()
                })
            ]
        );

        console.log(`✅ Wallet currency updated for user ${userId}: ${oldCurrency} → ${currency}`);
        console.log(`   Balance converted: ${oldBalance} ${oldCurrency} → ${newBalance} ${currency}`);

        res.json({
            message: 'Currency updated successfully',
            wallet: {
                balance: newBalance,
                currency: currency,
                oldBalance: oldBalance,
                oldCurrency: oldCurrency
            }
        });
    } catch (error) {
        console.error('❌ Error updating wallet currency:', error);
        res.status(500).json({ message: 'Error updating wallet currency' });
    }
}

/**
 * Get failed and pending deposit transactions
 * Helps users track unsuccessful deposit attempts
 */
export async function getFailedAndPendingDeposits(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const status = req.query.status; // 'failed', 'pending', or undefined for both

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
            // Get both failed and pending if status not specified
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

        // Convert amounts to wallet currency if needed
        const convertedTransactions = transactions.map(tx => {
            const transaction = { ...tx };
            if (walletCurrency === 'VND') {
                transaction.amount = currencyService.convertCurrency(
                    parseFloat(transaction.amount) || 0,
                    'USD',
                    'VND'
                );
                transaction.balance_before = currencyService.convertCurrency(
                    parseFloat(transaction.balance_before) || 0,
                    'USD',
                    'VND'
                );
                transaction.balance_after = currencyService.convertCurrency(
                    parseFloat(transaction.balance_after) || 0,
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


// ============================================
// WITHDRAWAL FEATURE
// ============================================

/**
 * Add a new bank account
 */
export async function addBankAccount(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { bank_code, bank_name, account_number, account_holder_name, branch_name } = req.body;

        if (!bank_code || !bank_name || !account_number || !account_holder_name) {
            return res.status(400).json({ message: 'Missing required bank information' });
        }

        // Check if account already exists
        const [existing] = await pool.execute(
            'SELECT id FROM bank_accounts WHERE user_id = ? AND bank_code = ? AND account_number = ?',
            [userId, bank_code, account_number]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Bank account already exists' });
        }

        // Add account - PostgreSQL requires RETURNING id to get insertId
        const [rows] = await pool.execute(
            `INSERT INTO bank_accounts 
            (user_id, bank_code, bank_name, account_number, account_holder_name, branch_name, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active') RETURNING id`,
            [userId, bank_code, bank_name, account_number, account_holder_name, branch_name]
        );

        res.json({
            message: 'Bank account added successfully',
            bank_account: {
                id: rows[0].id,
                bank_code,
                bank_name,
                account_number,
                account_holder_name,
                branch_name,
                status: 'active'
            }
        });
    } catch (error) {
        console.error('❌ Error adding bank account:', error);
        res.status(500).json({ message: 'Error adding bank account' });
    }
}

/**
 * Get user bank accounts
 */
export async function getBankAccounts(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const [accounts] = await pool.execute(
            'SELECT * FROM bank_accounts WHERE user_id = ? AND status != ?',
            [userId, 'deleted']
        );

        res.json({ bank_accounts: accounts });
    } catch (error) {
        console.error('❌ Error getting bank accounts:', error);
        res.status(500).json({ message: 'Error getting bank accounts' });
    }
}

/**
 * Delete bank account
 */
export async function deleteBankAccount(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const accountId = req.params.id;

        // Verify ownership
        const [accounts] = await pool.execute(
            'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );

        if (accounts.length === 0) {
            return res.status(404).json({ message: 'Bank account not found' });
        }

        // Soft delete
        await pool.execute(
            'UPDATE bank_accounts SET status = ? WHERE id = ?',
            ['deleted', accountId]
        );

        res.json({ message: 'Bank account deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting bank account:', error);
        res.status(500).json({ message: 'Error deleting bank account' });
    }
}

/**
 * Calculate withdrawal fee
 */
export async function calculateWithdrawalFee(req, res) {
    try {
        const amount = parseFloat(req.body.amount);

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        // Fee logic: Flat 5000 VND (~0.20 USD)
        const fee = 0.5; // Default USD fee
        const netAmount = amount - fee;

        if (netAmount <= 0) {
            return res.status(400).json({ message: 'Amount too small to withdraw' });
        }

        res.json({
            amount,
            fee,
            net_amount: netAmount,
            currency: 'USD'
        });
    } catch (error) {
        console.error('❌ Error calculating fee:', error);
        res.status(500).json({ message: 'Error calculating fee' });
    }
}

/**
 * Initiate withdrawal
 */
export async function withdraw(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { bank_account_id, amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const fee = 0.5; // Fixed fee for now
        const netAmount = amount - fee;

        if (netAmount <= 0) {
            return res.status(400).json({ message: 'Amount too small' });
        }

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Lock wallet for update
            const [wallets] = await connection.execute(
                'SELECT id, balance FROM user_wallets WHERE user_id = ? FOR UPDATE',
                [userId]
            );

            if (wallets.length === 0) {
                throw new Error('Wallet not found');
            }

            const wallet = wallets[0];

            if (parseFloat(wallet.balance) < amount) {
                await connection.rollback();
                return res.status(400).json({ message: 'Insufficient balance' });
            }

            // Deduct balance
            const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
            await connection.execute(
                'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newBalance, wallet.id]
            );

            // Create Transaction Record - use RETURNING id
            const [txRows] = await connection.execute(
                `INSERT INTO wallet_transactions 
                (wallet_id, user_id, type, amount, balance_before, balance_after, 
                 description, status, bank_account_id, withdrawal_fee, net_amount)
                VALUES (?, ?, 'withdrawal', ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
                [
                    wallet.id,
                    userId,
                    -amount, // Negative amount
                    wallet.balance,
                    newBalance,
                    'Withdrawal to Bank Account',
                    'pending', // Initial status
                    bank_account_id,
                    fee,
                    netAmount
                ]
            );

            const transactionId = txRows[0].id;

            // Create Withdrawal Request
            await connection.execute(
                `INSERT INTO withdrawal_requests
                (transaction_id, user_id, bank_account_id, amount, fee, net_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                [transactionId, userId, bank_account_id, amount, fee, netAmount]
            );

            await connection.commit();

            res.json({
                message: 'Withdrawal request submitted',
                withdrawal: {
                    transaction_id: transactionId,
                    amount,
                    fee,
                    net_amount: netAmount,
                    status: 'pending'
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Error processing withdrawal:', error);
        res.status(500).json({ message: 'Error processing withdrawal' });
    }
}

/**
 * Get withdrawal history
 */
export async function getWithdrawals(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const [withdrawals] = await pool.execute(
            'SELECT * FROM v_withdrawal_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );

        res.json({ withdrawals });
    } catch (error) {
        console.error('❌ Error getting withdrawals:', error);
        res.status(500).json({ message: 'Error getting withdrawals' });
    }
}
