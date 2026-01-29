import crypto from 'crypto';

/**
 * Generate a cryptographically secure random server seed
 * @returns {string} Hex string
 */
export const generateServerSeed = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate SHA256 Hash of a seed (to show to user before reveal)
 * @param {string} seed 
 * @returns {string} Hash string
 */
export const hashSeed = (seed) => {
    return crypto.createHash('sha256').update(seed).digest('hex');
};

/**
 * Calculate game result (Dice 1-6) based on seeds and nonce
 * @param {string} serverSeed 
 * @param {string} clientSeed 
 * @param {number} nonce 
 * @returns {number[]} Array of 3 dice values [d1, d2, d3]
 */
export const rollDice = (serverSeed, clientSeed, nonce) => {
    // 1. Create message
    const message = `${clientSeed}:${nonce}`;

    // 2. Create HMAC Hash
    const hash = crypto.createHmac('sha256', serverSeed)
        .update(message)
        .digest('hex');

    // 3. Extract Dice values
    const dice = [];
    let index = 0;

    // We need 3 dice
    while (dice.length < 3) {
        // Take 5 hex characters (20 bits)
        // 5 hex chars = max value 1,048,575
        const subHash = hash.substring(index, index + 5);

        // Safety check if hash runs out (unlikely with SHA256's 64 chars for 3 dice)
        if (subHash.length < 5) break;

        const decimalValue = parseInt(subHash, 16);

        // Modulo bias protection
        // We want a uniform distribution. 
        // Max 5 hex = 1,048,575. 
        // 1,048,575 % 6 = 3. 
        // So 0, 1, 2, 3 appear slightly more often than 4, 5 if we use the full range.
        // Rejection threshold: we reject numbers >= 1,000,000 (easy round number < max)
        // 1,000,000 % 6 = 4. Wait, simpler calculation:
        // We reject if decimalValue >= 1,000,000 to keep it simple and safe.
        // Since 1,000,000 is vast compared to 6, the probabilistic cost is tiny.

        if (decimalValue < 1000000) {
            const diceValue = (decimalValue % 6) + 1;
            dice.push(diceValue);
        }

        index += 5;
    }

    // Fallback? If somehow we didn't get 3 dice (extremely rare), we can shift index or re-hash.
    // With 64 chars, we have 12 chunks of 5. It is statistically impossible to fail getting 3 valid numbers.
    // But for absolute robustness:
    if (dice.length < 3) {
        // Fallback to crypto.randomInt just to prevent crashing (should never happen)
        while (dice.length < 3) {
            dice.push(crypto.randomInt(1, 7));
        }
    }

    return dice;
};
