import React, { useState } from 'react';
import { readingService } from '../readingService';

export default function ReadingViewer({ passage, darkMode, onBack, onWordLookup, onStartQuiz }) {
    const [selectedWord, setSelectedWord] = useState(null);
    const [wordInfo, setWordInfo] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
    const [wordsCount, setWordsCount] = useState(0);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#cbd5e1',
        '--content-bg': '#0f172a'
    } : {
        '--card-bg': '#ffffff', '--border-color': '#e2e8f0',
        '--text-primary': '#1e293b', '--text-secondary': '#64748b',
        '--content-bg': '#fefce8'
    };

    // Tách content thành mảng tokens (từ + dấu câu + khoảng trắng)
    const tokens = passage.content.split(/(\s+|[.,!?;:'"()\-–—])/);
    const diffWords = (passage.difficulty_words || []).map(w => w.word.toLowerCase());

    const handleWordClick = async (word, e) => {
        const cleanWord = word.replace(/[^a-zA-Z'-]/g, '');
        if (!cleanWord || cleanWord.length < 2) return;

        const rect = e.target.getBoundingClientRect();
        setPopupPos({ top: rect.bottom + window.scrollY + 8, left: Math.min(rect.left, window.innerWidth - 320) });
        setSelectedWord(cleanWord);
        setLookupLoading(true);

        try {
            // Tìm câu chứa từ
            const sentences = passage.content.split(/[.!?]+/);
            const sentence = sentences.find(s => s.toLowerCase().includes(cleanWord.toLowerCase())) || '';

            const result = await readingService.lookupWord(cleanWord, sentence.trim(), passage.level);
            setWordInfo(result);

            // Báo cho parent lưu từ đã tra
            onWordLookup({
                word: result.word,
                definition: result.definition,
                translation: result.translation,
                example: result.exampleInContext,
                level: passage.level
            });
            setWordsCount(prev => prev + 1);
        } catch (err) {
            setWordInfo({ word: cleanWord, definition: 'Không thể tra từ lúc này', translation: '', error: true });
        }
        setLookupLoading(false);
    };

    const closePopup = () => { setSelectedWord(null); setWordInfo(null); };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', ...themeVars }} onClick={(e) => {
            if (!e.target.closest('.word-popup') && !e.target.closest('.clickable-word')) closePopup();
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={onBack} style={{
                    padding: '8px 16px', background: 'transparent', color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer'
                }}>← Quay lại</button>
                <span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: '12px', fontSize: '0.875rem', color: '#475569', fontWeight: 'bold' }}>
                    {passage.level} • {passage.word_count || passage.content.split(/\s+/).length} từ
                </span>
            </div>

            <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>{passage.title}</h2>

            {/* Instruction */}
            <div style={{
                padding: '12px 16px', background: 'rgba(113, 55, 234, 0.08)', borderRadius: '8px',
                marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)'
            }}>
                💡 <strong>Mẹo:</strong> Click/bấm vào bất kỳ từ nào bạn không hiểu để xem nghĩa Tiếng Việt. Từ được đánh dấu <span style={{ color: '#7137ea', fontWeight: 'bold' }}>màu tím</span> là từ vựng quan trọng.
            </div>

            {/* Content area - clickable words */}
            <div style={{
                padding: '24px', background: 'var(--content-bg)', borderRadius: '12px',
                border: '1px solid var(--border-color)', lineHeight: '2', fontSize: '1.1rem',
                color: 'var(--text-primary)', marginBottom: '20px', position: 'relative'
            }}>
                {tokens.map((token, idx) => {
                    const cleanToken = token.replace(/[^a-zA-Z'-]/g, '');
                    const isWord = cleanToken.length >= 2;
                    const isDifficult = isWord && diffWords.includes(cleanToken.toLowerCase());
                    const isSelected = isWord && selectedWord === cleanToken;

                    if (!isWord) return <span key={idx}>{token}</span>;

                    return (
                        <span key={idx} className="clickable-word"
                            onClick={(e) => handleWordClick(token, e)}
                            style={{
                                cursor: 'pointer', borderRadius: '3px', padding: '1px 2px',
                                transition: 'background 0.15s',
                                backgroundColor: isSelected ? '#c4b5fd' : isDifficult ? 'rgba(113, 55, 234, 0.12)' : 'transparent',
                                color: isDifficult ? '#7137ea' : 'inherit',
                                fontWeight: isDifficult ? '600' : 'inherit',
                                textDecoration: isDifficult ? 'underline dotted' : 'none'
                            }}
                            onMouseEnter={e => { if (!isSelected) e.target.style.backgroundColor = darkMode ? '#334155' : '#e5e7eb'; }}
                            onMouseLeave={e => { if (!isSelected) e.target.style.backgroundColor = isDifficult ? 'rgba(113, 55, 234, 0.12)' : 'transparent'; }}
                        >{token}</span>
                    );
                })}
            </div>

            {/* Word popup */}
            {selectedWord && (
                <div className="word-popup" style={{
                    position: 'absolute', top: popupPos.top, left: popupPos.left,
                    width: '300px', padding: '16px', background: darkMode ? '#1e293b' : 'white',
                    border: '2px solid #7137ea', borderRadius: '12px', zIndex: 1000,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}>
                    {lookupLoading ? (
                        <div style={{ color: '#7137ea', fontWeight: 'bold' }}>⏳ Đang tra từ...</div>
                    ) : wordInfo ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#7137ea' }}>{wordInfo.word}</span>
                                <button onClick={closePopup} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
                            </div>
                            {wordInfo.pronunciation && <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{wordInfo.pronunciation} • {wordInfo.partOfSpeech}</div>}
                            <div style={{ margin: '8px 0', color: 'var(--text-primary)' }}>📖 {wordInfo.definition}</div>
                            <div style={{ color: '#10b981', fontWeight: 'bold' }}>🇻🇳 {wordInfo.translation}</div>
                            {wordInfo.synonyms && wordInfo.synonyms.length > 0 && (
                                <div style={{ margin: '6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Đồng nghĩa: {wordInfo.synonyms.join(', ')}
                                </div>
                            )}
                            {wordInfo.note && <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#f59e0b', fontStyle: 'italic' }}>💡 {wordInfo.note}</div>}
                            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#10b981' }}>✅ Đã tự động lưu vào Sổ Từ Vựng</div>
                        </>
                    ) : null}
                </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    📝 Đã tra: <strong>{wordsCount}</strong> từ
                </div>
                <button onClick={onStartQuiz} style={{
                    padding: '12px 24px', background: '#7137ea', color: 'white',
                    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                    fontSize: '1rem'
                }}>Tôi đã đọc xong → Làm Quiz ✍️</button>
            </div>
        </div>
    );
}
