import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart2, TrendingUp, X, HelpCircle, BookOpen, ArrowLeft } from 'lucide-react';
import TrendChart from './components/TrendChart';
import RoadMap from './components/RoadMap';
import BridgeGuideModal from './components/BridgeGuideModal';
import ProvablyFairModal from './components/ProvablyFairModal';
import './taixiu.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TaixiuGame = ({ darkMode, onBalanceUpdate, onBack }) => {
    const [balance, setBalance] = useState(0);
    const [currency, setCurrency] = useState('USD');
    const [betAmount, setBetAmount] = useState(0);
    const [selectedBet, setSelectedBet] = useState(null); // 'TAI' | 'XIU'
    const [gameState, setGameState] = useState('IDLE'); // IDLE, ROLLING, RESULT
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastWinAmount, setLastWinAmount] = useState(0);
    const [lastBetSnapshot, setLastBetSnapshot] = useState(0);
    const [isWin, setIsWin] = useState(false);

    // New State for Trends
    const [showTrends, setShowTrends] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [pfData, setPfData] = useState(null);
    const [showPfModal, setShowPfModal] = useState(false);

    // Chips denomination
    const chips = [1000, 5000, 10000, 50000, 100000, 500000];

    const handleHistoryClick = (item) => {
        if (!item.metadata) return;

        // Parse metadata if needed (MySQL driver usually returns object for JSON columns, but verify)
        let meta = item.metadata;
        if (typeof meta === 'string') {
            try {
                meta = JSON.parse(meta);
            } catch (e) {
                console.error("Invalid JSON metadata", e);
                return;
            }
        }

        // Check if PF data exists (it might be wrapped in 'pf' key based on our backend)
        const fairData = meta.pf || meta; // Fallback if structure varies

        if (fairData && fairData.serverSeed) {
            setPfData(fairData);
            setShowPfModal(true);
        }
    };

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

            setResult(data.result);
            setGameState('RESULT');
            setBalance(Number(data.newBalance));
            setIsWin(data.win);
            setLastWinAmount(data.winAmount);
            setLastBetSnapshot(betAmount); // Save executed bet amount

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
            <BridgeGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

            {/* New Modern Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px',
                        backgroundColor: darkMode ? '#334155' : '#e5e7eb',
                        color: darkMode ? 'white' : 'black', border: 'none', cursor: 'pointer'
                    }}
                >
                    <ArrowLeft size={18} /> Back
                </button>
                <div style={{
                    fontSize: '1.5rem', fontWeight: 'bold',
                    background: 'linear-gradient(to right, #fb923c, #eab308)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    textTransform: 'uppercase'
                }}>
                    🎲 SIC BO (Tài Xỉu)
                </div>
                <div style={{
                    padding: '8px 16px', borderRadius: '9999px',
                    backgroundColor: '#1e293b',
                    color: '#facc15', fontFamily: 'monospace', fontWeight: 'bold',
                    border: '1px solid #334155'
                }}>
                    {formatMoney(balance)}
                </div>
            </div>

            {/* Toolbar for Extra Features */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                <button
                    onClick={() => setShowGuide(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-indigo-600 text-white hover:bg-indigo-500"
                >
                    <BookOpen size={16} />
                    Các Loại Cầu
                </button>
                <button
                    onClick={() => setShowTrends(!showTrends)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${showTrends ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                >
                    {showTrends ? <X size={16} /> : <TrendingUp size={16} />}
                    {showTrends ? 'Đóng Soi Cầu' : 'Soi Cầu'}
                </button>
            </div>

            {/* Inject Custom Shake Animation */}
            <style>
                {`
                @keyframes shake-hard {
                    0% { transform: translate(1px, 1px) rotate(0deg) scale(1); filter: blur(0px); }
                    25% { transform: translate(-4px, -4px) rotate(-15deg) scale(1.1); filter: blur(2px); }
                    50% { transform: translate(0px, 0px) rotate(180deg) scale(0.9); filter: blur(4px); }
                    75% { transform: translate(4px, 4px) rotate(15deg) scale(1.1); filter: blur(2px); }
                    100% { transform: translate(1px, -1px) rotate(0deg) scale(1); filter: blur(0px); }
                }
                .shaking-effect {
                    animation: shake-hard 0.3s infinite;
                }
                @keyframes popIn {
                    0% { opacity: 0; transform: scale(0.5); }
                    70% { transform: scale(1.1); }
                    100% { opacity: 1; transform: scale(1); }
                }
                `}
            </style>

            <div className="flex flex-col md:flex-row gap-4 max-w-7xl mx-auto w-full">
                {/* Main Game Board */}
                <div className="game-board flex-1">
                    {/* Result Area */}
                    <div style={{
                        height: '192px', position: 'relative', borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', backgroundColor: '#0f172a',
                        border: '1px solid #334155', boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
                        marginBottom: '24px'
                    }}>
                        {gameState === 'ROLLING' ? (
                            <div className="shaking-effect" style={{
                                fontSize: '8rem',
                                filter: 'drop-shadow(0 0 15px rgba(250, 204, 21, 0.6))',
                                cursor: 'wait'
                            }}>
                                🎲
                            </div>
                        ) : gameState === 'RESULT' && result ? (
                            <div className="dice-result" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="dice-container" style={{ gap: '24px', marginBottom: '40px' }}>
                                    {result.dice.map((d, i) => (
                                        <div key={i} className={`dice dice-${d}`} style={{ width: '64px', height: '64px' }}></div>
                                    ))}
                                </div>
                                <div style={{
                                    position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center'
                                }}>
                                    <span style={{
                                        fontSize: '1.5rem', fontWeight: 'bold',
                                        color: result.type === 'TAI' ? '#facc15' : '#ef4444',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                    }}>
                                        Total: {result.total} - {result.type}
                                    </span>

                                    {/* Win/Lose Badge */}
                                    <div style={{
                                        marginTop: '4px',
                                        animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        height: '30px' // Reserved height
                                    }}>
                                        {(() => {
                                            const netProfit = lastWinAmount - lastBetSnapshot;
                                            if (netProfit > 0) {
                                                return (
                                                    <div style={{
                                                        color: '#4ade80', fontSize: '1.2rem', fontWeight: 'bold',
                                                        textShadow: '0 0 10px rgba(74, 222, 128, 0.5)',
                                                        background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px'
                                                    }}>
                                                        <span>🎉 THẮNG</span>
                                                        <span style={{ color: '#facc15' }}>+{formatMoney(netProfit)}</span>
                                                    </div>
                                                );
                                            } else if (netProfit < 0) {
                                                return (
                                                    <div style={{
                                                        color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold',
                                                        textShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                                                        background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px'
                                                    }}>
                                                        <span>💸 THUA</span>
                                                        <span style={{ color: '#fca5a5' }}>-{formatMoney(Math.abs(netProfit))}</span>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div style={{
                                                        color: '#94a3b8', fontSize: '1.2rem', fontWeight: 'bold',
                                                        background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center'
                                                    }}>
                                                        <span>⚖️ HÒA VỐN</span>
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#6b7280' }}>Place your bet</div>
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
                        <div className="bet-controls">
                            <div className="manual-bet-input mb-4 flex justify-center">
                                <span className="p-2 bg-slate-700 rounded-l text-gray-300">$</span>
                                <input
                                    type="number"
                                    value={betAmount || ''}
                                    onChange={(e) => setBetAmount(Number(e.target.value))}
                                    placeholder="Enter amount"
                                    className="bg-slate-800 text-white p-2 w-40 outline-none border-t border-b border-slate-700"
                                    min="0"
                                />
                                <button className="p-2 bg-slate-700 rounded-r hover:bg-slate-600 border-l border-slate-600" onClick={clearBet}>X</button>
                            </div>

                            <div className="chips-rack">
                                {chips.map(val => (
                                    <button key={val} className="chip" onClick={() => handleChipClick(val)}>
                                        {val >= 1000 ? (val / 1000) + 'k' : val}
                                    </button>
                                ))}
                                <button className="clear-btn" onClick={clearBet}>Clear</button>
                            </div>
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
                                    <div
                                        key={h.id}
                                        className="history-item cursor-pointer hover:bg-slate-700/50 transition-colors"
                                        onClick={() => handleHistoryClick(h)}
                                        title="Click to verify (Provably Fair)"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold text-white shadow-sm flex-shrink-0"
                                                style={{
                                                    backgroundColor: h.result_type === 'TAI' ? '#ef4444' : h.result_type === 'TRIPLE' ? '#22c55e' : '#3b82f6'
                                                }}
                                            >
                                                {h.result_type === 'TRIPLE' ? '3' : h.result_type[0]}
                                            </span>
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs text-gray-500 font-mono">#{h.session_id}</div>
                                                <div className="text-sm font-bold text-yellow-500">
                                                    {h.dice1} + {h.dice2} + {h.dice3} = {h.total_score}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-3">
                                            <span
                                                className="font-bold leading-none"
                                                style={{
                                                    color: h.win_amount > 0 ? '#4caf50' : '#ff5252'
                                                }}
                                            >
                                                {h.win_amount > 0
                                                    ? `+${formatMoney(h.win_amount - h.bet_amount)}`
                                                    : `-${formatMoney(h.bet_amount)}`
                                                }
                                            </span>
                                            {/* Small indicator if PF data exists */}
                                            {h.metadata && (
                                                <div className="flex items-center px-2 py-1 bg-slate-800 rounded text-[10px] text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 transition-colors">
                                                    🛡️ Verify
                                                </div>
                                            )}
                                        </div>
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

            <ProvablyFairModal
                isOpen={showPfModal}
                onClose={() => setShowPfModal(false)}
                data={pfData}
            />
        </div >
    );
};

export default TaixiuGame;
