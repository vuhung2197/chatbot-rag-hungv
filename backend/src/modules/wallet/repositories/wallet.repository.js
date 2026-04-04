import pool from '#db';

class WalletRepository {
    /**
     * Lấy wallet theo user_id (không lock)
     */
    async findByUserId(userId) {
        const [wallets] = await pool.execute(
            'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM user_wallets WHERE user_id = ?',
            [userId]
        );
        return wallets[0] || null;
    }

    /**
     * Lấy wallet với lock (FOR UPDATE) - dùng trong transaction
     */
    async findByIdForUpdate(connection, walletId) {
        const [wallets] = await connection.execute(
            'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
            [walletId]
        );
        return wallets[0] || null;
    }

    /**
     * Lấy wallet theo user_id với lock (FOR UPDATE) - dùng trong transaction
     */
    async findByUserIdForUpdate(connection, userId) {
        const [wallets] = await connection.execute(
            'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM user_wallets WHERE user_id = ? FOR UPDATE',
            [userId]
        );
        return wallets[0] || null;
    }

    /**
     * Tạo wallet mới
     */
    async create(userId, currency = 'USD') {
        const [result] = await pool.execute(
            'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?) RETURNING id',
            [userId, currency, 'active']
        );
        return result[0];
    }

    /**
     * Lấy wallet vừa tạo theo ID
     */
    async findById(walletId) {
        const [wallets] = await pool.execute(
            'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM user_wallets WHERE id = ?',
            [walletId]
        );
        return wallets[0] || null;
    }

    /**
     * Cập nhật balance
     */
    async updateBalance(connection, walletId, newBalance) {
        await connection.execute(
            'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newBalance, walletId]
        );
    }

    /**
     * Cập nhật currency + balance
     */
    async updateCurrencyAndBalance(walletId, newCurrency, newBalance) {
        await pool.execute(
            'UPDATE user_wallets SET currency = ?, balance = ?, updated_at = NOW() WHERE id = ?',
            [newCurrency, newBalance, walletId]
        );
    }

