import currencyService from '#services/currencyService.js';
import walletRepository from '../repositories/wallet.repository.js';
import {
    WALLET_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS,
    DEFAULTS, ACTIONS, WITHDRAWAL_FEE_USD
} from '../wallet.constants.js';

class WalletService {
    async getOrCreateWallet(userId, currency = DEFAULTS.CURRENCY) {
        const wallet = await walletRepository.findByUserId(userId);
        if (wallet) return wallet;

        const result = await walletRepository.create(userId, currency);
        return walletRepository.findById(result.id);
    }

    async getWalletOverview(userId) {
        return this.getOrCreateWallet(userId);
    }

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
            totalPages: Math.ceil(total / limit),
        };
    }

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
                last_transaction_at: null,
            };
        }

        return stats;
    }

    async updateCurrency(userId, newCurrency) {
        const supportedCurrencies = currencyService.getSupportedCurrencies();
        if (!supportedCurrencies.some(c => c.code === newCurrency)) {
            throw new Error(`Unsupported currency: ${newCurrency}`);
        }

        const wallet = await this.getOrCreateWallet(userId);
        if (!wallet) throw new Error('Wallet not found');

        if (wallet.currency === newCurrency) return { updated: false, wallet };

        const oldCurrency = wallet.currency;
        const oldBalance = parseFloat(wallet.balance);
        const newBalance = currencyService.convertCurrency(oldBalance, oldCurrency, newCurrency);

        await walletRepository.updateCurrencyAndBalance(wallet.id, newCurrency, newBalance);

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
                changed_at: new Date().toISOString(),
            },
        });

        return { updated: true, wallet: { balance: newBalance, currency: newCurrency, oldBalance, oldCurrency } };
    }

    // ═══════════════════════════════════════════════════════
    // DEPOSIT
    // ═══════════════════════════════════════════════════════

    async creditDeposit({ transactionId, gatewayId, gatewayMetadata = {} }) {
        const transaction = await walletRepository.findTransactionById(transactionId);
        if (!transaction) throw new Error('Transaction not found');
        if (transaction.status !== TRANSACTION_STATUS.PENDING) {
            return { success: false, alreadyProcessed: true, status: transaction.status };
        }

        const { newBalance, creditedAmount, currency } = await walletRepository.creditDepositTransaction(
            transactionId,
            gatewayId,
            gatewayMetadata,
            (amount, from, to) => currencyService.convertCurrency(amount, from, to)
        );

        return { success: true, newBalance, creditedAmount, currency };
    }

    async failDeposit(transactionId, gatewayId) {
        await walletRepository.failDepositTransaction(transactionId, gatewayId);
    }

    // ═══════════════════════════════════════════════════════
    // WITHDRAWAL
    // ═══════════════════════════════════════════════════════

    calculateWithdrawalFee(walletCurrency) {
        if (walletCurrency !== 'USD') {
            return currencyService.convertCurrency(WITHDRAWAL_FEE_USD, 'USD', walletCurrency);
        }
        return WITHDRAWAL_FEE_USD;
    }

    async processWithdrawal({ userId, bankAccountId, amount }) {
        return walletRepository.processWithdrawalTransaction({
            userId,
            bankAccountId,
            amount,
            calculateFeeFn: (currency) => this.calculateWithdrawalFee(currency),
        });
    }
}

export default new WalletService();
