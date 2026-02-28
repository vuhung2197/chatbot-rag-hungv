import pool from '#db';
import currencyService from '#services/currencyService.js';

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

        const [existing] = await pool.execute(
            'SELECT id FROM bank_accounts WHERE user_id = ? AND bank_code = ? AND account_number = ?',
            [userId, bank_code, account_number]
        );

        if (existing.length > 0) return res.status(400).json({ message: 'Bank account already exists' });

        const [rows] = await pool.execute(
            `INSERT INTO bank_accounts 
            (user_id, bank_code, bank_name, account_number, account_holder_name, branch_name, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active') RETURNING id`,
            [userId, bank_code, bank_name, account_number, account_holder_name, branch_name || null]
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

export async function getBankAccounts(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

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

export async function deleteBankAccount(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const accountId = req.params.id;

        const [accounts] = await pool.execute(
            'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );

        if (accounts.length === 0) return res.status(404).json({ message: 'Bank account not found' });

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

// ============================================
// WITHDRAWAL LOGIC
// ============================================

export async function calculateWithdrawalFee(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const amount = parseFloat(req.body.amount);
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        // Fetch wallet currency to calculate fee properly
        const [wallets] = await pool.execute('SELECT currency FROM user_wallets WHERE user_id = ?', [userId]);
        if (wallets.length === 0) return res.status(404).json({ message: 'Wallet not found' });

        const currency = wallets[0].currency;

        // Default USD fee is $0.5
        let fee = 0.5;
        if (currency !== 'USD') {
            fee = currencyService.convertCurrency(0.5, 'USD', currency);
        }

        const netAmount = amount - fee;

        if (netAmount <= 0) return res.status(400).json({ message: 'Amount too small to withdraw. Must be greater than fee.' });

        res.json({
            amount,
            fee,
            net_amount: netAmount,
            currency
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

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [wallets] = await connection.execute(
                'SELECT id, balance, currency FROM user_wallets WHERE user_id = ? FOR UPDATE',
                [userId]
            );

            if (wallets.length === 0) throw new Error('Wallet not found');
            const wallet = wallets[0];

            // Default USD fee is $0.5
            let fee = 0.5;
            if (wallet.currency !== 'USD') {
                fee = currencyService.convertCurrency(0.5, 'USD', wallet.currency);
            }

            const netAmount = amount - fee;
            if (netAmount <= 0) return res.status(400).json({ message: 'Amount too small. Must be greater than fee.' });

            const amountToDeduct = parseFloat(amount); // Amount is already in wallet currency

            if (parseFloat(wallet.balance) < amountToDeduct) {
                await connection.rollback();
                return res.status(400).json({
                    message: 'Insufficient balance',
                    balance: wallet.balance,
                    currency: wallet.currency,
                    required: amountToDeduct
                });
            }

            const newBalance = parseFloat(wallet.balance) - amountToDeduct;
            await connection.execute(
                'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newBalance, wallet.id]
            );

            // Convert amount to USD for the withdrawal_requests table if required, 
            // but the system mostly treats it as raw numbers. Let's keep it in wallet currency.
            const [txRows] = await connection.execute(
                `INSERT INTO wallet_transactions 
                (wallet_id, user_id, type, amount, balance_before, balance_after, 
                 description, status, metadata)
                VALUES (?, ?, 'withdrawal', ?, ?, ?, ?, ?, ?) RETURNING id`,
                [
                    wallet.id,
                    userId,
                    -amountToDeduct,
                    wallet.balance,
                    newBalance,
                    'Withdrawal to Bank Account',
                    'pending',
                    JSON.stringify({
                        bank_account_id,
                        withdrawal_fee: fee,
                        net_amount: netAmount,
                        deducted_amount: amountToDeduct,
                        deducted_currency: wallet.currency
                    })
                ]
            );

            const transactionId = txRows[0].id;

            await connection.execute(
                `INSERT INTO withdrawal_requests
                (transaction_id, user_id, bank_account_id, amount, fee, net_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                [transactionId, userId, bank_account_id, amountToDeduct, fee, netAmount]
            );

            await connection.commit();

            res.json({
                message: 'Withdrawal request submitted',
                withdrawal: {
                    transaction_id: transactionId,
                    amount: amountToDeduct,
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

export async function getWithdrawals(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

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
