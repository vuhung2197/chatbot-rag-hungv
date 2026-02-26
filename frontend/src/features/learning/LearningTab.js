import React, { useState } from 'react';
import { learningService } from './learningService';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CATEGORIES = [
    { id: 'grammar', name: '📖 Ngữ Pháp' },
    { id: 'pattern', name: '💬 Mẫu Câu Giao Tiếp' },
    { id: 'pronunciation', name: '🗣️ Phát Âm' }
];

export default function LearningTab({ darkMode }) {
    const [view, setView] = useState('dashboard'); // dashboard, loading, lesson, quiz, result
    const [category, setCategory] = useState('grammar');
    const [level, setLevel] = useState('B1');
    const [lessonData, setLessonData] = useState(null);
    const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState([]);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#cbd5e1'
    } : {
        '--card-bg': '#ffffff', '--border-color': '#e2e8f0',
        '--text-primary': '#1e293b', '--text-secondary': '#64748b'
    };

    const containerStyle = {
        maxWidth: '800px', margin: '0 auto', padding: '24px',
        backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: '16px', color: 'var(--text-primary)', ...themeVars
    };

    const startLesson = async () => {
        setView('loading');
        try {
            const data = await learningService.getLesson(category, level);
            setLessonData(data.lesson);
            setView('lesson');
        } catch (error) {
            console.error(error);
            alert("Lỗi khi AI soạn bài. Có thể máy chủ đang quá tải, vui lòng thử lại.");
            setView('dashboard');
        }
    };

    const handleQuizSelect = (selectedIdx, correctIdx) => {
        const isCorrect = selectedIdx === correctIdx;
        if (isCorrect) setScore(prev => prev + 1);

        setQuizAnswers(prev => [...prev, {
            isCorrect,
            selectedIdx
        }]);

        // Move to next after a short delay
        setTimeout(() => {
            if (currentQuizIdx < lessonData.quiz.length - 1) {
                setCurrentQuizIdx(prev => prev + 1);
            } else {
                finishLesson(isCorrect ? score + 1 : score);
            }
        }, 2000);
    };

    const finishLesson = async (finalScore) => {
        setView('result');
        const maxScore = lessonData.quiz.length;
        const scorePercent = Math.round((finalScore / maxScore) * 100);

        try {
            await learningService.submitLessonQuiz({
                category,
                level,
                title: lessonData.title,
                score: scorePercent,
                flashcard_item: lessonData.flashcard_item
            });
        } catch (e) {
            console.error("Lỗi khi lưu kết quả", e);
        }
    };

    const reset = () => {
        setLessonData(null);
        setCurrentQuizIdx(0);
        setScore(0);
        setQuizAnswers([]);
        setView('dashboard');
    };

    return (
        <div style={containerStyle}>
            {view === 'dashboard' && (
                <>
                    <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>🎓 Lớp Học Mini AI</h2>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        AI sẽ soạn riêng cho bạn một bài giảng dài 3 phút kèm trắc nghiệm và thẻ nhớ flashcard.
                    </p>

                    <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Chủ đề muốn học:</label>
                            <select value={category} onChange={e => setCategory(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: darkMode ? '#0f172a' : 'white', color: 'var(--text-primary)' }}>
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Độ khó (Level):</label>
                            <select value={level} onChange={e => setLevel(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: darkMode ? '#0f172a' : 'white', color: 'var(--text-primary)' }}>
                                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={startLesson} style={{ width: '100%', padding: '16px', background: '#ec4899', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        ✨ Xin AI Giáo Trình Nhỏ
                    </button>
                    <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>Lưu ý: Bạn học xong sẽ được đưa thẳng vào Sổ Tay Kiến Thức để luyện tập lâu dài.</p>
                </>
            )}

            {view === 'loading' && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: '4rem', animation: 'spin 2s linear infinite' }}>⚙️</div>
                    <h3 style={{ marginTop: '20px', color: '#7137ea' }}>Gia sư AI đang soạn giáo án riêng...</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Đang tìm lọc chắt kiến thức trọng tâm mức độ {level}...</p>
                </div>
            )}

            {view === 'lesson' && lessonData && (
                <div>
                    <h2 style={{ color: '#10b981', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                        {lessonData.title}
                    </h2>

                    <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                        <h4 style={{ color: '#7137ea', marginBottom: '8px', fontSize: '1.2rem' }}>📖 Lý thuyết cô đọng</h4>
                        <p style={{ lineHeight: '1.6', fontSize: '1.05rem' }}>{lessonData.theory}</p>
                    </div>

                    <h4 style={{ color: '#ec4899', marginBottom: '16px', fontSize: '1.2rem' }}>💡 Ví dụ thực tiễn</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                        {lessonData.examples.map((ex, i) => (
                            <div key={i} style={{ padding: '16px', borderLeft: '4px solid #ec4899', background: darkMode ? '#1e293b' : 'white', border: '1px solid var(--border-color)', borderRadius: '0 8px 8px 0' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px' }}>{ex.en}</div>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{ex.vi}</div>
                                <div style={{ fontSize: '0.9rem', color: '#10b981', fontStyle: 'italic' }}>Chi tiết: {ex.explain}</div>
                            </div>
                        ))}
                    </div>

                    <button onClick={() => setView('quiz')} style={{ width: '100%', padding: '16px', background: '#7137ea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }}>
                        ✅ Đã hiểu, Kiểm tra tôi đi!
                    </button>
                </div>
            )}

            {view === 'quiz' && lessonData && (
                <div>
                    <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Bài tập trắc nghiệm ({currentQuizIdx + 1}/{lessonData.quiz.length})</h3>
                    <div style={{ width: '100%', background: '#e2e8f0', height: '8px', borderRadius: '4px', marginBottom: '24px' }}>
                        <div style={{ width: `${((currentQuizIdx) / lessonData.quiz.length) * 100}%`, background: '#10b981', height: '100%', borderRadius: '4px', transition: 'width 0.3s' }}></div>
                    </div>

                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '24px' }}>
                        {lessonData.quiz[currentQuizIdx].question}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {lessonData.quiz[currentQuizIdx].options.map((opt, idx) => {
                            const hasAnswered = quizAnswers.length > currentQuizIdx;
                            let bgColor = darkMode ? '#0f172a' : 'white';
                            let borderColor = 'var(--border-color)';

                            if (hasAnswered) {
                                const correctIdx = lessonData.quiz[currentQuizIdx].correct_index;
                                if (idx === correctIdx) {
                                    bgColor = '#d1fae5'; borderColor = '#10b981'; // Green Correct
                                } else if (idx === quizAnswers[currentQuizIdx]?.selectedIdx) {
                                    bgColor = '#fee2e2'; borderColor = '#ef4444'; // Red Wrong
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    disabled={hasAnswered}
                                    onClick={() => handleQuizSelect(idx, lessonData.quiz[currentQuizIdx].correct_index)}
                                    style={{
                                        padding: '16px', textAlign: 'left', background: bgColor, color: hasAnswered && bgColor !== (darkMode ? '#0f172a' : 'white') ? '#1e293b' : 'var(--text-primary)',
                                        border: `2px solid ${borderColor}`, borderRadius: '8px', fontSize: '1.1rem', cursor: hasAnswered ? 'default' : 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {String.fromCharCode(65 + idx)}. {opt}
                                </button>
                            );
                        })}
                    </div>

                    {
                        quizAnswers.length > currentQuizIdx && (
                            <div style={{ marginTop: '24px', padding: '16px', background: quizAnswers[currentQuizIdx].isCorrect ? '#ecfdf5' : '#fef2f2', borderLeft: `4px solid ${quizAnswers[currentQuizIdx].isCorrect ? '#10b981' : '#ef4444'}`, color: '#1e293b' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                    {quizAnswers[currentQuizIdx].isCorrect ? 'Tuyệt vời, chính xác!' : 'Rất tiếc!'}
                                </div>
                                <div>{lessonData.quiz[currentQuizIdx].explanation}</div>
                            </div>
                        )}
                </div>
            )}

            {view === 'result' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '16px' }}>{score >= lessonData.quiz.length / 2 ? '🎉' : '💪'}</div>
                    <h2 style={{ color: score >= lessonData.quiz.length / 2 ? '#10b981' : '#f59e0b', marginBottom: '8px' }}>
                        Bạn làm đúng {score}/{lessonData.quiz.length} câu!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        Kiến thức lõi từ bài học này đã được gia sư AI tự động chép vào bảng tin "Sổ tay Từ Vựng & Kiến Thức" của bạn.
                        Sau này game Phản Xạ sẽ đem nó ra hỏi lại đấy nhé!
                    </p>

                    <button onClick={reset} style={{ padding: '16px 32px', background: '#7137ea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
                        Tiếp tục học bài khác ➔
                    </button>
                </div>
            )}
        </div>
    );
}
