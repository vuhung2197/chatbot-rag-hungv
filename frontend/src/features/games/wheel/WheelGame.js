import React, { useState, useEffect, useCallback } from "react";
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import '../../../styles/WheelGame.css';
import WheelComponent from "./WheelComponent";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const BET_OPTIONS = [1, 2, 5, 10, 20, 40];
const CHIP_VALUES = [1000, 5000, 10000, 50000, 100000, 500000];

const WheelGame = ({ darkMode, onBack }) => {
    const [balance, setBalance] = useState(0);
    const [currency, setCurrency] = useState('USD');
    const [selectedChip, setSelectedChip] = useState(10000);
    const [bets, setBets] = useState({}); // { 1: 10000, 5: 5000 }
    const [spinning, setSpinning] = useState(false);
    const [resultIndex, setResultIndex] = useState(0); // Index 0-53
    const [history, setHistory] = useState([]);
    const [lastWin, setLastWin] = useState(null);
    const [lastBetAmount, setLastBetAmount] = useState(0);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

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
            const res = await axios.get(`${API_URL}/games/wheel/history?limit=10`, {
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

    const handlePlaceBet = (multiplier) => {
        if (spinning) return;
        if (balance < selectedChip) {
            setError("Not enough balance!");
            return;
        }

        setError(null);
        setBets(prev => ({
            ...prev,
            [multiplier]: (prev[multiplier] || 0) + selectedChip
        }));
        setBalance(prev => prev - selectedChip);
    };

    const handleClearBets = () => {
        if (spinning) return;
        const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
        setBalance(prev => prev + totalBet);
        setBets({});
        setError(null);
    };

    const handleSpin = async () => {
        const betArray = Object.entries(bets).map(([type, amount]) => ({
            type: Number(type),
            amount
        }));

        const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
        if (totalBet === 0) {
            setError("Please place a bet first!");
            return;
        }

        try {
            setError(null);
            setLastBetAmount(totalBet);
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/games/wheel/bet`, {
                bets: betArray
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setSpinning(true);
                setResultIndex(res.data.result.index);
                setLastWin(res.data.result);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Spin failed");
            fetchWallet();
        }
    };

    const onSpinEnd = () => {
        setSpinning(false);
        if (lastWin) {
            if (lastWin.totalWin > 0) {
                setMessage(`🎉 You won ${formatMoney(lastWin.totalWin)}!`);
                setBalance(prev => prev + lastWin.totalWin);
            } else {
                setError(`💸 Better luck next time! You lost -${formatMoney(lastBetAmount)}`);
            }
            fetchHistory();
        }
        setBets({});
        // Small delay before clearing lastWin to keep the UI showing the result
        setTimeout(() => {
            setLastWin(null);
            setMessage(null);
            setError(null);
        }, 5000);

        fetchWallet();
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    return (
        <div className={`wheel-container ${darkMode ? 'dark' : 'light'}`}>
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', padding: '0 10px' }}>
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px',
                        backgroundColor: 'rgba(51, 65, 85, 0.8)', color: 'white', border: 'none', cursor: 'pointer',
                        fontSize: '0.85rem', transition: 'all 0.2s'
                    }}
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🎡</span>
                    <h2 style={{ color: '#f1c40f', margin: 0, fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.05em' }}>
                        WHEEL OF FORTUNE
                    </h2>
                </div>
                <div style={{
                    padding: '6px 14px', borderRadius: '9999px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    color: '#facc15', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem',
                    border: '1px solid rgba(51, 65, 85, 0.5)', boxShadow: '0 0 15px rgba(250, 204, 21, 0.1)'
                }}>
                    {formatMoney(balance)}
                </div>
            </div>

            <div style={{
                width: '100%', maxWidth: '900px', background: darkMode ? 'rgba(15, 23, 42, 0.4)' : '#fff',
                borderRadius: '24px', padding: '30px', border: `1px solid ${darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb'}`,
                backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '25px'
            }}>
                {/* Clean Horizontal History */}
                <div style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '15px',
                    padding: '10px 20px', backgroundColor: 'rgba(15, 23, 42, 0.2)', borderRadius: '12px'
                }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>History</span>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '5px 0' }}>
                        {[...history].map((h, i) => (
                            <div key={i} className={`history-item history-${h.multiplier}`}
                                style={{
                                    backgroundColor: getHistoryColor(Number(h.multiplier)),
                                    minWidth: '32px', height: '32px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '0.85rem', color: '#000',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)', flexShrink: 0
                                }}>
                                {h.multiplier}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="main-game-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <WheelComponent
                        spinning={spinning}
                        resultIndex={resultIndex}
                        onSpinEnd={onSpinEnd}
                    />

                    {!spinning && lastWin && lastWin.totalWin > 0 && (
                        <div className="result-overlay" onClick={() => setLastWin(null)}>
                            <div className="result-popup">
                                <div className="result-multiplier">x{lastWin.multiplier}</div>
                                <div className="win-amount">+{formatMoney(lastWin.totalWin)}</div>
                            </div>
                        </div>
                    )}

                    <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        {error && (
                            <div style={{
                                backgroundColor: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c',
                                padding: '8px 20px', borderRadius: '8px', border: '1px solid #e74c3c', fontSize: '0.9rem'
                            }}>
                                {error}
                            </div>
                        )}
                        {message && (
                            <div style={{
                                backgroundColor: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71',
                                padding: '8px 20px', borderRadius: '8px', border: '1px solid #2ecc71', fontSize: '0.9rem'
                            }}>
                                {message}
                            </div>
                        )}
                    </div>

                    <div className="betting-board" style={{ marginTop: '0' }}>
                        {BET_OPTIONS.map(opt => (
                            <div key={opt} className="bet-option" onClick={() => handlePlaceBet(opt)}>
                                <div className="bet-multiplier" style={{ color: getHistoryColor(opt) }}>{opt}</div>
                                <div className="bet-payout">1 TO {opt}</div>
                                <div className="bet-chip-area">
                                    {bets[opt] > 0 && (
                                        <div className="bet-chip">
                                            <span style={{ fontSize: '10px', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                {formatChip(bets[opt])}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginTop: '5px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>
                                    {bets[opt] ? formatMoney(bets[opt]) : ''}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="game-controls" style={{ marginTop: '30px' }}>
                        <div className="chip-selector">
                            {CHIP_VALUES.map(val => (
                                <button
                                    key={val}
                                    onClick={() => setSelectedChip(val)}
                                    className={`chip-btn ${selectedChip === val ? 'selected' : ''}`}
                                    style={{
                                        margin: '0 4px', padding: '6px 12px', borderRadius: '15px',
                                        background: selectedChip === val ? '#f1c40f' : 'rgba(30, 41, 59, 0.5)',
                                        color: selectedChip === val ? '#000' : '#cbd5e1',
                                        border: `1px solid ${selectedChip === val ? '#f1c40f' : 'rgba(71, 85, 105, 0.5)'}`,
                                        cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem'
                                    }}
                                >
                                    {formatChip(val)}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                            <button className="btn-control btn-clear" onClick={handleClearBets} disabled={spinning}
                                style={{ padding: '10px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', border: 'none', fontSize: '0.9rem' }}>
                                CLEAR
                            </button>
                            <button className="btn-control btn-spin" onClick={handleSpin} disabled={spinning}
                                style={{ padding: '10px 50px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', border: 'none', fontSize: '0.9rem' }}>
                                {spinning ? 'SPINNING...' : 'SPIN'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Utils
const getHistoryColor = (num) => {
    const colors = {
        1: '#F1C40F',
        2: '#3498DB',
        5: '#9B59B6',
        10: '#2ECC71',
        20: '#E67E22',
        40: '#E74C3C'
    };
    return colors[num] || '#95a5a6';
};

const formatChip = (val) => {
    if (val >= 1000000) return (val / 1000000) + 'M';
    if (val >= 1000) return (val / 1000) + 'K';
    return val;
};

export default WheelGame;
