import pool from '#db';
import currencyService from '#services/currencyService.js';
import walletRepository from '../repositories/wallet.repository.js';
import {
    WALLET_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS,
    DEFAULTS, ACTIONS, WITHDRAWAL_FEE_USD
} from '../wallet.constants.js';

class WalletService {
    /**
     * Get or create wallet for user
     * @param {number} userId
     * @returns {Promise<Object>} Wallet object
     */
    async getOrCreateWallet(userId, currency = DEFAULTS.CURRENCY) {
        const wallet = await walletRepository.findByUserId(userId);
        if (wallet) return wallet;

        const result = await walletRepository.create(userId, currency);
        const newWallet = await walletRepository.findById(result.id);
        return newWallet;
    }

    /**
     * Alias for backward compatibility — getWalletOverview calls getOrCreateWallet
     */
    async getWalletOverview(userId) {
        return this.getOrCreateWallet(userId);
    }

    /**
     * Get transaction history with pagination
     * @param {number} userId 
     * @param {Object} options { page, limit, type }
     */
    async getTransactions(userId, { page = 1, limit = 20, type = null }) {
        limit = Math.max(1, Math.min(100, limit));
        const offset = (page - 1) * limit;

        const transactions = await walletRepository.getTransactionsPaginated(userId, { type, limit, offset });
        const total = await walletRepository.countTransactions(userId, type);

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
        const stats = await walletRepository.getTransactionStats(userId);

        if (!stats) {
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

        return stats;
    }

    /**
     * Update wallet currency (with balance conversion)
     * @param {number} userId 
     * @param {string} newCurrency 
     */
    async updateCurrency(userId, newCurrency) {
        const supportedCurrencies = currencyService.getSupportedCurrencies();
        const isSupported = supportedCurrencies.some(c => c.code === newCurrency);

        if (!isSupported) {
            throw new Error(`Unsupported currency: ${newCurrency}`);
        }

        const wallet = await this.getOrCreateWallet(userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        if (wallet.currency === newCurrency) {
            return { updated: false, wallet };
        }

        const oldCurrency = wallet.currency;
        const oldBalance = parseFloat(wallet.balance);
        const newBalance = currencyService.convertCurrency(oldBalance, oldCurrency, newCurrency);

        // Update wallet
        await walletRepository.updateCurrencyAndBalance(wallet.id, newCurrency, newBalance);

        // Log transaction
        await walletRepository.createTransaction({
            walletId: wallet.id,
            userId,
            type: TRANSACTION_TYPE.DEPOSIT,
            amount: 0,
            balanceBefore: oldBalance,
            balanceAfter: newBalance,
            description: `Currency changed from ${oldCurrency} to ${newCurrency}`,
            status: TRANSACTION_STATUS.COMPLETED,
            metadata: {
                action: ACTIONS.CURRENCY_CHANGE,
                old_currency: oldCurrency,
                new_currency: newCurrency,
                old_balance: oldBalance,
                new_balance: newBalance,
                exchange_rate: currencyService.getExchangeRate(oldCurrency, newCurrency),
                changed_at: new Date().toISOString()
            }
        });

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

    // ═══════════════════════════════════════════════════════
    // DEPOSIT — Centralized credit logic (dùng chung cho mọi gateway)
    // ═══════════════════════════════════════════════════════

    /**
     * Credit deposit vào wallet (dùng chung cho VNPay, MoMo, manual callback)
     * @param {Object} params
     * @param {number} params.transactionId - ID giao dịch pending
     * @param {string} params.gatewayId - ID giao dịch bên gateway
     * @param {Object} params.gatewayMetadata - Dữ liệu bổ sung từ gateway
     * @returns {Object} { success, newBalance, creditedAmount, currency } hoặc { success: false, alreadyProcessed, status }
     */
    async creditDeposit({ transactionId, gatewayId, gatewayMetadata = {} }) {
        const transaction = await walletRepository.findTransactionById(transactionId);
        if (!transaction) throw new Error('Transaction not found');
        if (transaction.status !== TRANSACTION_STATUS.PENDING) {
            return { success: false, alreadyProcessed: true, status: transaction.status };
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const wallet = await walletRepository.findByIdForUpdate(connection, transaction.wallet_id);
            if (!wallet) throw new Error('Wallet not found');

            let creditedAmount = parseFloat(transaction.amount);
            if (wallet.currency !== 'USD') {
                creditedAmount = currencyService.convertCurrency(creditedAmount, 'USD', wallet.currency);
            }
            const newBalance = parseFloat(wallet.balance) + creditedAmount;

            await walletRepository.updateBalance(connection, wallet.id, newBalance);
            await walletRepository.updateTransactionStatus(connection, transactionId, TRANSACTION_STATUS.COMPLETED, {
                balanceAfter: newBalance,
                paymentGatewayId: gatewayId,
            });
            await walletRepository.mergeTransactionMetadata(connection, transactionId, {
                completed_at: new Date().toISOString(),
                credited_amount: creditedAmount,
                credited_currency: wallet.currency,
                ...gatewayMetadata,
            });

            await connection.commit();
            return { success: true, newBalance, creditedAmount, currency: wallet.currency };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Đánh dấu deposit thất bại
     * @param {number} transactionId
     * @param {string} gatewayId
     */
    async failDeposit(transactionId, gatewayId) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            await walletRepository.updateTransactionStatus(connection, transactionId, TRANSACTION_STATUS.FAILED, {
                paymentGatewayId: gatewayId,
            });
            await walletRepository.mergeTransactionMetadata(connection, transactionId, {
                failed_at: new Date().toISOString(),
            });
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ═══════════════════════════════════════════════════════
    // WITHDRAWAL — Centralized fee calculation & deduction
    // ═══════════════════════════════════════════════════════

    /**
     * Tính phí rút tiền theo wallet currency
     * @param {string} walletCurrency
     * @returns {number} fee in wallet currency
     */
    calculateWithdrawalFee(walletCurrency) {
        if (walletCurrency !== 'USD') {
            return currencyService.convertCurrency(WITHDRAWAL_FEE_USD, 'USD', walletCurrency);
        }
        return WITHDRAWAL_FEE_USD;
    }

    /**
     * Xử lý rút tiền: trừ balance, tạo transaction + withdrawal request
     * @param {Object} params
     * @param {number} params.userId
     * @param {number} params.bankAccountId
     * @param {number} params.amount - Số tiền muốn rút (wallet currency)
     * @returns {Object} withdrawal details
     */
    async processWithdrawal({ userId, bankAccountId, amount }) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const wallet = await walletRepository.findByUserIdForUpdate(connection, userId);
            if (!wallet) throw new Error('Wallet not found');

            const fee = this.calculateWithdrawalFee(wallet.currency);
            const netAmount = amount - fee;
            if (netAmount <= 0) throw new Error('Amount too small. Must be greater than fee.');

            const amountToDeduct = parseFloat(amount);
            if (parseFloat(wallet.balance) < amountToDeduct) {
                throw Object.assign(new Error('Insufficient balance'), {
                    statusCode: 400,
                    details: {
                        balance: wallet.balance,
                        currency: wallet.currency,
                        required: amountToDeduct
                    }
                });
            }

            const newBalance = parseFloat(wallet.balance) - amountToDeduct;
            await walletRepository.updateBalance(connection, wallet.id, newBalance);

            const txResult = await walletRepository.createTransaction({
                walletId: wallet.id,
                userId,
                type: TRANSACTION_TYPE.WITHDRAW,
                amount: -amountToDeduct,
                balanceBefore: wallet.balance,
                balanceAfter: newBalance,
                description: 'Withdrawal to Bank Account',
                status: TRANSACTION_STATUS.PENDING,
                metadata: {
                    bank_account_id: bankAccountId,
                    withdrawal_fee: fee,
                    net_amount: netAmount,
                    deducted_amount: amountToDeduct,
                    deducted_currency: wallet.currency
                }
            }, connection);

            const transactionId = txResult.id;

            await walletRepository.createWithdrawalRequest(connection, {
                transactionId,
                userId,
                bankAccountId,
                amount: amountToDeduct,
                fee,
                netAmount
            });

            await connection.commit();

            return {
                transaction_id: transactionId,
                amount: amountToDeduct,
                fee,
                net_amount: netAmount,
                status: TRANSACTION_STATUS.PENDING
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default new WalletService();
