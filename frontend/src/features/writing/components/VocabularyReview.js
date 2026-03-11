import React, { useState, useEffect } from 'react';
import { writingService } from '../writingService';
import VocabMatchGame from './VocabMatchGame';
import VocabFillBlankGame from './VocabFillBlankGame';

const styles = {
    container: {
        padding: '24px',
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        minHeight: '400px'
    },
    header: { margin: 0, color: 'var(--text-primary, #1e293b)' },
    flashcard: {
        width: '100%',
        maxWidth: '400px',
        height: '250px',
        perspective: '1000px',
        cursor: 'pointer',
        position: 'relative'
    },
    cardFace: (isFlipped) => ({
        width: '100%', height: '100%',
        position: 'absolute',
        backfaceVisibility: 'hidden',
        transition: 'transform 0.6s',
        borderRadius: '16px',
        padding: '32px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        border: '2px solid #7137ea'
    }),
    cardFront: (isFlipped) => ({
        backgroundColor: 'white',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
    }),
    cardBack: (isFlipped) => ({
        backgroundColor: '#f8fafc',
        transform: isFlipped ? 'rotateY(0)' : 'rotateY(-180deg)',
        border: '2px dashed #10b981'
    }),
    wordBig: { fontSize: '2.5rem', fontWeight: 'bold', color: '#1e293b' },
    wordDef: { fontSize: '1.25rem', color: '#334155', textAlign: 'center' },
    wordEx: { fontSize: '1rem', fontStyle: 'italic', color: '#64748b', textAlign: 'center', marginTop: '16px' },
    actionArea: { display: 'flex', gap: '16px', marginTop: '20px', width: '100%', maxWidth: '400px' },
    btnAction: (color) => ({
        flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
        color: 'white', backgroundColor: color, fontWeight: 'bold', fontSize: '1rem',
        cursor: 'pointer', transition: 'alpha 0.2s'
    }),
    modeCard: {
        width: '100%', maxWidth: '300px', padding: '24px',
        borderRadius: '12px', border: '2px solid #e2e8f0',
        cursor: 'pointer', textAlign: 'center',
        transition: 'all 0.2s', backgroundColor: 'var(--card-bg, #ffffff)'
    }
};

