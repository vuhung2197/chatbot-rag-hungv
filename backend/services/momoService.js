import crypto from 'crypto';
import axios from 'axios';
import PaymentService from './paymentService.js';

/**
 * MoMo Payment Gateway Service
 * Documentation: https://developers.momo.vn/
 */
class MoMoService extends PaymentService {
    constructor() {
        super({
            name: 'MoMo',
            currency: 'VND'
        });

        this.partnerCode = process.env.MOMO_PARTNER_CODE;
        this.accessKey = process.env.MOMO_ACCESS_KEY;
        this.secretKey = process.env.MOMO_SECRET_KEY;
        this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
        this.redirectUrl = process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/wallet?payment=momo';
        this.ipnUrl = process.env.MOMO_IPN_URL || 'http://localhost:3001/wallet/momo/ipn';

        // Validate configuration
        if (!this.partnerCode || !this.accessKey || !this.secretKey) {
            this.log('warn', 'MoMo credentials not configured. Payment will not work.');
        }
    }

    /**
     * Create MoMo payment
     * @param {Object} params
     * @param {string} params.orderId - Unique order ID
     * @param {number} params.amount - Amount in VND
     * @param {string} params.orderInfo - Order description
     * @param {string} params.requestId - Request ID (usually same as orderId)
     * @returns {Promise<Object>} Payment response with payUrl
     */
    async createPaymentUrl({ orderId, amount, orderInfo, requestId = null }) {
        try {
            this.log('info', 'Creating MoMo payment', { orderId, amount });

            // Validate inputs
            if (!orderId || !amount || !orderInfo) {
                throw new Error('Missing required parameters: orderId, amount, orderInfo');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // MoMo requires integer amount (no decimals)
            const amountInt = Math.round(amount);

            // Use orderId as requestId if not provided
            const reqId = requestId || orderId;

            // Build request body
            const requestBody = {
                partnerCode: this.partnerCode,
                partnerName: 'English Chatbot',
                storeId: 'EnglishChatbot',
                requestId: reqId,
                amount: amountInt,
                orderId,
                orderInfo,
                redirectUrl: this.redirectUrl,
                ipnUrl: this.ipnUrl,
                lang: 'vi',
                requestType: 'captureWallet', // Use MoMo wallet
                autoCapture: true,
                extraData: '', // Can store additional data
                orderGroupId: ''
            };

            // Generate signature
            const signature = this.generateSignature(requestBody);
            requestBody.signature = signature;

            this.log('info', 'Sending request to MoMo', { orderId, endpoint: this.endpoint });

            // Call MoMo API
            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 seconds timeout
            });

            const data = response.data;

            this.log('info', 'MoMo response received', {
                orderId,
                resultCode: data.resultCode,
                message: data.message
            });

            // Check result code
            if (data.resultCode !== 0) {
                throw new Error(`MoMo error: ${data.message} (Code: ${data.resultCode})`);
            }

            // Return payment URL
            return data.payUrl;

        } catch (error) {
            this.log('error', 'Error creating MoMo payment', {
                error: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Generate MoMo signature
     * @param {Object} data - Request data
     * @returns {string} HMAC SHA256 signature
     */
    generateSignature(data) {
        // Build raw signature string according to MoMo spec
        const rawSignature = `accessKey=${this.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;

        // Generate HMAC SHA256
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(rawSignature)
            .digest('hex');

        this.log('debug', 'Generated signature', {
            rawSignature: `${rawSignature.substring(0, 100)  }...`,
            signature: `${signature.substring(0, 20)  }...`
        });

        return signature;
    }

    /**
     * Verify MoMo callback signature
     * @param {Object} data - Callback data from MoMo
     * @returns {boolean} True if signature is valid
     */
    verifySignature(data) {
        try {
            const {
                partnerCode,
                orderId,
                requestId,
                amount,
                orderInfo,
                orderType,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
                signature
            } = data;

            if (!signature) {
                this.log('warn', 'Missing signature in MoMo callback');
                return false;
            }

            // Build raw signature string for verification
            const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

            // Generate expected signature
            const expectedSignature = crypto
                .createHmac('sha256', this.secretKey)
                .update(rawSignature)
                .digest('hex');

            const isValid = signature === expectedSignature;

            if (!isValid) {
                this.log('warn', 'Invalid MoMo signature', {
                    expected: `${expectedSignature.substring(0, 20)  }...`,
                    received: `${signature.substring(0, 20)  }...`
                });
            }

            return isValid;

        } catch (error) {
            this.log('error', 'Error verifying MoMo signature', { error: error.message });
            return false;
        }
    }

    /**
     * Process MoMo callback
     * @param {Object} data - Callback data
     * @returns {Object} Processed result
     */
    async processCallback(data) {
        try {
            this.log('info', 'Processing MoMo callback', { orderId: data.orderId });

            // Verify signature first
            if (!this.verifySignature(data)) {
                return {
                    success: false,
                    message: 'Invalid signature',
                    code: 'INVALID_SIGNATURE'
                };
            }

            const resultCode = parseInt(data.resultCode);
            const transId = data.transId;
            const orderId = data.orderId;
            const amount = parseInt(data.amount);
            const payType = data.payType;
            const responseTime = data.responseTime;

            // Result code meanings:
            // 0: Success
            // 9000: Transaction is being processed
            // 8000: Transaction is being processed (waiting for user confirmation)
            // 7000: Transaction is being processed (waiting for payment)
            // 1000: Transaction has been initialized, waiting for user confirmation
            // 11: Access denied
            // 12: Invalid amount
            // 13: Invalid data
            // 20: Invalid signature
            // 21: Invalid orderId
            // 22: Invalid requestId
            // 40: Invalid requestType
            // 41: Invalid extraData
            // 42: Invalid orderInfo
            // 43: Payment has been cancelled
            // 1001: Transaction failed
            // 1002: Transaction failed (insufficient balance)
            // 1003: Transaction failed (exceeded transaction limit)
            // 1004: Transaction failed (exceeded daily limit)
            // 1005: Transaction failed (URL has expired)
            // 1006: Transaction failed (user rejected)
            // 1007: Transaction failed (transaction timeout)
            // 3001: Linked account not found
            // 3002: Invalid linked account
            // 3003: Linked account has been locked
            // 3004: Linked account has been closed
            // 4001: Transaction amount is invalid
            // 4100: Customer cancelled transaction

            const result = {
                success: resultCode === 0,
                orderId,
                transactionId: transId,
                amount,
                payType,
                responseTime,
                resultCode,
                message: this.getResultMessage(resultCode)
            };

            this.log('info', 'MoMo callback processed', result);

            return result;

        } catch (error) {
            this.log('error', 'Error processing MoMo callback', { error: error.message });
            throw error;
        }
    }

    /**
     * Get human-readable message for MoMo result code
     */
    getResultMessage(code) {
        const messages = {
            0: 'Giao dịch thành công',
            9000: 'Giao dịch đang được xử lý',
            8000: 'Giao dịch đang được xử lý (chờ xác nhận)',
            7000: 'Giao dịch đang được xử lý (chờ thanh toán)',
            1000: 'Giao dịch đã khởi tạo, chờ người dùng xác nhận',
            11: 'Truy cập bị từ chối',
            12: 'Số tiền không hợp lệ',
            13: 'Dữ liệu không hợp lệ',
            20: 'Chữ ký không hợp lệ',
            21: 'Mã đơn hàng không hợp lệ',
            22: 'Mã yêu cầu không hợp lệ',
            40: 'Loại yêu cầu không hợp lệ',
            41: 'Dữ liệu bổ sung không hợp lệ',
            42: 'Thông tin đơn hàng không hợp lệ',
            43: 'Giao dịch đã bị hủy',
            1001: 'Giao dịch thất bại',
            1002: 'Giao dịch thất bại (số dư không đủ)',
            1003: 'Giao dịch thất bại (vượt quá hạn mức giao dịch)',
            1004: 'Giao dịch thất bại (vượt quá hạn mức ngày)',
            1005: 'Giao dịch thất bại (URL đã hết hạn)',
            1006: 'Giao dịch thất bại (người dùng từ chối)',
            1007: 'Giao dịch thất bại (hết thời gian)',
            3001: 'Không tìm thấy tài khoản liên kết',
            3002: 'Tài khoản liên kết không hợp lệ',
            3003: 'Tài khoản liên kết đã bị khóa',
            3004: 'Tài khoản liên kết đã bị đóng',
            4001: 'Số tiền giao dịch không hợp lệ',
            4100: 'Khách hàng đã hủy giao dịch'
        };

        return messages[code] || `Lỗi không xác định (${code})`;
    }

    /**
     * Query transaction status from MoMo
     * @param {string} orderId - Order ID to query
     * @param {string} requestId - Request ID
     * @returns {Promise<Object>} Transaction status
     */
    async queryPaymentStatus(orderId, requestId = null) {
        try {
            const reqId = requestId || orderId;

            const requestBody = {
                partnerCode: this.partnerCode,
                requestId: reqId,
                orderId,
                lang: 'vi'
            };

            // Generate signature for query
            const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${reqId}`;
            const signature = crypto
                .createHmac('sha256', this.secretKey)
                .update(rawSignature)
                .digest('hex');

            requestBody.signature = signature;

            const queryEndpoint = this.endpoint.replace('/create', '/query');

            const response = await axios.post(queryEndpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return response.data;

        } catch (error) {
            this.log('error', 'Error querying MoMo transaction status', { error: error.message });
            throw error;
        }
    }

    /**
     * Refund a MoMo transaction
     * @param {string} transactionId - MoMo transaction ID
     * @param {number} amount - Refund amount
     * @param {string} description - Refund description
     * @returns {Promise<Object>} Refund result
     */
    async refundPayment(transactionId, amount, description = 'Refund') {
        try {
            const refundId = `REFUND_${Date.now()}`;

            const requestBody = {
                partnerCode: this.partnerCode,
                orderId: refundId,
                requestId: refundId,
                amount: Math.round(amount),
                transId: transactionId,
                lang: 'vi',
                description
            };

            // Generate signature for refund
            const rawSignature = `accessKey=${this.accessKey}&amount=${requestBody.amount}&description=${description}&orderId=${refundId}&partnerCode=${this.partnerCode}&requestId=${refundId}&transId=${transactionId}`;
            const signature = crypto
                .createHmac('sha256', this.secretKey)
                .update(rawSignature)
                .digest('hex');

            requestBody.signature = signature;

            const refundEndpoint = this.endpoint.replace('/create', '/refund');

            const response = await axios.post(refundEndpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return response.data;

        } catch (error) {
            this.log('error', 'Error refunding MoMo transaction', { error: error.message });
            throw error;
        }
    }
}

// Export singleton instance
export default new MoMoService();
