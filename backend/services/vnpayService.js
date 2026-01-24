import crypto from 'crypto';
import qs from 'qs';
import moment from 'moment-timezone';
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
        this.vnp_ReturnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3001/wallet/vnpay/return';
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

            // Create date and expiry date (GMT+7 - Vietnam timezone as required by VNPay)
            const createDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');
            const expireDate = moment().tz('Asia/Ho_Chi_Minh').add(15, 'minutes').format('YYYYMMDDHHmmss');

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
                vnp_CreateDate: createDate,
                vnp_ExpireDate: expireDate // Payment expiry time (required by VNPay 2.1.0)
            };

            // Sort parameters
            // Sort parameters
            vnp_Params = this.sortObject(vnp_Params);

            // Create signature - VNPay uses RFC1738 (space as +)
            const signData = qs.stringify(vnp_Params, { encode: true, format: 'RFC1738' });

            console.log('🔐 Sign Data (before hash):', signData);

            const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
            vnp_Params['vnp_SecureHash'] = signed;

            // Build payment URL - URL must be encoded
            const paymentUrl = this.vnp_Url + '?' + qs.stringify(vnp_Params, { encode: true, format: 'RFC1738' });

            // Detailed logging for debugging
            this.log('info', 'VNPay payment URL created successfully', { orderId });
            console.log('🔍 VNPay Parameters:', {
                orderId,
                amount: amount,
                vnp_Amount: vnp_Params.vnp_Amount,
                vnp_TmnCode: vnp_Params.vnp_TmnCode,
                vnp_ReturnUrl: vnp_Params.vnp_ReturnUrl,
                vnp_IpAddr: vnp_Params.vnp_IpAddr,
                vnp_CreateDate: vnp_Params.vnp_CreateDate,
                vnp_ExpireDate: vnp_Params.vnp_ExpireDate,
                vnp_Locale: vnp_Params.vnp_Locale,
                signDataLength: signData.length,
                hasSecureHash: !!vnp_Params.vnp_SecureHash
            });
            console.log('📤 Full Parameters:', JSON.stringify(vnp_Params, null, 2));
            console.log('📝 Sign Data:', signData);
            console.log('🔗 Payment URL:', paymentUrl.substring(0, 150) + '...');

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

            // Create signature - Use qs with encode: true to match creation logic
            const signData = qs.stringify(sortedParams, { encode: true, format: 'RFC1738' });

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
     * Query payment status from VNPay
     * API: vnp_Command=querydr
     * @param {string} orderId - Transaction reference (vnp_TxnRef)
     * @param {string} transactionDate - Transaction date (yyyyMMddHHmmss)
     * @returns {Promise<Object>} Query result
     */
    async queryPaymentStatus(orderId, transactionDate) {
        try {
            this.log('info', 'Querying VNPay payment status', { orderId, transactionDate });

            // Build query parameters
            const vnp_RequestId = moment().format('YYYYMMDDHHmmss');
            const vnp_CreateDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');

            let vnp_Params = {
                vnp_Version: this.vnp_Version,
                vnp_Command: 'querydr',
                vnp_TmnCode: this.vnp_TmnCode,
                vnp_TxnRef: orderId,
                vnp_OrderInfo: `Query transaction ${orderId}`,
                vnp_TransactionDate: transactionDate,
                vnp_CreateDate: vnp_CreateDate,
                vnp_IpAddr: '127.0.0.1',
                vnp_RequestId: vnp_RequestId
            };

            // Sort parameters
            vnp_Params = this.sortObject(vnp_Params);

            // Create signature
            const signData = qs.stringify(vnp_Params, { encode: false });
            const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
            vnp_Params['vnp_SecureHash'] = signed;

            // Build query URL
            const queryUrl = this.vnp_Url.replace('/vpcpay.html', '/querydr') + '?' + qs.stringify(vnp_Params, { encode: false });

            this.log('info', 'VNPay query URL created', { orderId });

            // Note: This requires making HTTP request to VNPay
            // For now, return the URL for manual testing
            return {
                success: true,
                queryUrl,
                message: 'Query URL created. Make GET request to this URL to get transaction status.'
            };

        } catch (error) {
            this.log('error', 'Error querying VNPay payment status', { error: error.message });
            throw error;
        }
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
