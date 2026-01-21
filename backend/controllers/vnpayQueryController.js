import pool from '../db.js';
import vnpayService from '../services/vnpayService.js';

/**
 * Query VNPay Transaction Status
 * @route GET /wallet/vnpay/query/:orderId
 */
export async function queryVNPayTransaction(req, res) {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        console.log(`🔍 Querying VNPay transaction: ${orderId}`);

        // Get transaction from database
        const [transactions] = await pool.execute(
            `SELECT wt.*, uw.user_id 
             FROM wallet_transactions wt
             JOIN user_wallets uw ON wt.wallet_id = uw.id
             WHERE wt.metadata->>'$.vnpay_order_id' = ? AND uw.user_id = ?`,
            [orderId, userId]
        );

        if (transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        const transaction = transactions[0];

        // Extract transaction date from metadata
        const metadata = JSON.parse(transaction.metadata);
        const transactionDate = metadata.vnpay_create_date || metadata.created_at;

        if (!transactionDate) {
            return res.status(400).json({
                success: false,
                message: 'Transaction date not found in metadata'
            });
        }

        // Query VNPay
        const result = await vnpayService.queryPaymentStatus(orderId, transactionDate);

        res.json({
            success: true,
            transaction: {
                id: transaction.id,
                orderId: orderId,
                amount: transaction.amount,
                status: transaction.status,
                created_at: transaction.created_at,
                metadata: metadata
            },
            vnpayQuery: result
        });

    } catch (error) {
        console.error('❌ Error querying VNPay transaction:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
