
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { ArrowLeft, RotateCw, Info, X, Volume2, VolumeX } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// --- Assets / Symbols ---
// Using Emoji/Text for now. Replace with SVG images later.
const SYMBOLS = {
    'DIAMOND': { icon: '💎', color: '#b9f2ff', glow: '0 0 15px #00eaff' },
    'WILD': { icon: '🤖', color: '#a855f7', glow: '0 0 10px #d8b4fe' },
    'SEVEN': { icon: '7️⃣', color: '#ef4444', glow: '0 0 5px #fca5a5' },
    'DISK': { icon: '📀', color: '#f59e0b', glow: 'none' },
    'CHERRY': { icon: '🍒', color: '#ec4899', glow: 'none' },
    'A': { icon: '🅰️', color: '#94a3b8', glow: 'none' }, // Using text A might be cleaner
    'K': { icon: '🇰', color: '#94a3b8', glow: 'none' },
    'Q': { icon: '🇶', color: '#94a3b8', glow: 'none' }
};

const PAYLINES_SVG = [ // Coordinates for drawing lines? Maybe later.
];

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

const SlotsGame = ({ darkMode, onBack }) => {
    const [balance, setBalance] = useState(0);
    const [jackpot, setJackpot] = useState(1000000);
    const [betAmount, setBetAmount] = useState(10000); // 10k default
    // Matrix: 3 Rows x 5 Cols
    const [matrix, setMatrix] = useState([
        ['DIAMOND', 'DIAMOND', 'DIAMOND', 'DIAMOND', 'DIAMOND'],
        ['WILD', 'WILD', 'WILD', 'WILD', 'WILD'],
        ['SEVEN', 'SEVEN', 'SEVEN', 'SEVEN', 'SEVEN']
    ]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winLines, setWinLines] = useState([]);
    const [totalWin, setTotalWin] = useState(0);
    const [history, setHistory] = useState([]);
    const [showRules, setShowRules] = useState(false);
    const [showJackpotCelebration, setShowJackpotCelebration] = useState(false);
    const [floatingEffects, setFloatingEffects] = useState([]); // { id, text, type: 'win'|'loss' }
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Sound Refs
    const spinAudio = useRef(new Audio('/sounds/spin.mp3'));
    const winAudio = useRef(new Audio('/sounds/win.mp3'));
    const jackpotAudio = useRef(new Audio('/sounds/jackpot.mp3'));

    useEffect(() => {
        // Preload sounds
        spinAudio.current.loop = true;
        spinAudio.current.volume = 0.5;
        winAudio.current.volume = 0.6;
        jackpotAudio.current.volume = 1.0;
    }, []);

    const playSound = (type) => {
        if (!soundEnabled) return;
        try {
            if (type === 'spin') {
                spinAudio.current.currentTime = 0;
                spinAudio.current.play().catch(() => { });
            } else if (type === 'stopSpin') {
                spinAudio.current.pause();
                spinAudio.current.currentTime = 0;
            } else if (type === 'win') {
                winAudio.current.currentTime = 0;
                winAudio.current.play().catch(() => { });
            } else if (type === 'jackpot') {
                jackpotAudio.current.currentTime = 0;
                jackpotAudio.current.play().catch(() => { });
            }
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const fetchWallet = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/wallet`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(Number(res.data.wallet.balance));
        } catch (err) { console.error(err); }
    }, []);

    const fetchJackpot = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/games/slots/jackpot`);
            setJackpot(res.data.amount);
        } catch (err) { }
    }, []);

    useEffect(() => {
        fetchWallet();
        fetchJackpot();
        const interval = setInterval(fetchJackpot, 5000); // Poll Jackpot
        return () => clearInterval(interval);
    }, [fetchWallet, fetchJackpot]);

    const triggerEffect = (text, type) => {
        const id = Date.now();
        setFloatingEffects(prev => [...prev, { id, text, type }]);
        setTimeout(() => {
            setFloatingEffects(prev => prev.filter(e => e.id !== id));
        }, 1500);
    };

    const handleSpin = async (forceJackpot = false) => {
        if (balance < betAmount) {
            alert('Số dư không đủ!');
            return;
        }

        setIsSpinning(true);
        setWinLines([]);
        setTotalWin(0);

        // Effect: Deduct money visually
        triggerEffect(`-${formatMoney(betAmount)}`, 'loss');
        setBalance(prev => prev - betAmount); // Optimistic visual update
        playSound('spin');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/games/slots/spin`, { betAmount, forceJackpot }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Spin time - wait a bit longer or sync with sound?
            // Let's spin for at least 1.5s for the sound to be heard
            await new Promise(r => setTimeout(r, 1500));

            playSound('stopSpin');

            const data = res.data;
            setMatrix(data.matrix); // [[R0C0, R0C1...], [R1C0...], [R2C0...]]
            setWinLines(data.winLines);
            setTotalWin(data.totalWin);
            setBalance(data.newBalance); // Sync correct balance
            if (data.currentJackpot) setJackpot(data.currentJackpot);

            // Effect: Add win money visually
            if (data.totalWin > 0) {
                triggerEffect(`+${formatMoney(data.totalWin)}`, 'win');
                if (data.jackpotWon) {
                    playSound('jackpot');
                    setShowJackpotCelebration(true);
                    // Auto hide after 8 seconds
                    setTimeout(() => setShowJackpotCelebration(false), 8000);
                } else {
                    playSound('win');
                }
            }

        } catch (err) {
            console.error(err);
            playSound('stopSpin');
            setBalance(prev => prev + betAmount); // Revert optimistic
            alert('Lỗi kết nối');
        } finally {
            setIsSpinning(false);
        }
    };

    const formatMoney = (n) => n.toLocaleString('vi-VN') + ' đ';

    return (
        <div style={{
            minHeight: '100%',
            display: 'flex', flexDirection: 'column',
            backgroundColor: '#0f172a', // Slate 900
            color: 'white',
            padding: '20px', fontFamily: 'Orbitron, sans-serif'
        }}>
            <style>
                {`
                @keyframes spinReel {
                    0% { transform: translateY(-50px); filter: blur(5px); opacity: 0.5; }
                    100% { transform: translateY(50px); filter: blur(5px); opacity: 0.5; }
                }
                @keyframes pulseLine {
                    0% { opacity: 0.3; box-shadow: 0 0 10px #facc15; }
                    50% { opacity: 0.8; box-shadow: 0 0 25px #facc15, 0 0 10px white; }
                    100% { opacity: 0.3; box-shadow: 0 0 10px #facc15; }
                }
                .reel-spinning .symbol-cell {
                    animation: spinReel 0.1s linear infinite;
                }
                @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-80px) scale(1.5); opacity: 0; }
                }
                @keyframes drawLine {
                    from { stroke-dashoffset: 1000; }
                    to { stroke-dashoffset: 0; }
                }
                .win-line-svg {
                    animation: drawLine 1s ease-out forwards;
                }
                .win-line-svg {
                    animation: drawLine 1s ease-out forwards;
                }
                @keyframes zoomIn {
                    0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                    80% { transform: scale(1.1) rotate(0deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes raysRotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>

            {/* Header: Jackpot Ticker & Info */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{
                    flex: 1,
                    background: 'linear-gradient(90deg, #3b0764 0%, #7e22ce 50%, #3b0764 100%)',
                    padding: '20px', borderRadius: '16px',
                    textAlign: 'center', border: '2px solid #d8b4fe',
                    boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
                }}>
                    <div style={{ fontSize: '1rem', color: '#e9d5ff', letterSpacing: '2px', marginBottom: '4px' }}>CYBER JACKPOT</div>
                    <div style={{
                        fontSize: '2.5rem', fontWeight: '900', color: '#fff',
                        textShadow: '0 0 10px #e879f9, 0 0 20px #e879f9'
                    }}>
                        {formatMoney(jackpot)}
                    </div>
                </div>
                <button onClick={() => setShowRules(true)} style={{
                    width: '50px', height: '50px', borderRadius: '50%',
                    background: '#1e293b', border: '1px solid #475569', color: '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                    <Info size={24} />
                </button>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{
                    width: '50px', height: '50px', borderRadius: '50%',
                    background: '#1e293b', border: '1px solid #475569', color: soundEnabled ? '#4ade80' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                    {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                </button>
            </div>

            {/* Back & Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={{
                    background: 'none', border: '1px solid #475569', color: '#94a3b8',
                    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px'
                }}>
                    <ArrowLeft size={16} /> Exit
                </button>
                <div style={{ fontWeight: 'bold', color: '#facc15' }}>Balance: {formatMoney(balance)}</div>
            </div>

            {/* THE SLOT MACHINE */}
            <div style={{
                flex: 1,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                perspective: '1000px'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)', // 5 Reels
                    gap: '8px',
                    padding: '16px',
                    background: '#1e293b',
                    border: '4px solid #334155',
                    borderRadius: '12px',
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)',
                    position: 'relative', overflow: 'hidden' // Overflows for effect
                }}>
                    {/* --- Middle Line Effect & Needles --- */}
                    {/* Laser Line Background for Middle Row (Row Index 1) */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '0', right: '0',
                        height: '90px', // Approx height of a cell + gaps
                        transform: 'translateY(-50%)',
                        background: 'linear-gradient(90deg, rgba(250, 204, 21, 0) 0%, rgba(250, 204, 21, 0.15) 50%, rgba(250, 204, 21, 0) 100%)',
                        borderTop: '1px solid rgba(250, 204, 21, 0.3)',
                        borderBottom: '1px solid rgba(250, 204, 21, 0.3)',
                        pointerEvents: 'none',
                        zIndex: 1
                    }}></div>

                    {/* Left Needle */}
                    <div style={{
                        position: 'absolute', top: '50%', left: '-10px',
                        transform: 'translateY(-50%)',
                        width: '0', height: '0',
                        borderTop: '15px solid transparent',
                        borderBottom: '15px solid transparent',
                        borderLeft: '25px solid #facc15',
                        filter: 'drop-shadow(0 0 5px #facc15)',
                        zIndex: 10
                    }}></div>

                    {/* Right Needle */}
                    <div style={{
                        position: 'absolute', top: '50%', right: '-10px',
                        transform: 'translateY(-50%)',
                        width: '0', height: '0',
                        borderTop: '15px solid transparent',
                        borderBottom: '15px solid transparent',
                        borderRight: '25px solid #facc15',
                        filter: 'drop-shadow(0 0 5px #facc15)',
                        zIndex: 10
                    }}></div>

                    {/* SVG OVERLAY FOR WIN LINES */}
                    <svg style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        zIndex: 20, pointerEvents: 'none'
                    }}>
                        {winLines.map((win, idx) => {
                            const lineDef = PAYLINES[win.lineIdx];
                            if (!lineDef) return null;

                            // Calculate points: 
                            // 5 Columns. Cell width ~80px + 8px gap => ~88px step.
                            // Start Offset ~48px (16px padding + 32px half cell?) - Need precise calc or percentage.
                            // Container padding 16px. Grid Gap 8px. Cell 80px.
                            // Center of Col 0 = 16 + 40 = 56px.
                            // Center of Col 1 = 16 + 80 + 8 + 40 = 144px. (Step 88px)
                            // Row 0 = 16 + 40 = 56px.
                            // Row 1 = 16 + 80 + 8 + 40 = 144px. (Step 88px)

                            const points = lineDef.map((row, col) => {
                                const x = 56 + col * 88;
                                const y = 56 + row * 88;
                                return `${x},${y}`;
                            }).join(' ');

                            const color = ['#f472b6', '#4ade80', '#60a5fa', '#facc15'][idx % 4];

                            return (
                                <polyline key={idx} points={points}
                                    fill="none" stroke={color} strokeWidth="5"
                                    className="win-line-svg"
                                    strokeDasharray="1000"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                                />
                            );
                        })}
                    </svg>

                    {/* Render Columns (Reels) */}
                    {[0, 1, 2, 3, 4].map(colIdx => (
                        <div key={colIdx} className={isSpinning ? 'reel-spinning' : ''} style={{
                            display: 'flex', flexDirection: 'column', gap: '8px',
                            zIndex: 2 // Above the line
                        }}>
                            {[0, 1, 2].map(rowIdx => {
                                const symbolKey = matrix[rowIdx][colIdx]; // Get symbol ID
                                const sym = SYMBOLS[symbolKey] || SYMBOLS['Q'];

                                // Check if this cell is part of a win line
                                const isWin = winLines.some(line => {
                                    // line.lineIdx tells us the pattern, but that's hard to map back without PAYLINES array.
                                    // For MVP, just highlight if we won anything? 
                                    // Better: Backend returns winning coords? Or we just infer.
                                    // Let's just create a generic glow if TotalWin > 0 for now to save complex logic mapping
                                    return false; // TODO: Exact line highlighting
                                });

                                return (
                                    <div key={rowIdx} className="symbol-cell" style={{
                                        width: '80px', height: '80px',
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '2.5rem',
                                        boxShadow: isSpinning ? 'none' : (sym.glow !== 'none' ? sym.glow : 'inset 0 0 10px rgba(0,0,0,0.5)'),
                                        transition: 'transform 0.2s',
                                        // Specific highlight for Middle Row (Index 1) if not spinning
                                        borderColor: (rowIdx === 1 && !isSpinning) ? 'rgba(250, 204, 21, 0.5)' : '#334155',
                                        position: 'relative'
                                    }}>
                                        {isSpinning ? (
                                            // Blur / Trail effect content
                                            <div style={{ filter: 'blur(3px)', transform: 'scaleY(1.5)', opacity: 0.7 }}>
                                                {['🍒', '💎', '7️⃣'][Math.floor(Math.random() * 3)]}
                                            </div>
                                        ) : sym.icon}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div style={{
                marginTop: '20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                padding: '24px', background: '#1e293b', borderRadius: '16px 16px 0 0'
            }}>
                {/* Bet Selector */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    {[1000, 5000, 10000, 50000].map(amt => (
                        <button key={amt}
                            onClick={() => setBetAmount(amt)}
                            style={{
                                padding: '8px 16px', borderRadius: '8px',
                                border: betAmount === amt ? '2px solid #facc15' : '1px solid #475569',
                                background: betAmount === amt ? 'rgba(250, 204, 21, 0.1)' : 'transparent',
                                color: betAmount === amt ? '#facc15' : '#94a3b8',
                                fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            {formatMoney(amt)}
                        </button>
                    ))}
                </div>

                {/* Spin Button */}
                <button
                    onClick={() => handleSpin(false)}
                    disabled={isSpinning}
                    style={{
                        width: '200px', height: '64px',
                        background: isSpinning ? '#475569' : 'linear-gradient(180deg, #ec4899 0%, #db2777 100%)',
                        border: 'none', borderRadius: '50px',
                        color: 'white', fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase',
                        boxShadow: isSpinning ? 'none' : '0 10px 20px rgba(219, 39, 119, 0.4)',
                        cursor: isSpinning ? 'not-allowed' : 'pointer',
                        transform: isSpinning ? 'scale(0.95)' : 'scale(1)',
                        transition: 'all 0.1s'
                    }}
                >
                    {isSpinning ? 'Running...' : 'SPIN'}
                </button>

                {/* DEV BUTTON */}
                <button
                    onClick={() => handleSpin(true)}
                    disabled={isSpinning}
                    style={{
                        marginTop: '10px', padding: '8px 12px', fontSize: '0.8rem',
                        background: 'rgba(255, 255, 255, 0.1)', border: '1px dashed #94a3b8', color: '#e2e8f0',
                        cursor: 'pointer', opacity: 1, borderRadius: '4px'
                    }}
                    title="Force Jackpot Win (Dev Only)"
                >
                    DEV: FORCE JACKPOT
                </button>

                {/* Win Display */}
                {totalWin > 0 && (
                    <div style={{
                        fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80',
                        textShadow: '0 0 10px rgba(74, 222, 128, 0.5)',
                        marginTop: '8px'
                    }}>
                        WON: {formatMoney(totalWin)}
                    </div>
                )}

            </div>

            {/* FLOATING EFFECTS LAYER */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                pointerEvents: 'none', overflow: 'hidden', zIndex: 100
            }}>
                {floatingEffects.map(effect => (
                    <div key={effect.id} style={{
                        position: 'absolute',
                        top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                        fontSize: '3rem', fontWeight: '900',
                        color: effect.type === 'win' ? '#4ade80' : '#ef4444',
                        textShadow: effect.type === 'win' ? '0 0 20px #22c55e' : '0 0 10px #991b1b',
                        animation: 'floatUp 1.5s forwards',
                        whiteSpace: 'nowrap'
                    }}>
                        {effect.text}
                    </div>
                ))}
            </div>



            {/* JACKPOT CELEBRATION OVERLAY */}
            {
                showJackpotCelebration && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.9)', zIndex: 300,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, sans-serif'
                    }}>
                        {/* Rotating Rays */}
                        <div style={{
                            position: 'absolute', width: '100vw', height: '100vw',
                            background: 'conic-gradient(from 0deg, #facc15 0deg, transparent 20deg, #f0abfc 40deg, transparent 60deg, #facc15 80deg, transparent 100deg, #f0abfc 120deg, transparent 140deg, #facc15 160deg, transparent 180deg, #f0abfc 200deg, transparent 220deg, #facc15 240deg, transparent 260deg, #f0abfc 280deg, transparent 300deg, #facc15 320deg, transparent 340deg, #f0abfc 360deg)',
                            opacity: 0.3,
                            animation: 'raysRotate 10s linear infinite'
                        }}></div>

                        {/* Main Content */}
                        <div style={{ zIndex: 10, textAlign: 'center', animation: 'zoomIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                            <div style={{ fontSize: '5rem', marginBottom: '20px' }}>💎💎💎💎💎</div>
                            <h1 style={{
                                fontSize: '4rem', fontWeight: '900', color: '#facc15',
                                textShadow: '0 0 20px #eab308, 0 0 50px #a855f7',
                                marginBottom: '10px', textTransform: 'uppercase'
                            }}>
                                JACKPOT!
                            </h1>
                            <p style={{ fontSize: '2rem', color: 'white', letterSpacing: '2px' }}>YOU WON THE GRAND PRIZE</p>
                            <div style={{
                                fontSize: '3.5rem', fontWeight: 'bold', color: '#4ade80',
                                marginTop: '20px', textShadow: '0 0 30px #22c55e'
                            }}>
                                {formatMoney(jackpot)}
                            </div>
                            <button onClick={() => setShowJackpotCelebration(false)} style={{
                                marginTop: '40px', padding: '16px 32px', fontSize: '1.2rem', fontWeight: 'bold',
                                background: 'white', color: 'black', border: 'none', borderRadius: '50px', cursor: 'pointer',
                                boxShadow: '0 0 20px white'
                            }}>
                                COLLECT MONEY
                            </button>
                        </div>
                    </div>
                )
            }

            {/* RULES MODAL */}
            {
                showRules && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.85)', zIndex: 200,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <div style={{
                            background: '#1e293b', border: '2px solid #334155', borderRadius: '16px',
                            width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
                            padding: '24px', position: 'relative', color: '#e2e8f0'
                        }}>
                            <button onClick={() => setShowRules(false)} style={{
                                position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'
                            }}>
                                <X size={24} />
                            </button>

                            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#facc15', marginBottom: '20px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Hướng Dẫn Luật Chơi
                            </h2>

                            {/* SECTION 1: CÁCH CHIẾN THẮNG */}
                            <div style={{ marginBottom: '32px', padding: '16px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px' }}>
                                <h3 style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    ✅ CÁCH TÍNH CHIẾN THẮNG
                                </h3>
                                <p style={{ color: '#e2e8f0', marginBottom: '12px', lineHeight: '1.6' }}>
                                    - Kết hợp <strong>3 biểu tượng giống nhau trở lên</strong> liên tiếp nhau trên một đường trả thưởng (Payline). <br />
                                    - Quy tắc bắt buộc: Phải bắt đầu từ <strong>Cột đầu tiên bên trái (Reel 1)</strong> chạy sang phải.
                                </p>

                                {/* Ví dụ minh họa */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.85rem' }}>
                                    <div style={{ border: '1px dashed #4ade80', padding: '8px', borderRadius: '8px', background: 'rgba(74, 222, 128, 0.1)' }}>
                                        <strong style={{ color: '#4ade80' }}>WIN (Đúng):</strong> <br />
                                        [🍒][🍒][🍒][❌][❌] <br />
                                        <span style={{ color: '#94a3b8' }}>(3 Cherry liên tiếp từ trái sang)</span>
                                    </div>
                                    <div style={{ border: '1px dashed #ef4444', padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)' }}>
                                        <strong style={{ color: '#ef4444' }}>LOSS (Sai):</strong> <br />
                                        [❌][🍒][🍒][🍒][❌] <br />
                                        <span style={{ color: '#94a3b8' }}>(Không tính vì bỏ trống cột 1)</span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: BẢNG TRẢ THƯỞNG */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontWeight: 'bold', color: '#f472b6', marginBottom: '16px' }}>💰 BẢNG GIÁ TRỊ (PAYTABLE)</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                                    {Object.entries(SYMBOLS).map(([key, s]) => {
                                        let payoutText = '';
                                        if (key === 'DIAMOND') payoutText = '5x = NỔ HŨ (JACKPOT)';
                                        else if (key === 'WILD') payoutText = 'Thay thế mọi hình (trừ Diamond)';
                                        else if (key === 'SEVEN') payoutText = '3x: x10 | 4x: x50 | 5x: x200';
                                        else if (key === 'DISK') payoutText = '3x: x5 | 4x: x20 | 5x: x80';
                                        else if (key === 'CHERRY') payoutText = '3x: x2 | 4x: x5 | 5x: x20';
                                        else payoutText = '3x: x1 | 4x: x3 | 5x: x10 (Thấp)';

                                        return (
                                            <div key={key} style={{
                                                display: 'flex', alignItems: 'center', gap: '16px',
                                                background: '#0f172a', padding: '12px', borderRadius: '12px', border: '1px solid #334155'
                                            }}>
                                                <div style={{ fontSize: '2.5rem', minWidth: '50px', display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', color: s.color, marginBottom: '4px' }}>{key}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{payoutText}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* SECTION 3: CÁC DÒNG THẮNG */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontWeight: 'bold', color: '#a78bfa', marginBottom: '16px' }}>📐 20 DÒNG TRẢ THƯỞNG (PAYLINES)</h3>
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.5', marginBottom: '16px' }}>
                                    Tiền thắng được tính nếu biểu tượng xuất hiện liên tiếp theo các đường kẻ dưới đây (Tính từ trái sang):
                                </p>

                                {/* Visual Grid of Paylines */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px'
                                }}>
                                    {[
                                        { id: 1, p: [1, 1, 1, 1, 1] }, { id: 2, p: [0, 0, 0, 0, 0] }, { id: 3, p: [2, 2, 2, 2, 2] },
                                        { id: 4, p: [0, 1, 2, 1, 0] }, { id: 5, p: [2, 1, 0, 1, 2] }, { id: 6, p: [0, 0, 1, 0, 0] },
                                        { id: 7, p: [2, 2, 1, 2, 2] }, { id: 8, p: [1, 2, 2, 2, 1] }, { id: 9, p: [1, 0, 0, 0, 1] },
                                        { id: 10, p: [0, 1, 1, 1, 0] }, { id: 11, p: [2, 1, 1, 1, 2] }, { id: 12, p: [0, 1, 0, 1, 0] },
                                        { id: 13, p: [2, 1, 2, 1, 2] }, { id: 14, p: [1, 0, 1, 0, 1] }, { id: 15, p: [1, 2, 1, 2, 1] },
                                        { id: 16, p: [0, 2, 0, 2, 0] }, { id: 17, p: [2, 0, 2, 0, 2] }, { id: 18, p: [0, 2, 2, 2, 0] },
                                        { id: 19, p: [2, 0, 0, 0, 2] }, { id: 20, p: [0, 0, 2, 0, 0] }
                                    ].map(line => (
                                        <div key={line.id} style={{
                                            background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', padding: '4px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center'
                                        }}>
                                            <div style={{ width: '100%', height: '40px', position: 'relative', marginBottom: '4px' }}>
                                                {/* Minimal 5x3 Grid */}
                                                <div style={{
                                                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
                                                    width: '100%', height: '100%', gap: '1px'
                                                }}>
                                                    {[...Array(15)].map((_, i) => (
                                                        <div key={i} style={{ background: '#1e293b', borderRadius: '1px' }}></div>
                                                    ))}
                                                </div>
                                                {/* The Line Path */}
                                                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} viewBox="0 0 50 30" preserveAspectRatio="none">
                                                    <polyline
                                                        points={line.p.map((row, col) => `${col * 10 + 5},${row * 10 + 5}`).join(' ')}
                                                        fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Line {line.id}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(250, 204, 21, 0.1)', borderRadius: '12px', border: '1px solid #facc15' }}>
                                <strong style={{ color: '#facc15', fontSize: '1.1rem' }}>🏆 LUẬT QUAN TRỌNG NHẤT:</strong>
                                <p style={{ fontSize: '0.95rem', marginTop: '8px' }}>
                                    Biểu tượng 💎 <strong>DIAMOND</strong> là chìa khóa để Nổ Hũ. <br />
                                    Nếu bạn quay được <strong>5 viên Kim Cương</strong> nằm trên cùng một hàng ngang ở giữa (Dòng số 1), bạn sẽ thắng toàn bộ số tiền Jackpot hiển thị trên màn hình!
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SlotsGame;
