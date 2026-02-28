import pool from '#db';
import currencyService from '#services/currencyService.js';
import { WALLET_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS, DEFAULTS, ACTIONS } from '../wallet.constants.js';

class WalletService {
    /**
     * Get or create wallet for user
     * @param {number} userId
     * @returns {Promise<Object>} Wallet object
     */
    async getWalletOverview(userId) {
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
                [userId, DEFAULTS.CURRENCY, WALLET_STATUS.ACTIVE]
            );

            const [newWallet] = await pool.execute(
                'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM user_wallets WHERE id = ?',
                [result.insertId]
            );
            return newWallet[0];
        }

        return wallets[0];
    }

    /**
     * Get transaction history
     * @param {number} userId 
     * @param {Object} options { page, limit, type }
     */
    async getTransactions(userId, { page = 1, limit = 20, type = null }) {
        limit = Math.max(1, Math.min(100, limit));
        const offset = (page - 1) * limit;

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

        return {
            transactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get wallet statistics
     * @param {number} userId 
     */
    async getWalletStats(userId) {
        const [stats] = await pool.execute(
            `SELECT 
                w.balance,
                w.currency,
                COUNT(DISTINCT wt.id) as total_transactions,
                SUM(CASE WHEN wt.type = '${TRANSACTION_TYPE.DEPOSIT}' AND wt.status = '${TRANSACTION_STATUS.COMPLETED}' THEN wt.amount ELSE 0 END) as total_deposits,
                SUM(CASE WHEN wt.type IN ('${TRANSACTION_TYPE.PURCHASE}', '${TRANSACTION_TYPE.SUBSCRIPTION}') AND wt.status = '${TRANSACTION_STATUS.COMPLETED}' THEN ABS(wt.amount) ELSE 0 END) as total_spent,
                SUM(CASE WHEN wt.type = '${TRANSACTION_TYPE.DEPOSIT}' AND wt.status = '${TRANSACTION_STATUS.FAILED}' THEN wt.amount ELSE 0 END) as failed_deposit_amount,
                SUM(CASE WHEN wt.type = '${TRANSACTION_TYPE.DEPOSIT}' AND wt.status = '${TRANSACTION_STATUS.PENDING}' THEN wt.amount ELSE 0 END) as pending_deposit_amount,
                COUNT(CASE WHEN wt.type = '${TRANSACTION_TYPE.DEPOSIT}' AND wt.status = '${TRANSACTION_STATUS.FAILED}' THEN 1 END) as total_failed_deposits,
                COUNT(CASE WHEN wt.type = '${TRANSACTION_TYPE.DEPOSIT}' AND wt.status = '${TRANSACTION_STATUS.PENDING}' THEN 1 END) as total_pending_deposits,
                MAX(wt.created_at) as last_transaction_at
            FROM user_wallets w
            LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
            WHERE w.user_id = ?
            GROUP BY w.id, w.balance, w.currency`,
            [userId]
        );

        if (stats.length === 0) {
            return {
                balance: 0,
                currency: DEFAULTS.CURRENCY,
                total_transactions: 0,
                total_deposits: 0,
                total_spent: 0,
                failed_deposit_amount: 0,
                pending_deposit_amount: 0,
                total_failed_deposits: 0,
                total_pending_deposits: 0,
                last_transaction_at: null
            };
        }

        return stats[0];
    }

    /**
     * Update wallet currency
     * @param {number} userId 
     * @param {string} newCurrency 
     */
    async updateCurrency(userId, newCurrency) {
        const supportedCurrencies = currencyService.getSupportedCurrencies();
        const isSupported = supportedCurrencies.some(c => c.code === newCurrency);

        if (!isSupported) {
            throw new Error(`Unsupported currency: ${newCurrency}`);
        }

        const wallet = await this.getWalletOverview(userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        if (wallet.currency === newCurrency) {
            return {
                updated: false,
                wallet
            };
        }

        const oldCurrency = wallet.currency;
        const oldBalance = parseFloat(wallet.balance);
        const newBalance = currencyService.convertCurrency(oldBalance, oldCurrency, newCurrency);

        // Update wallet
        await pool.execute(
            'UPDATE user_wallets SET currency = ?, balance = ?, updated_at = NOW() WHERE id = ?',
            [newCurrency, newBalance, wallet.id]
        );

        // Log transaction
        await pool.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, 
              description, status, metadata)
             VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)`,
            [
                wallet.id,
                userId,
                TRANSACTION_TYPE.DEPOSIT,
                oldBalance,
                newBalance,
                `Currency changed from ${oldCurrency} to ${newCurrency}`,
                TRANSACTION_STATUS.COMPLETED,
                JSON.stringify({
                    action: ACTIONS.CURRENCY_CHANGE,
                    old_currency: oldCurrency,
                    new_currency: newCurrency,
                    old_balance: oldBalance,
                    new_balance: newBalance,
                    exchange_rate: currencyService.getExchangeRate(oldCurrency, newCurrency),
                    changed_at: new Date().toISOString()
                })
            ]
        );

        return {
            updated: true,
            wallet: {
                balance: newBalance,
                currency: newCurrency,
                oldBalance,
                oldCurrency
            }
        };
    }
}

export default new WalletService();
