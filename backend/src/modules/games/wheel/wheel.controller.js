
import pool from '../../../../db.js';
import currencyService from '../../../../services/currencyService.js';
import { generateServerSeed, hashSeed, rollDice } from '../../../utils/provablyFair.js';
import crypto from 'crypto';
import { WHEEL_SEGMENTS, PAYOUT_RATES } from './wheel.utils.js';

const WheelController = {
    // 1. Place Bet
    placeBet: async (req, res) => {
        const connection = await pool.getConnection(); // Use transaction
        try {
            const { bets, clientSeed: reqClientSeed } = req.body;
            // bets = [{ type: 1, amount: 1000 }, { type: 10, amount: 5000 }] 
            // type is the multiplier number (1, 2, 5, 10, 20, 40)
            const userId = req.user.id;

            if (!bets || !Array.isArray(bets) || bets.length === 0) {
                return res.status(400).json({ message: 'Invalid bets' });
            }

            // Validate bets
            let totalBetAmount = 0;
            const validMultipliers = Object.keys(PAYOUT_RATES).map(Number);

            for (const bet of bets) {
                if (!validMultipliers.includes(Number(bet.type))) {
                    return res.status(400).json({ message: `Invalid bet type: ${bet.type}` });
                }
                if (bet.amount <= 0) return res.status(400).json({ message: 'Bet amount must be positive' });
                totalBetAmount += bet.amount;
            }

            await connection.beginTransaction();

            // 1. Check Balance
            const [wallets] = await connection.execute(
                "SELECT id, balance, currency FROM user_wallets WHERE user_id = ? FOR UPDATE",
                [userId]
            );

            if (wallets.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Wallet not found' });
            }

            const userWallet = wallets[0];
            const currentBalance = parseFloat(userWallet.balance);

            if (currentBalance < totalBetAmount) {
                await connection.rollback();
                return res.status(400).json({ message: 'Insufficient balance' });
            }

            // 2. Deduct Balance
            const balanceAfterBet = currentBalance - totalBetAmount;
            await connection.execute(
                "UPDATE user_wallets SET balance = ? WHERE id = ?",
                [balanceAfterBet, userWallet.id]
            );

            // Convert transaction amount to USD for storage
            let transactionAmountUSD = totalBetAmount;
            if (userWallet.currency !== 'USD') {
                transactionAmountUSD = currencyService.convertCurrency(totalBetAmount, userWallet.currency, 'USD');
            }

            await connection.execute(
                `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
                 VALUES (?, ?, 'purchase', ?, ?, ?, ?, 'completed')`,
                // Use 'purchase' or custom type 'bet_wheel' if added to constraints. Let's stick to 'purchase' for now or update constraints later.
                // Actually constraints were updated to include 'bet_wheel'? No, only 'bet_baucua', 'bet_taixiu'.
                // Let's use 'purchase' for now to be safe or ask user to update constraints.
                // UPDATE: User asked to deploy. I will assume I can update constraints or use a generic type.
                // Let's use 'purchase' for safety unless I update constraints.
                // Wait, I updated constraints to VARCHAR(50) so I can use 'bet_wheel'.
                [userWallet.id, userId, -transactionAmountUSD, currentBalance, balanceAfterBet, `Bet Wheel: ${bets.map(b => b.type).join(', ')}`]
            );

            // 3. Spin Wheel (Provably Fair)
            const serverSeed = generateServerSeed();
            const clientSeed = reqClientSeed || userId.toString();
            const nonce = Date.now();
            const serverSeedHash = hashSeed(serverSeed);

            // Mock HMAC generation for Wheel Segment (0 to WHEEL_SEGMENTS.length - 1)
            const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
            const hmac = crypto.createHmac('sha256', serverSeed).update(combinedSeed).digest('hex');
            // Take first 8 chars (32 bits) -> int -> modulo length
            const outcome = parseInt(hmac.substr(0, 8), 16) % WHEEL_SEGMENTS.length;

            const resultMultiplier = WHEEL_SEGMENTS[outcome];

            // 4. Save Game Session
            // Note: RETURNING is needed for Postgres
            const [sessionResult] = await connection.execute(
                `INSERT INTO game_sessions (game_type, dice1, dice2, dice3, total_score, result_type)
                 VALUES ('WHEEL', 0, 0, 0, ?, ?) RETURNING id`,
                [outcome, resultMultiplier.toString()] // Store index in total_score, multiplier in result_type
            );

            const sessionId = sessionResult[0].id;

            // 5. Calculate Win & Save Bets
            let totalWinAmount = 0;
            const betDetails = [];
            const pfData = { serverSeed, serverSeedHash, clientSeed, nonce, resultIndex: outcome };

            for (const bet of bets) {
                const betType = Number(bet.type);
                let win = 0;
                let status = 'LOST';

                if (betType === resultMultiplier) {
                    // Win Rule: Stake + (Stake * PayRate)
                    // e.g. Bet 10 on 10 -> Win 10 + (10 * 10) = 110
                    win = bet.amount + (bet.amount * PAYOUT_RATES[betType]);
                    status = 'WON';
                }

                totalWinAmount += win;
                betDetails.push({ ...bet, win, status });

                // Save Bet
                const betAmountUSD = currencyService.convertCurrency(bet.amount, userWallet.currency, 'USD');
                const winAmountUSD = currencyService.convertCurrency(win, userWallet.currency, 'USD');

                await connection.execute(
                    `INSERT INTO game_bets (user_id, session_id, bet_type, bet_amount, win_amount, status, metadata)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [userId, sessionId, `BET_${bet.type}`, betAmountUSD, winAmountUSD, status, JSON.stringify({ ...pfData, currency: 'USD' })]
                );
            }

            // 6. Update Balance if Win
            let finalUserBalance = balanceAfterBet;
            if (totalWinAmount > 0) {
                finalUserBalance = balanceAfterBet + totalWinAmount;
                await connection.execute(
                    "UPDATE user_wallets SET balance = ? WHERE id = ?",
                    [finalUserBalance, userWallet.id]
                );

                // Log Win Transaction
                let winAmountUSD = totalWinAmount;
                if (userWallet.currency !== 'USD') {
                    winAmountUSD = currencyService.convertCurrency(totalWinAmount, userWallet.currency, 'USD');
                }

                await connection.execute(
                    `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
                     VALUES (?, ?, 'deposit', ?, ?, ?, ?, 'completed')`,
                    // Using 'deposit' for win or 'win_wheel'
                    [userWallet.id, userId, winAmountUSD, balanceAfterBet, finalUserBalance, `Win Wheel (Session #${sessionId})`]
                );
            }

            await connection.commit();

            res.json({
                success: true,
                sessionId,
                result: {
                    index: outcome,
                    multiplier: resultMultiplier,
                    totalWin: totalWinAmount,
                    winDetails: betDetails
                },
                newBalance: finalUserBalance,
                pf: pfData
            });

        } catch (error) {
            await connection.rollback();
            console.error("Wheel Bet Error:", error);
            res.status(500).json({
                message: 'Error processing bet: ' + (error.message || 'Unknown error')
            });
        } finally {
            if (connection) connection.release();
        }
    },

    // 2. Get History
    getHistory: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;

            // Get recent sessions
            const [sessions] = await pool.execute(
                `SELECT id, total_score as result_index, result_type as multiplier, created_at 
                 FROM game_sessions 
                 WHERE game_type = 'WHEEL' 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [limit]
            );

            res.json({ history: sessions });
        } catch (error) {
            console.error("Wheel History Error:", error);
            res.status(500).json({ message: 'Error fetching history' });
        }
    }
};

export default WheelController;