export default function VocabularyReview({ darkMode, onBack }) {
    const [reviewList, setReviewList] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState(null); // null, 'flashcard', 'match'

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--text-primary': '#f8fafc'
    } : {};

    useEffect(() => {
        loadReviewWords();
    }, []);

    const loadReviewWords = async () => {
        setLoading(true);
        try {
            const words = await writingService.getReviewWords();
            setReviewList(words || []);
            setCurrentIndex(0);
            setIsFlipped(false);
            setMode(null);
        } catch (e) {
            console.error('Lỗi lấy từ ôn', e);
        } finally {
            setLoading(false);
        }
    };

    const handleScore = async (score) => {
        const word = reviewList[currentIndex];
        // Gửi điểm (1-5) cho SRS Backend
        await writingService.submitReviewWord(word.id, score);

        // Sang từ tiếp theo
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
        }, 200);
    };

    const handleMatchComplete = (score) => {
        // Advance 6 words
        setCurrentIndex(prev => prev + 6);
    };

    if (loading) return <div style={{ ...styles.container, ...themeVars }}>Đang tải thẻ Flashcard...</div>;

    if (currentIndex >= reviewList.length && reviewList.length > 0) {
        return (
            <div style={{ ...styles.container, ...themeVars, justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem' }}>🏆</div>
                <h2 style={{ color: '#10b981' }}>Tuyệt Vời!</h2>
                <p style={{ color: 'var(--text-primary)' }}>Bạn đã hoàn thành phiên ôn tập hôm nay.</p>
                <button onClick={onBack} style={{ ...styles.btnAction('#7137ea'), maxWidth: '200px' }}>
                    Tuyệt vời
                </button>
            </div>
        );
    }

    if (reviewList.length === 0) {
        return (
            <div style={{ ...styles.container, ...themeVars, justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem' }}>🎉</div>
                <h2 style={{ color: '#10b981', textAlign: 'center' }}>Tuyệt Vời, Không có từ nào cần ôn!</h2>
                <p style={{ color: 'var(--text-primary)', textAlign: 'center' }}>Bạn đã ôn tập xong tất cả từ vựng cần nhớ cho ngày hôm nay.</p>
                <button onClick={onBack} style={{ ...styles.btnAction('#7137ea'), maxWidth: '200px' }}>
                    Quay Lại
                </button>
            </div>
        )
    }

    if (mode === null) {
        return (
            <div style={{ ...styles.container, ...themeVars }}>
                <h2 style={styles.header}>Chọn Chế Độ Ôn Tập</h2>
                <p style={{ color: 'var(--text-primary)' }}>Bạn có {reviewList.length} kiến thức cần ôn tập hôm nay.</p>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
                    <div
                        style={{ ...styles.modeCard, borderColor: '#7137ea' }}
                        onClick={() => setMode('flashcard')}
                        onKeyDown={(e) => e.key === 'Enter' && setMode('flashcard')}
                        role="button"
                        tabIndex={0}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onFocus={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onBlur={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗂️</div>
                        <h3 style={{ color: '#7137ea' }}>Flashcard</h3>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Lật thẻ truyền thống, tự chấm điểm nhớ từ.</p>
                    </div>

                    <div
                        style={{ ...styles.modeCard, borderColor: '#10b981' }}
                        onClick={() => setMode('match')}
                        onKeyDown={(e) => e.key === 'Enter' && setMode('match')}
                        role="button"
                        tabIndex={0}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onFocus={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onBlur={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎮</div>
                        <h3 style={{ color: '#10b981' }}>Nối Từ Siêu Tốc</h3>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Luyện phản xạ nối cặp từ - nghĩa trong 60 giây.</p>
                    </div>

                    <div
                        style={{ ...styles.modeCard, borderColor: '#f59e0b' }}
                        onClick={() => setMode('fillblank')}
                        onKeyDown={(e) => e.key === 'Enter' && setMode('fillblank')}
                        role="button"
                        tabIndex={0}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onFocus={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onBlur={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✍️</div>
                        <h3 style={{ color: '#f59e0b' }}>Điền Từ Vào Câu</h3>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Đọc câu và điền từ còn thiếu vào chỗ trống.</p>
                    </div>
                </div>

                <button onClick={onBack} style={{ ...styles.btnAction('#64748b'), maxWidth: '200px', marginTop: 'auto' }}>
                    Quay Lại
                </button>
            </div>
        );
    }

    if (mode === 'fillblank') {
        return <VocabFillBlankGame words={reviewList} darkMode={darkMode} onComplete={(score) => {
            setCurrentIndex(reviewList.length); // mark all done
            setMode(null);
        }} />;
    }

    if (mode === 'match') {
        // Send a chunk of 6 words to the match game
        const currentBatch = reviewList.slice(currentIndex, currentIndex + 6);
        return <VocabMatchGame words={currentBatch} darkMode={darkMode} onComplete={handleMatchComplete} />;
    }

    // FLASHCARD MODE
    const currentWord = reviewList[currentIndex];

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
                    ← Đổi chế độ
                </button>
                <h2 style={styles.header}>Thẻ Kiến Thức Ôn Tập ({currentIndex + 1} / {reviewList.length})</h2>
                <div style={{ width: '80px' }}></div> {/* Spacer */}
            </div>

            {/* FLASHCARD */}
            <div style={styles.flashcard} onClick={() => setIsFlipped(!isFlipped)} onKeyDown={(e) => e.key === 'Enter' && setIsFlipped(!isFlipped)} role="button" tabIndex={0}>
                {/* Mặt Trước (Front) */}
                <div style={{ ...styles.cardFace(isFlipped), ...styles.cardFront(isFlipped), borderColor: currentWord.item_type === 'grammar' ? '#e11d48' : currentWord.item_type === 'pronunciation' ? '#d97706' : '#7137ea' }}>
                    {currentWord.item_type === 'grammar' ? (
                        <>
                            <div style={{ color: '#e11d48', fontWeight: 'bold', marginBottom: '8px' }}>📖 Sửa lỗi Ngữ Pháp</div>
                            <div style={{ fontSize: '1.25rem', color: '#1e293b', textAlign: 'center', textDecoration: 'line-through' }}>{currentWord.grammar_error}</div>
                        </>
                    ) : currentWord.item_type === 'pronunciation' ? (
                        <>
                            <div style={{ color: '#d97706', fontWeight: 'bold', marginBottom: '8px' }}>🗣️ Trọng tâm Phát Âm</div>
                            <div style={styles.wordBig}>{currentWord.word}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ color: '#7137ea', fontWeight: 'bold', marginBottom: '8px' }}>💡 Từ Vựng</div>
                            <div style={styles.wordBig}>{currentWord.word}</div>
                        </>
                    )}
                    <div style={{ color: '#94a3b8', marginTop: '16px', fontSize: '0.875rem' }}>(Nhấn để Lật/Xem Đáp Án)</div>
                </div>

                {/* Mặt Sau (Back) */}
                <div style={{ ...styles.cardFace(isFlipped), ...styles.cardBack(!isFlipped), borderColor: currentWord.item_type === 'grammar' ? '#e11d48' : currentWord.item_type === 'pronunciation' ? '#d97706' : '#10b981' }}>
                    {currentWord.item_type === 'grammar' ? (
                        <>
                            <div style={{ ...styles.wordDef, color: '#10b981', fontWeight: 'bold' }}>✅ {currentWord.grammar_correction}</div>
                            <div style={{ ...styles.wordEx, color: '#334155' }}>💡 {currentWord.definition}</div>
                        </>
                    ) : currentWord.item_type === 'pronunciation' ? (
                        <>
                            <div style={{ ...styles.wordDef, color: '#10b981', fontWeight: 'bold' }}>✅ {currentWord.example_sentence}</div>
                            <div style={{ ...styles.wordEx, color: '#ef4444', textDecoration: 'line-through' }}>❌ {currentWord.translation}</div>
                            <div style={{ ...styles.wordEx, color: '#334155', marginTop: '8px' }}>💡 {currentWord.definition}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ ...styles.wordBig, fontSize: '2rem', color: '#7137ea', marginBottom: '4px' }}>{currentWord.word}</div>
                            {currentWord.pos && <div style={{ color: '#a78bfa', fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '12px' }}>({currentWord.pos})</div>}
                            <div style={styles.wordDef}>{currentWord.definition}</div>
                            {currentWord.translation && (
                                <div style={{ ...styles.wordDef, color: '#10b981', fontWeight: 'bold', marginTop: '8px' }}>
                                    (Tiếng Việt: {currentWord.translation})
                                </div>
                            )}
                            <div style={styles.wordEx}>"{currentWord.example_sentence}"</div>
                        </>
                    )}
                </div>
            </div>

            {/* Hành Động - Chỉ hiện khi lật mặt sau */}
            {isFlipped && (
                <div style={styles.actionArea}>
                    <button style={styles.btnAction('#ef4444')} onClick={() => handleScore(1)}>
                        Sai / Quên
                    </button>
                    <button style={styles.btnAction('#f59e0b')} onClick={() => handleScore(3)}>
                        Tạm Nhớ
                    </button>
                    <button style={styles.btnAction('#10b981')} onClick={() => handleScore(5)}>
                        Rất Thuộc
                    </button>
                </div>
            )}
        </div>
    );
}
