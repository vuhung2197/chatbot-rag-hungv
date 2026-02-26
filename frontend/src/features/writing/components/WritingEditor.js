import React, { useState } from 'react';
import { writingService } from '../writingService';

const styles = {
    container: {
        padding: '24px',
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    header: { margin: 0, color: 'var(--text-primary, #1e293b)' },
    promptBox: {
        padding: '16px',
        backgroundColor: 'var(--prompt-bg, #f8fafc)',
        borderLeft: '4px solid #7137ea',
        borderRadius: '4px',
        color: 'var(--text-secondary, #475569)'
    },
    textarea: {
        width: '100%',
        minHeight: '300px',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #cbd5e1)',
        backgroundColor: 'var(--input-bg, #ffffff)',
        color: 'var(--text-primary, #1e293b)',
        fontFamily: 'inherit',
        fontSize: '1rem',
        lineHeight: '1.6',
        resize: 'vertical',
        boxSizing: 'border-box'
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    wordCount: (count, min, max) => ({
        color: (count >= min && count <= max) ? '#10b981' : '#ef4444',
        fontWeight: '500'
    }),
    submitBtn: (disabled) => ({
        padding: '10px 24px',
        backgroundColor: disabled ? '#94a3b8' : '#7137ea',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
    }),
    backBtn: {
        padding: '10px 16px',
        backgroundColor: 'transparent',
        color: 'var(--text-primary, #475569)',
        border: '1px solid var(--border-color, #cbd5e1)',
        borderRadius: '8px',
        cursor: 'pointer'
    }
};

export default function WritingEditor({ exercise, darkMode, onBack, onSubmitSuccess }) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--prompt-bg': '#0f172a',
        '--border-color': '#334155',
        '--input-bg': '#0f172a',
        '--text-primary': '#f8fafc',
        '--text-secondary': '#cbd5e1'
    } : {};

    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const isLengthValid = wordCount >= exercise.min_words && wordCount <= exercise.max_words;

    const handleSubmit = async () => {
        if (!isLengthValid) {
            setError(`Vui lòng viết từ ${exercise.min_words} đến ${exercise.max_words} từ.`);
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const submission = await writingService.submitWriting(exercise.id, content);
            onSubmitSuccess(submission);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Lỗi nộp bài');
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={styles.header}>{exercise.title}</h2>
                <span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: '12px', fontSize: '0.875rem', color: '#475569', fontWeight: 'bold' }}>
                    {exercise.level} • {exercise.type}
                </span>
            </div>

            <div style={styles.promptBox}>
                <strong>Đề bài:</strong> {exercise.prompt}
                {exercise.hints && exercise.hints.length > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '0.9rem' }}>
                        <strong>Gợi ý:</strong>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                            {exercise.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            <textarea
                style={styles.textarea}
                placeholder="Bắt đầu viết bài của bạn tại đây..."
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={isSubmitting}
            />

            {error && <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>❌ {error}</div>}

            <div style={styles.footer}>
                <button style={styles.backBtn} onClick={onBack} disabled={isSubmitting}>
                    ← Quay lại danh sách
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={styles.wordCount(wordCount, exercise.min_words, exercise.max_words)}>
                        {wordCount} / {exercise.max_words} words (Min: {exercise.min_words})
                    </div>

                    <button
                        style={styles.submitBtn(isSubmitting || wordCount === 0)}
                        onClick={handleSubmit}
                        disabled={isSubmitting || wordCount === 0}
                    >
                        {isSubmitting ? 'Đang chấm điểm AI...' : 'Nộp bài & Chấm điểm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