    /**
     * Tạo transaction record
     * @param {Object} data - Transaction data
     * @param {Object} [connection] - DB connection (dùng trong transaction). Nếu không truyền, dùng pool mặc định.
     */
    async createTransaction(data, connection = null) {
        const executor = connection || pool;
        const { walletId, userId, type, amount, balanceBefore, balanceAfter,
                description, status, paymentMethod, paymentGatewayId, metadata } = data;

        const [rows] = await executor.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, 
              description, status, payment_method, payment_gateway_id, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
            [walletId, userId, type, amount, balanceBefore, balanceAfter,
             description, status, paymentMethod || null, paymentGatewayId || null,
             JSON.stringify(metadata || {})]
        );
        return rows[0];
    }

    /**
     * Tìm transaction theo ID
     */
    async findTransactionById(transactionId) {
        const [transactions] = await pool.execute(
            'SELECT * FROM wallet_transactions WHERE id = ?',
            [transactionId]
        );
        return transactions[0] || null;
    }

    /**
     * Cập nhật status của transaction (dùng trong DB transaction)
     */
    async updateTransactionStatus(connection, transactionId, status, extraFields = {}) {
        let query = 'UPDATE wallet_transactions SET status = ?';
        const params = [status];

        if (extraFields.balanceAfter !== undefined) {
            query += ', balance_after = ?';
            params.push(extraFields.balanceAfter);
        }
        if (extraFields.paymentGatewayId) {
            query += ', payment_gateway_id = ?';
            params.push(extraFields.paymentGatewayId);
        }

        query += ' WHERE id = ?';
        params.push(transactionId);

        await connection.execute(query, params);
    }

    /**
     * Merge metadata vào transaction (dùng jsonb_build_object cho PostgreSQL)
     */
    async mergeTransactionMetadata(connection, transactionId, metadataObj) {
        // Build jsonb_build_object arguments dynamically
        const entries = Object.entries(metadataObj);
        if (entries.length === 0) return;

        const jsonbArgs = entries.map(([key]) => `'${key}', ?::text`).join(', ');
        const values = entries.map(([, value]) => String(value));

        await connection.execute(
            `UPDATE wallet_transactions 
             SET metadata = metadata || jsonb_build_object(${jsonbArgs})
             WHERE id = ?`,
            [...values, transactionId]
        );
    }

    /**
     * Cập nhật transaction với order_id trong metadata
     */
    async updateTransactionOrderId(transactionId, orderId) {
        await pool.execute(
            `UPDATE wallet_transactions 
             SET metadata = metadata || jsonb_build_object('order_id', ?::text)
             WHERE id = ?`,
            [orderId, transactionId]
        );
    }

    /**
     * Đánh dấu transaction thất bại (không cần connection)
     */
    async markTransactionFailed(transactionId) {
        await pool.execute(
            'UPDATE wallet_transactions SET status = ? WHERE id = ?',
            ['failed', transactionId]
        );
    }

    /**
     * Tìm transaction theo order_id trong metadata + user_id
     */
    async findTransactionByOrderId(orderId, userId) {
        const [transactions] = await pool.execute(
            `SELECT wt.*, uw.user_id 
             FROM wallet_transactions wt
             JOIN user_wallets uw ON wt.wallet_id = uw.id
             WHERE wt.metadata->>'order_id' = ? AND uw.user_id = ?`,
            [orderId, userId]
        );
        return transactions[0] || null;
    }

    /**
     * Lấy payment methods đang active
     */
    async getActivePaymentMethods() {
        const [methods] = await pool.execute(
            'SELECT name, display_name, provider, min_amount, max_amount, is_active FROM payment_methods WHERE is_active = TRUE'
        );
        return methods;
    }

    /**
     * Tìm payment method theo tên
     */
    async findPaymentMethodByName(name) {
        const [methods] = await pool.execute(
            'SELECT * FROM payment_methods WHERE name = ? AND is_active = TRUE',
            [name]
        );
        return methods[0] || null;
    }

    /**
     * Lấy danh sách deposit thất bại/pending
     */
    async getFailedPendingDeposits(userId, status) {
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
            query += ' AND status IN (?, ?)';
            params.push('failed', 'pending');
        }

        query += ' ORDER BY created_at DESC';
        const [transactions] = await pool.execute(query, params);
        return transactions;
    }

    /**
     * Lấy bank accounts của user
     */
    async getBankAccounts(userId) {
        const [accounts] = await pool.execute(
            'SELECT * FROM bank_accounts WHERE user_id = ? AND status != ?',
            [userId, 'deleted']
        );
        return accounts;
    }

    /**
     * Tìm bank account trùng
     */
    async findBankAccount(userId, bankCode, accountNumber) {
        const [existing] = await pool.execute(
            'SELECT id FROM bank_accounts WHERE user_id = ? AND bank_code = ? AND account_number = ?',
            [userId, bankCode, accountNumber]
        );
        return existing[0] || null;
    }

    /**
     * Tìm bank account theo id + user_id
     */
    async findBankAccountById(accountId, userId) {
        const [accounts] = await pool.execute(
            'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );
        return accounts[0] || null;
    }

    /**
     * Tạo bank account
     */
    async createBankAccount(data) {
        const { userId, bankCode, bankName, accountNumber, accountHolderName, branchName } = data;
        const [rows] = await pool.execute(
            `INSERT INTO bank_accounts 
            (user_id, bank_code, bank_name, account_number, account_holder_name, branch_name, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active') RETURNING id`,
            [userId, bankCode, bankName, accountNumber, accountHolderName, branchName || null]
        );
        return rows[0];
    }

    /**
     * Soft delete bank account
     */
    async deleteBankAccount(accountId) {
        await pool.execute(
            'UPDATE bank_accounts SET status = ? WHERE id = ?',
            ['deleted', accountId]
        );
    }

    /**
     * Tạo withdrawal request
     */
    async createWithdrawalRequest(connection, data) {
        const { transactionId, userId, bankAccountId, amount, fee, netAmount } = data;
        await connection.execute(
            `INSERT INTO withdrawal_requests
            (transaction_id, user_id, bank_account_id, amount, fee, net_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [transactionId, userId, bankAccountId, amount, fee, netAmount]
        );
    }

    /**
     * Lấy lịch sử rút tiền
     */
    async getWithdrawalHistory(userId, limit = 50) {
        const [withdrawals] = await pool.execute(
            'SELECT * FROM v_withdrawal_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [userId, limit]
        );
        return withdrawals;
    }

    /**
     * Lấy tổng hợp giao dịch theo user — dùng cho stats
     */
    async getTransactionStats(userId) {
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
        return stats[0] || null;
    }

    /**
     * Lấy danh sách transaction có phân trang
     */
    async getTransactionsPaginated(userId, { type, limit, offset }) {
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
        return transactions;
    }

    /**
     * Đếm tổng transaction
     */
    async countTransactions(userId, type) {
        let query = 'SELECT COUNT(*) as total FROM wallet_transactions WHERE user_id = ?';
        const params = [userId];
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        const [countResult] = await pool.execute(query, params);
        return countResult[0].total;
    }
}

export default new WalletRepository();
