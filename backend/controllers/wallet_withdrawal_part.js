
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
