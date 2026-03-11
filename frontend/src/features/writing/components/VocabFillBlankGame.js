import React, { useState, useEffect, useRef } from 'react';
import { writingService } from '../writingService';

// ─── Helpers ───

/**
 * Find the target word (or its conjugated form) inside the sentence and return
 * the blanked sentence + the exact form that was removed.
 */
function blankOutWord(sentence, word) {
    if (!sentence || !word) return null;

    const wordLower = word.toLowerCase();
    // Build regex: match the word stem + common suffixes (ed, ing, s, es, tion, ly, ment, ness)
    // This handles: implement → implemented, implementing, implements, implementation
    const escaped = wordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b(${escaped}\\w{0,8})\\b`, 'gi');

    const match = sentence.match(pattern);
    if (!match) return null;

    // Use the first match
    const foundForm = match[0];
    const blanked = sentence.replace(foundForm, '_'.repeat(Math.max(foundForm.length, 5)));

    return { blankedSentence: blanked, answer: foundForm };
}

// ─── Styles ───

const styles = {
    container: {
        padding: '24px',
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        minHeight: '400px',
        width: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    progressBar: {
        width: '100%',
        height: '6px',
        backgroundColor: 'var(--border-color, #e2e8f0)',
        borderRadius: '3px',
        overflow: 'hidden'
    },
    progressFill: (pct) => ({
        width: `${pct}%`,
        height: '100%',
        backgroundColor: '#7137ea',
        borderRadius: '3px',
        transition: 'width 0.4s ease'
    }),
    sentenceCard: {
        width: '100%',
        maxWidth: '600px',
        padding: '28px 24px',
        borderRadius: '16px',
        border: '2px solid var(--border-color, #e2e8f0)',
        backgroundColor: 'var(--card-bg, #fff)',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
    },
    hintArea: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '8px'
    },
    hintTag: (color) => ({
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontWeight: '600',
        backgroundColor: `${color}18`,
        color: color,
        border: `1px solid ${color}40`
    }),
    inputRow: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        width: '100%',
        maxWidth: '500px'
    },
    input: (isCorrect, isWrong) => ({
        flex: 1,
        padding: '14px 18px',
        fontSize: '1.1rem',
        borderRadius: '12px',
        border: `2px solid ${isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#7137ea'}`,
        outline: 'none',
        backgroundColor: isCorrect ? '#d1fae520' : isWrong ? '#fee2e220' : 'var(--card-bg, #fff)',
        color: 'var(--text-primary, #1e293b)',
        fontWeight: '500',
        transition: 'border-color 0.2s'
    }),
    btnSubmit: {
        padding: '14px 24px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: '#7137ea',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '1rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'opacity 0.2s'
    },
    resultCard: (isCorrect) => ({
        width: '100%',
        maxWidth: '600px',
        padding: '20px 24px',
        borderRadius: '12px',
        border: `2px solid ${isCorrect ? '#10b981' : '#ef4444'}`,
        backgroundColor: isCorrect ? '#d1fae520' : '#fee2e220',
        textAlign: 'center'
    }),
    btnNext: {
        padding: '12px 28px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: '#7137ea',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '1rem',
        cursor: 'pointer',
        marginTop: '8px'
    },
    statsRow: {
        display: 'flex',
        gap: '24px',
        fontSize: '1rem',
        fontWeight: 'bold'
    }
};

// ─── Component ───

