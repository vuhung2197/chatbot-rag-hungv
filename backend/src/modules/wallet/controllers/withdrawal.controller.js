import walletService from '../services/wallet.service.js';
import walletRepository from '../repositories/wallet.repository.js';

// ============================================
// BANK ACCOUNT MANAGEMENT
// ============================================

export async function addBankAccount(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { bank_code, bank_name, account_number, account_holder_name, branch_name } = req.body;

        if (!bank_code || !bank_name || !account_number || !account_holder_name) {
            return res.status(400).json({ message: 'Missing required bank information' });
        }

        const existing = await walletRepository.findBankAccount(userId, bank_code, account_number);
        if (existing) return res.status(400).json({ message: 'Bank account already exists' });

        const result = await walletRepository.createBankAccount({
            userId, bankCode: bank_code, bankName: bank_name,
            accountNumber: account_number, accountHolderName: account_holder_name,
            branchName: branch_name
        });

        res.json({
            message: 'Bank account added successfully',
            bank_account: {
                id: result.id,
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

export async function getBankAccounts(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const accounts = await walletRepository.getBankAccounts(userId);
        res.json({ bank_accounts: accounts });
    } catch (error) {
        console.error('❌ Error getting bank accounts:', error);
        res.status(500).json({ message: 'Error getting bank accounts' });
    }
}

export async function deleteBankAccount(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const accountId = req.params.id;

        const account = await walletRepository.findBankAccountById(accountId, userId);
        if (!account) return res.status(404).json({ message: 'Bank account not found' });

        await walletRepository.deleteBankAccount(accountId);
        res.json({ message: 'Bank account deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting bank account:', error);
        res.status(500).json({ message: 'Error deleting bank account' });
    }
}

// ============================================
// WITHDRAWAL LOGIC
// ============================================

export async function calculateWithdrawalFee(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const amount = parseFloat(req.body.amount);
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        // Fetch wallet to determine currency
        const wallet = await walletRepository.findByUserId(userId);
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const fee = walletService.calculateWithdrawalFee(wallet.currency);
        const netAmount = amount - fee;

        if (netAmount <= 0) return res.status(400).json({ message: 'Amount too small to withdraw. Must be greater than fee.' });

        res.json({
            amount,
            fee,
            net_amount: netAmount,
            currency: wallet.currency
        });
    } catch (error) {
        console.error('❌ Error calculating fee:', error);
        res.status(500).json({ message: 'Error calculating fee' });
    }
}

export async function withdraw(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { bank_account_id, amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        const withdrawal = await walletService.processWithdrawal({
            userId,
            bankAccountId: bank_account_id,
            amount: parseFloat(amount)
        });

        res.json({
            message: 'Withdrawal request submitted',
            withdrawal
        });
    } catch (error) {
        // Handle known operational errors
        if (error.statusCode === 400) {
            return res.status(400).json({
                message: error.message,
                ...error.details
            });
        }
        if (error.message === 'Amount too small. Must be greater than fee.') {
            return res.status(400).json({ message: error.message });
        }
        if (error.message === 'Wallet not found') {
            return res.status(404).json({ message: error.message });
        }

        console.error('❌ Error processing withdrawal:', error);
        res.status(500).json({ message: 'Error processing withdrawal' });
    }
}

export async function getWithdrawals(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const withdrawals = await walletRepository.getWithdrawalHistory(userId);
        res.json({ withdrawals });
    } catch (error) {
        console.error('❌ Error getting withdrawals:', error);
        res.status(500).json({ message: 'Error getting withdrawals' });
    }
}
