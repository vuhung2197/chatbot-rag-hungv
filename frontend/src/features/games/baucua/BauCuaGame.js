
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import ProvablyFairModal from '../taixiu/components/ProvablyFairModal'; // Reuse specific modal or create new one? reusing is fine.

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Mascot Assets (Using Emojis/Colors for now)
const MASCOTS = [
    { id: 'NAI', name: 'NAI', icon: '🦌', color: 'bg-amber-600' },
    { id: 'BAU', name: 'BẦU', icon: '🎃', color: 'bg-green-600' },
    { id: 'GA', name: 'GÀ', icon: '🐓', color: 'bg-red-500' },
    { id: 'CA', name: 'CÁ', icon: '🐟', color: 'bg-blue-500' },
    { id: 'CUA', name: 'CUA', icon: '🦀', color: 'bg-orange-600' },
    { id: 'TOM', name: 'TÔM', icon: '🦐', color: 'bg-pink-600' },
];

const CHIPS = [1000, 5000, 10000, 50000, 100000, 500000];

const BauCuaGame = ({ darkMode, onBack }) => {
    const [balance, setBalance] = useState(0);
    const [bets, setBets] = useState({}); // { NAI: 1000, TOM: 5000 }
    const [selectedChip, setSelectedChip] = useState(10000);
    const [gameState, setGameState] = useState('IDLE'); // IDLE, SHAKING, RESULT
    const [result, setResult] = useState(null); // { dice: [1,2,3], mascots: [...] }
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pfData, setPfData] = useState(null);
    const [showPfModal, setShowPfModal] = useState(false);
    const [totalWin, setTotalWin] = useState(0);
    const [goldenDiceIndex, setGoldenDiceIndex] = useState(null); // Index of the Golden Dice (0-2)

    const fetchWallet = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/wallet`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(Number(res.data.wallet.balance));
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/games/baucua/history?limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data.history);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchWallet();
        fetchHistory();
    }, [fetchWallet, fetchHistory]);

    // Handle putting chips on mascots
    const handleBet = (mascotId) => {
        const amount = selectedChip;
        if (gameState !== 'IDLE' && gameState !== 'RESULT') return;
        if (gameState === 'RESULT') {
            // If clicking after result, we might want to clear old result visually first, but usually we just add bet
            setGameState('IDLE');
            setResult(null);
            setGoldenDiceIndex(null);
            setTotalWin(0);
        }

        // Check balance limit locally (approx)
        const currentTotalBet = Object.values(bets).reduce((a, b) => a + b, 0);
        if (currentTotalBet + amount > balance) {
            alert("Insufficient balance!");
            return;
        }

        setBets(prev => ({
            ...prev,
            [mascotId]: (prev[mascotId] || 0) + amount
        }));
    };

    const clearBets = () => {
        if (gameState === 'SHAKING') return;
        setBets({});
        setResult(null);
        setTotalWin(0);
        setGameState('IDLE');
    };

    const placeBet = async () => {
        const betItems = Object.entries(bets).map(([type, amount]) => ({ type, amount }));
        if (betItems.length === 0) return;

        setLoading(true);
        setGameState('SHAKING');
        setTotalWin(0);

        // Animation Timer
        await new Promise(r => setTimeout(r, 2000));

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/games/baucua/bet`, {
                bets: betItems
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;
            setResult(data.result);
            setTotalWin(data.result.totalWin);
            setBalance(data.newBalance);
            setGoldenDiceIndex(data.goldenDiceIndex);
            setPfData(data.pf); // For Verify button if needed immediately

            setGameState('RESULT');
            fetchHistory();

        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Error placing bet");
            setGameState('IDLE');
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (n) => n.toLocaleString('vi-VN') + ' đ';

    // HEX Colors for Mascots (since tailwind classes might fail)
    const MASCOT_COLORS = {
        'NAI': '#d97706', // Amber 600
        'BAU': '#16a34a', // Green 600
        'GA': '#ef4444', // Red 500
        'CA': '#3b82f6', // Blue 500
        'CUA': '#ea580c', // Orange 600
        'TOM': '#db2777'  // Pink 600
    };

    return (
        <div style={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            color: darkMode ? 'white' : '#111827',
            padding: '20px',
            fontFamily: 'sans-serif'
        }}>
            {/* Header */}
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
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                    BẦU CUA TÔM CÁ
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
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                `}
            </style>

            <div style={{ display: 'flex', flexDirection: window.innerWidth < 1024 ? 'column' : 'row', gap: '24px', flex: 1 }}>
                {/* Main Game Board */}
                <div style={{ flex: 1, minWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Shaking Bowl / Result Area */}
                    <div style={{
                        height: '192px', position: 'relative', borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', backgroundColor: '#0f172a',
                        border: '1px solid #334155', boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
                    }}>
                        {gameState === 'SHAKING' ? (
                            <div className="shaking-effect" style={{
                                fontSize: '8rem',
                                filter: 'drop-shadow(0 0 15px rgba(250, 204, 21, 0.6))', // Gold glow
                                cursor: 'wait'
                            }}>
                                🎲
                            </div>
                        ) : result ? (
                            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', alignItems: 'center' }}>
                                {result.mascots.map((m, i) => {
                                    const mascotObj = MASCOTS.find(x => x.id === m);
                                    const isGolden = i === goldenDiceIndex;
                                    return (
                                        <div key={i} style={{
                                            width: '120px', height: '120px', borderRadius: '16px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: MASCOT_COLORS[mascotObj?.id] || '#6b7280',
                                            boxShadow: isGolden ? '0 0 20px 5px rgba(250, 204, 21, 0.8)' : '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            border: isGolden ? '4px solid #facc15' : 'none',
                                            borderBottom: isGolden ? '4px solid #facc15' : '4px solid rgba(0,0,0,0.2)',
                                            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                                            animationDelay: `${i * 0.1}s`,
                                            opacity: 0,
                                            position: 'relative'
                                        }}>
                                            {isGolden && (
                                                <div style={{
                                                    position: 'absolute', top: '-12px', right: '-12px',
                                                    background: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)',
                                                    color: '#422006', fontWeight: '900', fontSize: '1rem',
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: 10
                                                }}>
                                                    x2
                                                </div>
                                            )}
                                            <span style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))', lineHeight: 1 }}>{mascotObj?.icon || '?'}</span>
                                            <span style={{
                                                fontWeight: 'bold', color: 'white', textTransform: 'uppercase',
                                                fontSize: '0.875rem', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                            }}>
                                                {mascotObj?.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ color: '#6b7280', fontSize: '1.25rem' }}>Đặt cược và Xóc ngay!</div>
                        )}

                        {/* Win/Lose Notification */}
                        {gameState === 'RESULT' && (
                            <div style={{
                                position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center',
                                animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}>
                                {(() => {
                                    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
                                    const netProfit = totalWin - totalBet;

                                    if (netProfit > 0) {
                                        return (
                                            <div style={{
                                                color: '#4ade80', fontSize: '1.2rem', fontWeight: 'bold',
                                                textShadow: '0 0 10px rgba(74, 222, 128, 0.5)',
                                                background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px'
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
                                                background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px'
                                            }}>
                                                <span>💸 THUA</span>
                                                <span style={{ color: '#fca5a5' }}>-{formatMoney(Math.abs(netProfit))}</span>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div style={{
                                                color: '#94a3b8', fontSize: '1.2rem', fontWeight: 'bold',
                                                background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center'
                                            }}>
                                                <span>⚖️ HÒA VỐN</span>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Betting Grid */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'
                    }}>
                        {MASCOTS.map(m => (
                            <div
                                key={m.id}
                                onClick={() => handleBet(m.id)}
                                style={{
                                    height: '128px', borderRadius: '12px', position: 'relative',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', userSelect: 'none',
                                    backgroundColor: MASCOT_COLORS[m.id],
                                    borderBottom: '4px solid rgba(0,0,0,0.2)',
                                    transition: 'transform 0.1s',
                                }}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))' }}>{m.icon}</span>
                                <span style={{ fontWeight: 'bold', color: 'white', textTransform: 'uppercase', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                    {m.name}
                                </span>

                                {/* Chip Badge */}
                                {bets[m.id] > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '8px', right: '8px',
                                        backgroundColor: '#facc15', color: 'black',
                                        fontSize: '0.75rem', fontWeight: 'bold',
                                        padding: '2px 8px', borderRadius: '9999px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}>
                                        {formatMoney(bets[m.id])}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Controls */}
                    {/* Controls */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: '20px',
                        backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '24px', borderRadius: '24px',
                        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)',
                        marginTop: 'auto'
                    }}>
                        {/* Chip Selection Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', position: 'relative' }}>
                            <button
                                onClick={clearBets}
                                disabled={gameState === 'SHAKING'}
                                style={{
                                    width: '44px', height: '44px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid #ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                title="Xóa cược"
                            >
                                <RotateCcw size={20} />
                            </button>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {CHIPS.map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setSelectedChip(val)}
                                        style={{
                                            width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: '900', color: selectedChip === val ? '#451a03' : '#94a3b8',
                                            background: selectedChip === val ? 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)' : '#1e293b',
                                            border: selectedChip === val ? '2px solid #fffbeb' : '2px dashed #475569',
                                            transform: selectedChip === val ? 'translateY(-4px)' : 'none',
                                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'pointer',
                                            boxShadow: selectedChip === val ? '0 10px 15px -3px rgba(245, 158, 11, 0.4)' : 'none'
                                        }}
                                    >
                                        {val >= 1000 ? val / 1000 + 'k' : val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Big Spin Button */}
                        <div style={{ padding: '0 20px' }}>
                            <button
                                onClick={placeBet}
                                disabled={loading || Object.keys(bets).length === 0}
                                style={{
                                    width: '100%', padding: '18px',
                                    background: loading || Object.keys(bets).length === 0
                                        ? '#334155'
                                        : 'linear-gradient(to bottom, #ef4444, #b91c1c)', // Red Gradient
                                    color: 'white', border: 'none', borderRadius: '16px',
                                    borderTop: '1px solid rgba(255,255,255,0.2)',
                                    borderBottom: '4px solid rgba(0,0,0,0.3)',
                                    fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px',
                                    boxShadow: loading ? 'none' : '0 20px 25px -5px rgba(220, 38, 38, 0.4), 0 8px 10px -6px rgba(220, 38, 38, 0.2)',
                                    cursor: loading || Object.keys(bets).length === 0 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.1s',
                                    transform: 'scale(1)'
                                }}
                                onMouseDown={e => !loading && Object.keys(bets).length > 0 && (e.currentTarget.style.transform = 'scale(0.98) translateY(2px)')}
                                onMouseUp={e => !loading && Object.keys(bets).length > 0 && (e.currentTarget.style.transform = 'scale(1) translateY(0)')}
                            >
                                {loading ? 'ĐANG XÓC...' : 'XÓC NGAY'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* History Sidebar */}
                <div style={{
                    width: '320px', borderRadius: '12px', padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: '16px',
                    backgroundColor: darkMode ? '#1e293b' : 'white',
                    boxShadow: darkMode ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)'
                }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', borderBottom: '1px solid rgba(156, 163, 175, 0.3)', paddingBottom: '8px', margin: 0 }}>
                        Lịch Sử
                    </h3>

                    {/* Inject Custom Scrollbar Style */}
                    <style>
                        {`
                        .custom-scroll::-webkit-scrollbar { width: 8px; }
                        .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 4px; }
                        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
                        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
                        `}
                    </style>

                    <div className="custom-scroll" style={{
                        height: '600px', // Fixed height to ensure scroll
                        overflowY: 'scroll', // Always show scrollbar track
                        display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px'
                    }}>
                        {history.map(h => (
                            <div key={h.id} style={{
                                display: 'flex', flexDirection: 'column', padding: '12px', borderRadius: '4px',
                                backgroundColor: 'rgba(0,0,0,0.1)', fontSize: '0.875rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '4px', fontSize: '0.75rem' }}>
                                    <span>#{h.id}</span>
                                    <span>{new Date(h.created_at).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    {/* Dice Results */}
                                    {h.dice.map((d, i) => {
                                        // Logic mapping as before
                                        // MASCOTS array is 0-indexed, d is 1-based index (1-6)
                                        // If backend returns number 1-6:
                                        const mIndex = typeof d === 'number' ? d - 1 : 0;
                                        // If backend returns string "NAI", etc:
                                        // But my controller returns { dice: [1,2,3] } so it is number.
                                        const mObj = MASCOTS[mIndex];
                                        const isGoldenHistory = i === h.goldenDiceIndex;
                                        return (
                                            <span key={i} title={mObj?.name} style={{
                                                fontSize: '1.25rem',
                                                position: 'relative',
                                                filter: isGoldenHistory ? 'drop-shadow(0 0 4px #facc15)' : 'none'
                                            }}>
                                                {mObj?.icon}
                                                {isGoldenHistory && <span style={{
                                                    position: 'absolute', top: -4, right: -4, fontSize: '8px',
                                                    background: '#facc15', color: 'black', borderRadius: '50%',
                                                    width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 'bold'
                                                }}>2</span>}
                                            </span>
                                        )
                                    })}
                                </div>
                                <div style={{ fontWeight: 'bold', textAlign: 'right', color: h.totalWin - h.totalBet > 0 ? '#22c55e' : (h.totalWin - h.totalBet < 0 ? '#ef4444' : '#9ca3af') }}>
                                    {(() => {
                                        const net = h.totalWin - h.totalBet;
                                        if (net > 0) return `+${formatMoney(net)}`;
                                        if (net < 0) return `-${formatMoney(Math.abs(net))}`;
                                        return `${formatMoney(0)}`;
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal for PF Verification */}
            <ProvablyFairModal
                isOpen={showPfModal}
                onClose={() => setShowPfModal(false)}
                data={pfData}
            />
        </div>
    );
};

export default BauCuaGame;
