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
        minHeight: '400px',
        width: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: { margin: 0, color: 'var(--text-primary, #1e293b)' },
    statsContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        padding: '0 20px',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        color: '#7137ea'
    },
    gameBoard: {
        display: 'flex',
        gap: '40px',
        width: '100%',
        justifyContent: 'center'
    },
    column: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flex: 1,
        maxWidth: '300px'
    },
    card: (isSelected, isMatched, isError, darkMode) => ({
        padding: '16px',
        borderRadius: '8px',
        border: `2px solid ${isError ? '#ef4444' : isMatched ? '#10b981' : isSelected ? '#7137ea' : 'var(--border-color, #e2e8f0)'}`,
        backgroundColor: isError ? '#fee2e2' : isMatched ? '#d1fae5' : isSelected ? '#e0e7ff' : darkMode ? '#0f172a' : '#f8fafc',
        color: isError ? '#991b1b' : isMatched ? '#065f46' : darkMode ? '#f8fafc' : '#1e293b',
        cursor: isMatched ? 'default' : 'pointer',
        opacity: isMatched ? 0.6 : 1,
        transition: 'all 0.2s',
        textAlign: 'center',
        fontWeight: '500',
        transform: isSelected && !isMatched ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isSelected && !isMatched ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
        pointerEvents: isMatched ? 'none' : 'auto',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80px'
    }),
    btnAction: {
        padding: '12px 24px', borderRadius: '8px', border: 'none',
        color: 'white', backgroundColor: '#7137ea', fontWeight: 'bold', fontSize: '1.1rem',
        cursor: 'pointer', transition: 'alpha 0.2s', marginTop: '20px'
    }
};

export default function VocabMatchGame({ words, darkMode, onComplete }) {
    const [leftItems, setLeftItems] = useState([]);
    const [rightItems, setRightItems] = useState([]);
    const [selectedLeft, setSelectedLeft] = useState(null);
    const [selectedRight, setSelectedRight] = useState(null);
    const [matchedIds, setMatchedIds] = useState([]);
    const [errorPair, setErrorPair] = useState([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds to match
    const [gameOver, setGameOver] = useState(false);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--text-primary': '#f8fafc'
    } : {};

    // Shuffle helper
    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    /**
     * Helper mapping item_type to front display text
     */
    const getFrontText = (w) => {
        if (w.item_type === 'grammar') return `[Ngữ pháp] ${w.grammar_error}`;
        if (w.item_type === 'pronunciation') return `[Phát âm] ${w.word}`;
        return w.word;
    };

    /**
     * Helper mapping item_type to back display text
     */
    const getBackText = (w) => {
        if (w.item_type === 'grammar') return w.grammar_correction;
        if (w.item_type === 'pronunciation') return w.example_sentence;
        return w.definition || w.translation || 'N/A';
    };

    useEffect(() => {
        if (!words || words.length === 0) return;
        // Take up to 6 words for a round
        const roundWords = shuffleArray(words).slice(0, 6);

        const left = roundWords.map(w => ({ id: w.id, text: getFrontText(w) }));
        const right = roundWords.map(w => ({ id: w.id, text: getBackText(w) }));

        setLeftItems(shuffleArray(left));
        setRightItems(shuffleArray(right));
        setMatchedIds([]);
        setScore(0);
        setTimeLeft(60);
        setGameOver(false);
    }, [words]);

    useEffect(() => {
        if (timeLeft <= 0 && !gameOver) {
            setGameOver(true);
        }
        if (!gameOver && timeLeft > 0 && matchedIds.length < leftItems.length) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        }
        if (matchedIds.length === leftItems.length && leftItems.length > 0) {
            setGameOver(true);
            setTimeout(() => {
                onComplete(score + Math.floor(timeLeft / 2)); // Bonus for time
            }, 1000);
        }
    }, [timeLeft, gameOver, matchedIds, leftItems, score, onComplete]);

    const handleSelectLeft = (id) => {
        if (gameOver || matchedIds.includes(id)) return;
        setSelectedLeft(id);

        if (selectedRight !== null) {
            checkMatch(id, selectedRight);
        }
    };

    const handleSelectRight = (id) => {
        if (gameOver || matchedIds.includes(id)) return;
        setSelectedRight(id);

        if (selectedLeft !== null) {
            checkMatch(selectedLeft, id);
        }
    };

    const checkMatch = async (leftId, rightId) => {
        if (leftId === null || rightId === null) return;

        if (leftId === rightId) {
            // Match correct!
            setMatchedIds(prev => [...prev, leftId]);
            setScore(prev => prev + 10);
            setSelectedLeft(null);
            setSelectedRight(null);
            setErrorPair([]);

            // Call API ngầm tăng SM-2
            try {
                await writingService.submitReviewWord(leftId, 4); // Điểm tốt vì nối nhanh
            } catch (e) {
                console.error('Lỗi lưu điểm SRS', e);
            }
        } else {
            // Wrong match
            setErrorPair([leftId, rightId]);
            setScore(prev => Math.max(0, prev - 2));
            setTimeout(() => {
                setSelectedLeft(null);
                setSelectedRight(null);
                setErrorPair([]);
            }, 500);
        }
    };

    if (gameOver && matchedIds.length === leftItems.length) {
        return (
            <div style={{ ...styles.container, ...themeVars, justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem' }}>🏆 Vượt Ải Nối Từ!</div>
                <h2 style={{ color: '#10b981' }}>Điểm: {score + Math.floor(timeLeft / 2)}</h2>
                <p style={{ color: 'var(--text-primary)' }}>Bạn nối từ rất nhanh và chuẩn xác!</p>
                <button onClick={() => onComplete(score)} style={styles.btnAction}>Tiếp tục ôn tập</button>
            </div>
        );
    }

    if (gameOver && timeLeft <= 0) {
        return (
            <div style={{ ...styles.container, ...themeVars, justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem' }}>⏳ Hết Giờ!</div>
                <h2 style={{ color: '#ef4444' }}>Điểm: {score}</h2>
                <button onClick={() => onComplete(score)} style={styles.btnAction}>Thử lại sau</button>
            </div>
        );
    }

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            <h2 style={styles.header}>🎮 Nối Từ Siêu Tốc</h2>
            <div style={styles.statsContainer}>
                <div>⭐ Điểm: {score}</div>
                <div style={{ color: timeLeft <= 10 ? '#ef4444' : '#7137ea' }}>⏳ Thời gian: {timeLeft}s</div>
            </div>

            <div style={styles.gameBoard}>
                {/* Cột trái (Từ Vựng / Focus) */}
                <div style={styles.column}>
                    {leftItems.map(item => {
                        const isMatched = matchedIds.includes(item.id);
                        const isSelected = selectedLeft === item.id;
                        const isError = errorPair.includes(item.id) && isSelected;
                        return (
                            <div
                                key={`left-${item.id}`}
                                style={styles.card(isSelected, isMatched, isError, darkMode)}
                                onClick={() => handleSelectLeft(item.id)}
                            >
                                {item.text}
                            </div>
                        )
                    })}
                </div>

                {/* Cột phải (Nghĩa / Định Nghĩa) */}
                <div style={styles.column}>
                    {rightItems.map(item => {
                        const isMatched = matchedIds.includes(item.id);
                        const isSelected = selectedRight === item.id;
                        const isError = errorPair.includes(item.id) && isSelected;
                        return (
                            <div
                                key={`right-${item.id}`}
                                style={styles.card(isSelected, isMatched, isError, darkMode)}
                                onClick={() => handleSelectRight(item.id)}
                            >
                                {item.text}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
