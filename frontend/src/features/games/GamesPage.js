
import React, { useState } from 'react';
import TaixiuGame from './taixiu/TaixiuGame';
import BauCuaGame from './baucua/BauCuaGame';
import WheelGame from './wheel/WheelGame';
import SlotsGame from './slots/SlotsGame';
import { ArrowLeft, Dice5, Fish, Command, Gem } from 'lucide-react'; // Command icon as Wheel placeholder

const GamesPage = ({ darkMode }) => {
    const [selectedGame, setSelectedGame] = useState(null); // 'taixiu' | 'baucua' | 'wheel' | 'slots' | null

    if (selectedGame === 'taixiu') {
        return (
            <TaixiuGame
                darkMode={darkMode}
                onBack={() => setSelectedGame(null)}
            />
        );
    }

    if (selectedGame === 'baucua') {
        return (
            <BauCuaGame
                darkMode={darkMode}
                onBack={() => setSelectedGame(null)}
            />
        );
    }

    if (selectedGame === 'wheel') {
        return (
            <WheelGame
                darkMode={darkMode}
                onBack={() => setSelectedGame(null)}
            />
        );
    }


    if (selectedGame === 'slots') {
        return (
            <SlotsGame
                darkMode={darkMode}
                onBack={() => setSelectedGame(null)}
            />
        );
    }

    // Lobby View
    return (
        <div style={{
            minHeight: '600px',
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px',
            backgroundColor: darkMode ? '#0f172a' : '#f9fafb',
            color: darkMode ? 'white' : '#111827'
        }}>
            {/* Ambient Background Effects (Inline Style for safety) */}
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
                {/* Header Section */}
                <div style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '600px' }}>
                    <h1 style={{
                        fontSize: '3rem', fontWeight: 800, marginBottom: '16px',
                        background: 'linear-gradient(to right, #818cf8, #c084fc, #f472b6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        Game Arena
                    </h1>
                    <p style={{ fontSize: '1.125rem', color: darkMode ? '#9ca3af' : '#4b5563' }}>
                        Trải nghiệm các trò chơi fair-play đỉnh cao với công nghệ Blockchain Provably Fair.
                    </p>
                </div>

                {/* Games Container - Using Flex Wrap instead of Grid for safety */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center', width: '100%', maxWidth: '1024px'
                }}>

                    {/* Sic Bo Card */}
                    <div
                        onClick={() => setSelectedGame('taixiu')}
                        className="game-card"
                        style={{
                            flex: '1 1 350px', maxWidth: '450px', height: '320px',
                            borderRadius: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                            border: `1px solid ${darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb'}`,
                            background: darkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
                            backdropFilter: 'blur(10px)',
                            boxShadow: darkMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = '#6366f1';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb';
                        }}
                    >
                        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '20px', marginBottom: '24px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: darkMode ? '#0f172a' : '#f3f4f6',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}>
                                <Dice5 size={40} color="#6366f1" />
                            </div>

                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: darkMode ? 'white' : '#111827' }}>
                                Sic Bo (Tài Xỉu)
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 'auto' }}>
                                Dự đoán kết quả 3 viên xúc xắc. Tỉ lệ cược hấp dẫn, minh bạch tuyệt đối.
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                                <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#22c55e' }}>
                                    Live Now
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bau Cua Card */}
                    <div
                        onClick={() => setSelectedGame('baucua')}
                        className="game-card"
                        style={{
                            flex: '1 1 350px', maxWidth: '450px', height: '320px',
                            borderRadius: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                            border: `1px solid ${darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb'}`,
                            background: darkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
                            backdropFilter: 'blur(10px)',
                            boxShadow: darkMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = '#f97316';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb';
                        }}
                    >
                        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '20px', marginBottom: '24px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: darkMode ? '#0f172a' : '#f3f4f6',
                                border: '1px solid rgba(249, 115, 22, 0.2)'
                            }}>
                                <Fish size={40} color="#f97316" />
                            </div>

                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: darkMode ? 'white' : '#111827' }}>
                                Bầu Cua
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 'auto' }}>
                                Game dân gian Việt Nam với Gà, Nai, Tôm, Cá... Sắp ra mắt phiên bản đặc biệt.
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                                <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#22c55e' }}>
                                    Live Now
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Wheel Card */}
                    <div
                        onClick={() => setSelectedGame('wheel')}
                        className="game-card"
                        style={{
                            flex: '1 1 350px', maxWidth: '450px', height: '320px',
                            borderRadius: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                            border: `1px solid ${darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb'}`,
                            background: darkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
                            backdropFilter: 'blur(10px)',
                            boxShadow: darkMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = '#f1c40f'; // Yellow for Wheel
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb';
                        }}
                    >
                        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '20px', marginBottom: '24px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: darkMode ? '#0f172a' : '#f3f4f6',
                                border: '1px solid rgba(241, 196, 15, 0.2)'
                            }}>
                                <Command size={40} color="#f1c40f" />
                            </div>

                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: darkMode ? 'white' : '#111827' }}>
                                Wheel of Fortune
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 'auto' }}>
                                Vòng quay may mắn với mức thưởng lên tới x40! Thử vận may ngay.
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                                <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#22c55e' }}>
                                    Live Now
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Slots Card (Jackpot) */}
                    <div
                        onClick={() => setSelectedGame('slots')}
                        className="game-card"
                        style={{
                            flex: '1 1 350px', maxWidth: '450px', height: '320px',
                            borderRadius: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                            border: `1px solid ${darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb'}`,
                            background: darkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
                            backdropFilter: 'blur(10px)',
                            boxShadow: darkMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = '#d8b4fe'; // Purple for Slots
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = darkMode ? 'rgba(51, 65, 85, 0.5)' : '#e5e7eb';
                        }}
                    >
                        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '20px', marginBottom: '24px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: darkMode ? '#0f172a' : '#f3f4f6',
                                border: '1px solid rgba(216, 180, 254, 0.2)'
                            }}>
                                <Gem size={40} color="#d8b4fe" />
                            </div>

                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: darkMode ? 'white' : '#111827' }}>
                                Cyber Slots
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 'auto' }}>
                                Game Nổ Hũ (Jackpot) phong cách Cyberpunk 2077. Cơ hội đổi đời!
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                                <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e879f9', boxShadow: '0 0 10px #e879f9' }}></span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#e879f9' }}>
                                    Jackpot Live
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Stats / Info */}
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
