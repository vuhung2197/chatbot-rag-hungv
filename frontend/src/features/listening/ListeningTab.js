import React, { useState, useEffect } from 'react';
import { listeningService } from './listeningService';
import { writingService } from '../writing/writingService';
import ListeningEditor from './components/ListeningEditor';
import ListeningFeedbackPanel from './components/ListeningFeedbackPanel';
import VocabularyList from '../writing/components/VocabularyList';
import VocabularyReview from '../writing/components/VocabularyReview';

export default function ListeningTab({ darkMode }) {
    const [currentView, setCurrentView] = useState('list'); // 'list', 'editor', 'feedback'
    const [exercises, setExercises] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState('B1');
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [completedSubmission, setCompletedSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    const LISTENING_TOPICS = [
        { id: 'daily_life', label: '🏠 Cuộc sống' },
        { id: 'travel', label: '✈️ Du lịch' },
        { id: 'technology', label: '💻 Công nghệ' },
        { id: 'science', label: '🔬 Khoa học' },
        { id: 'health', label: '🏥 Sức khỏe' },
        { id: 'business', label: '💼 Kinh doanh' },
        { id: 'education', label: '📚 Giáo dục' },
        { id: 'culture', label: '🎭 Văn hóa' },
    ];

    const loadExercises = async () => {
        setIsLoading(true);
        try {
            const [data, statsRes] = await Promise.all([
                listeningService.getExercises(selectedLevel, 'dictation'),
                writingService.getStats().catch(() => null)
            ]);
            setExercises(data.exercises || []);
            setStats(statsRes || null);
        } catch (e) {
            console.error('Lỗi tải bài nghe:', e);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadExercises();
    }, [selectedLevel]);

    const handleGenerateExercise = async (topic) => {
        setIsGenerating(true);
        try {
            const exercise = await listeningService.generateExercise(selectedLevel, topic);
            setSelectedExercise(exercise);
            setCurrentView('editor');
            loadExercises(); // refresh list in background
        } catch (e) {
            alert('Lỗi tạo bài nghe: ' + (e.response?.data?.error || e.message));
        }
        setIsGenerating(false);
    };

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--text-primary': '#f8fafc',
        '--text-secondary': '#cbd5e1'
    } : {
        '--card-bg': '#ffffff',
        '--border-color': '#e2e8f0',
        '--text-primary': '#1e293b',
        '--text-secondary': '#64748b'
    };

    const renderDashboard = () => (
        <div style={{ maxWidth: '1000px', margin: '0 auto', ...themeVars }}>
            <h2 style={{ textAlign: 'center', color: 'var(--text-primary)' }}>🎧 Luyện Nghe Tiếng Anh (Dictation)</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nghe file Audio và gõ lại chính xác những gì bạn nghe được. AI sẽ soi từng chữ để chấm điểm!
            </p>

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* LEFT COLUMN: Bài tập chờ nộp */}
                <div style={{ flex: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
                        {levels.map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setSelectedLevel(lvl)}
                                style={{
                                    padding: '6px 16px',
                                    background: selectedLevel === lvl ? '#7137ea' : 'transparent',
                                    color: selectedLevel === lvl ? 'white' : (darkMode ? 'white' : 'black'),
                                    border: `1px solid ${selectedLevel === lvl ? '#7137ea' : 'var(--border-color)'}`,
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>

                    {/* ✨ AI Generate Section */}
                    <div style={{ padding: '20px', background: darkMode ? 'rgba(113, 55, 234, 0.1)' : 'rgba(113, 55, 234, 0.06)', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(113, 55, 234, 0.2)' }}>
                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>✨ Tạo bài nghe mới bằng AI</h3>
                        <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Chọn chủ đề, AI sẽ tạo bài nghe phù hợp level {selectedLevel}:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {LISTENING_TOPICS.map(t => (
                                <button key={t.id} onClick={() => handleGenerateExercise(t.id)}
                                    disabled={isGenerating}
                                    style={{
                                        padding: '8px 14px', borderRadius: '8px',
                                        background: darkMode ? '#334155' : '#f1f5f9',
                                        color: darkMode ? '#e2e8f0' : '#334155',
                                        border: '1px solid transparent', cursor: isGenerating ? 'not-allowed' : 'pointer',
                                        fontSize: '0.9rem', transition: 'all 0.2s',
                                        opacity: isGenerating ? 0.5 : 1
                                    }}>{t.label}</button>
                            ))}
                        </div>
                        {isGenerating && <p style={{ color: '#7137ea', fontWeight: 'bold', marginTop: '12px' }}>⏳ AI đang tạo bài nghe mới... (5-10 giây)</p>}
                    </div>

                    {isLoading ? <p style={{ textAlign: 'center' }}>Đang tải bài tập...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {exercises.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có bài tập cho trình độ này.</p>
                            ) : (
                                exercises.map(ex => (
                                    <div key={ex.id} style={{
                                        padding: '16px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        background: 'var(--card-bg)',
                                        color: 'var(--text-primary)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 8px 0' }}>{ex.title}</h3>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Gợi ý: {ex.hints && ex.hints[0] ? ex.hints[0] : 'Không có'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedExercise(ex);
                                                setCurrentView('editor');
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#7137ea', color: 'white',
                                                border: 'none', borderRadius: '8px',
                                                cursor: 'pointer', fontWeight: 'bold'
                                            }}>
                                            ▶️ Nghe & Viết
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Thống kê sinh động */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* STREAK WIDGET MOCKUP */}
                    <div style={{ padding: '24px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chuỗi ngày học liên tục</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🔥 {stats?.streak?.current || 0}
                            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>ngày</span>
                        </div>
                    </div>

                    {/* VOCABULARY WIDGET */}
                    <div style={{ padding: '24px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Sổ Tay Từ Vựng</h2>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                            <div
                                onClick={() => setCurrentView('vocabList')}
                                onKeyDown={(e) => e.key === 'Enter' && setCurrentView('vocabList')}
                                role="button"
                                tabIndex={0}
                                style={{ flex: 1, background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onFocus={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'none'}
                                onBlur={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ color: '#166534', fontSize: '1.25rem', fontWeight: 'bold' }}>{stats?.vocabulary?.mastered || 0}</div>
                                <div style={{ color: '#15803d', fontSize: '0.75rem' }}>Từ đã thuộc</div>
                            </div>
                            <div
                                onClick={() => setCurrentView('vocabReview')}
                                onKeyDown={(e) => e.key === 'Enter' && setCurrentView('vocabReview')}
                                role="button"
                                tabIndex={0}
                                style={{ flex: 1, background: '#fef3c7', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onFocus={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'none'}
                                onBlur={e => e.currentTarget.style.transform = 'none'}
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
        </div>
    );

    return currentView === 'list' ? renderDashboard() :
        currentView === 'editor' ? (
            <ListeningEditor
                exercise={selectedExercise}
                darkMode={darkMode}
                onBack={() => setCurrentView('list')}
                onSubmitSuccess={(submission) => {
                    setCompletedSubmission(submission);
                    setCurrentView('feedback');
                }}
            />
        ) : currentView === 'feedback' ? (
            <ListeningFeedbackPanel
                submission={completedSubmission}
                darkMode={darkMode}
                onBack={() => setCurrentView('list')}
                onRetry={() => setCurrentView('editor')}
            />
        ) : currentView === 'vocabList' ? (
            <React.Fragment>
                <div style={{ marginBottom: '16px', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                    <button style={{ padding: '8px 16px', background: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setCurrentView('list')}>← Trở về Luyện Nghe</button>
                </div>
                <VocabularyList darkMode={darkMode} />
            </React.Fragment>
        ) : currentView === 'vocabReview' ? (
            <React.Fragment>
                <div style={{ marginBottom: '16px', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                    <button style={{ padding: '8px 16px', background: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => { setCurrentView('list'); loadExercises(); }}>← Quay lại (Hoặc bỏ ngang)</button>
                </div>
                <VocabularyReview darkMode={darkMode} onBack={() => { setCurrentView('list'); loadExercises(); }} />
            </React.Fragment>
        ) : null;
}
