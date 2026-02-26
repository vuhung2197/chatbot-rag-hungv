import React, { useState, useRef, useEffect } from 'react';
import { listeningService } from '../listeningService';

const styles = {
    container: {
        padding: '24px',
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '800px',
        margin: '0 auto'
    },
    header: { margin: 0, color: 'var(--text-primary, #1e293b)' },
    audioBox: {
        padding: '16px',
        backgroundColor: '#e7e5e4',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center'
    },
    textarea: {
        width: '100%',
        minHeight: '200px',
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
    },
    audioPlayer: { width: '100%', marginTop: '10px' }
};

export default function ListeningEditor({ exercise, darkMode, onBack, onSubmitSuccess }) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [audioBlobUrl, setAudioBlobUrl] = useState(null);
    const [audioLoading, setAudioLoading] = useState(false);
    const [audioError, setAudioError] = useState('');
    const audioRef = useRef(null);

    // Fetch audio with Authorization header, create blob URL
    useEffect(() => {
        if (!exercise) return;
        let cancelled = false;
        const loadAudio = async () => {
            setAudioLoading(true);
            setAudioError('');
            try {
                const url = listeningService.getAudioUrl(exercise.id);
                const token = localStorage.getItem('token');
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                if (!cancelled) {
                    const blobUrl = URL.createObjectURL(blob);
                    setAudioBlobUrl(blobUrl);
                }
            } catch (e) {
                console.error('Lỗi tải audio:', e);
                if (!cancelled) setAudioError('Không thể tải file âm thanh. Vui lòng thử lại.');
            }
            if (!cancelled) setAudioLoading(false);
        };
        loadAudio();
        return () => { cancelled = true; };
    }, [exercise]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
        };
    }, [audioBlobUrl]);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b',
        '--border-color': '#334155',
        '--input-bg': '#0f172a',
        '--text-primary': '#f8fafc',
        '--text-secondary': '#cbd5e1'
    } : {};

    const handleSubmit = async () => {
        if (!content.trim()) {
            setError('Bạn cần nhập nội dung vào khung trống để nộp!');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const submission = await listeningService.submitDictation(exercise.id, content);
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
                    {exercise.level} • Dictation
                </span>
            </div>

            <div style={styles.audioBox}>
                <h3 style={{ margin: 0, color: '#1e293b' }}>🎧 Nghe và chép lại (Dictation)</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                    Bấm Play để nghe. Có thể nghe lại nhiều lần.
                </p>
                {audioLoading ? (
                    <div style={{ padding: '20px', color: '#7137ea', fontWeight: 'bold' }}>⏳ Đang tạo file âm thanh từ AI... (có thể mất 3-5 giây)</div>
                ) : audioError ? (
                    <div style={{ padding: '20px', color: '#ef4444' }}>❌ {audioError}</div>
                ) : audioBlobUrl ? (
                    <audio controls ref={audioRef} style={styles.audioPlayer} src={audioBlobUrl}>
                        Trình duyệt của bạn không hỗ trợ file âm thanh này.
                    </audio>
                ) : (
                    <div style={{ padding: '20px', color: '#ef4444' }}>Không tìm thấy link âm thanh</div>
                )}
            </div>

            <textarea
                style={styles.textarea}
                placeholder="Gõ chính xác những gì bạn nghe được vào đây..."
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={isSubmitting}
            />

            {error && <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>❌ {error}</div>}

            <div style={styles.footer}>
                <button style={styles.backBtn} onClick={onBack} disabled={isSubmitting}>
                    ← Quay lại
                </button>

                <button
                    style={styles.submitBtn(isSubmitting || !content.trim())}
                    onClick={handleSubmit}
                    disabled={isSubmitting || !content.trim()}
                >
                    {isSubmitting ? 'Đang chấm với AI...' : 'Nộp bài điền từ'}
                </button>
            </div>
        </div>
    );
}
