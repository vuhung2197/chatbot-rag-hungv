/**
 * Currency Exchange Service
 * Handles currency conversion between USD and VND
 */

// Exchange rates (can be updated from external API in production)
const EXCHANGE_RATES = {
    USD_TO_VND: 25000, // 1 USD = 25,000 VND (approximate)
    VND_TO_USD: 1 / 25000
};

/**
 * Get current exchange rate
 * @param {string} from - Source currency (USD or VND)
 * @param {string} to - Target currency (USD or VND)
 * @returns {number} Exchange rate
 */
export function getExchangeRate(from, to) {
    if (from === to) return 1;

    if (from === 'USD' && to === 'VND') {
        return EXCHANGE_RATES.USD_TO_VND;
    }

    if (from === 'VND' && to === 'USD') {
        return EXCHANGE_RATES.VND_TO_USD;
    }

    throw new Error(`Unsupported currency conversion: ${from} to ${to}`);
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency
 * @param {string} to - Target currency
 * @returns {number} Converted amount
 */
export function convertCurrency(amount, from, to) {
    if (from === to) return amount;

    const rate = getExchangeRate(from, to);
    const converted = amount * rate;

    // Round to 2 decimal places for USD, 0 for VND
    if (to === 'VND') {
        return Math.round(converted);
    }

    return Math.round(converted * 100) / 100;
}

/**
 * Get all supported currencies
 * @returns {Array} List of supported currencies
 */
export function getSupportedCurrencies() {
    return [
        {
            code: 'USD',
            name: 'US Dollar',
            symbol: '$',
            decimals: 2
        },
        {
            code: 'VND',
            name: 'Vietnamese Dong',
            symbol: '₫',
            decimals: 0
        }
    ];
}

/**
 * Get exchange rates for all currency pairs
 * @returns {Object} Exchange rates object
 */
export function getAllExchangeRates() {
    return {
        USD_TO_VND: EXCHANGE_RATES.USD_TO_VND,
        VND_TO_USD: EXCHANGE_RATES.VND_TO_USD,
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Update exchange rates (for admin use)
 * In production, this could fetch from external API
 * @param {number} usdToVnd - New USD to VND rate
 */
export function updateExchangeRate(usdToVnd) {
    if (usdToVnd <= 0) {
        throw new Error('Exchange rate must be positive');
    }

    EXCHANGE_RATES.USD_TO_VND = usdToVnd;
    EXCHANGE_RATES.VND_TO_USD = 1 / usdToVnd;

    console.log(`✅ Exchange rate updated: 1 USD = ${usdToVnd} VND`);
}

export default {
    getExchangeRate,
    convertCurrency,
    getSupportedCurrencies,
    getAllExchangeRates,
    updateExchangeRate
};
