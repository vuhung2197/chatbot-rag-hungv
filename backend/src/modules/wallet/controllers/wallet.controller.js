import pool from '../../../../db.js';
import currencyService from '../../../../services/currencyService.js';

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
                'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?) RETURNING id',
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

        // Use string interpolation for LIMIT/OFFSET
        query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

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

        // Get wallet currency to convert amounts if needed
        const [wallets] = await pool.execute(
            'SELECT currency FROM user_wallets WHERE user_id = ?',
            [userId]
        );
        const walletCurrency = wallets.length > 0 ? wallets[0].currency : 'USD';

        // Convert amounts to wallet currency
        const convertedTransactions = transactions.map(tx => {
            const transaction = { ...tx };
            // Amount is always stored in USD
            if (walletCurrency === 'VND') {
                transaction.amount = currencyService.convertCurrency(
                    parseFloat(transaction.amount) || 0,
                    'USD',
                    'VND'
                );
            }
            return transaction;
        });

        res.json({
            transactions: convertedTransactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            currency: walletCurrency
        });
    } catch (error) {
        console.error('❌ Error getting transactions:', error);
        res.status(500).json({ message: 'Error getting transaction history' });
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
        if (result.currency === 'VND') {
            const fieldsToConvert = ['total_deposits', 'total_spent', 'failed_deposit_amount', 'pending_deposit_amount'];
            fieldsToConvert.forEach(field => {
                result[field] = currencyService.convertCurrency(
                    parseFloat(result[field]) || 0,
                    'USD',
                    'VND'
                );
            });
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Error getting wallet stats:', error);
        res.status(500).json({ message: 'Error getting wallet statistics' });
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
        const supportedCurrencies = currencyService.getSupportedCurrencies();
        const isSupported = supportedCurrencies.some(c => c.code === currency);

        if (!isSupported) {
            return res.status(400).json({
                message: 'Unsupported currency',
                supportedCurrencies: supportedCurrencies.map(c => c.code)
            });
        }

        const [wallets] = await pool.execute(
            'SELECT id, balance, currency FROM user_wallets WHERE user_id = ?',
            [userId]
        );

        if (wallets.length === 0) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const wallet = wallets[0];
        if (wallet.currency === currency) {
            return res.json({
                message: 'Currency already set',
                wallet: { balance: wallet.balance, currency: wallet.currency }
            });
        }

        const oldCurrency = wallet.currency;
        const oldBalance = parseFloat(wallet.balance);
        const newBalance = currencyService.convertCurrency(oldBalance, oldCurrency, currency);

        // Update wallet
        await pool.execute(
            'UPDATE user_wallets SET currency = ?, balance = ?, updated_at = NOW() WHERE id = ?',
            [currency, newBalance, wallet.id]
        );

        // Log transaction
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
