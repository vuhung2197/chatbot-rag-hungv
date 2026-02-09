import pool from '#db';
import momoService from '#services/momoService.js';
import currencyService from '#services/currencyService.js';

/**
 * MoMo Return URL Handler
 */
export async function momoReturn(req, res) {
    try {
        console.log('🔔 MoMo return callback received');
        const momoParams = req.query;
        const result = await momoService.processCallback(momoParams);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (!result.success) {
            console.error('❌ MoMo payment failed:', result.message);
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
                         'momo_trans_id', ?::text,
                         'momo_pay_type', ?::text,
                         'momo_response_time', ?::text,
                         'credited_amount', ?::text,
                         'credited_currency', ?::text
                     )
                 WHERE id = ?`,
                [
                    newBalance,
                    result.transactionId,
                    new Date().toISOString(),
                    result.transactionId,
                    result.payType,
                    result.responseTime,
                    creditedAmount,
                    wallet.currency,
                    transactionId
                ]
            );

            await connection.commit();

            console.log(`✅ MoMo payment completed successfully for transaction ${transactionId}`);
            res.redirect(`${frontendUrl.trim()}/wallet?payment=success&amount=${creditedAmount}&currency=${wallet.currency}`);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Error processing MoMo return:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/wallet?payment=error&message=${encodeURIComponent(error.message)}`);
    }
}

/**
 * MoMo IPN Handler
 */
export async function momoIPN(req, res) {
    try {
        console.log('🔔 MoMo IPN received');
        const momoParams = req.body;
        const result = await momoService.processCallback(momoParams);

        if (!result.success) {
            console.error('❌ MoMo IPN failed:', result.message);
            return res.json({ status: 1, message: result.message });
        }

        const orderIdParts = result.orderId.split('_');
        const transactionId = orderIdParts[1];

        if (!transactionId) return res.json({ status: 2, message: 'Invalid order ID' });

        const [transactions] = await pool.execute(
            'SELECT * FROM wallet_transactions WHERE id = ?',
            [transactionId]
        );

        if (transactions.length === 0) return res.json({ status: 3, message: 'Transaction not found' });

        const transaction = transactions[0];
        if (transaction.status !== 'pending') return res.json({ status: 0, message: 'Transaction already processed' });

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
                         'momo_trans_id', ?::text,
                         'momo_pay_type', ?::text,
                         'momo_response_time', ?::text,
                         'ipn_received_at', ?::text,
                         'credited_amount', ?::text,
                         'credited_currency', ?::text
                     )
                 WHERE id = ?`,
                [
                    newBalance,
                    result.transactionId,
                    new Date().toISOString(),
                    result.transactionId,
                    result.payType,
                    result.responseTime,
                    new Date().toISOString(),
                    creditedAmount,
                    wallet.currency,
                    transactionId
                ]
            );

            await connection.commit();
            console.log(`✅ MoMo IPN processed successfully for transaction ${transactionId}`);
            res.json({ status: 0, message: 'Success' });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Error processing MoMo IPN:', error);
        res.json({ status: 99, message: 'Unknown error' });
    }
}
