import React, { useState, useEffect } from 'react';
import { writingService } from '../writingService';

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
    })
};

export default function VocabularyReview({ darkMode, onBack }) {
    const [reviewList, setReviewList] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div style={styles.container}>Đang tải thẻ Flashcard...</div>;

    if (currentIndex >= reviewList.length) {
        return (
            <div style={{ ...styles.container, ...themeVars, justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem' }}>🏆</div>
                <h2 style={{ color: '#10b981' }}>Tuyệt Vời!</h2>
                <p style={{ color: 'var(--text-primary)' }}>Bạn đã hoàn thành phiên ôn tập thẻ từ hôm nay.</p>
                <button onClick={onBack} style={{ ...styles.btnAction('#7137ea'), maxWidth: '200px' }}>
                    Tuyệt vời
                </button>
            </div>
        );
    }

    const currentWord = reviewList[currentIndex];

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            <h2 style={styles.header}>Thẻ Kiến Thức Ôn Tập ({currentIndex + 1} / {reviewList.length})</h2>

            {/* FLASHCARD */}
            <div style={styles.flashcard} onClick={() => setIsFlipped(!isFlipped)}>
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
