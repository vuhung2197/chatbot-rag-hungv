
import pool from '../../../../db.js';
import currencyService from '../../../../services/currencyService.js';
import { generateServerSeed, hashSeed, rollDice } from '../../../utils/provablyFair.js'; // Can reuse or adapt
import crypto from 'crypto';

// --- Slots Configuration ---
const SYMBOLS = [
    { id: 'DIAMOND', name: 'Diamond', payout: { 3: 0, 4: 0, 5: 'JACKPOT' }, weight: 1 },    // Very Rare (0.1%)
    { id: 'WILD', name: 'Wild', payout: { 3: 0, 4: 0, 5: 0 }, weight: 20 },   // Rare (2%)
    { id: 'SEVEN', name: 'Seven', payout: { 3: 10, 4: 50, 5: 200 }, weight: 50 },   // Low (5%)
    { id: 'DISK', name: 'Disk', payout: { 3: 5, 4: 20, 5: 80 }, weight: 150 },  // Medium (15%)
    { id: 'CHERRY', name: 'Cherry', payout: { 3: 2, 4: 5, 5: 20 }, weight: 300 },  // High (30%)
    { id: 'A', name: 'A', payout: { 3: 1, 4: 3, 5: 10 }, weight: 160 },  // 16%
    { id: 'K', name: 'K', payout: { 3: 1, 4: 3, 5: 10 }, weight: 160 },  // 16%
    { id: 'Q', name: 'Q', payout: { 3: 1, 4: 3, 5: 10 }, weight: 159 }   // ~16%
];

// Calculate cumulative weights for matrix generation
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0); // 1000

// Fixed Paylines (0,1,2 = rows)
const PAYLINES = [
    [1, 1, 1, 1, 1], // 1. Middle
    [0, 0, 0, 0, 0], // 2. Top
    [2, 2, 2, 2, 2], // 3. Bottom
    [0, 1, 2, 1, 0], // 4. V Shape
    [2, 1, 0, 1, 2], // 5. Inverted V
    [0, 0, 1, 0, 0], // 6. Top-Mid-Top
    [2, 2, 1, 2, 2], // 7. Bot-Mid-Bot
    [1, 2, 2, 2, 1], // 8. Mid-Bot-Mid
    [1, 0, 0, 0, 1], // 9. Mid-Top-Mid
    [0, 1, 1, 1, 0], // 10. Top-Mid-Top(wide)
    [2, 1, 1, 1, 2], // 11. Bot-Mid-Bot(wide)
    [0, 1, 0, 1, 0], // 12. ZigZag Top
    [2, 1, 2, 1, 2], // 13. ZigZag Bot
    [1, 0, 1, 0, 1], // 14. Mid-Top ZigZag
    [1, 2, 1, 2, 1], // 15. Mid-Bot ZigZag
    [0, 2, 0, 2, 0], // 16. Extreme ZigZag Top
    [2, 0, 2, 0, 2], // 17. Extreme ZigZag Bot
    [0, 2, 2, 2, 0], // 18. Top-Bot-Top bucket
    [2, 0, 0, 0, 2], // 19. Bot-Top-Bot bucket
    [0, 0, 2, 0, 0]  // 20. Top-Bot dip
];

// Helper: Generate matrix from seed
const generateMatrix = (serverSeed, clientSeed, nonce) => {
    // Hash: HMAC-SHA256(ServerSeed, ClientSeed + Nonce)
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest('hex'); // 64 chars

    // We need 15 symbols (5 cols x 3 rows).
    // Use 4 chars (16 bits) per symbol from hash? Or rolling hash?
    // 64 chars hex = 32 bytes. Not enough for 15 independent high-quality randoms?
    // Let's settle for taking substrings or re-hashing if needed.
    // Simple approach: Take 4 hex chars -> int -> mod TOTAL_WEIGHT

    const matrix = [[], [], []]; // 3 rows, 5 cols

    for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 3; row++) {
            // Index 0-14. 
            // 64 hex / 4 = 16 chunks. We need 15. Perfect.
            const chunkIndex = (col * 3) + row;
            const hexChunk = hash.substring(chunkIndex * 4, (chunkIndex + 1) * 4);
            const value = parseInt(hexChunk, 16);
            const weightTarget = value % TOTAL_WEIGHT;

            let cumulative = 0;
            let symbolId = 'Q';
            for (const sym of SYMBOLS) {
                cumulative += sym.weight;
                if (weightTarget < cumulative) {
                    symbolId = sym.id;
                    break;
                }
            }
            matrix[row][col] = symbolId;
        }
    }
    return matrix;
};

