import pool from '../../../../db.js';
import currencyService from '../../../../services/currencyService.js';

// Configuration
const HOUSE_EDGE_TRIPLE = true; // If true, triple (1-1-1, etc.) makes Big/Small lose.

/**
 * Place a bet on Tai Xiu
 * POST /api/games/taixiu/bet
 * Body: { betType: 'TAI' | 'XIU', amount: number }
 */
export async function placeBet(req, res) {
    const connection = await pool.getConnection(); // Get distinct connection for transaction
    try {
        const userId = req.user?.id;
        const { betType, amount } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // 0. ADMIN RESTRICTION
        if (req.user?.role === 'admin') {
            return res.status(403).json({ message: 'Admin accounts are not allowed to place bets.' });
        }

        if (!['TAI', 'XIU'].includes(betType)) {
            return res.status(400).json({ message: 'Invalid bet type. Must be TAI or XIU.' });
        }

        // 1. AMOUNT VALIDATION
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid bet amount.' });
        }

        // Decimal Precision Check (Max 2 decimal places)
        // Convert to string to check decimals
        const amountStr = amount.toString();
        if (amountStr.includes('.')) {
            const decimalPart = amountStr.split('.')[1];
            if (decimalPart.length > 2) {
                return res.status(400).json({ message: 'Invalid bet amount. Maximum 2 decimal places allowed.' });
            }
        }

        // Minimum Bet Check
        const MIN_BET_VND = 1000;
        const MIN_BET_USD = 0.1;

        // Since we don't know the currency yet without fetching wallet, we can default to a safe check
        // or check it after fetching wallet. Let's check basics first.
        if (amount < 0.1) {
            // Basic safe guard for USD (0.1) which is tiny for VND. 
            // We will check stricter logic after fetching wallet currency.
            return res.status(400).json({ message: 'Bet amount too small (Min 0.1 USD / 1000 VND).' });
        }

        await connection.beginTransaction();

        // 1. Get User Wallet (Locking)
        const [userWallets] = await connection.execute(
            'SELECT id, balance, currency FROM user_wallets WHERE user_id = ? FOR UPDATE',
            [userId]
        );

        if (userWallets.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Wallet not found' });
        }
        const userWallet = userWallets[0];

        // 2. Get Admin (House) Wallet (Locking)
        const [admins] = await connection.execute(
            "SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
        );

        if (admins.length === 0) {
            await connection.rollback();
            return res.status(500).json({ message: 'System error: No house account found.' });
        }
        const adminId = admins[0].id;

        // Ensure Admin has a wallet
        const [adminWallets] = await connection.execute(
            'SELECT id, balance, currency FROM user_wallets WHERE user_id = ? FOR UPDATE',
            [adminId]
        );

        let adminWallet;
        if (adminWallets.length === 0) {
            const [newAdminWallet] = await connection.execute(
                "INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, 'USD', 'active') RETURNING id",
                [adminId]
            );
            if (newAdminWallet && newAdminWallet.length > 0) {
                adminWallet = { id: newAdminWallet[0].id, balance: 0.00, currency: 'USD' };
            } else {
                throw new Error("Failed to create admin wallet");
            }
        } else {
            adminWallet = adminWallets[0];
        }

        // 3. Validation & Currency Conversion
        const userBalance = parseFloat(userWallet.balance);
        const adminBalance = parseFloat(adminWallet.balance);

        // Stricter Minimum Bet Check based on Currency
        if (userWallet.currency === 'VND' && amount < 1000) {
            await connection.rollback();
            return res.status(400).json({ message: 'Minimum bet is 1,000 VND.' });
        }
        if (userWallet.currency === 'USD' && amount < 0.1) {
            await connection.rollback();
            return res.status(400).json({ message: 'Minimum bet is 0.1 USD.' });
        }

        if (userBalance < amount) {
            await connection.rollback();
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // HOUSE SOLVENCY CHECK
        // Payout is 1:1, so House needs at least 'amount' to pay if user wins.
        if (adminBalance < amount) {
            await connection.rollback();
            return res.status(503).json({
                message: 'Nhà cái đang bảo trì ngân sách (Tạm hết tiền). Vui lòng quay lại sau!',
                code: 'HOUSE_INSOLVENT'
            });
        }

        const betAmountUserCurrency = amount;
        let betAmountAdminCurrency = amount;

        if (userWallet.currency !== adminWallet.currency) {
            betAmountAdminCurrency = currencyService.convertCurrency(
                amount,
                userWallet.currency,
                adminWallet.currency
            );
        }

        // 4. Transfer Bet: User -> Admin
        const newUserBalance_AfterBet = userBalance - betAmountUserCurrency;
        const newAdminBalance_AfterBet = adminBalance + betAmountAdminCurrency;

        await connection.execute(
            'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newUserBalance_AfterBet, userWallet.id]
        );

        await connection.execute(
            'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newAdminBalance_AfterBet, adminWallet.id]
        );

        // Log Transfer: User Pay
        let amountUSD = betAmountUserCurrency;
        if (userWallet.currency !== 'USD') {
            amountUSD = currencyService.convertCurrency(betAmountUserCurrency, userWallet.currency, 'USD');
        }

        // FIX: Use 'purchase' instead of 'game_bet' due to ENUM constraint
        await connection.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, description, status, metadata)
             VALUES (?, ?, 'purchase', ?, ?, ?, ?, 'completed', ?)`,
            [userWallet.id, userId, -amountUSD, userBalance, newUserBalance_AfterBet, `Đặt cược ${betType} (Sic Bo)`, JSON.stringify({ game: 'TAI_XIU', bet: betType })]
        );

        // Log Transfer: Admin Receive
        let amountAdminUSD = betAmountAdminCurrency;
        if (adminWallet.currency !== 'USD') {
            amountAdminUSD = currencyService.convertCurrency(betAmountAdminCurrency, adminWallet.currency, 'USD');
        }

        // FIX: Use 'deposit' instead of 'game_revenue' due to ENUM constraint
        await connection.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, user_id, type, amount, balance_before, balance_after, description, status, metadata)
             VALUES (?, ?, 'deposit', ?, ?, ?, ?, 'completed', ?)`,
            [adminWallet.id, adminId, amountAdminUSD, adminBalance, newAdminBalance_AfterBet, `Người chơi cược ${betType} (Sic Bo)`, JSON.stringify({ game: 'TAI_XIU', from_user: userId })]
        );

        // 5. Roll Dice & Determine Result
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const dice3 = Math.floor(Math.random() * 6) + 1;
        const totalScore = dice1 + dice2 + dice3;

        let resultType;
        if (dice1 === dice2 && dice2 === dice3) {
            resultType = 'TRIPLE';
        } else {
            resultType = totalScore >= 11 ? 'TAI' : 'XIU';
        }

        // 6. Handle Payout (If Win)
        let isWin = false;
        let winAmountUserCurrency = 0;
        let finalUserBalance = newUserBalance_AfterBet;

        if (resultType === 'TRIPLE') {
            isWin = false;
        } else if (resultType === betType) {
            isWin = true;
            winAmountUserCurrency = betAmountUserCurrency * 2;
        }

        if (isWin) {
            let payoutAmountAdminCurrency = winAmountUserCurrency;
            if (userWallet.currency !== adminWallet.currency) {
                payoutAmountAdminCurrency = currencyService.convertCurrency(
                    winAmountUserCurrency,
                    userWallet.currency,
                    adminWallet.currency
                );
            }

            const newUserBalance_AfterWin = newUserBalance_AfterBet + winAmountUserCurrency;
            const newAdminBalance_AfterWin = newAdminBalance_AfterBet - payoutAmountAdminCurrency;

            await connection.execute(
                'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newUserBalance_AfterWin, userWallet.id]
            );

            await connection.execute(
                'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newAdminBalance_AfterWin, adminWallet.id]
            );

            let winUSD = winAmountUserCurrency;
            if (userWallet.currency !== 'USD') {
                winUSD = currencyService.convertCurrency(winAmountUserCurrency, userWallet.currency, 'USD');
            }

            // FIX: Use 'deposit' instead of 'game_win' due to ENUM constraint
            await connection.execute(
                `INSERT INTO wallet_transactions 
                 (wallet_id, user_id, type, amount, balance_before, balance_after, description, status, metadata)
                 VALUES (?, ?, 'deposit', ?, ?, ?, ?, 'completed', ?)`,
                [userWallet.id, userId, winUSD, newUserBalance_AfterBet, newUserBalance_AfterWin, `Thắng cược ${betType} (Sic Bo)`, JSON.stringify({ game: 'TAI_XIU', result: resultType })]
            );

            let payoutUSD = payoutAmountAdminCurrency;
            if (adminWallet.currency !== 'USD') {
                payoutUSD = currencyService.convertCurrency(payoutAmountAdminCurrency, adminWallet.currency, 'USD');
            }

            // FIX: Use 'purchase' instead of 'game_payout' due to ENUM constraint
            await connection.execute(
                `INSERT INTO wallet_transactions 
                 (wallet_id, user_id, type, amount, balance_before, balance_after, description, status, metadata)
                 VALUES (?, ?, 'purchase', ?, ?, ?, ?, 'completed', ?)`,
                [adminWallet.id, adminId, -payoutUSD, newAdminBalance_AfterBet, newAdminBalance_AfterWin, `Trả thưởng thắng cược (Sic Bo)`, JSON.stringify({ game: 'TAI_XIU', to_user: userId })]
            );

            finalUserBalance = newUserBalance_AfterWin;
        }

        // 7. Record Game Session & Bet
        const [sessionResult] = await connection.execute(
            `INSERT INTO game_sessions (game_type, dice1, dice2, dice3, total_score, result_type)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
            ['TAI_XIU', dice1, dice2, dice3, totalScore, resultType]
        );
        const sessionId = sessionResult[0].id;

        const betStatus = isWin ? 'WON' : 'LOST';
        await connection.execute(
            `INSERT INTO game_bets (user_id, session_id, bet_type, bet_amount, win_amount, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, sessionId, betType, amount, isWin ? winAmountUserCurrency : 0, betStatus]
        );

        await connection.commit();

        res.json({
            success: true,
            result: {
                dice: [dice1, dice2, dice3],
                total: totalScore,
                type: resultType
            },
            win: isWin,
            winAmount: isWin ? winAmountUserCurrency : 0,
            newBalance: finalUserBalance
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error processing Tai Xiu bet:', error);
        res.status(500).json({ message: 'Error processing bet' });
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Get game history for user
 */
export async function getHistory(req, res) {
    try {
        const userId = req.user?.id;
        const limit = parseInt(req.query.limit) || 20;

        const [history] = await pool.execute(
            `SELECT gb.*, gs.dice1, gs.dice2, gs.dice3, gs.total_score, gs.result_type 
             FROM game_bets gb
             JOIN game_sessions gs ON gb.session_id = gs.id
             WHERE gb.user_id = ?
             ORDER BY gb.created_at DESC
             LIMIT ?`,
            [userId, limit]
        );

        res.json({ history });
    } catch (error) {
        console.error('❌ Error getting game history:', error);
        res.status(500).json({ message: 'Error getting history' });
    }
}
