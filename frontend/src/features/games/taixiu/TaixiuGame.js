import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart2, TrendingUp, X } from 'lucide-react';
import TrendChart from './components/TrendChart';
import RoadMap from './components/RoadMap';
import './taixiu.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TaixiuGame = ({ darkMode, onBalanceUpdate }) => {
    const [balance, setBalance] = useState(0);
    const [currency, setCurrency] = useState('USD');
    const [betAmount, setBetAmount] = useState(0);
    const [selectedBet, setSelectedBet] = useState(null); // 'TAI' | 'XIU'
    const [gameState, setGameState] = useState('IDLE'); // IDLE, ROLLING, RESULT
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // New State for Trends
    const [showTrends, setShowTrends] = useState(false);

    // Chips denomination
    const chips = [1000, 5000, 10000, 50000, 100000, 500000];

    const fetchWallet = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/wallet`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(Number(res.data.wallet.balance));
            setCurrency(res.data.wallet.currency);
        } catch (err) {
            console.error("Error fetching wallet", err);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            // Fetch more history for trends (50 items)
            const res = await axios.get(`${API_URL}/games/taixiu/history?limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data.history);
        } catch (err) {
            console.error("Error fetching history", err);
        }
    }, []);

    useEffect(() => {
        fetchWallet();
        fetchHistory();
    }, [fetchWallet, fetchHistory]);

    const handleBetClick = (type) => {
        if (gameState === 'ROLLING') return;
        setSelectedBet(type);
        setError(null);
    };

    const handleChipClick = (amount) => {
        if (gameState === 'ROLLING') return;
        setBetAmount(prev => prev + amount);
        setError(null);
    };

    const clearBet = () => {
        if (gameState === 'ROLLING') return;
        setBetAmount(0);
    };

    const placeBet = async () => {
        if (!selectedBet) {
            setError("Please select TAI or XIU");
            return;
        }
        if (betAmount <= 0) {
            setError("Please select a bet amount");
            return;
        }
        if (betAmount > balance) {
            setError("Insufficient balance");
            return;
        }

        setLoading(true);
        setGameState('ROLLING');
        setError(null);

        // Simulate animation time (2s) before calling API or call API then wait
        // Ideally call API, wait for result, but show animation during wait.

        try {
            const token = localStorage.getItem('token');

            // Artificial delay for suspense if API is too fast
            const [apiRes] = await Promise.all([
                axios.post(`${API_URL}/games/taixiu/bet`, {
                    betType: selectedBet,
                    amount: betAmount
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                new Promise(resolve => setTimeout(resolve, 2000)) // Min 2s animation
            ]);

            const data = apiRes.data;

            setResult(data.result); // { dice: [1,2,3], total: 6, type: 'XIU' }
            setGameState('RESULT');
            setBalance(Number(data.newBalance));

            // Update history locally or fetch
            fetchHistory();

            if (data.win) {
                // Maybe play win sound
            }

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Error processing bet");
            setGameState('IDLE');
        } finally {
            setLoading(false);
        }
    };

    const resetGame = () => {
        setGameState('IDLE');
        setResult(null);
        setBetAmount(0);
        // Keep selectedBet or clear? Let's keep for easy re-bet.
    };

    // Helper to format currency
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currency }).format(amount);
    };

    return (
        <div className={`taixiu-container ${darkMode ? 'dark' : 'light'}`}>
            <div className="game-header">
                <h2>🎲 TÀI XỈU (SIC BO)</h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowTrends(!showTrends)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${showTrends ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                    >
                        {showTrends ? <X size={16} /> : <TrendingUp size={16} />}
                        {showTrends ? 'Đóng Soi Cầu' : 'Soi Cầu'}
                    </button>
                    <div className="balance-display">
                        Balance: <span>{formatMoney(balance)}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 max-w-7xl mx-auto w-full">
                {/* Main Game Board */}
                <div className="game-board flex-1">
                    {/* Result Area */}
                    <div className="dice-area">
                        {gameState === 'ROLLING' ? (
                            <div className="shaking-bowl">🥣</div>
                        ) : gameState === 'RESULT' && result ? (
                            <div className="dice-result">
                                <div className="dice-container">
                                    {result.dice.map((d, i) => (
                                        <div key={i} className={`dice dice-${d}`}></div>
                                    ))}
                                </div>
                                <div className="result-text">
                                    Total: {result.total} - <span className={result.type === 'TAI' ? 'text-tai' : 'text-xiu'}>{result.type}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="placeholder-text">Place your bet</div>
                        )}
                    </div>

                    {/* Betting Options */}
                    <div className="betting-zones">
                        <div
                            className={`bet-zone xiu ${selectedBet === 'XIU' ? 'active' : ''}`}
                            onClick={() => handleBetClick('XIU')}
                        >
                            <h3>XỈU (SMALL)</h3>
                            <p>Total 4-10</p>
                            <div className="odds">1 : 1</div>
                            {selectedBet === 'XIU' && betAmount > 0 && (
                                <div className="current-bet">{formatMoney(betAmount)}</div>
                            )}
                        </div>

                        <div
                            className={`bet-zone tai ${selectedBet === 'TAI' ? 'active' : ''}`}
                            onClick={() => handleBetClick('TAI')}
                        >
                            <h3>TÀI (BIG)</h3>
                            <p>Total 11-17</p>
                            <div className="odds">1 : 1</div>
                            {selectedBet === 'TAI' && betAmount > 0 && (
                                <div className="current-bet">{formatMoney(betAmount)}</div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="controls">
                        {gameState === 'RESULT' ? (
                            <button className="btn-action play-again" onClick={resetGame}>PLAY AGAIN</button>
                        ) : (
                            <button
                                className="btn-action place-bet"
                                onClick={placeBet}
                                disabled={loading || betAmount === 0 || !selectedBet}
                            >
                                {loading ? 'ROLLING...' : 'PLACE BET'}
                            </button>
                        )}
                    </div>

                    {/* Chips */}
                    {gameState !== 'ROLLING' && gameState !== 'RESULT' && (
                        <div className="chips-rack">
                            {chips.map(val => (
                                <button key={val} className="chip" onClick={() => handleChipClick(val)}>
                                    {val >= 1000 ? (val / 1000) + 'k' : val}
                                </button>
                            ))}
                            <button className="clear-btn" onClick={clearBet}>Clear</button>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}
                </div>

                {/* Right Side: Trends or History */}
                <div className={`w-full md:w-[400px] transition-all duration-300 ${showTrends ? 'block' : 'hidden md:block'}`}>
                    {showTrends ? (
                        <div className="flex flex-col gap-4">
                            <TrendChart history={history} />
                            <RoadMap history={history} />
                        </div>
                    ) : (
                        <div className="game-history">
                            <h3>Lịch Sử Cược</h3>
                            <div className="history-list h-[400px] overflow-y-auto">
                                {history.map(h => (
                                    <div key={h.id} className="history-item">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                                                style={{
                                                    backgroundColor: h.result_type === 'TAI' ? '#ef4444' : h.result_type === 'TRIPLE' ? '#22c55e' : '#3b82f6'
                                                }}
                                            >
                                                {h.result_type === 'TRIPLE' ? '3' : h.result_type[0]}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400">#{h.session_id}</span>
                                                <span className="text-sm font-medium">{h.dice1}+{h.dice2}+{h.dice3} = {h.total_score}</span>
                                            </div>
                                        </div>
                                        <span
                                            className="font-bold"
                                            style={{
                                                color: h.win_amount > 0 ? '#4caf50' : '#ff5252'
                                            }}
                                        >
                                            {h.win_amount > 0 ? `+${formatMoney(h.win_amount)}` : `-${formatMoney(h.bet_amount)}`}
                                        </span>
                                    </div>
                                ))}
                                {history.length === 0 && <div className="text-center text-gray-500 mt-10">Chưa có lịch sử</div>}
                            </div>
                            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                                <p className="text-xs text-center text-gray-400">
                                    Mẹo: Bấm nút "Soi Cầu" phía trên để xem biểu đồ phân tích.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaixiuGame;
