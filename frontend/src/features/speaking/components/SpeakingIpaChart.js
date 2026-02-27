import React, { useState, useEffect } from 'react';
import { speakingService } from '../speakingService';
import SpeakingRecorder from './SpeakingRecorder';

const SpeakingIpaChart = ({ darkMode, onPlayTopic }) => {
    const [phonemes, setPhonemes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPhoneme, setSelectedPhoneme] = useState(null);

    const themeVars = darkMode ? {
        '--bg-primary': '#0f172a',
        '--bg-secondary': '#1e293b',
        '--text-primary': '#f8fafc',
        '--text-secondary': '#94a3b8',
        '--border-color': '#334155',
        '--accent-color': '#3b82f6',
        '--hover-bg': '#334155'
    } : {
        '--bg-primary': '#f8fafc',
        '--bg-secondary': '#ffffff',
        '--text-primary': '#0f172a',
        '--text-secondary': '#64748b',
        '--border-color': '#e2e8f0',
        '--accent-color': '#2563eb',
        '--hover-bg': '#f1f5f9'
    };

    useEffect(() => {
        const fetchIpa = async () => {
            try {
                const data = await speakingService.getIpaPhonemes();
                if (data && data.length > 0) {
                    setPhonemes(data);
                }
            } catch (err) {
                console.error("Failed to fetch IPA phonemes", err);
            }
            setIsLoading(false);
        };
        fetchIpa();
    }, []);

    const vowels = phonemes.filter(p => p.category === 'vowel');
    const consonants = phonemes.filter(p => p.category === 'consonant');
    const diphthongs = phonemes.filter(p => p.category === 'diphthong');

    const renderPhonemeCard = (phoneme) => {
        const isSelected = selectedPhoneme?.id === phoneme.id;
        return (
            <div
                key={phoneme.id}
                onClick={() => setSelectedPhoneme(phoneme)}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 8px',
                    backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                    border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '100px',
                    boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseOut={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
            >
                {/* Voice Indicator Dot */}
                <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: phoneme.is_voiced ? '#10b981' : '#cbd5e1',
                    title: phoneme.is_voiced ? 'Hữu thanh (Voiced)' : 'Vô thanh (Unvoiced)'
                }}></div>

                <span style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: '"Times New Roman", Times, serif', marginBottom: '8px' }}>
                    /{phoneme.symbol}/
                </span>
                <span style={{ fontSize: '0.8rem', color: isSelected ? '#e2e8f0' : 'var(--text-secondary)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {phoneme.example_words?.split(',')[0]}
                </span>
            </div>
        );
    };

    if (isLoading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Đang tải bảng IPA...</div>;

    if (phonemes.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Chưa có dữ liệu bảng IPA. Hãy cấu hình database.</div>;

    return (
        <div style={{ ...themeVars, width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Top Section: Phoneme Details & Action */}
            {selectedPhoneme ? (
                <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{
                                fontSize: '4rem',
                                fontWeight: 'bold',
                                fontFamily: '"Times New Roman", Times, serif',
                                color: 'var(--accent-color)',
                                background: 'var(--bg-primary)',
                                padding: '10px 24px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)'
                            }}>
                                /{selectedPhoneme.symbol}/
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                                    Âm {selectedPhoneme.category === 'vowel' ? 'Nguyên Âm' : selectedPhoneme.category === 'consonant' ? 'Phụ Âm' : 'Nguyên Âm Đôi'}
                                    {selectedPhoneme.is_voiced ? ' Hữu Thanh (Rung cổ họng)' : ' Vô Thanh (Chỉ có hơi)'}
                                </h3>
                                <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Ví dụ:</strong> {selectedPhoneme.example_words}
                                </p>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Khẩu hình:</strong> {selectedPhoneme.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                        <button
                            onClick={() => {
                                // Fallback mock TTS audio since we don't have real media files yet
                                const utterance = new SpeechSynthesisUtterance(selectedPhoneme.example_words);
                                utterance.lang = 'en-US';
                                window.speechSynthesis.speak(utterance);
                            }}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                flex: 1,
                                fontSize: '1.1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            🔊 Nghe Ví Dụ
                        </button>

                        <button
                            onClick={() => onPlayTopic({
                                id: `ipa-${selectedPhoneme.id}`,
                                type: 'pronunciation',
                                level: 'A1',
                                prompt_text: selectedPhoneme.example_words
                            })}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#ec4899', // Pink alert color
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                flex: 2,
                                fontSize: '1.1rem',
                                boxShadow: '0 4px 6px -1px rgba(236, 72, 153, 0.4)'
                            }}
                        >
                            🎙️ Rèn Luyện Âm Này (Thu Âm)
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px dashed var(--border-color)',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                }}>
                    👆 Bấm vào một âm vị bất kỳ trên bảng để xem chi tiết cách phát âm và luyện tập.
                </div>
            )}

            {/* Bottom Section: The Chart */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)'
            }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📖 Bảng Ký Hiệu Ngữ Âm Quốc Tế (IPA)
                    <span style={{ fontSize: '0.8rem', fontWeight: 'normal', backgroundColor: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '4px' }}>
                        🟢 Chấm xanh: Hữu thanh (Voiced) | ⚪ Chấm xám: Vô thanh (Unvoiced)
                    </span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                    {/* Vowels */}
                    {vowels.length > 0 && (
                        <div>
                            <h4 style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Nguyên Âm (Vowels)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                {vowels.map(renderPhonemeCard)}
                            </div>
                        </div>
                    )}

                    {/* Diphthongs */}
                    {diphthongs.length > 0 && (
                        <div>
                            <h4 style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Nguyên Âm Đôi (Diphthongs)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                {diphthongs.map(renderPhonemeCard)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Consonants */}
                {consonants.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                        <h4 style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Phụ Âm (Consonants)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '12px' }}>
                            {consonants.map(renderPhonemeCard)}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default SpeakingIpaChart;
