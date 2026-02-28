import React, { useState, useEffect } from 'react';
import { vocabularyService } from './vocabularyService';

export default function VocabularyHub({ darkMode }) {
    const [view, setView] = useState('daily'); // daily, review, explore, mistakes
    const [dailyWords, setDailyWords] = useState([]);
    const [reviewWords, setReviewWords] = useState([]);
    const [myWords, setMyWords] = useState([]);
    const [systemWords, setSystemWords] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState('A1');

    // UI state for practicing
    const [practiceIndex, setPracticeIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#94a3b8',
        '--accent-color': '#3b82f6', '--success': '#10b981', '--warning': '#eab308'
    } : {
        '--card-bg': '#ffffff', '--border-color': '#e2e8f0',
        '--text-primary': '#0f172a', '--text-secondary': '#64748b',
        '--accent-color': '#2563eb', '--success': '#059669', '--warning': '#d97706'
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load user's words & stats
            const userData = await vocabularyService.getUserVocabulary('');
            setMyWords(userData.words || []);
            setStats(userData.stats);

            // Load daily recommend
            const dailyData = await vocabularyService.getRecommendWords(10);
            setDailyWords(dailyData.data || []);

            // Load review words
            const reviewsData = await vocabularyService.getReviewWords();
            setReviewWords(reviewsData.data || []);

            // Initial practice settings
            setPracticeIndex(0);
            setShowAnswer(false);

        } catch (error) {
            console.error('Failed to load vocabulary data:', error);
        }
        setIsLoading(false);
    };

    const loadSystemWords = async (level) => {
        try {
            const data = await vocabularyService.getSystemVocabulary(level);
            setSystemWords(data.data || []);
        } catch (error) {
            console.error('Failed to load system words:', error);
        }
    };

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (view === 'explore') loadSystemWords(selectedLevel); }, [view, selectedLevel]);

    // Handle Adding word
    const handleAddWord = async (wordId) => {
        try {
            await vocabularyService.addSystemWord(wordId);
            // Refresh local state to reflect it
            if (view === 'explore') {
                setSystemWords(systemWords.map(w => w.id === wordId ? { ...w, is_added: true } : w));
            } else if (view === 'daily') {
                setDailyWords(dailyWords.filter(w => w.id !== wordId));
            }
            // Update stats subtly
            setStats(prev => prev ? { ...prev, learning_words: parseInt(prev.learning_words || 0) + 1 } : prev);
        } catch (error) {
            console.error('Failed to add word:', error);
        }
    };

    const handleAddAllDaily = async () => {
        const ids = dailyWords.map(w => w.id);
        if (ids.length === 0) return;
        try {
            await vocabularyService.addMultipleSystemWords(ids);
            setDailyWords([]);
            loadData(); // Reload everything to update list
        } catch (e) {
            console.error('Failed adding multiple:', e);
        }
    }

    // Handle Practicing (Spaced Repetition System)
    const handleReviewAnswer = async (isCorrect) => {
        const currentWord = reviewWords[practiceIndex];
        try {
            // API Call
            await vocabularyService.updateWordMastery(currentWord.id, isCorrect);

            // Move to next card locally
            if (practiceIndex < reviewWords.length - 1) {
                setPracticeIndex(practiceIndex + 1);
                setShowAnswer(false);
            } else {
                // Done reviewing!
                setReviewWords([]); // clear local review
            }
        } catch (e) {
            console.error('Failed to update mastery:', e);
        }
    };

    const playText = (text) => {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    const renderTabs = () => (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '10px' }}>
            {['daily', 'review', 'explore', 'mistakes'].map(v => (
                <button key={v} onClick={() => setView(v)}
                    style={{
                        padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap',
                        border: view === v ? 'none' : `1px solid var(--border-color)`,
                        background: view === v ? 'var(--accent-color)' : 'transparent',
                        color: view === v ? '#fff' : 'var(--text-primary)',
                        transition: 'all 0.2s'
                    }}>
                    {v === 'daily' && '🎯 Đề Xuất Hôm Nay'}
                    {v === 'review' && `🔥 Ôn Tập (${reviewWords.length})`}
                    {v === 'explore' && '🌍 Khám Phá Thư Viện'}
                    {v === 'mistakes' && '📝 Sổ Tay Của Tôi'}
                </button>
            ))}
        </div>
    );

    const renderWordCard = (word, actionBtn = null) => (
        <div key={word.id} style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{word.word}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{word.phonetic}</span>
                    <button onClick={() => playText(word.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🔊</button>
                    {word.level && <span style={{ fontSize: '0.75rem', background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>{word.level}</span>}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    <span style={{ fontStyle: 'italic', marginRight: '6px' }}>({word.pos})</span>
                    {word.definition}
                </div>
                <div style={{ color: 'var(--success)', fontSize: '0.9rem', marginTop: '4px' }}>
                    → {word.translation}
                </div>
            </div>
            {actionBtn && <div>{actionBtn}</div>}
        </div>
    );

    if (isLoading) return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải sổ tay từ vựng...</div>;

    return (
        <div style={{ ...themeVars, width: '100%', maxWidth: '1000px', margin: '0 auto' }}>

            {/* Stats Header */}
            {stats && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px',
                    marginBottom: '32px', background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{stats.total_words || 0}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Số từ đang học</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.memorized_words || 0}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Đã thuộc lòng</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ec4899' }}>{stats.pronunciation_errors || 0}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Lỗi phát âm (Azure)</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '--warning' }}>{stats.grammar_errors || 0}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Lỗi Ngữ pháp (Grammar)</div>
                    </div>
                </div>
            )}

            {renderTabs()}

            {/* VIEWS */}
            {view === 'daily' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Mục tiêu hôm nay: Học {dailyWords.length} từ mới</h3>
                        {dailyWords.length > 0 && (
                            <button onClick={handleAddAllDaily} style={{ padding: '8px 16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Thêm {dailyWords.length} từ vào Sổ
                            </button>
                        )}
                    </div>
                    {dailyWords.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Bạn đã hết từ đề xuất hôm nay! Hãy qua mục Khám Phá để tự tìm thêm nhé.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {dailyWords.map(w => renderWordCard(w, (
                                <button onClick={() => handleAddWord(w.id)} style={{ padding: '8px 16px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+ Học từ này</button>
                            )))}
                        </div>
                    )}
                </div>
            )}

            {view === 'explore' && (
                <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>Chọn cấp độ:</span>
                        {['A1', 'A2', 'B1', 'B2', 'C1'].map(l => (
                            <button key={l} onClick={() => setSelectedLevel(l)} style={{ padding: '6px 12px', borderRadius: '6px', border: selectedLevel === l ? '2px solid var(--accent-color)' : '1px solid var(--border-color)', background: selectedLevel === l ? 'var(--accent-color)' : 'var(--card-bg)', color: selectedLevel === l ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}>
                                {l}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {systemWords.map(w => renderWordCard(w, (
                            w.is_added ?
                                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓ Đã học</span> :
                                <button onClick={() => handleAddWord(w.id)} style={{ padding: '8px 16px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+ Thêm</button>
                        )))}
                    </div>
                </div>
            )}

            {view === 'mistakes' && (
                <div>
                    <h3 style={{ color: 'var(--text-primary)' }}>Sổ tay từ vựng / Lỗi sai của bạn</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Nơi lưu trữ các từ bạn tự thêm, cũng như các lỗi ngữ pháp / phát âm mà AI bắt được trong quá trình luyện tập.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                        {myWords.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Chưa có từ nào.</p> :
                            myWords.map(w => (
                                <div key={w.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                            {w.word}
                                            {w.item_type === 'pronunciation' && <span style={{ marginLeft: 10, fontSize: '0.8rem', background: '#ec4899', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>⚠️ Lỗi Phát Âm</span>}
                                            {w.item_type === 'grammar' && <span style={{ marginLeft: 10, fontSize: '0.8rem', background: 'var(--warning)', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>⚠️ Lỗi Ngữ Pháp</span>}
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            Độ thuộc: {w.mastery}/5
                                        </div>
                                    </div>
                                    {w.phonetic && <div style={{ color: 'var(--text-secondary)' }}>Phiên âm: {w.phonetic}</div>}
                                    <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{w.definition}</div>
                                    {w.translation && <div style={{ color: 'var(--success)', fontWeight: 'bold' }}>→ {w.translation}</div>}
                                    {w.example_sentence && <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '8px', paddingLeft: '10px', borderLeft: '3px solid var(--border-color)' }}>VD: "{w.example_sentence}"</div>}
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {view === 'review' && (
                <div>
                    {reviewWords.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
                            <h2 style={{ color: 'var(--text-primary)' }}>Không còn từ nào cần ôn tập hôm nay!</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Tuyệt vời, bạn đã hoàn thành mục tiêu. Hãy khám phá thêm từ mới nhé.</p>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '400px', justifyContent: 'center' }}>

                            <div style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Tiến độ ôn tập: {practiceIndex + 1} / {reviewWords.length}</div>

                            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '10px' }}>
                                {reviewWords[practiceIndex].word}
                                <button onClick={() => playText(reviewWords[practiceIndex].word)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', verticalAlign: 'middle', marginLeft: '10px' }}>🔊</button>
                            </div>

                            {showAnswer ? (
                                <div style={{ animation: 'fadeIn 0.3s', marginTop: '20px', background: 'var(--border-color)', padding: '20px', borderRadius: '12px', width: '100%' }}>
                                    {reviewWords[practiceIndex].phonetic && <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '10px' }}>/{reviewWords[practiceIndex].phonetic}/</div>}
                                    <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '10px' }}>{reviewWords[practiceIndex].definition}</div>
                                    <div style={{ color: 'var(--success)', fontSize: '1.2rem', fontWeight: 'bold' }}>{reviewWords[practiceIndex].translation}</div>

                                    <div style={{ display: 'flex', gap: '20px', marginTop: '30px', justifyContent: 'center' }}>
                                        <button onClick={() => handleReviewAnswer(false)} style={{ padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                            ❌ Quên (Học lại liền)
                                        </button>
                                        <button onClick={() => handleReviewAnswer(true)} style={{ padding: '12px 24px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                            ✅ Nhớ (Tăng điểm bổng)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setShowAnswer(true)} style={{ marginTop: '40px', padding: '16px 32px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    Lật thẻ (Xem đáp án)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
