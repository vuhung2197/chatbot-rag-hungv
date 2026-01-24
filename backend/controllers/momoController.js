import pool from '../db.js';
import momoService from '../services/momoService.js';

/**
 * MoMo Return URL Handler
 * Called when user completes/cancels payment and is redirected back
 */
export async function momoReturn(req, res) {
    try {
        console.log('🔔 MoMo return callback received');
        console.log('Query params:', req.query);

        const momoParams = req.query;

        // Process callback
        const result = await momoService.processCallback(momoParams);

        if (!result.success) {
            console.error('❌ MoMo payment failed:', result.message);

            // Redirect to frontend with error
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/wallet?payment=failed&message=${encodeURIComponent(result.message)}`);
        }

        // Extract transaction ID from order ID
        // Format: DEPOSIT_{transactionId}_{timestamp}
        const orderIdParts = result.orderId.split('_');
        const transactionId = orderIdParts[1];

        if (!transactionId) {
            console.error('❌ Invalid order ID format:', result.orderId);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/wallet?payment=failed&message=Invalid+order+ID`);
        }

        // Get transaction from database
        const [transactions] = await pool.execute(
            'SELECT * FROM wallet_transactions WHERE id = ?',
            [transactionId]
        );

        if (transactions.length === 0) {
            console.error('❌ Transaction not found:', transactionId);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/wallet?payment=failed&message=Transaction+not+found`);
        }

        const transaction = transactions[0];

        // Check if already processed
        if (transaction.status !== 'pending') {
            console.log(`⚠️  Transaction ${transactionId} already processed with status: ${transaction.status}`);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/wallet?payment=${transaction.status}`);
        }

        // Process payment
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get wallet with lock
            const [wallets] = await connection.execute(
                'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
                [transaction.wallet_id]
            );

            if (wallets.length === 0) {
                throw new Error('Wallet not found');
            }

            const wallet = wallets[0];
            const newBalance = parseFloat(wallet.balance) + parseFloat(transaction.amount);

            // Update wallet balance
            await connection.execute(
                'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newBalance, wallet.id]
            );

            // Update transaction
            await connection.execute(
                `UPDATE wallet_transactions 
                 SET status = 'completed', 
                     balance_after = ?, 
                     payment_gateway_id = ?,
                     metadata = metadata || jsonb_build_object(
                         'completed_at', ?::text,
                         'momo_trans_id', ?::text,
                         'momo_pay_type', ?::text,
                         'momo_response_time', ?::text
                     )
                 WHERE id = ?`,
                [
                    newBalance,
                    result.transactionId,
                    new Date().toISOString(),
                    result.transactionId,
                    result.payType,
                    result.responseTime,
                    transactionId
                ]
            );

            await connection.commit();

            console.log(`✅ MoMo payment completed successfully for transaction ${transactionId}`);
            console.log(`   Amount: ${transaction.amount}`);
            console.log(`   New balance: ${newBalance}`);

            // Redirect to frontend with success
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/wallet?payment=success&amount=${transaction.amount}`);

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
 * MoMo IPN (Instant Payment Notification) Handler
 * Called by MoMo server to notify payment result
 */
export async function momoIPN(req, res) {
    try {
        console.log('🔔 MoMo IPN received');
        console.log('Body:', req.body);

        const momoParams = req.body;

        // Process callback
        const result = await momoService.processCallback(momoParams);

        if (!result.success) {
            console.error('❌ MoMo IPN failed:', result.message);
            return res.json({
                status: 1,
                message: result.message
            });
        }

        // Extract transaction ID
        const orderIdParts = result.orderId.split('_');
        const transactionId = orderIdParts[1];

        if (!transactionId) {
            console.error('❌ Invalid order ID format:', result.orderId);
            return res.json({
                status: 2,
                message: 'Invalid order ID'
            });
        }

        // Get transaction
        const [transactions] = await pool.execute(
            'SELECT * FROM wallet_transactions WHERE id = ?',
            [transactionId]
        );

        if (transactions.length === 0) {
            console.error('❌ Transaction not found:', transactionId);
            return res.json({
                status: 3,
                message: 'Transaction not found'
            });
        }

        const transaction = transactions[0];

        // Check if already processed
        if (transaction.status !== 'pending') {
            console.log(`⚠️  Transaction ${transactionId} already processed`);
            return res.json({
                status: 0,
                message: 'Transaction already processed'
            });
        }

        // Process payment (same as return handler)
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [wallets] = await connection.execute(
                'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
                [transaction.wallet_id]
            );

            if (wallets.length === 0) {
                throw new Error('Wallet not found');
            }

            const wallet = wallets[0];
            const newBalance = parseFloat(wallet.balance) + parseFloat(transaction.amount);

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
                         'ipn_received_at', ?::text
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
                    transactionId
                ]
            );

            await connection.commit();

            console.log(`✅ MoMo IPN processed successfully for transaction ${transactionId}`);

            // Return success to MoMo
            res.json({
                status: 0,
                message: 'Success'
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Error processing MoMo IPN:', error);
        res.json({
            status: 99,
            message: 'Unknown error'
        });
    }
}
