import pool from '#db';
import vnpayService from '#services/vnpayService.js';
import currencyService from '#services/currencyService.js';

/**
 * VNPay Return URL Handler
 */
export async function vnpayReturn(req, res) {
    try {
        console.log('🔔 VNPay return callback received');
        console.log('Query params:', req.query);

        const vnp_Params = req.query;
        const result = await vnpayService.processCallback(vnp_Params);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (!result.success) {
            console.error('❌ VNPay payment failed:', result.message);
            return res.redirect(`${frontendUrl.trim()}/wallet?payment=failed&message=${encodeURIComponent(result.message)}`);
        }

        const orderIdParts = result.orderId.split('_');
        const transactionId = orderIdParts[1];

        if (!transactionId) {
            return res.redirect(`${frontendUrl}/wallet?payment=failed&message=Invalid+order+ID`);
        }

        const [transactions] = await pool.execute(
            'SELECT * FROM wallet_transactions WHERE id = ?',
            [transactionId]
        );

        if (transactions.length === 0) {
            return res.redirect(`${frontendUrl}/wallet?payment=failed&message=Transaction+not+found`);
        }

        const transaction = transactions[0];
        if (transaction.status !== 'pending') {
            return res.redirect(`${frontendUrl}/wallet?payment=${transaction.status}`);
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [wallets] = await connection.execute(
                'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
                [transaction.wallet_id]
            );

            if (wallets.length === 0) throw new Error('Wallet not found');
            const wallet = wallets[0];

            let creditedAmount = parseFloat(transaction.amount); // USD
            if (wallet.currency !== 'USD') {
                creditedAmount = currencyService.convertCurrency(creditedAmount, 'USD', wallet.currency);
            }

            const newBalance = parseFloat(wallet.balance) + creditedAmount;

            await connection.execute(
                'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newBalance, wallet.id]
            );

            await connection.execute(
                `UPDATE wallet_transactions 
                 SET status = 'completed', 
                     balance_after = ?, 
                     payment_gateway_id = ?,
                     metadata = metadata || jsonb_build_object(
                         'completed_at', ?::text,
                         'vnpay_transaction_no', ?::text,
                         'vnpay_bank_code', ?::text,
                         'vnpay_pay_date', ?::text,
                         'credited_amount', ?::text,
                         'credited_currency', ?::text
                     )
                 WHERE id = ?`,
                [
                    newBalance,
                    result.transactionNo,
                    new Date().toISOString(),
                    result.transactionNo,
                    result.bankCode,
                    result.payDate,
                    creditedAmount,
                    wallet.currency,
                    transactionId
                ]
            );

            await connection.commit();


            console.log(`✅ Payment completed successfully for transaction ${transactionId}`);
            console.log('Redirecting to frontend:', frontendUrl);
            res.redirect(`${frontendUrl.trim()}/wallet?payment=success&amount=${creditedAmount}&currency=${wallet.currency}`);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Error processing VNPay return:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/wallet?payment=error&message=${encodeURIComponent(error.message)}`);
    }
}

/**
 * VNPay IPN Handler
 */
export async function vnpayIPN(req, res) {
    try {
        console.log('🔔 VNPay IPN received');
        const vnp_Params = req.query;
        const result = await vnpayService.processCallback(vnp_Params);

        if (!result.success) {
            console.error('❌ VNPay IPN failed:', result.message);
            return res.json({ RspCode: '97', Message: result.message });
        }

        const orderIdParts = result.orderId.split('_');
        const transactionId = orderIdParts[1];

        if (!transactionId) return res.json({ RspCode: '99', Message: 'Invalid order ID' });

        const [transactions] = await pool.execute(
            'SELECT * FROM wallet_transactions WHERE id = ?',
            [transactionId]
        );

        if (transactions.length === 0) return res.json({ RspCode: '01', Message: 'Transaction not found' });

        const transaction = transactions[0];
        if (transaction.status !== 'pending') return res.json({ RspCode: '02', Message: 'Transaction already processed' });

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [wallets] = await connection.execute(
                'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
                [transaction.wallet_id]
            );
            if (wallets.length === 0) throw new Error('Wallet not found');

            const wallet = wallets[0];
            let creditedAmount = parseFloat(transaction.amount);
            if (wallet.currency !== 'USD') {
                creditedAmount = currencyService.convertCurrency(creditedAmount, 'USD', wallet.currency);
            }

            const newBalance = parseFloat(wallet.balance) + creditedAmount;

            await connection.execute(
                'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newBalance, wallet.id]
            );

            await connection.execute(
                `UPDATE wallet_transactions 
                 SET status = 'completed', 
                     balance_after = ?, 
                     payment_gateway_id = ?,
                     metadata = metadata || jsonb_build_object(
                         'completed_at', ?::text,
                         'vnpay_transaction_no', ?::text,
                         'vnpay_bank_code', ?::text,
                         'vnpay_pay_date', ?::text,
                         'ipn_received_at', ?::text,
                         'credited_amount', ?::text,
                         'credited_currency', ?::text
                     )
                 WHERE id = ?`,
                [
                    newBalance,
                    result.transactionNo,
                    new Date().toISOString(),
                    result.transactionNo,
                    result.bankCode,
                    result.payDate,
                    new Date().toISOString(),
                    creditedAmount,
                    wallet.currency,
                    transactionId
                ]
            );

            await connection.commit();
            console.log(`✅ VNPay IPN processed successfully for transaction ${transactionId}`);
            res.json({ RspCode: '00', Message: 'Confirm Success' });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Error processing VNPay IPN:', error);
        res.json({ RspCode: '99', Message: 'Unknown error' });
    }
}

/**
 * Query VNPay Transaction Status
 */
export async function queryVNPayTransaction(req, res) {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        console.log(`🔍 Querying VNPay transaction: ${orderId}`);

        const [transactions] = await pool.execute(
            `SELECT wt.*, uw.user_id 
             FROM wallet_transactions wt
             JOIN user_wallets uw ON wt.wallet_id = uw.id
             WHERE wt.metadata->>'order_id' = ? AND uw.user_id = ?`,
            [orderId, userId]
        );

        if (transactions.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        const transaction = transactions[0];
        const metadata = typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata;
        const transactionDate = metadata.vnpay_create_date || metadata.created_at;

        if (!transactionDate) {
            return res.status(400).json({ success: false, message: 'Transaction date not found in metadata' });
        }

        const result = await vnpayService.queryPaymentStatus(orderId, transactionDate);

        res.json({
            success: true,
            transaction: {
                id: transaction.id,
                orderId,
                amount: transaction.amount,
                status: transaction.status,
                created_at: transaction.created_at,
                metadata
            },
            vnpayQuery: result
        });

    } catch (error) {
        console.error('❌ Error querying VNPay transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}
