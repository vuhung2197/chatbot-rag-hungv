import React from 'react';

export default function ReadingResult({ submission, darkMode, wordsLookedUp, onBack, onReadAnother }) {
    if (!submission) return null;

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#cbd5e1'
    } : {};

    const fb = submission.feedback || {};
    const results = fb.results || [];
    const score = submission.score_total ?? 0;
    const correct = fb.correct || 0;
    const total = fb.total || results.length;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', ...themeVars, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary, #1e293b)' }}>🎉 Kết quả đọc hiểu (Level: {submission.level || 'Unknown'})</h2>

            {/* Score */}
            <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(113, 55, 234, 0.1)', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary, #1e293b)' }}>Điểm Quiz</h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {score}%
                </div>
                <div style={{ color: 'var(--text-secondary, #64748b)', marginTop: '8px' }}>
                    {correct}/{total} câu đúng
                    {submission.reading_time_seconds > 0 && ` • ⏱️ Thời gian đọc: ${Math.floor(submission.reading_time_seconds / 60)} phút ${submission.reading_time_seconds % 60} giây`}
                </div>
            </div>

            {/* Question results */}
            <div>
                <h3 style={{ color: 'var(--text-primary, #1e293b)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    Giải thích từng câu
                </h3>
                {results.map((r, i) => (
                    <div key={i} style={{
                        padding: '12px', marginBottom: '12px', borderRadius: '8px',
                        borderLeft: `4px solid ${r.isCorrect ? '#10b981' : '#ef4444'}`,
                        background: r.isCorrect ? (darkMode ? '#064e3b20' : '#f0fdf4') : (darkMode ? '#7f1d1d20' : '#fef2f2')
                    }}>
                        <div style={{ fontWeight: 'bold', color: r.isCorrect ? '#10b981' : '#ef4444', marginBottom: '4px' }}>
                            {r.isCorrect ? '✅' : '❌'} Câu {i + 1}: {r.question}
                        </div>
                        {!r.isCorrect && (
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', marginBottom: '4px' }}>
                                Bạn chọn: <strong>{r.userAnswer}</strong> • Đáp án đúng: <strong style={{ color: '#10b981' }}>{r.correctAnswer}</strong>
                            </div>
                        )}
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)' }}>
                            💡 {r.explanation}
                        </div>
                    </div>
                ))}
            </div>

            {/* Words looked up */}
            {wordsLookedUp && wordsLookedUp.length > 0 && (
                <div>
                    <h3 style={{ color: 'var(--text-primary, #1e293b)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                        📚 Từ vựng đã tra ({wordsLookedUp.length} từ — đã lưu vào Sổ SRS)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {wordsLookedUp.map((w, i) => (
                            <div key={i} style={{
                                padding: '12px', border: '1px solid var(--border-color, #cbd5e1)',
                                borderRadius: '8px', background: 'var(--card-bg, #f8fafc)'
                            }}>
                                <div style={{ color: '#7137ea', fontWeight: 'bold', fontSize: '1.1rem' }}>{w.word}</div>
                                <div style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)' }}>
                                    {w.definition}
                                </div>
                                <div style={{ color: '#10b981', fontWeight: '500' }}>🇻🇳 {w.translation}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <button onClick={onBack} style={{
                    padding: '10px 16px', background: 'transparent', color: '#7137ea',
                    border: '2px solid #7137ea', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                }}>← Về danh sách</button>
                <button onClick={onReadAnother} style={{
                    padding: '10px 16px', background: '#7137ea', color: 'white',
                    border: '2px solid #7137ea', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                }}>📖 Đọc bài khác</button>
            </div>
        </div>
    );
}
