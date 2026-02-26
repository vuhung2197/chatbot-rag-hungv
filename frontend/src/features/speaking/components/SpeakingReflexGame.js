import React, { useState, useEffect, useRef } from 'react';
import { speakingService } from '../speakingService';

const styles = {
    container: {
        maxWidth: '800px', margin: '0 auto', padding: '24px',
        backgroundColor: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center'
    },
    timerCircle: {
        width: '60px', height: '60px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', fontWeight: 'bold', color: 'white',
        backgroundColor: '#f59e0b', marginBottom: '20px', transition: 'background-color 0.3s'
    },
    questionText: {
        fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)',
        textAlign: 'center', marginBottom: '40px', lineHeight: '1.4'
    },
    micButton: (isRecording) => ({
        width: '100px', height: '100px', borderRadius: '50%',
        backgroundColor: isRecording ? '#ef4444' : '#7137ea',
        color: 'white', border: 'none', cursor: 'pointer',
        fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 4px 6px -1px rgba(0,0,0,0.1)',
        transition: 'all 0.2s', animation: isRecording ? 'pulse 1.5s infinite' : 'none'
    }),
    resultBox: (isCorrect) => ({
        marginTop: '20px', width: '100%', padding: '20px', borderRadius: '12px',
        backgroundColor: isCorrect ? '#ecfdf5' : '#fef2f2',
        border: `2px solid ${isCorrect ? '#10b981' : '#ef4444'}`,
        color: '#1e293b'
    })
};

export default function SpeakingReflexGame({ topics, darkMode, onExit }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(10);
    const [gameState, setGameState] = useState('ready'); // ready, recording, grading, result, summary
    const [result, setResult] = useState(null);
    const [isRecording, setIsRecording] = useState(false);

    // Media Recorder stats
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155', '--text-primary': '#f8fafc'
    } : {};

    useEffect(() => {
        let timer;
        if (gameState === 'recording' && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (gameState === 'recording' && timeLeft === 0) {
            stopRecordingAndSubmit();
        }
        return () => clearTimeout(timer);
    }, [timeLeft, gameState]);

    const startGame = async () => {
        if (!topics || topics.length === 0) return;
        setGameState('recording');
        setTimeLeft(10);
        await startRecording();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = processAudioSubmission;
            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access denied", err);
            alert("Vui lòng cấp quyền Microphone để luyện phản xạ!");
        }
    };

    const stopRecordingAndSubmit = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setGameState('grading');
        }
    };

    const processAudioSubmission = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const currentTopic = topics[currentIndex];

        try {
            const res = await speakingService.submitAudio(currentTopic.id, audioBlob, 'webm');
            setResult(res.feedback);
            setGameState('result');
        } catch (e) {
            console.error('Submission failed', e);
            setResult({ error: e.message || "Lỗi chấm điểm" });
            setGameState('result');
        }
    };

    const nextQuestion = () => {
        if (currentIndex < topics.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setResult(null);
            setTimeLeft(10);
            setGameState('ready');
        } else {
            setGameState('summary');
        }
    };

    if (gameState === 'summary') {
        return (
            <div style={{ ...styles.container, ...themeVars, textAlign: 'center' }}>
                <h1 style={{ fontSize: '4rem' }}>🏆</h1>
                <h2 style={{ color: '#10b981' }}>Hoàn thành lượt chơi!</h2>
                <p style={{ color: 'var(--text-primary)' }}>Brain của bạn đã được rèn luyện dịch realtime thành công.</p>
                <div style={{ marginTop: '30px', display: 'flex', gap: '16px' }}>
                    <button onClick={onExit} style={{ padding: '12px 24px', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Trở về
                    </button>
                    <button onClick={() => { setCurrentIndex(0); setGameState('ready'); }} style={{ padding: '12px 24px', background: '#7137ea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Chơi lại
                    </button>
                </div>
            </div>
        );
    }

    const currentTopic = topics[currentIndex];

    return (
        <div style={{ ...styles.container, ...themeVars }}>
            {/* Header info */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: 'var(--text-primary)' }}>
                <div style={{ fontWeight: 'bold', color: '#7137ea' }}>Câu {currentIndex + 1} / {topics.length}</div>
                <button onClick={onExit} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>
                    ✖ Thoát
                </button>
            </div>

            {/* Timer */}
            {(gameState === 'recording' || gameState === 'grading') && (
                <div style={{ ...styles.timerCircle, backgroundColor: gameState === 'grading' ? '#cbd5e1' : timeLeft <= 3 ? '#ef4444' : '#f59e0b' }}>
                    {gameState === 'grading' ? '...' : timeLeft}
                </div>
            )}

            {/* Question */}
            <div style={styles.questionText}>
                {gameState === 'ready' ? "Nhấn Bắt Đầu Câu Hỏi" : currentTopic.prompt_text}
            </div>

            {/* Interaction Area */}
            {gameState === 'ready' && (
                <button onClick={startGame} style={styles.micButton(false)}>
                    ▶️
                </button>
            )}

            {gameState === 'recording' && (
                <>
                    <button onClick={stopRecordingAndSubmit} style={styles.micButton(true)}>
                        🎙️
                    </button>
                    <p style={{ marginTop: '16px', color: 'var(--text-primary)' }}>Đang thu âm... Bấm để nộp sớm!</p>
                </>
            )}

            {gameState === 'grading' && (
                <div style={{ textAlign: 'center', color: 'var(--text-primary)' }}>
                    <div style={{ fontSize: '3rem', animation: 'pulse 1s infinite' }}>🤖</div>
                    <p>AI đang chấm dịch thuật của bạn...</p>
                </div>
            )}

            {gameState === 'result' && result && (
                <div style={styles.resultBox(result.score >= 50)}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.score >= 50 ? '#10b981' : '#ef4444', marginBottom: '12px' }}>
                        {result.score >= 50 ? '✅ Tuyệt Vời!' : '❌ Chưa Chuẩn Tiếng Anh Rồi!'}
                        <span style={{ float: 'right' }}>Score: {result.score || 0}/100</span>
                    </div>

                    {result.expected_translation && (
                        <div style={{ marginBottom: '12px' }}>
                            <strong style={{ display: 'block', color: '#64748b', fontSize: '0.9rem' }}>Câu Dịch Mẫu:</strong>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{result.expected_translation}</div>
                        </div>
                    )}

                    {result.errors && result.errors.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <strong style={{ display: 'block', color: '#64748b', fontSize: '0.9rem' }}>Lỗi Ngữ Pháp/Dịch Bị Bắt Bài:</strong>
                            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                                {result.errors.map((err, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>{err.mistake}</span>
                                        {" ➔ "}
                                        <strong style={{ color: '#10b981' }}>{err.correction}</strong>
                                        <br /><i style={{ fontSize: '0.85rem', color: '#64748b' }}>Lý do: {err.explanation}</i>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div style={{ fontStyle: 'italic', marginTop: '16px', color: '#334155' }}>"{result.overall_comment}"</div>

                    <button onClick={nextQuestion} style={{ display: 'block', width: '100%', padding: '16px', marginTop: '20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        Câu Tiếp Theo ➔
                    </button>
                </div>
            )}
        </div>
    );
}
