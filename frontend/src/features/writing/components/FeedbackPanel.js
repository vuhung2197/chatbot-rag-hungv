import React from 'react';

const styles = {
    container: {
        padding: '24px',
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
    },
    header: { margin: 0, color: 'var(--text-primary, #1e293b)' },
    scoreGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '12px'
    },
    scoreCard: (color) => ({
        padding: '16px',
        backgroundColor: color + '10', // Light background
        border: `1px solid ${color}30`,
        borderRadius: '8px',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', gap: '8px'
    }),
    scoreTitle: { color: 'var(--text-secondary, #64748b)', fontSize: '0.875rem', fontWeight: 'bold' },
    scoreValue: (color) => ({ color: color, fontSize: '1.5rem', fontWeight: 'bold' }),
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

export default function FeedbackPanel({ submission, darkMode, onBack, onRetry }) {
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

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            <h2 style={styles.header}>🎉 Kết quả bài viết (Level: {submission.level || 'Unknown'})</h2>

            {/* 1. Điểm số */}
            <div>
                <h3 style={styles.sectionTitle}>Bảng điểm (Tổng: <span style={{ color: '#7137ea' }}>{submission.score_total ?? 0}/100</span>)</h3>
                <div style={styles.scoreGrid}>
                    <div style={styles.scoreCard('#3b82f6')}>
                        <div style={styles.scoreTitle}>Ngữ Pháp</div>
                        <div style={styles.scoreValue('#3b82f6')}>{submission.score_grammar ?? 0}</div>
                    </div>
                    <div style={styles.scoreCard('#10b981')}>
                        <div style={styles.scoreTitle}>Từ Vựng</div>
                        <div style={styles.scoreValue('#10b981')}>{submission.score_vocabulary ?? 0}</div>
                    </div>
                    <div style={styles.scoreCard('#f59e0b')}>
                        <div style={styles.scoreTitle}>Mạch Lạc</div>
                        <div style={styles.scoreValue('#f59e0b')}>{submission.score_coherence ?? 0}</div>
                    </div>
                    <div style={styles.scoreCard('#8b5cf6')}>
                        <div style={styles.scoreTitle}>Phản Hồi Đề</div>
                        <div style={styles.scoreValue('#8b5cf6')}>{submission.score_task ?? 0}</div>
                    </div>
                </div>
            </div>

            {/* 2. Sửa lỗi */}
            <div>
                <h3 style={styles.sectionTitle}>Sửa lỗi ({errors.length} lỗi)</h3>
                {errors.length === 0 ? (
                    submission.score_total === 0 ? (
                        <p style={{ color: '#ef4444' }}>⚠️ Không thể nhận diện ngữ pháp do bài làm quá ngắn hoặc không phải tiếng Anh hợp lệ.</p>
                    ) : (
                        <p style={{ color: '#10b981' }}>Tuyệt vời! Không phát hiện lỗi sai đáng kể nào.</p>
                    )
                ) : (
                    errors.map((err, i) => (
                        <div key={i} style={styles.errorCard}>
                            <div style={styles.originalText}>❌ {err.original}</div>
                            <div style={styles.correctedText}>✅ {err.correction}</div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>💡 {err.explanation}</div>
                        </div>
                    ))
                )}
            </div>

            {/* 3. Gợi ý làm bài tốt hơn */}
            <div>
                <h3 style={styles.sectionTitle}>Gợi ý cải thiện</h3>
                {suggestions.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Không có gợi ý cụ thể nào. (Có thể nội dung viết chưa đạt yêu cầu để AI phân tích).</p>
                ) : (
                    <ul style={styles.suggestionList}>
                        {suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                    </ul>
                )}
            </div>

            {/* 4. Từ vựng bóc tách */}
            <div>
                <h3 style={styles.sectionTitle}>Từ vựng hay ({newWords.length} từ đã lưu vào sổ)</h3>
                {newWords.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Không có nhóm từ mới nổi bật nào.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

            {/* 5. Model Answer */}
            {fb.model_answer && (
                <div>
                    <h3 style={styles.sectionTitle}>📝 Bài viết mẫu ({submission.level || 'Tham khảo'})</h3>
                    <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {fb.model_answer}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button style={{ ...styles.backBtn, backgroundColor: 'transparent', color: '#7137ea', border: '2px solid #7137ea' }} onClick={onBack}>
                    ← Về danh sách
                </button>
                <button style={{ ...styles.backBtn, backgroundColor: '#7137ea', color: 'white', border: '2px solid #7137ea' }} onClick={onRetry}>
                    ✍️ Viết lại / Sửa bài
                </button>
            </div>
        </div>
    );
}
