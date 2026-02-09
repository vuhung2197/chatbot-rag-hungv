import walletService from '../services/wallet.service.js';
import currencyService from '#services/currencyService.js';
import { CURRENCY } from '../wallet.constants.js';

/**
 * Get user wallet information
 */
export async function getWallet(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const wallet = await walletService.getWalletOverview(userId);
        res.json({ wallet });
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
        const type = req.query.type;

        const { transactions, total, totalPages } = await walletService.getTransactions(userId, { page, limit, type });

        // Get wallet currency for formatting
        const wallet = await walletService.getWalletOverview(userId);
        const walletCurrency = wallet ? wallet.currency : CURRENCY.USD;

        // Convert amounts to wallet currency if needed for display
        const convertedTransactions = transactions.map(tx => {
            const transaction = { ...tx };
            if (walletCurrency === CURRENCY.VND) {
                transaction.amount = currencyService.convertCurrency(
                    parseFloat(transaction.amount) || 0,
                    CURRENCY.USD,
                    CURRENCY.VND
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
                totalPages
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

        const result = await walletService.getWalletStats(userId);

        // Convert amounts to wallet currency if needed
        if (result.currency === CURRENCY.VND) {
            const fieldsToConvert = ['total_deposits', 'total_spent', 'failed_deposit_amount', 'pending_deposit_amount'];
            fieldsToConvert.forEach(field => {
                result[field] = currencyService.convertCurrency(
                    parseFloat(result[field]) || 0,
                    CURRENCY.USD,
                    CURRENCY.VND
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
 */
export async function updateWalletCurrency(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { currency } = req.body;

        try {
            const result = await walletService.updateCurrency(userId, currency);

            if (!result.updated) {
                return res.json({
                    message: 'Currency already set',
                    wallet: result.wallet
                });
            }

            console.log(`✅ Wallet currency updated for user ${userId}: ${result.wallet.oldCurrency} → ${currency}`);

            res.json({
                message: 'Currency updated successfully',
                wallet: result.wallet
            });

        } catch (err) {
            if (err.message.includes('Unsupported currency')) {
                const supportedCurrencies = currencyService.getSupportedCurrencies();
                return res.status(400).json({
                    message: err.message,
                    supportedCurrencies: supportedCurrencies.map(c => c.code)
                });
            }
            if (err.message === 'Wallet not found') {
                return res.status(404).json({ message: 'Wallet not found' });
            }
            throw err;
        }
    } catch (error) {
        console.error('❌ Error updating wallet currency:', error);
        res.status(500).json({ message: 'Error updating wallet currency' });
    }
}
