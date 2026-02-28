import React, { useState, useEffect } from 'react';
import { writingService } from './writingService';
import WritingEditor from './components/WritingEditor';
import FeedbackPanel from './components/FeedbackPanel';
import VocabularyList from './components/VocabularyList';
import VocabularyReview from './components/VocabularyReview';
import Confetti from 'react-confetti';

// Bọc thử CSS nội tuyến cho nhanh (Có thể mang sang index.css sau)
const styles = {
    container: {
        display: 'flex',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    leftColumn: { flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' },
    rightColumn: { flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' },
    card: {
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    },
    header: { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary, #1e293b)' },
    levelSelector: {
        display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px'
    },
    levelBtn: (active) => ({
        padding: '8px 16px',
        borderRadius: '20px',
        border: `1px solid ${active ? '#7137ea' : '#cbd5e1'}`,
        backgroundColor: active ? '#7137ea' : 'transparent',
        color: active ? '#fff' : '#475569',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.2s',
    }),
    exerciseCard: {
        padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px',
        cursor: 'pointer', transition: 'border-color 0.2s',
    },
    tag: {
        fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b',
        fontWeight: '600', textTransform: 'uppercase', marginRight: '8px'
    },
    statRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#475569' },
    streakNumber: { fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' },
    streakTitle: { fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }
};

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function WritingTab({ darkMode }) {
    const [activeLevel, setActiveLevel] = useState('B1');
    const [exercises, setExercises] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);
    const [streakMessage, setStreakMessage] = useState(null);

    // Giao diện con: 'list', 'editor', 'feedback'
    const [currentView, setCurrentView] = useState('list');
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [completedSubmission, setCompletedSubmission] = useState(null);

    // Áp dụng biến css theo theme
    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--text-primary': '#f8fafc',
    } : {};

    useEffect(() => {
        loadDashboard();
    }, [activeLevel]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [exRes, statsRes] = await Promise.all([
                writingService.getExercises(activeLevel, null, 1),
                writingService.getStats().catch(() => null) // Ignore error nếu ko load được stat (người mới)
            ]);
            setExercises(exRes.exercises || []);
            setStats(statsRes || null);
        } catch (error) {
            console.error('Lỗi load DB Writing:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderDashboard = () => (
        <div style={{ ...styles.container, ...themeVars }}>
            {/* LEFT COLUMN: Bài tập chờ nộp */}
            <div style={styles.leftColumn}>
                <div style={styles.card}>
                    <h2 style={styles.header}>Chọn trình độ của bạn (CEFR Level)</h2>
                    <div style={styles.levelSelector}>
                        {LEVELS.map(lv => (
                            <button
                                key={lv}
                                style={styles.levelBtn(activeLevel === lv)}
                                onClick={() => setActiveLevel(lv)}
                            >
                                {lv}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={styles.card}>
                    <h2 style={styles.header}>Bài tập luyện viết {activeLevel}</h2>
                    {loading ? <p>Đang tải...</p> : (
                        <div>
                            {exercises.map(ex => (
                                <div
                                    key={ex.id}
                                    style={styles.exerciseCard}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#7137ea'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                >
                                    <div style={{ marginBottom: '8px' }}>
                                        <span style={styles.tag}>{ex.type}</span>
                                        <span style={styles.tag}>{ex.min_words} - {ex.max_words} words</span>
                                    </div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: darkMode ? '#f8fafc' : '#0f172a' }}>{ex.title}</h3>
                                    <p style={{ margin: 0, color: darkMode ? '#94a3b8' : '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        {ex.prompt.length > 100 ? `${ex.prompt.substring(0, 100)}...` : ex.prompt}
                                    </p>

                                    <button
                                        onClick={() => {
                                            setSelectedExercise(ex);
                                            setCurrentView('editor');
                                        }}
                                        style={{
                                            marginTop: '16px', background: '#7137ea', color: 'white', padding: '8px 16px',
                                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500'
                                        }}
                                    >
                                        Viết bài ngay
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: Thống kê sinh động */}
            <div style={styles.rightColumn}>

                {/* STREAK WIDGET MOCKUP */}
                <div style={styles.card}>
                    <div style={styles.streakTitle}>Chuỗi ngày học tập</div>
                    <div style={styles.streakNumber}>
                        🔥 {stats?.streak?.current || 0}
                        <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>ngày liên tục</span>
                    </div>
                    <div style={{ ...styles.statRow, marginTop: '16px' }}>
                        <span>Kỷ lục dài nhất:</span>
                        <strong>{stats?.streak?.longest || 0} ngày</strong>
                    </div>
                    <div style={styles.statRow}>
                        <span>Tổng số bài nộp:</span>
                        <strong>{stats?.writing?.total_submissions || 0} bài</strong>
                    </div>
                </div>

                {/* VOCABULARY WIDGET */}
                <div style={styles.card}>
                    <h2 style={styles.header}>Sổ Tay Từ Vựng</h2>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <div
                            onClick={() => setCurrentView('vocabList')}
                            style={{ flex: 1, background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'none'}
                        >
                            <div style={{ color: '#166534', fontSize: '1.25rem', fontWeight: 'bold' }}>{stats?.vocabulary?.mastered || 0}</div>
                            <div style={{ color: '#15803d', fontSize: '0.75rem' }}>Từ đã thuộc</div>
                        </div>
                        <div
                            onClick={() => setCurrentView('vocabReview')}
                            style={{ flex: 1, background: '#fef3c7', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'none'}
                        >
                            <div style={{ color: '#92400e', fontSize: '1.25rem', fontWeight: 'bold' }}>{stats?.vocabulary?.to_review || 0}</div>
                            <div style={{ color: '#b45309', fontSize: '0.75rem' }}>Chờ ôn SRS</div>
                        </div>
                    </div>

                    <button
                        onClick={() => setCurrentView('vocabList')}
                        style={{
                            width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1',
                            borderRadius: '6px', color: '#334155', fontWeight: '600', cursor: 'pointer'
                        }}>
                        Mở Danh Sách ({stats?.vocabulary?.total || 0} từ)
                    </button>
                </div>
            </div>
        </div>
    );

    const content = currentView === 'list' ? renderDashboard() :
        currentView === 'editor' ? (
            <WritingEditor
                exercise={selectedExercise}
                darkMode={darkMode}
                onBack={() => setCurrentView('list')}
                onSubmitSuccess={(submission) => {
                    setCompletedSubmission(submission);
                    setCurrentView('feedback');

                    // Kiểm tra streakInfo từ backend
                    const si = submission?.streakInfo;
                    if (si && si.streakIncremented) {
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 6000);

                        if (si.milestoneReached) {
                            setStreakMessage(`🌟 Wow! Bạn đã đạt mốc ${si.milestoneReached} ngày học liên tục! Tuyệt vời!`);
                        } else {
                            setStreakMessage(`🔥 Chuỗi học tập: ${si.newStreak} ngày liên tục!`);
                        }
                    } else {
                        setStreakMessage(null);
                    }

                    // Refresh list sau khi nộp để update streak
                    loadDashboard();
                }}
            />
        ) : currentView === 'feedback' ? (
            <React.Fragment>
                {streakMessage && (
                    <div style={{
                        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                        padding: '16px 24px', borderRadius: '12px', margin: '16px auto',
                        maxWidth: '600px', fontWeight: 'bold', fontSize: '1.1rem',
                        color: '#92400e', border: '2px solid #f59e0b', textAlign: 'center'
                    }}>
                        {streakMessage}
                    </div>
                )}
                <FeedbackPanel
                    submission={completedSubmission}
                    darkMode={darkMode}
                    onBack={() => { setStreakMessage(null); setCurrentView('list'); }}
                    onRetry={() => { setStreakMessage(null); setCurrentView('editor'); }}
                />
            </React.Fragment>
        ) : currentView === 'vocabList' ? (
            <React.Fragment>
                <div style={{ marginBottom: '16px', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                    <button style={{ padding: '8px 16px', background: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setCurrentView('list')}>← Trở về Luyện Viết</button>
                </div>
                <VocabularyList darkMode={darkMode} />
            </React.Fragment>
        ) : currentView === 'vocabReview' ? (
            <React.Fragment>
                <div style={{ marginBottom: '16px', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                    <button style={{ padding: '8px 16px', background: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => { setCurrentView('list'); loadDashboard(); }}>← Quay lại (Hoặc bỏ ngang)</button>
                </div>
                <VocabularyReview darkMode={darkMode} onBack={() => { setCurrentView('list'); loadDashboard(); }} />
            </React.Fragment>
        ) : null;

    return (
        <>
            {showConfetti && (
                <Confetti
                    width={typeof window !== 'undefined' ? window.innerWidth : 800}
                    height={typeof window !== 'undefined' ? window.innerHeight : 600}
                    numberOfPieces={300}
                    recycle={false}
                    colors={['#7137ea', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444']}
                    style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}
                />
            )}
            {content}
        </>
    );
}
