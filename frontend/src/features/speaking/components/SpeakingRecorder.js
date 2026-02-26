import React, { useState, useRef, useEffect } from 'react';
import { speakingService } from '../speakingService';

export default function SpeakingRecorder({ topic, darkMode, onBack, onSubmitSuccess }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [referenceAudioUrl, setReferenceAudioUrl] = useState(null);
    const [isPlayingRef, setIsPlayingRef] = useState(false);

    const mediaRecorderRef = useRef(null);
    const timerRef = useRef(null);
    const chunksRef = useRef([]);
    const refAudioElement = useRef(null);

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#cbd5e1'
    } : {
        '--card-bg': '#ffffff', '--border-color': '#e2e8f0',
        '--text-primary': '#1e293b', '--text-secondary': '#64748b'
    };

    useEffect(() => {
        // Load reference audio (AI voice reading the prompt)
        const loadReferenceAudio = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(speakingService.getTopicAudioUrl(topic.id), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const blob = await response.blob();
                    setReferenceAudioUrl(URL.createObjectURL(blob));
                }
            } catch (error) {
                console.error('Lỗi tải reference audio:', error);
            }
        };
        loadReferenceAudio();

        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (referenceAudioUrl) URL.revokeObjectURL(referenceAudioUrl);
            clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [topic.id]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current.mimeType });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                chunksRef.current = [];
                // Stop microphone tracks
                stream.getTracks().forEach(track => track.stop());
            };

            chunksRef.current = [];
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 119) { stopRecording(); return 120; }
                    return prev + 1;
                });
            }, 1000);

        } catch (err) {
            alert('Không thể truy cập Microphone: ' + err.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        clearInterval(timerRef.current);
    };

    const deleteRecording = () => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    const submitAudio = async () => {
        if (!audioBlob) return;
        setIsSubmitting(true);
        try {
            const result = await speakingService.submitAudio(topic.id, audioBlob);
            onSubmitSuccess(result);
        } catch (error) {
            alert('Lỗi nộp bài: ' + (error.response?.data?.error || error.message));
        }
        setIsSubmitting(false);
    };

    const toggleReferenceAudio = () => {
        if (!refAudioElement.current) return;
        if (isPlayingRef) {
            refAudioElement.current.pause();
            refAudioElement.current.currentTime = 0;
            setIsPlayingRef(false);
        } else {
            refAudioElement.current.play();
            setIsPlayingRef(true);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', ...themeVars }}>
            <button onClick={onBack} style={{
                padding: '8px 16px', background: 'transparent', color: 'var(--text-primary)',
                border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px'
            }}>← Chọn bài khác</button>

            <div style={{
                padding: '30px', background: 'var(--card-bg)', borderRadius: '16px',
                border: '1px solid var(--border-color)', textAlign: 'center'
            }}>
                <div style={{ color: '#ec4899', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase' }}>
                    {topic.type === 'shadowing' ? 'Luyện Đọc (Shadowing)' : 'Phản Xạ (Topic Speaking)'}
                    {' '}• Level {topic.level}
                </div>

                <h2 style={{ color: 'var(--text-primary)', margin: '0 0 24px 0', fontSize: '1.8rem', lineHeight: '1.4' }}>
                    {topic.type === 'shadowing' ? `"${topic.prompt_text}"` : topic.prompt_text}
                </h2>

                {/* Reference Audio Player */}
                {referenceAudioUrl && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                        <audio ref={refAudioElement} src={referenceAudioUrl} onEnded={() => setIsPlayingRef(false)} />
                        <button onClick={toggleReferenceAudio} style={{
                            padding: '12px 24px', background: '#fce7f3', color: '#be185d',
                            border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            {isPlayingRef ? '⏹️ Dừng nghe' : '🔊 Nghe người bản xứ đọc mẫu'}
                        </button>
                    </div>
                )}

                {/* Recorder Status */}
                {!audioUrl ? (
                    <div style={{ margin: '40px 0' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: isRecording ? '#ef4444' : 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {formatTime(recordingTime)} / 02:00
                        </div>
                        {isRecording && <div style={{ color: '#ef4444', animation: 'pulse 1.5s infinite', margin: '10px 0' }}>🔴 Đang Ghi Âm... (Nói vào micro)</div>}

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
                            {!isRecording ? (
                                <button onClick={startRecording} style={{
                                    width: '80px', height: '80px', borderRadius: '50%', background: '#ef4444', color: 'white',
                                    border: 'none', cursor: 'pointer', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                                }}>🎙️</button>
                            ) : (
                                <button onClick={stopRecording} style={{
                                    width: '80px', height: '80px', borderRadius: '50%', background: '#1e293b', color: 'white',
                                    border: 'none', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>⏹️</button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ margin: '30px 0', padding: '20px', background: 'rgba(236, 72, 153, 0.05)', borderRadius: '12px' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Phần ghi âm của bạn</h3>
                        <audio src={audioUrl} controls style={{ width: '100%', marginBottom: '20px' }} />

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                            <button onClick={deleteRecording} disabled={isSubmitting} style={{
                                padding: '12px 24px', background: 'transparent', color: '#ef4444',
                                border: '2px solid #ef4444', borderRadius: '8px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.5 : 1
                            }}>🗑️ Thu âm lại</button>

                            <button onClick={submitAudio} disabled={isSubmitting} style={{
                                padding: '12px 32px', background: '#ec4899', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.5 : 1, fontSize: '1.1rem'
                            }}>
                                {isSubmitting ? '⏳ Đang gửi cho AI phân tích...' : '✨ Nộp & Nhận Điểm AI'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
