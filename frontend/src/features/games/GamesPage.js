import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TaixiuGame from './taixiu/TaixiuGame';
import BauCuaGame from './baucua/BauCuaGame';
import WheelGame from './wheel/WheelGame';
import SlotsGame from './slots/SlotsGame';
import { ArrowLeft, Dice5, Fish, Command, Gem, Eye, EyeOff, Settings } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const GamesPage = ({ darkMode }) => {
    const [selectedGame, setSelectedGame] = useState(null);
    const [gameConfigs, setGameConfigs] = useState({
        'taixiu': { isActive: true },
        'baucua': { isActive: true },
        'wheel': { isActive: true },
        'slots': { isActive: true }
    });
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem('role');
        console.log("Current User Role:", role); // Debugging
        // Handle potential extra quotes or case issues
        const cleanRole = role ? role.replace(/['"]+/g, '').toLowerCase() : '';
        setIsAdmin(cleanRole === 'admin');
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            // If internal route structure differs, adjust. Assuming /games/settings is available via proxy or direct
            const res = await axios.get(`${API_URL}/games/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGameConfigs(res.data);
        } catch (err) {
            console.error("Failed to fetch game settings", err);
        }
    };

    const toggleGame = async (gameKey, currentStatus, e) => {
        e.stopPropagation();
        if (!confirm(`Bạn có chắc muốn ${currentStatus ? 'TẮT' : 'BẬT'} game này không?`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/games/settings/${gameKey}`,
                { isActive: !currentStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setGameConfigs(prev => ({
                ...prev,
                [gameKey]: { ...prev[gameKey], isActive: !currentStatus }
            }));
        } catch (err) {
            alert('Lỗi cập nhật cấu hình');
        }
    };

    // Render Game Component based on selection
    if (selectedGame === 'taixiu') return <TaixiuGame darkMode={darkMode} onBack={() => setSelectedGame(null)} />;
    if (selectedGame === 'baucua') return <BauCuaGame darkMode={darkMode} onBack={() => setSelectedGame(null)} />;
    if (selectedGame === 'wheel') return <WheelGame darkMode={darkMode} onBack={() => setSelectedGame(null)} />;
    if (selectedGame === 'slots') return <SlotsGame darkMode={darkMode} onBack={() => setSelectedGame(null)} />;

    // Helper to check visibility
    const checkVisible = (key) => {
        const active = gameConfigs[key]?.isActive;
        // Admin sees everything (with opacity if inactive). Users only see active.
        if (isAdmin) return true;
        return active;
    };

    const renderCard = (key, title, desc, Icon, color, colorDark) => {
        const config = gameConfigs[key] || { isActive: true };
        const isActive = config.isActive;

        if (!checkVisible(key)) return null;

        return (
            <div
                onClick={() => isActive ? setSelectedGame(key) : alert('Game đang bảo trì!')}
                className="game-card"
                style={{
                    flex: '1 1 350px', maxWidth: '450px', height: '320px',
                    borderRadius: '24px', cursor: isActive ? 'pointer' : 'not-allowed', position: 'relative', overflow: 'hidden',
                    border: `1px solid ${darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb'}`,
                    background: darkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
                    backdropFilter: 'blur(10px)',
                    boxShadow: darkMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                    opacity: isActive ? 1 : 0.6,
                    filter: isActive ? 'none' : 'grayscale(100%)'
                }}
                onMouseEnter={e => {
                    if (isActive) {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = color;
                    }
                }}
                onMouseLeave={e => {
                    if (isActive) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb';
                    }
                }}
            >
                {/* Admin Toggle */}
                {isAdmin && (
                    <div
                        onClick={(e) => toggleGame(key, isActive, e)}
                        style={{
                            position: 'absolute', top: '10px', right: '10px', zIndex: 9999,
                            padding: '8px', borderRadius: '50%',
                            backgroundColor: isActive ? '#fff' : '#fee2e2',
                            color: isActive ? '#10b981' : '#ef4444',
                            cursor: 'pointer',
                            border: `2px solid ${isActive ? '#10b981' : '#ef4444'}`,
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                        title={isActive ? "Đang bật -> Nhấn để tắt" : "Đang tắt -> Nhấn để bật"}
                    >
                        {isActive ? <Eye size={20} /> : <EyeOff size={20} />}
                    </div>
                )}

                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '20px', marginBottom: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: darkMode ? '#0f172a' : '#f3f4f6',
                        border: `1px solid ${darkMode ? colorDark : color + '33'}`
                    }}>
                        <Icon size={40} color={color} />
                    </div>

                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: darkMode ? 'white' : '#111827' }}>
                        {title} {isAdmin && !isActive && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>(Đã Tắt)</span>}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 'auto' }}>
                        {desc}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                        <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isActive ? '#22c55e' : '#9ca3af', boxShadow: isActive ? '0 0 10px #22c55e' : 'none' }}></span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: isActive ? '#22c55e' : '#9ca3af' }}>
                            {isActive ? 'Live Now' : 'Maintenance'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    // Lobby View
    return (
        <div style={{
            minHeight: '600px', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '16px',
            backgroundColor: darkMode ? '#0f172a' : '#f9fafb', color: darkMode ? 'white' : '#111827'
        }}>
            {/* Ambient effects ... */}
            <div style={{
                position: 'absolute', top: '-20%', left: '-10%', width: '500px', height: '500px',
                borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3,
                backgroundColor: darkMode ? '#4f46e5' : '#a5b4fc', pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px',
                borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3,
                backgroundColor: darkMode ? '#9333ea' : '#d8b4fe', pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 10, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '600px' }}>
                    <h1 style={{
                        fontSize: '3rem', fontWeight: 800, marginBottom: '16px',
                        background: 'linear-gradient(to right, #818cf8, #c084fc, #f472b6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        Game Arena
                    </h1>
                    <p style={{ fontSize: '1.125rem', color: darkMode ? '#9ca3af' : '#4b5563' }}>
                        Trải nghiệm các trò chơi fair-play đỉnh cao.
                        {isAdmin && <span style={{ display: 'block', color: '#facc15', marginTop: '8px', fontSize: '0.9em', fontWeight: 'bold' }}>🔧 CHẾ ĐỘ QUẢN TRỊ VIÊN: Bấm vào icon con mắt để Bật/Tắt game</span>}
                    </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center', width: '100%', maxWidth: '1024px' }}>

                    {renderCard('taixiu', 'Sic Bo (Tài Xỉu)', 'Dự đoán kết quả 3 viên xúc xắc. Tỉ lệ cược hấp dẫn.', Dice5, '#6366f1', 'rgba(99, 102, 241, 0.2)')}

                    {renderCard('baucua', 'Bầu Cua', 'Game dân gian Việt Nam với Gà, Nai, Tôm, Cá...', Fish, '#f97316', 'rgba(249, 115, 22, 0.2)')}

                    {renderCard('wheel', 'Wheel of Fortune', 'Vòng quay may mắn với mức thưởng lên tới x40!', Command, '#f1c40f', 'rgba(241, 196, 15, 0.2)')}

                    {renderCard('slots', 'Cyber Slots', 'Game Nổ Hũ (Jackpot) phong cách Cyberpunk 2077.', Gem, '#d8b4fe', 'rgba(216, 180, 254, 0.2)')}

                </div>

                {/* Footer Stats ... */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '60px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { val: '100%', label: 'Fair Play', color1: '#60a5fa', color2: '#22d3ee' },
                        { val: '24/7', label: 'Support', color1: '#34d399', color2: '#4ade80' },
                        { val: 'Instant', label: 'Payouts', color1: '#a78bfa', color2: '#f472b6' }
                    ].map((item, idx) => (
                        <div key={idx} style={{
                            padding: '16px 24px', borderRadius: '16px',
                            border: `1px solid ${darkMode ? '#1e293b' : '#f3f4f6'}`,
                            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.5)' : 'white',
                            textAlign: 'center', minWidth: '120px'
                        }}>
                            <div style={{
                                fontSize: '1.5rem', fontWeight: 'bold',
                                background: `linear-gradient(to right, ${item.color1}, ${item.color2})`,
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                            }}>{item.val}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GamesPage;
