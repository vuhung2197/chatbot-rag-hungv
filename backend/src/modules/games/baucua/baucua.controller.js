
import pool from '../../../../db.js';
import currencyService from '../../../../services/currencyService.js';
import { generateServerSeed, hashSeed, rollDice } from '../../../utils/provablyFair.js';

// Mapping: 1=Nai, 2=Bầu, 3=Gà, 4=Cá, 5=Cua, 6=Tôm
const MASCOT_MAPPING = {
    'NAI': 1,
    'BAU': 2,
    'GA': 3,
    'CA': 4,
    'CUA': 5,
    'TOM': 6
};

// Reverse mapping for display
const ID_TO_MASCOT = {
    1: 'NAI', 2: 'BAU', 3: 'GA', 4: 'CA', 5: 'CUA', 6: 'TOM'
};

const BauCuaController = {
    // 1. Place Bet (Multiple items)
    placeBet: async (req, res) => {
        const connection = await pool.getConnection(); // Use transaction
        try {
            const { bets, clientSeed: reqClientSeed } = req.body;
            // bets = [{ type: 'BAU', amount: 1000 }, { type: 'CUA', amount: 5000 }]
            const userId = req.user.id;

            if (!bets || !Array.isArray(bets) || bets.length === 0) {
                return res.status(400).json({ message: 'Invalid bets' });
            }

            // Calculate total bet amount & Validate
            let totalBetAmount = 0;
            for (const bet of bets) {
                if (!MASCOT_MAPPING[bet.type]) {
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

            // 2. Deduct Balance (Initial)
            const balanceAfterBet = currentBalance - totalBetAmount;
            await connection.execute(
                "UPDATE user_wallets SET balance = ? WHERE id = ?",
                [balanceAfterBet, userWallet.id]
            );

            // Convert transaction amount to USD for storage (System Standard)
            let transactionAmountUSD = totalBetAmount;
            if (userWallet.currency !== 'USD') {
                transactionAmountUSD = currencyService.convertCurrency(totalBetAmount, userWallet.currency, 'USD');
            }

            await connection.execute(
                `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
                 VALUES (?, ?, 'bet_baucua', ?, ?, ?, ?, 'completed')`,
                [userWallet.id, userId, -transactionAmountUSD, currentBalance, balanceAfterBet, `Bet Bau Cua: ${bets.map(b => b.type).join(', ')}`]
            );

            // 3. Roll Dice (Provably Fair)
            const serverSeed = generateServerSeed();
            const clientSeed = reqClientSeed || userId.toString();
            const nonce = Date.now(); // Simple nonce based on timestamp
            const serverSeedHash = hashSeed(serverSeed);

            // Roll 3 dice (1-6)
            const [dice1, dice2, dice3] = rollDice(serverSeed, clientSeed, nonce);
            const totalScore = dice1 + dice2 + dice3;

            // 4. Save Game Session
            const resultString = [ID_TO_MASCOT[dice1], ID_TO_MASCOT[dice2], ID_TO_MASCOT[dice3]].join(',');

            // Note: RETURNING is needed for Postgres to get ID
            const [sessionResult] = await connection.execute(
                `INSERT INTO game_sessions (game_type, dice1, dice2, dice3, total_score, result_type)
                 VALUES ('BAU_CUA', ?, ?, ?, ?, ?) RETURNING id`,
                [dice1, dice2, dice3, totalScore, resultString]
            );

            const sessionId = sessionResult[0].id;

            // 5. Calculate Win & Save Bets with Golden Dice Logic
            // Generate Golden Dice Index (0-2) using the hash to be consistent (Deterministic based on seed)
            // Use the last char of hash converted to integer mod 3
            const lastChar = serverSeedHash.charCodeAt(serverSeedHash.length - 1);
            const goldenDiceIndex = lastChar % 3; // 0, 1, or 2

            let totalWinAmount = 0;
            const betDetails = [];
            const pfData = { serverSeed, serverSeedHash, clientSeed, nonce, goldenDiceIndex }; // Add golden index to PF data

            for (const bet of bets) {
                const mascotId = MASCOT_MAPPING[bet.type];

                // Calculate multipliers based on dice matches
                let matchMultiplier = 0;
                [dice1, dice2, dice3].forEach((d, index) => {
                    if (d === mascotId) {
                        // Apply Golden Dice Multiplier (x2) if index matches, otherwise x1
                        matchMultiplier += (index === goldenDiceIndex ? 2 : 1);
                    }
                });

                let win = 0;
                let status = 'LOST';
                if (matchMultiplier > 0) {
                    // Win Rule: Stake + (Stake * Multiplier)
                    // Regular: 1 hit = Stake + Stake*1 (Total 2x)
                    // Golden: 1 hit (Golden) = Stake + Stake*2 (Total 3x)
                    win = bet.amount + (bet.amount * matchMultiplier);
                    status = 'WON';
                }

                totalWinAmount += win;
                betDetails.push({ ...bet, win, matchMultiplier, status });

                // Convert to USD for storage
                const betAmountUSD = currencyService.convertCurrency(bet.amount, userWallet.currency, 'USD');
                const winAmountUSD = currencyService.convertCurrency(win, userWallet.currency, 'USD');

                // Save PF data including goldenDiceIndex in metadata
                const betPfData = { ...pfData, goldenDiceIndex, currency: 'USD' };

                await connection.execute(
                    `INSERT INTO game_bets (user_id, session_id, bet_type, bet_amount, win_amount, status, metadata)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [userId, sessionId, bet.type, betAmountUSD, winAmountUSD, status, JSON.stringify(betPfData)]
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

                // Convert win amount to USD for logging
                let winAmountUSD = totalWinAmount;
                if (userWallet.currency !== 'USD') {
                    winAmountUSD = currencyService.convertCurrency(totalWinAmount, userWallet.currency, 'USD');
                }

                await connection.execute(
                    `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
                     VALUES (?, ?, 'win_baucua', ?, ?, ?, ?, 'completed')`,
                    [userWallet.id, userId, winAmountUSD, balanceAfterBet, finalUserBalance, `Win Bau Cua (Session #${sessionId})`]
                );
            }

            await connection.commit();

            res.json({
                success: true,
                sessionId,
                result: {
                    dice: [dice1, dice2, dice3],
                    mascots: [ID_TO_MASCOT[dice1], ID_TO_MASCOT[dice2], ID_TO_MASCOT[dice3]],
                    totalWin: totalWinAmount,
                    winDetails: betDetails
                },
                newBalance: finalUserBalance,
                newBalance: finalUserBalance,
                pf: pfData,
                goldenDiceIndex // Return to frontend
            });

        } catch (error) {
            await connection.rollback();
            console.error("BauCua Bet Error Detailed:", error);
            // Return detailed error to client for debugging
            res.status(500).json({
                message: 'Error processing bet: ' + (error.message || 'Unknown error'),
                detail: error.toString()
            });
        } finally {
            if (connection) connection.release();
        }
    },

    // 2. Get History
    getHistory: async (req, res) => {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 20;

            // We need to group bets by session, because one session can have multiple bet rows.
            // But for simple list, maybe we just show rows? 
            // Better: Show Sessions and aggregate bets.

            // Query Sessions joined with Bets
            const [rows] = await pool.execute(
                `SELECT 
                    gs.id as session_id, gs.dice1, gs.dice2, gs.dice3, gs.result_type, gs.created_at,
                    gb.bet_type, gb.bet_amount, gb.win_amount, gb.status, gb.metadata
                 FROM game_bets gb
                 JOIN game_sessions gs ON gb.session_id = gs.id
                 WHERE gb.user_id = ? AND gs.game_type = 'BAU_CUA'
                 ORDER BY gs.created_at DESC
                 LIMIT ?`,
                [userId, limit * 5] // Fetch more rows to group in code
            );

            // Get User Currency
            const [walletRows] = await pool.execute('SELECT currency FROM user_wallets WHERE user_id = ?', [userId]);
            const userCurrency = walletRows[0]?.currency || 'USD';

            // Group by Session ID
            const historyMap = new Map();
            for (const row of rows) {
                if (!historyMap.has(row.session_id)) {
                    historyMap.set(row.session_id, {
                        id: row.session_id,
                        dice: [row.dice1, row.dice2, row.dice3],
                        result_type: row.result_type,
                        created_at: row.created_at,
                        timestamp: new Date(row.created_at).getTime(),
                        bets: [],
                        totalBet: 0,
                        totalWin: 0,
                        totalWin: 0,
                        pf: row.metadata, // Valid for all bets in session
                        goldenDiceIndex: typeof row.metadata === 'string' ? JSON.parse(row.metadata)?.goldenDiceIndex : row.metadata?.goldenDiceIndex
                    });
                }

                // Detect Source Currency from Metadata
                let srcCurrency = 'USD'; // Default assumption for new system
                try {
                    const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
                    if (meta?.currency) {
                        srcCurrency = meta.currency;
                    } else {
                        // Ambiguous records: Could be Legacy VND (with pfData) or Intermediate USD (with pfData)
                        // Heuristic: VND bets are usually large integers (e.g. 10000, 50000). USD bets are small (1, 5, 10).
                        // Threshold: 5000. 
                        // If amount > 5000, likely VND.
                        if (parseFloat(row.bet_amount) > 5000) {
                            srcCurrency = 'VND';
                        } else {
                            srcCurrency = 'USD';
                        }
                    }
                } catch (e) { }

                // Convert to User Currency
                const betAmount = currencyService.convertCurrency(parseFloat(row.bet_amount), srcCurrency, userCurrency);
                const winAmount = parseFloat(row.win_amount) > 0 ? currencyService.convertCurrency(parseFloat(row.win_amount), srcCurrency, userCurrency) : 0;

                const session = historyMap.get(row.session_id);
                session.bets.push({
                    type: row.bet_type,
                    amount: betAmount,
                    win: winAmount,
                    status: row.status
                });
                session.totalBet += betAmount;
                session.totalWin += winAmount;
            }

            const history = Array.from(historyMap.values()).slice(0, limit);

            res.json({ history });

        } catch (error) {
            console.error("BauCua History Error:", error);
            res.status(500).json({ message: 'Error fetching history' });
        }
    }
};

export default BauCuaController;