export default function VocabFillBlankGame({ words, darkMode, onComplete }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [gameData, setGameData] = useState([]); // processed word data with blanked sentences
    const [gameOver, setGameOver] = useState(false);
    const [hintLevel, setHintLevel] = useState(0); // 0=none, 1=definition, 2=more letters
    const inputRef = useRef(null);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--text-primary': '#f8fafc'
    } : {};

    // Process words into fill-the-blank data
    useEffect(() => {
        if (!words || words.length === 0) return;

        const processed = words
            .filter(w => w.example_sentence && w.word) // must have example_sentence
            .map(w => {
                const blankResult = blankOutWord(w.example_sentence, w.word);
                if (!blankResult) return null;
                return {
                    ...w,
                    blankedSentence: blankResult.blankedSentence,
                    correctAnswer: blankResult.answer
                };
            })
            .filter(Boolean);

        setGameData(processed);
        setCurrentIndex(0);
        setResult(null);
        setUserInput('');
        setCorrectCount(0);
        setWrongCount(0);
        setGameOver(false);
    }, [words]);

    // Auto-focus input when moving to next word
    useEffect(() => {
        if (inputRef.current && !result) {
            inputRef.current.focus();
        }
    }, [currentIndex, result]);

    const handleSubmit = async () => {
        if (!userInput.trim() || result) return;

        const current = gameData[currentIndex];
        const isCorrect = userInput.trim().toLowerCase() === current.correctAnswer.toLowerCase();

        setResult(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            // Update SRS - correct
            try {
                await writingService.submitReviewWord(current.id, 4);
            } catch (e) {
                console.error('SRS update error:', e);
            }
        } else {
            setWrongCount(prev => prev + 1);
            // Update SRS - wrong
            try {
                await writingService.submitReviewWord(current.id, 1);
            } catch (e) {
                console.error('SRS update error:', e);
            }
        }
    };

    const handleNext = () => {
        if (currentIndex + 1 >= gameData.length) {
            setGameOver(true);
            return;
        }
        setCurrentIndex(prev => prev + 1);
        setUserInput('');
        setResult(null);
        setHintLevel(0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (result) {
                handleNext();
            } else {
                handleSubmit();
            }
        }
    };

    // ─── No valid words ───
    if (gameData.length === 0) {
        return (
            <div style={{ ...styles.container, ...themeVars, justifyContent: 'center' }}>
                <div style={{ fontSize: '3rem' }}>📝</div>
                <p style={{ color: 'var(--text-primary)', textAlign: 'center' }}>
                    Không có từ nào có câu ví dụ để luyện tập.
                    Hãy thử chế độ Flashcard hoặc Nối Từ.
                </p>
                <button onClick={() => onComplete(0)} style={styles.btnNext}>Quay lại</button>
            </div>
        );
    }

    // ─── Game Over ───
    if (gameOver) {
        const total = correctCount + wrongCount;
        const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        return (
            <div style={{ ...styles.container, ...themeVars, justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem' }}>{pct >= 70 ? '🏆' : pct >= 40 ? '💪' : '📚'}</div>
                <h2 style={{ color: pct >= 70 ? '#10b981' : '#f59e0b', margin: '0' }}>
                    {pct >= 70 ? 'Xuất sắc!' : pct >= 40 ? 'Khá tốt!' : 'Cần ôn thêm!'}
                </h2>
                <div style={styles.statsRow}>
                    <span style={{ color: '#10b981' }}>✅ {correctCount} đúng</span>
                    <span style={{ color: '#ef4444' }}>❌ {wrongCount} sai</span>
                    <span style={{ color: '#7137ea' }}>📊 {pct}%</span>
                </div>
                <button onClick={() => onComplete(correctCount)} style={styles.btnNext}>
                    Hoàn thành
                </button>
            </div>
        );
    }

    // ─── Main Game ───
    const current = gameData[currentIndex];
    const progress = ((currentIndex + (result ? 1 : 0)) / gameData.length) * 100;

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            {/* Header */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    onClick={() => onComplete(correctCount)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                >
                    ← Quay lại
                </button>
                <h3 style={{ margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                    ✍️ Điền Từ ({currentIndex + 1} / {gameData.length})
                </h3>
                <div style={styles.statsRow}>
                    <span style={{ color: '#10b981', fontSize: '0.9rem' }}>✅ {correctCount}</span>
                    <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>❌ {wrongCount}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div style={styles.progressBar}>
                <div style={styles.progressFill(progress)} />
            </div>

            {/* Hint tags */}
            <div style={styles.hintArea}>
                {current.pos && <span style={styles.hintTag('#7137ea')}>{current.pos}</span>}
                {current.translation && <span style={styles.hintTag('#10b981')}>🇻🇳 {current.translation}</span>}
                {current.level && <span style={styles.hintTag('#f59e0b')}>{current.level}</span>}
            </div>

            {/* Sentence card */}
            <div style={styles.sentenceCard}>
                <div style={{ fontSize: '1.2rem', lineHeight: 1.8, color: 'var(--text-primary, #1e293b)' }}>
                    {current.blankedSentence}
                </div>
            </div>

            {/* Letter hint - always visible */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ color: 'var(--text-primary, #64748b)', fontSize: '0.9rem' }}>💡</span>
                <span style={{
                    fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 'bold',
                    color: '#7137ea', letterSpacing: '3px',
                    padding: '4px 12px', borderRadius: '8px',
                    backgroundColor: '#7137ea12', border: '1px dashed #7137ea40'
                }}>
                    {(() => {
                        const ans = current.correctAnswer;
                        if (hintLevel >= 2) {
                            // Show first half of letters
                            const showCount = Math.ceil(ans.length / 2);
                            return ans.slice(0, showCount).split('').join(' ') + ' ' + Array(ans.length - showCount).fill('_').join(' ');
                        }
                        // Always show first letter + blanks
                        return ans[0].toUpperCase() + ' ' + Array(ans.length - 1).fill('_').join(' ');
                    })()}
                </span>
                <span style={{ color: 'var(--text-primary, #94a3b8)', fontSize: '0.8rem' }}>({current.correctAnswer.length} chữ cái)</span>
            </div>

            {/* Definition hint - level 1+ */}
            {hintLevel >= 1 && current.definition && (
                <div style={{
                    padding: '10px 16px', borderRadius: '10px',
                    backgroundColor: '#f59e0b14', border: '1px solid #f59e0b30',
                    color: 'var(--text-primary, #334155)', fontSize: '0.95rem',
                    maxWidth: '600px', textAlign: 'center', fontStyle: 'italic'
                }}>
                    📖 {current.definition}
                </div>
            )}

            {/* Hint button */}
            {!result && hintLevel < 2 && (
                <button
                    onClick={() => setHintLevel(prev => prev + 1)}
                    style={{
                        background: 'none', border: '1px dashed #f59e0b',
                        color: '#f59e0b', padding: '6px 16px', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                        transition: 'all 0.2s'
                    }}
                >
                    {hintLevel === 0 ? '💡 Xem gợi ý (định nghĩa)' : '💡 Xem thêm chữ cái'}
                </button>
            )}

            {/* Input + submit */}
            <div style={styles.inputRow}>
                <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Điền từ còn thiếu..."
                    disabled={!!result}
                    style={styles.input(result === 'correct', result === 'wrong')}
                    autoComplete="off"
                    spellCheck={false}
                />
                {!result ? (
                    <button
                        onClick={handleSubmit}
                        disabled={!userInput.trim()}
                        style={{ ...styles.btnSubmit, opacity: userInput.trim() ? 1 : 0.5 }}
                    >
                        Kiểm tra
                    </button>
                ) : (
                    <button onClick={handleNext} style={styles.btnNext}>
                        {currentIndex + 1 >= gameData.length ? 'Kết thúc' : 'Tiếp →'}
                    </button>
                )}
            </div>

            {/* Result feedback */}
            {result && (
                <div style={styles.resultCard(result === 'correct')}>
                    {result === 'correct' ? (
                        <>
                            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✅ Chính xác!</div>
                            <div style={{ color: '#065f46', fontSize: '1rem' }}>
                                <strong>{current.correctAnswer}</strong> — {current.definition}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>❌ Chưa đúng</div>
                            <div style={{ color: '#991b1b', fontSize: '1rem', marginBottom: '8px' }}>
                                Bạn viết: <strong style={{ textDecoration: 'line-through' }}>{userInput}</strong>
                            </div>
                            <div style={{ color: '#065f46', fontSize: '1.05rem', fontWeight: 'bold' }}>
                                Đáp án: <span style={{ color: '#7137ea' }}>{current.correctAnswer}</span>
                            </div>
                            <div style={{ color: 'var(--text-primary, #334155)', fontSize: '0.95rem', marginTop: '8px', fontStyle: 'italic' }}>
                                "{current.example_sentence}"
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
