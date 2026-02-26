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
        gap: '20px',
        maxHeight: '600px',
    },
    header: { margin: 0, color: 'var(--text-primary, #1e293b)' },
    list: {
        display: 'flex', flexDirection: 'column', gap: '12px',
        overflowY: 'auto', paddingRight: '8px'
    },
    wordCard: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px',
        backgroundColor: 'var(--input-bg, #f8fafc)'
    },
    wordMain: { fontSize: '1.2rem', fontWeight: 'bold', color: '#7137ea', marginBottom: '4px' },
    wordMeta: { fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' },
    masteryDots: (level) => ({
        display: 'flex', gap: '4px'
    }),
    dot: (filled) => ({
        width: '10px', height: '10px', borderRadius: '50%',
        backgroundColor: filled ? '#10b981' : '#cbd5e1'
    }),
    button: {
        padding: '8px 16px', background: '#7137ea', color: 'white',
        borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500'
    }
};

export default function VocabularyList({ darkMode }) {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load words when component mounts
    useEffect(() => {
        loadWords();
    }, []);

    const loadWords = async () => {
        try {
            setLoading(true);
            const res = await writingService.getVocabulary(1);
            setWords(res.vocabulary || []);
        } catch (err) {
            console.error('Failed to load vocabulary', err);
        } finally {
            setLoading(false);
        }
    };

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--text-primary': '#f8fafc',
        '--text-secondary': '#94a3b8',
        '--input-bg': '#0f172a'
    } : {};

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={styles.header}>📚 Sổ Tay Kiến Thức ({words.length})</h2>
            </div>

            {loading ? <p>Đang tải dữ liệu...</p> : (
                <div style={styles.list}>
                    {words.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Bạn chưa có từ vựng nào. Hãy làm thêm bài tập để AI gom từ giúp bạn nhé!</p>
                    ) : (
                        words.map(w => {
                            const isGrammar = w.item_type === 'grammar';
                            const isPronunciation = w.item_type === 'pronunciation';

                            return (
                                <div key={w.id} style={styles.wordCard}>
                                    <div style={{ flex: 1, paddingRight: '16px' }}>
                                        <div style={{ ...styles.wordMain, color: isGrammar ? '#e11d48' : isPronunciation ? '#d97706' : '#7137ea' }}>
                                            {isGrammar ? '📖 Ngữ Pháp:' : isPronunciation ? '🗣️ Phát Âm:' : '💡 Từ Vựng:'} {w.word}
                                            <span style={{ fontSize: '0.8rem', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>{w.level || 'A1'}</span>
                                        </div>

                                        {isGrammar ? (
                                            <div style={styles.wordMeta}>
                                                <div style={{ marginTop: '4px' }}><strong>Giải thích:</strong> {w.definition}</div>
                                                <div style={{ marginTop: '8px', color: '#ef4444', textDecoration: 'line-through' }}>❌ {w.grammar_error}</div>
                                                <div style={{ color: '#10b981', fontWeight: 'bold' }}>✅ {w.grammar_correction}</div>
                                            </div>
                                        ) : isPronunciation ? (
                                            <div style={styles.wordMeta}>
                                                <div style={{ marginTop: '4px' }}><strong>Mẹo đọc:</strong> {w.definition}</div>
                                                <div style={{ marginTop: '8px', color: '#ef4444', textDecoration: 'line-through' }}>❌ {w.translation}</div>
                                                <div style={{ color: '#10b981', fontWeight: 'bold' }}>✅ {w.example_sentence}</div>
                                            </div>
                                        ) : (
                                            <div style={styles.wordMeta}>
                                                <strong>Mô tả:</strong> {w.definition}
                                                {w.translation && <span style={{ color: '#10b981', marginLeft: '6px' }}><br /><strong>Tiếng Việt:</strong> {w.translation}</span>}
                                                <div style={{ ...styles.wordMeta, fontStyle: 'italic', marginTop: '6px' }}><strong>VD:</strong> "{w.example_sentence}"</div>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Mức độ thuộc</div>
                                        <div style={styles.masteryDots()}>
                                            {[1, 2, 3, 4, 5].map(lvl => (
                                                <div key={lvl} style={styles.dot(w.mastery >= lvl)} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
