import crypto from 'crypto';
import querystring from 'querystring';
import moment from 'moment';
import PaymentService from './paymentService.js';

/**
 * VNPay Payment Gateway Service
 * Documentation: https://sandbox.vnpayment.vn/apis/
 */
class VNPayService extends PaymentService {
    constructor() {
        super({
            name: 'VNPay',
            currency: 'VND'
        });

        this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
        this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
        this.vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        this.vnp_ReturnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3001/wallet/vnpay/callback';
        this.vnp_Version = '2.1.0';
        this.vnp_Command = 'pay';
        this.vnp_CurrCode = 'VND';

        // Validate configuration
        if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
            this.log('warn', 'VNPay credentials not configured. Payment will not work.');
        }
    }

    /**
     * Create VNPay payment URL
     * @param {Object} params
     * @param {string} params.orderId - Unique order ID (max 100 chars)
     * @param {number} params.amount - Amount in VND
     * @param {string} params.orderInfo - Order description (max 255 chars)
     * @param {string} params.ipAddr - User IP address
     * @param {string} params.locale - Language (vn or en), default: vn
     * @returns {string} Payment URL
     */
    async createPaymentUrl({ orderId, amount, orderInfo, ipAddr, locale = 'vn' }) {
        try {
            this.log('info', 'Creating VNPay payment URL', { orderId, amount });

            // Validate inputs
            if (!orderId || !amount || !orderInfo) {
                throw new Error('Missing required parameters: orderId, amount, orderInfo');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Create date
            const createDate = moment().format('YYYYMMDDHHmmss');

            // Build parameters
            let vnp_Params = {
                vnp_Version: this.vnp_Version,
                vnp_Command: this.vnp_Command,
                vnp_TmnCode: this.vnp_TmnCode,
                vnp_Locale: locale,
                vnp_CurrCode: this.vnp_CurrCode,
                vnp_TxnRef: orderId,
                vnp_OrderInfo: orderInfo,
                vnp_OrderType: 'other',
                vnp_Amount: Math.round(amount * 100), // VNPay uses smallest unit (VND * 100)
                vnp_ReturnUrl: this.vnp_ReturnUrl,
                vnp_IpAddr: ipAddr,
                vnp_CreateDate: createDate
            };

            // Sort parameters
            vnp_Params = this.sortObject(vnp_Params);

            // Create signature
            const signData = querystring.stringify(vnp_Params, { encode: false });
            const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
            vnp_Params['vnp_SecureHash'] = signed;

            // Build payment URL
            const paymentUrl = this.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

            this.log('info', 'VNPay payment URL created successfully', { orderId });

            return paymentUrl;
        } catch (error) {
            this.log('error', 'Error creating VNPay payment URL', { error: error.message });
            throw error;
        }
    }

    /**
     * Verify VNPay return URL signature
     * @param {Object} vnp_Params - Query parameters from VNPay callback
     * @returns {boolean} True if signature is valid
     */
    verifySignature(vnp_Params) {
        try {
            const secureHash = vnp_Params['vnp_SecureHash'];

            if (!secureHash) {
                this.log('warn', 'Missing vnp_SecureHash in callback');
                return false;
            }

            // Remove hash and hash type from params
            const paramsToVerify = { ...vnp_Params };
            delete paramsToVerify['vnp_SecureHash'];
            delete paramsToVerify['vnp_SecureHashType'];

            // Sort parameters
            const sortedParams = this.sortObject(paramsToVerify);

            // Create signature
            const signData = querystring.stringify(sortedParams, { encode: false });
            const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

            const isValid = secureHash === signed;

            if (!isValid) {
                this.log('warn', 'Invalid VNPay signature', {
                    expected: signed,
                    received: secureHash
                });
            }

            return isValid;
        } catch (error) {
            this.log('error', 'Error verifying VNPay signature', { error: error.message });
            return false;
        }
    }

    /**
     * Process VNPay callback
     * @param {Object} vnp_Params - Callback parameters
     * @returns {Object} Processed result
     */
    async processCallback(vnp_Params) {
        try {
            this.log('info', 'Processing VNPay callback', { txnRef: vnp_Params.vnp_TxnRef });

            // Verify signature first
            if (!this.verifySignature(vnp_Params)) {
                return {
                    success: false,
                    message: 'Invalid signature',
                    code: 'INVALID_SIGNATURE'
                };
            }

            const responseCode = vnp_Params.vnp_ResponseCode;
            const transactionNo = vnp_Params.vnp_TransactionNo;
            const orderId = vnp_Params.vnp_TxnRef;
            const amount = parseInt(vnp_Params.vnp_Amount) / 100; // Convert back to VND
            const bankCode = vnp_Params.vnp_BankCode;
            const payDate = vnp_Params.vnp_PayDate;

            // Response code meanings:
            // 00: Success
            // 07: Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).
            // 09: Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.
            // 10: Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần
            // 11: Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.
            // 12: Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.
            // 13: Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).
            // 24: Giao dịch không thành công do: Khách hàng hủy giao dịch
            // 51: Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.
            // 65: Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.
            // 75: Ngân hàng thanh toán đang bảo trì.
            // 79: Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.
            // 99: Các lỗi khác

            const result = {
                success: responseCode === '00',
                orderId,
                transactionNo,
                amount,
                bankCode,
                payDate,
                responseCode,
                message: this.getResponseMessage(responseCode)
            };

            this.log('info', 'VNPay callback processed', result);

            return result;
        } catch (error) {
            this.log('error', 'Error processing VNPay callback', { error: error.message });
            throw error;
        }
    }

    /**
     * Get human-readable message for VNPay response code
     */
    getResponseMessage(code) {
        const messages = {
            '00': 'Giao dịch thành công',
            '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
            '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
            '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
            '11': 'Đã hết hạn chờ thanh toán',
            '12': 'Thẻ/Tài khoản bị khóa',
            '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
            '24': 'Khách hàng hủy giao dịch',
            '51': 'Tài khoản không đủ số dư',
            '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
            '75': 'Ngân hàng thanh toán đang bảo trì',
            '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
            '99': 'Lỗi không xác định'
        };

        return messages[code] || 'Lỗi không xác định';
    }

    /**
     * Query payment status (VNPay API)
     * Note: Requires additional API configuration
     */
    async queryPaymentStatus(orderId) {
        // TODO: Implement VNPay query API
        this.log('warn', 'queryPaymentStatus not yet implemented for VNPay');
        throw new Error('Not implemented');
    }

    /**
     * Refund payment (VNPay API)
     * Note: Requires additional API configuration
     */
    async refundPayment(transactionId, amount) {
        // TODO: Implement VNPay refund API
        this.log('warn', 'refundPayment not yet implemented for VNPay');
        throw new Error('Not implemented');
    }
}

// Export singleton instance
export default new VNPayService();
