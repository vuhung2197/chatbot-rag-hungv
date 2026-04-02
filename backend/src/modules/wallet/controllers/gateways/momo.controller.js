import momoService from '#services/momoService.js';
import walletService from '../../services/wallet.service.js';

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

        const creditResult = await walletService.creditDeposit({
            transactionId,
            gatewayId: result.transactionId,
            gatewayMetadata: {
                momo_trans_id: result.transactionId,
                momo_pay_type: result.payType,
                momo_response_time: result.responseTime,
            }
        });

        if (!creditResult.success) {
            return res.redirect(`${frontendUrl}/wallet?payment=${creditResult.status}`);
        }

        console.log(`✅ MoMo payment completed successfully for transaction ${transactionId}`);
        res.redirect(`${frontendUrl.trim()}/wallet?payment=success&amount=${creditResult.creditedAmount}&currency=${creditResult.currency}`);

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

        const creditResult = await walletService.creditDeposit({
            transactionId,
            gatewayId: result.transactionId,
            gatewayMetadata: {
                momo_trans_id: result.transactionId,
                momo_pay_type: result.payType,
                momo_response_time: result.responseTime,
                ipn_received_at: new Date().toISOString(),
            }
        });

        if (!creditResult.success && creditResult.alreadyProcessed) {
            return res.json({ status: 0, message: 'Transaction already processed' });
        }

        console.log(`✅ MoMo IPN processed successfully for transaction ${transactionId}`);
        res.json({ status: 0, message: 'Success' });

    } catch (error) {
        console.error('❌ Error processing MoMo IPN:', error);
        res.json({ status: 99, message: 'Unknown error' });
    }
}
