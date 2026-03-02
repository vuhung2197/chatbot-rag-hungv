import React, { useState, useEffect } from 'react';
import { speakingService } from './speakingService';
import SpeakingRecorder from './components/SpeakingRecorder';
import SpeakingResult from './components/SpeakingResult';
import SpeakingReflexGame from './components/SpeakingReflexGame';
import SpeakingIpaChart from './components/SpeakingIpaChart';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function SpeakingTab({ darkMode }) {
    const [currentView, setCurrentView] = useState('list'); // list, recorder, result
    const [type, setType] = useState('shadowing'); // 'shadowing', 'topic', 'reflex', 'pronunciation'
    const [level, setLevel] = useState('B1');
    const [topics, setTopics] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [completedSubmission, setCompletedSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const loadTopics = async () => {
        setIsLoading(true);
        try {
            if (type !== 'pronunciation') {
                const data = await speakingService.getTopics(type, level);
                setTopics(data.topics || []);
            }
        } catch (error) {
            console.error('Failed to load speaking topics', error);
        }
        setIsLoading(false);
    };

    useEffect(() => { loadTopics(); }, [type, level]);

    const handleGenerateTopic = async () => {
        setIsGenerating(true);
        try {
            const topic = await speakingService.generateTopic(type, level);
            setSelectedTopic(topic);
            if (type === 'reflex') {
                // For reflex, add to the topics list instead
                setTopics(prev => [topic, ...prev]);
            } else {
                setCurrentView('recorder');
            }
            loadTopics(); // refresh in background
        } catch (e) {
            alert('Lỗi tạo đề nói: ' + (e.response?.data?.error || e.message));
        }
        setIsGenerating(false);
    };

    const themeVars = darkMode ? {
        '--card-bg': '#1e293b', '--border-color': '#334155',
        '--text-primary': '#f8fafc', '--text-secondary': '#cbd5e1'
    } : {
        '--card-bg': '#ffffff', '--border-color': '#e2e8f0',
        '--text-primary': '#1e293b', '--text-secondary': '#64748b'
    };

    const renderDashboard = () => (
        <div style={{ maxWidth: type === 'pronunciation' ? '1200px' : '800px', margin: '0 auto', ...themeVars }}>
            <h2 style={{ textAlign: 'center', color: 'var(--text-primary)' }}>🎙️ Luyện Phát Âm & Giao Tiếp</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Chọn hình thức luyện tập, thu âm giọng nói của bạn, AI sẽ chấm điểm phát âm và từ vựng!
            </p>

            {/* Selector Form */}
            <div style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 'bold' }}>Hình thức:</label>
                        <select value={type} onChange={e => setType(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: darkMode ? '#0f172a' : 'white', color: 'var(--text-primary)' }}>
                            <option value="shadowing">🗣️ Shadowing (Đọc nhại theo máy)</option>
                            <option value="topic">💬 Topic (Trả lời câu hỏi tự do)</option>
                            <option value="reflex">⚡ Phản Xạ (Dịch tốc độ cao)</option>
                            <option value="pronunciation">📖 Luyện Ngữ Âm IPA</option>
                        </select>
                    </div>
                    {type !== 'pronunciation' && (
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 'bold' }}>Cấp độ:</label>
                            <select value={level} onChange={e => setLevel(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: darkMode ? '#0f172a' : 'white', color: 'var(--text-primary)' }}>
                                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* List or Game Start */}
            {type !== 'pronunciation' ? (
                <>
                    {/* ✨ AI Generate Section */}
                    <div style={{ padding: '16px 20px', background: darkMode ? 'rgba(113, 55, 234, 0.1)' : 'rgba(113, 55, 234, 0.06)', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(113, 55, 234, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>✨ Tạo đề mới bằng AI</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                AI sẽ tạo {type === 'shadowing' ? 'câu mẫu' : type === 'reflex' ? 'câu dịch' : 'câu hỏi'} mới phù hợp level {level}
                            </p>
                        </div>
                        <button
                            onClick={handleGenerateTopic}
                            disabled={isGenerating}
                            style={{
                                padding: '10px 20px', background: isGenerating ? '#94a3b8' : '#7137ea', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap', fontSize: '0.95rem',
                                boxShadow: isGenerating ? 'none' : '0 4px 6px rgba(113, 55, 234, 0.3)'
                            }}
                        >
                            {isGenerating ? '⏳ Đang tạo...' : '✨ Tạo đề mới'}
                        </button>
                    </div>

                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        Danh sách bài tập {type === 'shadowing' ? 'Shadowing' : type === 'reflex' ? 'Phản Xạ' : 'Topic'} ({level})

                        {type === 'reflex' && topics.length > 0 && (
                            <button onClick={() => setCurrentView('reflex')}
                                style={{
                                    padding: '8px 16px', background: '#eab308', color: '#1e293b',
                                    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                🎮 CHƠI MINIGAME NGAY
                            </button>
                        )}
                    </h3>

                    {isLoading ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải danh sách...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topics.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>Chưa có bài tập cho level này.</p>
                            ) : topics.map(topic => (
                                <div key={topic.id} style={{
                                    padding: '16px', borderRadius: '12px', background: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ flex: 1, paddingRight: '20px' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px', fontSize: '1.1rem' }}>
                                            {type === 'shadowing' ? 'Đọc nhại mẫu câu' : type === 'reflex' ? 'Dịch ngay câu này sang Tiếng Anh:' : 'Trả lời câu hỏi:'}
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontStyle: type === 'topic' ? 'italic' : 'normal' }}>
                                            {topic.prompt_text}
                                        </div>
                                    </div>

                                    {type !== 'reflex' && (
                                        <button onClick={() => { setSelectedTopic(topic); setCurrentView('recorder'); }}
                                            style={{
                                                padding: '10px 20px', background: '#ec4899', color: 'white',
                                                border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
                                            }}>
                                            Thu âm ngay 🎙️
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <SpeakingIpaChart
                    darkMode={darkMode}
                    onPlayTopic={(topicData) => {
                        setSelectedTopic(topicData);
                        setCurrentView('recorder');
                    }}
                />
            )}
        </div>
    );

    return (
        <>
            {currentView === 'list' && renderDashboard()}

            {currentView === 'recorder' && selectedTopic && (
                <SpeakingRecorder
                    topic={selectedTopic} darkMode={darkMode}
                    onBack={() => setCurrentView('list')}
                    onSubmitSuccess={(submission) => {
                        setCompletedSubmission(submission);
                        setCurrentView('result');
                    }}
                />
            )}

            {currentView === 'result' && completedSubmission && (
                <SpeakingResult
                    submission={completedSubmission}
                    topic={selectedTopic}
                    darkMode={darkMode}
                    onBack={() => setCurrentView('list')}
                />
            )}

            {currentView === 'reflex' && (
                <SpeakingReflexGame
                    topics={topics}
                    darkMode={darkMode}
                    onExit={() => setCurrentView('list')}
                />
            )}
        </>
    );
}