const SlotsController = {
    // 1. Get Jackpot Amount
    getJackpot: async (req, res) => {
        try {
            const [rows] = await pool.execute("SELECT current_amount FROM jackpot_pools WHERE game_type = 'SLOTS_CYBER'");
            if (rows.length === 0) return res.json({ amount: 1000000 });
            res.json({ amount: parseFloat(rows[0].current_amount) });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch jackpot' });
        }
    },

    // 2. Spin
    spin: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            const userId = req.user.id;
            const { betAmount, forceJackpot } = req.body; // Total bet for the spin

            if (!betAmount || betAmount <= 0) return res.status(400).json({ message: 'Invalid bet amount' });

            await connection.beginTransaction();

            // 1. Check & Deduct Balance
            const [wallets] = await connection.execute(
                "SELECT id, balance, currency FROM user_wallets WHERE user_id = ? FOR UPDATE",
                [userId]
            );
            if (!wallets.length) {
                await connection.rollback();
                return res.status(404).json({ message: 'Wallet not found' });
            }
            const wallet = wallets[0];
            const currentBalance = parseFloat(wallet.balance);

            if (currentBalance < betAmount) {
                await connection.rollback();
                return res.status(400).json({ message: 'Insufficient balance' });
            }

            const balanceAfterBet = currentBalance - betAmount;
            await connection.execute("UPDATE user_wallets SET balance = ? WHERE id = ?", [balanceAfterBet, wallet.id]);

            // 2. Contribute to Jackpot (1% of bet)
            // Convert bet to USD standard for Jackpot pool? Assume Pool is in one currency or handle conversion?
            // For simplicity, let's assume Jackpot Pool tracks simplified units or USD.
            // Let's assume user currency matches pool for now or simplistic 1% value.
            const jackpotContribution = betAmount * 0.01;
            await connection.execute(
                "UPDATE jackpot_pools SET current_amount = current_amount + ? WHERE game_type = 'SLOTS_CYBER'",
                [jackpotContribution]
            );

            // Log Transaction (Bet)
            await connection.execute(
                `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
                 VALUES (?, ?, 'bet_slots', ?, ?, ?, 'Cyber Slots Spin', 'completed')`,
                [wallet.id, userId, -betAmount, currentBalance, balanceAfterBet]
            );

            // 3. Generate Matrix (Provably Fair)
            const serverSeed = generateServerSeed();
            const clientSeed = userId.toString(); // Simplify for now
            const nonce = Date.now();

            let matrix;
            if (forceJackpot) {
                // FORCE WIN FOR TESTING
                matrix = [
                    ['SEVEN', 'SEVEN', 'SEVEN', 'SEVEN', 'SEVEN'],
                    ['DIAMOND', 'DIAMOND', 'DIAMOND', 'DIAMOND', 'DIAMOND'], // Middle row jackpot
                    ['SEVEN', 'SEVEN', 'SEVEN', 'SEVEN', 'SEVEN']
                ];
            } else {
                matrix = generateMatrix(serverSeed, clientSeed, nonce);
            }

            // 4. Calculate Win
            let totalWin = 0;
            let jackpotWon = false;
            const winLines = [];

            // Fetch current Jackpot to pay out if won
            const [potRows] = await connection.execute("SELECT current_amount FROM jackpot_pools WHERE game_type = 'SLOTS_CYBER'");
            const currentJackpot = parseFloat(potRows[0]?.current_amount || 0);

            PAYLINES.forEach((lineIndices, lineIdx) => {
                // lineIndices is array of 5 row indexes for col 0-4
                const symbols = lineIndices.map((rowIndex, colIndex) => matrix[rowIndex][colIndex]);

                // Check matches
                // Logic: Left to Right. Wild substitutes.
                // e.g. [WILD, SEVEN, SEVEN] = 3 SEVENS.
                // [DIAMOND, DIAMOND, DIAMOND, DIAMOND, DIAMOND] = JACKPOT.

                const firstSym = symbols[0];
                // Resolve effective symbol (if first is wild, second determines, etc)
                // If all wild? Win highest? Let's keep it simple:
                // Identify the main symbol of the line.
                let mainSymbol = firstSym;
                if (mainSymbol === 'WILD') {
                    // Look ahead for first non-wild
                    const nonWild = symbols.find(s => s !== 'WILD');
                    mainSymbol = nonWild || 'WILD'; // If all wild, treat as highest paying regular (SEVEN) or special rule?
                    if (mainSymbol === 'WILD') mainSymbol = 'SEVEN'; // 5 Wilds = 5 Sevens payout
                }

                // Count consecutive matches
                let count = 0;
                for (const sym of symbols) {
                    if (sym === mainSymbol || sym === 'WILD') {
                        // Diamond cannot be substituted by Wild for Jackpot? Usually yes.
                        if (mainSymbol === 'DIAMOND' && sym === 'WILD') {
                            // Break chain if we want strict Jackpot rule (Only real diamonds)
                            // Let's say Wild subs for Diamond but NOT for Jackpot trigger.
                            // If mixed wild+diamond, treat as normal 5-of-a-kind Diamond payout (not jackpot).
                            // Only 5 REAL Diamonds trigger Jackpot.
                            count++;
                        } else {
                            count++;
                        }
                    } else {
                        break;
                    }
                }

                if (count >= 3) {
                    // Lookup Payout
                    const symConfig = SYMBOLS.find(s => s.id === mainSymbol);
                    let payoutMult = symConfig.payout[count] || 0;

                    // Special Jackpot Check: 5 Real DIAMONDS on Line #0 (Middle row - which is PAYLINES[0] usually)
                    // Let's allow Jackpot on ANY line for excitement? Or specific?
                    // Let's say ANY 5 Diamonds (Real) = Jackpot.
                    if (mainSymbol === 'DIAMOND' && count === 5) {
                        const realDiamonds = symbols.filter(s => s === 'DIAMOND').length;
                        if (realDiamonds === 5) {
                            jackpotWon = true;
                            payoutMult = 'JACKPOT';
                        }
                    }

                    if (payoutMult === 'JACKPOT') {
                        // Win entire pot!
                        // We handle this outside loop to avoid double counting if multiple lines hit (unlikely)
                    } else if (payoutMult > 0) {
                        // Per line bet = Total Bet / 20 lines? Or Total Bet * Multiplier directly?
                        // Standard slots: Bet per line.
                        // Let's assume 'betAmount' is Total Bet.
                        // Win = (betAmount / 20) * Multiplier.
                        const lineBet = betAmount / PAYLINES.length; // 20
                        const winVal = lineBet * payoutMult;
                        totalWin += winVal;
                        winLines.push({ lineIdx, count, symbol: mainSymbol, amount: winVal });
                    }
                }
            });

            // Handle Jackpot Payout
            if (jackpotWon) {
                totalWin += currentJackpot;
                // Reset Pot
                await connection.execute("UPDATE jackpot_pools SET current_amount = 1000000 WHERE game_type = 'SLOTS_CYBER'");
            }

            // 5. Update Balance (Win)
            let finalBalance = balanceAfterBet;
            if (totalWin > 0) {
                finalBalance = balanceAfterBet + totalWin;
                await connection.execute("UPDATE user_wallets SET balance = ? WHERE id = ?", [finalBalance, wallet.id]);

                await connection.execute(
                    `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
                     VALUES (?, ?, 'win_slots', ?, ?, ?, ?, 'completed')`,
                    [wallet.id, userId, totalWin, balanceAfterBet, finalBalance, jackpotWon ? 'Cyber Slots JACKPOT!' : 'Win Slots']
                );
            }

            // 6. Save Session
            await connection.execute(
                `INSERT INTO game_slots_sessions (user_id, bet_amount, total_win, matrix, is_jackpot, server_seed, client_seed, nonce, currency)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, betAmount, totalWin, JSON.stringify(matrix), jackpotWon, serverSeed, clientSeed, nonce, wallet.currency]
            );

            await connection.commit();

            res.json({
                success: true,
                matrix,
                totalWin,
                jackpotWon,
                winLines,
                newBalance: finalBalance,
                currentJackpot: jackpotWon ? 1000000 : currentJackpot + jackpotContribution
            });

        } catch (error) {
            await connection.rollback();
            console.error(error);
            res.status(500).json({ message: 'Spin failed' });
        } finally {
            connection.release();
        }
    }
};

export default SlotsController;
