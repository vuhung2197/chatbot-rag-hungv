import React, { useState, useEffect, useRef, useCallback } from 'react';
import { writingService } from '../writingService';

// Thời gian đếm ngược theo CEFR level (giây)
const TIMER_BY_LEVEL = {
    A1: 30, A2: 45, B1: 60, B2: 75, C1: 90, C2: 115
};
const DEFAULT_TIMER = 75;

function getTimerForLevel(level) {
    if (!level) return DEFAULT_TIMER;
    const key = level.toUpperCase().trim();
    return TIMER_BY_LEVEL[key] ?? DEFAULT_TIMER;
}

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
    },
};

// ─── Timer Ring ───

function TimerRing({ timeLeft, total }) {
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const pct = total > 0 ? timeLeft / total : 0;
    const offset = circumference * (1 - pct);
    const color = pct > 0.5 ? '#10b981' : pct > 0.25 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="5" />
                <circle
                    cx="32" cy="32" r={radius} fill="none"
                    stroke={color} strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 'bold', color
            }}>
                {timeLeft}
            </div>
        </div>
    );
}

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
    const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER);
    const [timedOut, setTimedOut] = useState(false);
    const inputRef = useRef(null);
    const timerRef = useRef(null);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--text-primary': '#f8fafc'
    } : {};

    // Khởi động timer khi chuyển câu mới
    const startTimer = useCallback((level) => {
        clearInterval(timerRef.current);
        const duration = getTimerForLevel(level);
        setTimeLeft(duration);
        setTimedOut(false);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setTimedOut(true);
                    setResult('wrong');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // Dừng timer khi có kết quả
    useEffect(() => {
        if (result) clearInterval(timerRef.current);
    }, [result]);

    // Cleanup khi unmount
    useEffect(() => () => clearInterval(timerRef.current), []);

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
        if (processed.length > 0) startTimer(processed[0].level);
    }, [words, startTimer]);

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
            try { await writingService.submitReviewWord(current.id, 4); } catch (e) { console.error('SRS update error:', e); }
        } else {
            setWrongCount(prev => prev + 1);
            try { await writingService.submitReviewWord(current.id, 1); } catch (e) { console.error('SRS update error:', e); }
        }
    };

    const handleNext = () => {
        if (currentIndex + 1 >= gameData.length) {
            setGameOver(true);
            return;
        }
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setUserInput('');
        setResult(null);
        setHintLevel(0);
        setTimedOut(false);
        startTimer(gameData[nextIndex].level);
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
        const passed = pct >= 80;
        return (
            <div style={{ ...styles.container, ...themeVars, justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem' }}>{passed ? '🏆' : pct >= 50 ? '💪' : '📚'}</div>
                <h2 style={{ color: passed ? '#10b981' : '#ef4444', margin: '0' }}>
                    {passed ? 'Xuất sắc! Đã hoàn thành!' : 'Chưa đạt — cần ôn thêm!'}
                </h2>
                <div style={styles.statsRow}>
                    <span style={{ color: '#10b981' }}>✅ {correctCount} đúng</span>
                    <span style={{ color: '#ef4444' }}>❌ {wrongCount} sai</span>
                    <span style={{ color: '#7137ea' }}>📊 {pct}%</span>
                </div>
                {!passed && (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0', textAlign: 'center' }}>
                        Cần đạt tối thiểu 80% để hoàn thành bài ôn tập
                    </p>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                        onClick={() => {
                            setCurrentIndex(0);
                            setUserInput('');
                            setResult(null);
                            setHintLevel(0);
                            setCorrectCount(0);
                            setWrongCount(0);
                            setGameOver(false);
                            setTimedOut(false);
                            if (gameData.length > 0) startTimer(gameData[0].level);
                        }}
                        style={{ ...styles.btnNext, backgroundColor: passed ? '#64748b' : '#7137ea' }}
                    >
                        Làm lại
                    </button>
                    {passed && (
                        <button onClick={() => onComplete(correctCount)} style={styles.btnNext}>
                            Hoàn thành
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ─── Main Game ───
    const current = gameData[currentIndex];
    const progress = ((currentIndex + (result ? 1 : 0)) / gameData.length) * 100;
    const totalTime = getTimerForLevel(current.level);

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={styles.statsRow}>
                        <span style={{ color: '#10b981', fontSize: '0.9rem' }}>✅ {correctCount}</span>
                        <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>❌ {wrongCount}</span>
                    </div>
                    <TimerRing timeLeft={timeLeft} total={totalTime} />
                </div>
            </div>

            {/* Progress bar */}
            <div style={styles.progressBar}>
                <div style={styles.progressFill(progress)} />
            </div>

            {/* Hint tags */}
            <div style={styles.hintArea}>
                {current.pos && <span style={styles.hintTag('#7137ea')}>{current.pos}</span>}
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
            {hintLevel >= 1 && (current.definition || current.translation) && (
                <div style={{
                    padding: '10px 16px', borderRadius: '10px',
                    backgroundColor: '#f59e0b14', border: '1px solid #f59e0b30',
                    color: 'var(--text-primary, #334155)', fontSize: '0.95rem',
                    maxWidth: '600px', textAlign: 'center', fontStyle: 'italic',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    {current.definition && <div>📖 {current.definition}</div>}
                    {current.translation && <div>🇻🇳 {current.translation}</div>}
                </div>
            )}

            {/* Full answer reveal - level 3 */}
            {hintLevel >= 3 && (
                <div style={{
                    padding: '12px 20px', borderRadius: '10px',
                    backgroundColor: '#ef444414', border: '1px solid #ef444430',
                    color: 'var(--text-primary, #334155)', fontSize: '1rem',
                    maxWidth: '600px', textAlign: 'center'
                }}>
                    🔓 Đáp án: <strong style={{ color: '#7137ea', fontSize: '1.15rem' }}>{current.correctAnswer}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                        Hãy ghi nhớ từ này và thử lại lần sau nhé!
                    </div>
                </div>
            )}

            {/* Hint button */}
            {!result && hintLevel < 3 && (
                <button
                    onClick={() => setHintLevel(prev => prev + 1)}
                    style={{
                        background: 'none', border: '1px dashed #f59e0b',
                        color: '#f59e0b', padding: '6px 16px', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                        transition: 'all 0.2s'
                    }}
                >
                    {hintLevel === 0 ? '💡 Xem gợi ý (Nghĩa tiếng Anh/Việt)' : hintLevel === 1 ? '💡 Xem thêm chữ cái' : '🔓 Xem đáp án'}
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
                                <strong>{current.correctAnswer}</strong>
                                {current.phonetic && <span style={{ marginLeft: '8px', color: '#64748b' }}>/{current.phonetic}/</span>}
                                {current.definition && <div style={{ marginTop: '8px' }}>📖 {current.definition}</div>}
                                {current.translation && <div style={{ marginTop: '4px' }}>🇻🇳 {current.translation}</div>}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
                                {timedOut ? '⏰ Hết giờ!' : '❌ Chưa đúng'}
                            </div>
                            {!timedOut && (
                                <div style={{ color: '#991b1b', fontSize: '1rem', marginBottom: '8px' }}>
                                    Bạn viết: <strong style={{ textDecoration: 'line-through' }}>{userInput}</strong>
                                </div>
                            )}
                            <div style={{ color: '#065f46', fontSize: '1.05rem', fontWeight: 'bold' }}>
                                Đáp án: <span style={{ color: '#7137ea' }}>{current.correctAnswer}</span>
                                {current.phonetic && <span style={{ marginLeft: '8px', color: '#64748b' }}>/{current.phonetic}/</span>}
                            </div>
                            <div style={{ color: 'var(--text-primary, #334155)', fontSize: '0.95rem', marginTop: '8px', fontStyle: 'italic' }}>
                                "{current.example_sentence}"
                            </div>
                            <div style={{ color: 'var(--text-primary, #334155)', fontSize: '0.95rem', marginTop: '8px', textAlign: 'center' }}>
                                {current.definition && <div>📖 {current.definition}</div>}
                                {current.translation && <div style={{ marginTop: '4px' }}>🇻🇳 {current.translation}</div>}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
