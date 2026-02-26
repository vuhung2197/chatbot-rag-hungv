import React from 'react';

const styles = {
    container: {
        padding: '24px',
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '800px',
        margin: '0 auto'
    },
    header: { margin: 0, color: 'var(--text-primary, #1e293b)' },
    sectionTitle: { fontSize: '1.2rem', color: 'var(--text-primary, #1e293b)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' },
    errorCard: {
        padding: '12px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', marginBottom: '12px'
    },
    originalText: { textDecoration: 'line-through', color: '#ef4444', marginBottom: '4px' },
    correctedText: { color: '#10b981', fontWeight: 'bold', marginBottom: '8px' },
    suggestionList: { paddingLeft: '20px', color: 'var(--text-secondary, #475569)', lineHeight: '1.6' },
    vocabCard: { padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '8px', background: 'var(--prompt-bg, #f8fafc)' },
    wordTitle: { color: '#7137ea', fontWeight: 'bold', fontSize: '1.1rem' },
    wordLevel: { fontSize: '0.75rem', padding: '2px 8px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '12px', marginLeft: '8px' },
    backBtn: {
        padding: '10px 16px', backgroundColor: '#7137ea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start'
    }
};

export default function ListeningFeedbackPanel({ submission, darkMode, onBack, onRetry }) {
    if (!submission) return null;

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--text-primary': '#f8fafc',
        '--text-secondary': '#cbd5e1',
        '--prompt-bg': '#0f172a',
    } : {};

    const fb = submission.feedback || {};
    const errors = fb.errors || [];
    const suggestions = fb.suggestions || [];
    const newWords = submission.new_words || [];
    const score = submission.score_total ?? 0;
    const originalText = fb.original_audio_text || '';

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            <h2 style={styles.header}>🎉 Kết quả nghe (Level: {submission.level || 'Unknown'})</h2>

            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(113, 55, 234, 0.1)', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Độ chính xác</h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#7137ea' }}>{score}%</div>
            </div>

            {/* Sửa lỗi */}
            <div>
                <h3 style={styles.sectionTitle}>Sửa lỗi nghe ({errors.length} lỗi)</h3>
                {errors.length === 0 ? (
                    score === 0 ? (
                        <p style={{ color: '#ef4444' }}>⚠️ Không thể nhận diện nội dung rỗng hoặc vô nghĩa.</p>
                    ) : (
                        <p style={{ color: '#10b981' }}>Tuyệt vời! Bạn đã nghe chính xác 100%.</p>
                    )
                ) : (
                    errors.map((err, i) => (
                        <div key={i} style={styles.errorCard}>
                            <div style={styles.originalText}>❌ Bạn nghe là: {err.original}</div>
                            <div style={styles.correctedText}>✅ Từ gốc: {err.correction}</div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>💡 Lời khuyên: {err.explanation}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Script Text */}
            {originalText && (
                <div>
                    <h3 style={styles.sectionTitle}>📜 Transcript File Âm Thanh</h3>
                    <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#1e293b', lineHeight: '1.6', fontSize: '1.1rem' }}>
                        {originalText}
                    </div>
                </div>
            )}

            {/* Gợi ý */}
            <div>
                <h3 style={styles.sectionTitle}>Gợi ý cải thiện Listening</h3>
                {suggestions.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Không có gợi ý cụ thể nào.</p>
                ) : (
                    <ul style={styles.suggestionList}>
                        {suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                    </ul>
                )}
            </div>

            {/* Từ vựng */}
            <div>
                <h3 style={styles.sectionTitle}>Từ vựng hay ({newWords.length} từ đã lưu vào sổ)</h3>
                {newWords.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Không có từ vựng nổi bật.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '12px' }}>
                        {newWords.map((w, i) => (
                            <div key={i} style={styles.vocabCard}>
                                <div style={styles.wordTitle}>{w.word} <span style={styles.wordLevel}>{w.level}</span></div>
                                <div style={{ margin: '8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    <strong>Định nghĩa:</strong> {w.definition} {w.translation ? `(${w.translation})` : ''}
                                </div>
                                <div style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#64748b' }}>"{w.example}"</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button style={{ ...styles.backBtn, backgroundColor: 'transparent', color: '#7137ea', border: '2px solid #7137ea' }} onClick={onBack}>
                    ← Về danh sách
                </button>
                <button style={{ ...styles.backBtn, backgroundColor: '#7137ea', color: 'white', border: '2px solid #7137ea' }} onClick={onRetry}>
                    🎧 Nghe lại / Làm lại
                </button>
            </div>
        </div>
    );
}
