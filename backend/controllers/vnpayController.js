import pool from '../db.js';
import vnpayService from '../services/vnpayService.js';

/**
 * VNPay Return URL Handler
 * Called when user completes/cancels payment and is redirected back
 */
export async function vnpayReturn(req, res) {
    try {
        console.log('🔔 VNPay return callback received');
        console.log('Query params:', req.query);

        const vnp_Params = req.query;

        // Process callback
        const result = await vnpayService.processCallback(vnp_Params);

        if (!result.success) {
            console.error('❌ VNPay payment failed:', result.message);

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
                     metadata = JSON_SET(
                         metadata, 
                         '$.completed_at', ?,
                         '$.vnpay_transaction_no', ?,
                         '$.vnpay_bank_code', ?,
                         '$.vnpay_pay_date', ?
                     )
                 WHERE id = ?`,
                [
                    newBalance,
                    result.transactionNo,
                    new Date().toISOString(),
                    result.transactionNo,
                    result.bankCode,
                    result.payDate,
                    transactionId
                ]
            );

            await connection.commit();

            console.log(`✅ Payment completed successfully for transaction ${transactionId}`);
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
        console.error('❌ Error processing VNPay return:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/wallet?payment=error&message=${encodeURIComponent(error.message)}`);
    }
}

/**
 * VNPay IPN (Instant Payment Notification) Handler
 * Called by VNPay server to notify payment result
 */
export async function vnpayIPN(req, res) {
    try {
        console.log('🔔 VNPay IPN received');
        console.log('Query params:', req.query);

        const vnp_Params = req.query;

        // Process callback
        const result = await vnpayService.processCallback(vnp_Params);

        if (!result.success) {
            console.error('❌ VNPay IPN failed:', result.message);
            return res.json({
                RspCode: '97',
                Message: result.message
            });
        }

        // Extract transaction ID
        const orderIdParts = result.orderId.split('_');
        const transactionId = orderIdParts[1];

        if (!transactionId) {
            console.error('❌ Invalid order ID format:', result.orderId);
            return res.json({
                RspCode: '99',
                Message: 'Invalid order ID'
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
                RspCode: '01',
                Message: 'Transaction not found'
            });
        }

        const transaction = transactions[0];

        // Check if already processed
        if (transaction.status !== 'pending') {
            console.log(`⚠️  Transaction ${transactionId} already processed`);
            return res.json({
                RspCode: '02',
                Message: 'Transaction already processed'
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
                     metadata = JSON_SET(
                         metadata, 
                         '$.completed_at', ?,
                         '$.vnpay_transaction_no', ?,
                         '$.vnpay_bank_code', ?,
                         '$.vnpay_pay_date', ?,
                         '$.ipn_received_at', ?
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
                    transactionId
                ]
            );

            await connection.commit();

            console.log(`✅ VNPay IPN processed successfully for transaction ${transactionId}`);

            // Return success to VNPay
            res.json({
                RspCode: '00',
                Message: 'Confirm Success'
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Error processing VNPay IPN:', error);
        res.json({
            RspCode: '99',
            Message: 'Unknown error'
        });
    }
}
