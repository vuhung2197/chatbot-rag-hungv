import React, { useState, useEffect } from 'react';
import { readingService } from './readingService';
import ReadingViewer from './components/ReadingViewer';
import ReadingQuiz from './components/ReadingQuiz';
import ReadingResult from './components/ReadingResult';

const TOPICS = [
    { id: 'daily_life', label: '🏠 Cuộc sống hàng ngày' },
    { id: 'travel', label: '✈️ Du lịch' },
    { id: 'technology', label: '💻 Công nghệ' },
    { id: 'science', label: '🔬 Khoa học' },
    { id: 'health', label: '🏥 Sức khỏe' },
    { id: 'environment', label: '🌍 Môi trường' },
    { id: 'culture', label: '🎭 Văn hóa' },
    { id: 'business', label: '💼 Kinh doanh' },
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function ReadingTab({ darkMode }) {
    const [currentView, setCurrentView] = useState('list'); // list, viewer, quiz, result
    const [passages, setPassages] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState('B1');
    const [selectedPassage, setSelectedPassage] = useState(null);
    const [completedSubmission, setCompletedSubmission] = useState(null);
    const [wordsLookedUp, setWordsLookedUp] = useState([]);
    const [readingStartTime, setReadingStartTime] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const loadPassages = async () => {
        setIsLoading(true);
        try {
            const data = await readingService.getPassages(selectedLevel);
            setPassages(data.passages || []);
        } catch (e) {
            console.error('Lỗi tải bài đọc:', e);
        }
        setIsLoading(false);
    };

    useEffect(() => { loadPassages(); }, [selectedLevel]);

    const handleGenerateNew = async (topic) => {
        setIsGenerating(true);
        try {
            const passage = await readingService.generatePassage(selectedLevel, topic);
            setSelectedPassage(passage);
            setWordsLookedUp([]);
            setReadingStartTime(Date.now());
            setCurrentView('viewer');
            loadPassages(); // refresh list
        } catch (e) {
            alert('Lỗi sinh bài đọc: ' + (e.response?.data?.error || e.message));
        }
        setIsGenerating(false);
    };

    const handleSelectPassage = async (passage) => {
        try {
            const full = await readingService.getPassageById(passage.id);
            setSelectedPassage(full);
            setWordsLookedUp([]);
            setReadingStartTime(Date.now());
            setCurrentView('viewer');
        } catch (e) {
            alert('Lỗi tải bài đọc');
        }
    };

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#cbd5e1'
    } : {
        '--card-bg': '#ffffff', '--border-color': '#e2e8f0',
        '--text-primary': '#1e293b', '--text-secondary': '#64748b'
    };

    const renderDashboard = () => (
        <div style={{ maxWidth: '1000px', margin: '0 auto', ...themeVars }}>
            <h2 style={{ textAlign: 'center', color: 'var(--text-primary)' }}>📖 Luyện Đọc Hiểu Tiếng Anh</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                Đọc bài viết theo trình độ, click vào từ lạ để tra nghĩa, rồi trả lời câu hỏi kiểm tra!
            </p>

            {/* Level selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
                {LEVELS.map(lvl => (
                    <button key={lvl} onClick={() => setSelectedLevel(lvl)}
                        style={{
                            padding: '6px 16px',
                            background: selectedLevel === lvl ? '#7137ea' : 'transparent',
                            color: selectedLevel === lvl ? 'white' : (darkMode ? 'white' : 'black'),
                            border: `1px solid ${selectedLevel === lvl ? '#7137ea' : '#cbd5e1'}`,
                            borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold'
                        }}>{lvl}</button>
                ))}
            </div>

            {/* Generate new passage */}
            <div style={{ padding: '20px', background: 'rgba(113, 55, 234, 0.08)', borderRadius: '12px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>✨ Tạo bài đọc mới bằng AI</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Chọn chủ đề bạn quan tâm, AI sẽ viết bài đọc phù hợp level {selectedLevel}:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {TOPICS.map(t => (
                        <button key={t.id} onClick={() => handleGenerateNew(t.id)}
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
                {isGenerating && <p style={{ color: '#7137ea', fontWeight: 'bold', marginTop: '12px' }}>⏳ AI đang viết bài đọc cho bạn... (5-10 giây)</p>}
            </div>

            {/* Existing passages */}
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>📚 Bài đọc có sẵn (Level {selectedLevel})</h3>
            {isLoading ? <p style={{ textAlign: 'center' }}>Đang tải...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {passages.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có bài đọc — hãy bấm chủ đề ở trên để AI tạo mới!</p>
                    ) : passages.map(p => (
                        <div key={p.id} style={{
                            padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px',
                            background: 'var(--card-bg)', color: 'var(--text-primary)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            cursor: 'pointer', transition: 'border-color 0.2s'
                        }}
                            onClick={() => handleSelectPassage(p)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#7137ea'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                        >
                            <div>
                                <h4 style={{ margin: '0 0 4px 0' }}>{p.title}</h4>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {p.summary || `${p.word_count} từ • ${p.topic}`}
                                </div>
                            </div>
                            <button style={{
                                padding: '8px 16px', background: '#7137ea', color: 'white',
                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                                whiteSpace: 'nowrap'
                            }}>📖 Đọc</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return currentView === 'list' ? renderDashboard() :
        currentView === 'viewer' ? (
            <ReadingViewer
                passage={selectedPassage} darkMode={darkMode}
                onBack={() => setCurrentView('list')}
                onWordLookup={(wordData) => setWordsLookedUp(prev => [...prev.filter(w => w.word !== wordData.word), wordData])}
                onStartQuiz={() => setCurrentView('quiz')}
            />
        ) : currentView === 'quiz' ? (
            <ReadingQuiz
                passage={selectedPassage} darkMode={darkMode}
                onBack={() => setCurrentView('viewer')}
                onSubmitSuccess={(submission) => {
                    setCompletedSubmission(submission);
                    setCurrentView('result');
                }}
                wordsLookedUp={wordsLookedUp}
                readingTimeSeconds={Math.round((Date.now() - readingStartTime) / 1000)}
            />
        ) : currentView === 'result' ? (
            <ReadingResult
                submission={completedSubmission} darkMode={darkMode}
                wordsLookedUp={wordsLookedUp}
                onBack={() => { setCurrentView('list'); loadPassages(); }}
                onReadAnother={() => setCurrentView('list')}
            />
        ) : null;
}
