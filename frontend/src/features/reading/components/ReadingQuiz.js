import React, { useState } from 'react';
import { readingService } from '../readingService';

export default function ReadingQuiz({ passage, darkMode, onBack, onSubmitSuccess, wordsLookedUp, readingTimeSeconds }) {
    const questions = passage.questions || [];
    const [answers, setAnswers] = useState({});
    const [currentQ, setCurrentQ] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#cbd5e1'
    } : {};

    const q = questions[currentQ];
    if (!q) return <div>Không có câu hỏi quiz cho bài đọc này.</div>;

    const handleAnswer = (answer) => {
        setAnswers(prev => ({ ...prev, [q.id]: answer }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const answerArray = Object.entries(answers).map(([id, answer]) => ({ id: parseInt(id), answer }));
            const submission = await readingService.submitQuiz(
                passage.id, answerArray, wordsLookedUp, readingTimeSeconds
            );
            onSubmitSuccess(submission);
        } catch (e) {
            alert('Lỗi nộp bài: ' + (e.response?.data?.error || e.message));
            setIsSubmitting(false);
        }
    };

    const answeredCount = Object.keys(answers).length;
    const progress = Math.round((answeredCount / questions.length) * 100);

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', ...themeVars }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={{
                    padding: '8px 16px', background: 'transparent', color: 'var(--text-primary, #333)',
                    border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '8px', cursor: 'pointer'
                }}>← Đọc lại bài</button>
                <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem' }}>
                    📝 Kiểm tra đọc hiểu ({questions.length} câu)
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '24px' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#7137ea', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>

            {/* Question card */}
            <div style={{
                padding: '24px', borderRadius: '12px', background: 'var(--card-bg, white)',
                border: '1px solid var(--border-color, #e2e8f0)', marginBottom: '20px'
            }}>
                <div style={{ fontSize: '0.85rem', color: '#7137ea', fontWeight: 'bold', marginBottom: '12px' }}>
                    Câu {currentQ + 1} / {questions.length}
                </div>

                <h3 style={{ color: 'var(--text-primary, #1e293b)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                    {q.type === 'true_false_ng' ? `"${q.statement}"` : q.question}
                </h3>

                {q.type === 'true_false_ng' && (
                    <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem', marginBottom: '12px' }}>
                        Chọn True (Đúng), False (Sai), hoặc Not Given (Không đề cập):
                    </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {q.type === 'multiple_choice' ? (
                        q.options.map((opt, i) => {
                            const letter = opt.charAt(0); // "A", "B", etc
                            const isSelected = answers[q.id] === letter;
                            return (
                                <button key={i} onClick={() => handleAnswer(letter)}
                                    style={{
                                        padding: '12px 16px', textAlign: 'left',
                                        background: isSelected ? '#7137ea' : 'var(--card-bg, #f8fafc)',
                                        color: isSelected ? 'white' : 'var(--text-primary, #1e293b)',
                                        border: `2px solid ${isSelected ? '#7137ea' : '#e2e8f0'}`,
                                        borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
                                        transition: 'all 0.2s'
                                    }}>{opt}</button>
                            );
                        })
                    ) : (
                        ['True', 'False', 'Not Given'].map(opt => {
                            const isSelected = answers[q.id] === opt;
                            return (
                                <button key={opt} onClick={() => handleAnswer(opt)}
                                    style={{
                                        padding: '12px 16px', textAlign: 'left',
                                        background: isSelected ? '#7137ea' : 'var(--card-bg, #f8fafc)',
                                        color: isSelected ? 'white' : 'var(--text-primary, #1e293b)',
                                        border: `2px solid ${isSelected ? '#7137ea' : '#e2e8f0'}`,
                                        borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
                                        transition: 'all 0.2s'
                                    }}>{opt === 'Not Given' ? 'Not Given (Không đề cập)' : opt === 'True' ? 'True (Đúng)' : 'False (Sai)'}</button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                    disabled={currentQ === 0}
                    style={{
                        padding: '10px 16px', borderRadius: '8px', cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                        background: 'transparent', border: '1px solid #cbd5e1', color: 'var(--text-primary, #333)',
                        opacity: currentQ === 0 ? 0.4 : 1
                    }}>← Câu trước</button>

                <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem' }}>
                    {answeredCount}/{questions.length} câu đã trả lời
                </span>

                {currentQ < questions.length - 1 ? (
                    <button onClick={() => setCurrentQ(currentQ + 1)}
                        style={{
                            padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
                            background: '#7137ea', color: 'white', border: 'none', fontWeight: 'bold'
                        }}>Câu tiếp →</button>
                ) : (
                    <button onClick={handleSubmit}
                        disabled={isSubmitting || answeredCount < questions.length}
                        style={{
                            padding: '10px 20px', borderRadius: '8px',
                            cursor: (isSubmitting || answeredCount < questions.length) ? 'not-allowed' : 'pointer',
                            background: (isSubmitting || answeredCount < questions.length) ? '#94a3b8' : '#10b981',
                            color: 'white', border: 'none', fontWeight: 'bold'
                        }}>{isSubmitting ? 'Đang chấm...' : `Nộp bài (${answeredCount}/${questions.length})`}</button>
                )}
            </div>
        </div>
    );
}
