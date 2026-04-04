import vnpayService from '#services/vnpayService.js';
import walletService from '../../services/wallet.service.js';
import walletRepository from '../../repositories/wallet.repository.js';

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

        const creditResult = await walletService.creditDeposit({
            transactionId,
            gatewayId: result.transactionNo,
            gatewayMetadata: {
                vnpay_transaction_no: result.transactionNo,
                vnpay_bank_code: result.bankCode,
                vnpay_pay_date: result.payDate,
            }
        });

        if (!creditResult.success) {
            return res.redirect(`${frontendUrl}/wallet?payment=${creditResult.status}`);
        }

        console.log(`✅ Payment completed successfully for transaction ${transactionId}`);
        console.log('Redirecting to frontend:', frontendUrl);
        res.redirect(`${frontendUrl.trim()}/wallet?payment=success&amount=${creditResult.creditedAmount}&currency=${creditResult.currency}`);

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

        const creditResult = await walletService.creditDeposit({
            transactionId,
            gatewayId: result.transactionNo,
            gatewayMetadata: {
                vnpay_transaction_no: result.transactionNo,
                vnpay_bank_code: result.bankCode,
                vnpay_pay_date: result.payDate,
                ipn_received_at: new Date().toISOString(),
            }
        });

        if (!creditResult.success && creditResult.alreadyProcessed) {
            return res.json({ RspCode: '02', Message: 'Transaction already processed' });
        }

        console.log(`✅ VNPay IPN processed successfully for transaction ${transactionId}`);
        res.json({ RspCode: '00', Message: 'Confirm Success' });

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

        const transaction = await walletRepository.findTransactionByOrderId(orderId, userId);

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

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
