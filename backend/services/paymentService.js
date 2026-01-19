/**
 * Base Payment Service Interface
 * Abstract class defining common payment gateway operations
 */

class PaymentService {
    constructor(config) {
        this.config = config;
    }

    /**
     * Create a payment URL for user to complete payment
     * @param {Object} params - Payment parameters
     * @param {string} params.orderId - Unique order ID
     * @param {number} params.amount - Payment amount
     * @param {string} params.orderInfo - Order description
     * @param {string} params.ipAddr - User IP address
     * @returns {Promise<string>} Payment URL
     */
    async createPaymentUrl(params) {
        throw new Error('createPaymentUrl() must be implemented');
    }

    /**
     * Verify payment callback/webhook signature
     * @param {Object} data - Callback data from payment gateway
     * @returns {boolean} True if signature is valid
     */
    verifySignature(data) {
        throw new Error('verifySignature() must be implemented');
    }

    /**
     * Process payment callback
     * @param {Object} data - Callback data
     * @returns {Promise<Object>} Processed payment result
     */
    async processCallback(data) {
        throw new Error('processCallback() must be implemented');
    }

    /**
     * Query payment status from gateway
     * @param {string} orderId - Order ID to query
     * @returns {Promise<Object>} Payment status
     */
    async queryPaymentStatus(orderId) {
        throw new Error('queryPaymentStatus() must be implemented');
    }

    /**
     * Refund a payment
     * @param {string} transactionId - Transaction ID to refund
     * @param {number} amount - Refund amount
     * @returns {Promise<Object>} Refund result
     */
    async refundPayment(transactionId, amount) {
        throw new Error('refundPayment() must be implemented');
    }

    /**
     * Sort object keys alphabetically
     * Common utility for signature generation
     */
    sortObject(obj) {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        keys.forEach(key => {
            sorted[key] = obj[key];
        });
        return sorted;
    }

    /**
     * Log payment activity
     */
    log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${this.constructor.name}] [${level.toUpperCase()}] ${message}`, data);
    }
}

export default PaymentService;
