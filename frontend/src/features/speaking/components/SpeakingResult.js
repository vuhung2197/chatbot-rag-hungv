import React from 'react';

export default function SpeakingResult({ submission, topic, darkMode, onBack }) {
    if (!submission) return null;

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#cbd5e1'
    } : {};

    const fb = submission.feedback || {};
    const score = submission.score_total ?? 0;
    const isTopic = topic.type === 'topic';

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', ...themeVars, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} style={{
                    padding: '8px 16px', background: 'transparent', color: 'var(--text-primary, #333)',
                    border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '8px', cursor: 'pointer'
                }}>← Về danh sách</button>
                <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem' }}>
                    ✅ Đánh giá bởi <span style={{ fontWeight: 'bold', color: '#ec4899' }}>AI Examiner</span>
                </div>
            </div>

            <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(236, 72, 153, 0.08)', borderRadius: '16px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary, #1e293b)' }}>
                    Điểm Phát Âm & Ngữ Pháp
                </h3>
                <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {score}%
                </div>
            </div>

            {/* Whisper/Azure Transcript */}
            <div style={{
                padding: '20px', borderRadius: '12px', background: 'var(--card-bg, white)',
                border: '1px solid var(--border-color, #e2e8f0)'
            }}>
                <h3 style={{ color: '#ec4899', margin: '0 0 12px 0', fontSize: '1.1rem' }}>🎙️ AI bóc băng giọng của bạn:</h3>

                {fb.raw_words_detail && fb.raw_words_detail.length > 0 ? (
                    <div style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '16px' }}>
                        {fb.raw_words_detail.map((w, idx) => {
                            let color = '#10b981'; // Green for good (>80)
                            if (w.AccuracyScore < 60) color = '#ef4444'; // Red for bad
                            else if (w.AccuracyScore < 80) color = '#f59e0b'; // Yellow for okay

                            // Add Title for tooltip showing exact score
                            return (
                                <span
                                    key={idx}
                                    title={`Độ chính xác: ${w.AccuracyScore}%`}
                                    style={{
                                        color: color,
                                        marginRight: '6px',
                                        fontWeight: w.AccuracyScore < 80 ? 'bold' : 'normal',
                                        borderBottom: w.AccuracyScore < 60 ? `2px solid ${color}` : 'none',
                                        cursor: 'help'
                                    }}
                                >
                                    {w.Word}
                                </span>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--text-primary, #1e293b)', lineHeight: '1.6', marginBottom: '16px' }}>
                        "{submission.transcript}"
                    </div>
                )}

                {fb.scores_detail && (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                        <div>🎯 Accuracy: <strong>{fb.scores_detail.accuracy}%</strong></div>
                        <div>🌊 Fluency: <strong>{fb.scores_detail.fluency}%</strong></div>
                        <div>✅ Completeness: <strong>{fb.scores_detail.completeness}%</strong></div>
                    </div>
                )}

                {submission.transcript === '' && (!fb.raw_words_detail || fb.raw_words_detail.length === 0) && (
                    <div style={{ color: '#ef4444' }}>⚠️ AI không nghe được chữ nào! Hãy chắc chắn micro của bạn hoạt động và bạn đọc to rõ ràng.</div>
                )}
            </div>

            {/* Shadowing Details */}
            {!isTopic && fb.mistakes && fb.mistakes.length > 0 && (
                <div style={{
                    padding: '20px', borderRadius: '12px', background: 'var(--card-bg, white)',
                    border: '1px solid #fecdd3'
                }}>
                    <h3 style={{ color: '#e11d48', margin: '0 0 16px 0', fontSize: '1.1rem' }}>❌ Các từ bạn phát âm sai hoặc thiếu:</h3>
                    <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                        {fb.mistakes.map((m, i) => (
                            <li key={i} style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{m.heard || 'Bỏ sót'}</span>
                                    <span>➡️</span>
                                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>{m.expected}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', marginTop: '4px' }}>💡 {m.tip}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Topic Details: Errors */}
            {isTopic && fb.errors && fb.errors.length > 0 && (
                <div style={{
                    padding: '20px', borderRadius: '12px', background: 'var(--card-bg, white)',
                    border: '1px solid #fecdd3'
                }}>
                    <h3 style={{ color: '#e11d48', margin: '0 0 16px 0', fontSize: '1.1rem' }}>❌ Lỗi ngữ pháp / Diễn đạt:</h3>
                    <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                        {fb.errors.map((e, i) => (
                            <li key={i} style={{ marginBottom: '12px' }}>
                                <div><span style={{ color: '#ef4444' }}>Bạn nói:</span> {e.mistake}</div>
                                <div><span style={{ color: '#10b981' }}>Cách đúng:</span> {e.correction}</div>
                                {e.explanation && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)' }}>💡 {e.explanation}</div>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Topic Details: Improvements */}
            {isTopic && fb.improvements && fb.improvements.length > 0 && (
                <div style={{
                    padding: '20px', borderRadius: '12px', background: 'var(--card-bg, white)',
                    border: '1px solid #bfdbfe'
                }}>
                    <h3 style={{ color: '#2563eb', margin: '0 0 16px 0', fontSize: '1.1rem' }}>📈 Gợi ý nâng cao band điểm:</h3>
                    <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                        {fb.improvements.map((imp, i) => <li key={i} style={{ marginBottom: '8px' }}>{imp}</li>)}
                    </ul>
                </div>
            )}

            {/* Vocabulary */}
            {submission.new_words && submission.new_words.length > 0 && (
                <div style={{
                    padding: '20px', borderRadius: '12px', background: 'var(--card-bg, white)',
                    border: '1px solid #bbf7d0'
                }}>
                    <h3 style={{ color: '#16a34a', margin: '0 0 16px 0', fontSize: '1.1rem' }}>📚 Từ vựng "ăn điểm" có thể thay thế (Đã tự động lưu SRS tủ):</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {submission.new_words.map((w, i) => (
                            <div key={i} style={{ padding: '12px', background: 'rgba(22, 163, 74, 0.05)', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '1.1rem' }}>{w.word}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary, #1e293b)' }}>{w.definition}</div>
                                <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: '500' }}>{w.translation}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Comment */}
            {fb.overall_comment && (
                <div style={{
                    padding: '20px', borderRadius: '12px', background: '#f8fafc',
                    color: '#0f172a', fontWeight: '500', textAlign: 'center'
                }}>
                    "{fb.overall_comment}"
                </div>
            )}
        </div>
    );
}
