import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { RefreshCw, AlertTriangle, BookOpen, AlertCircle, Activity } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function AnalyticsDashboard({ darkMode }) {
    const [weaknesses, setWeaknesses] = useState([]);
    const [recentMistakes, setRecentMistakes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(30);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [weakRes, recentRes] = await Promise.all([
                axios.get(`${API_URL}/analytics/weaknesses?limit=5&days=${days}`, { headers }),
                axios.get(`${API_URL}/analytics/mistakes/recent?limit=10`, { headers })
            ]);

            setWeaknesses(weakRes.data.data || []);
            setRecentMistakes(recentRes.data.data || []);
        } catch (err) {
            console.error('Error fetching analytics data:', err);
            setError('Failed to load analytics data. ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const maxErrorCount = weaknesses.length > 0 ? Math.max(...weaknesses.map(w => parseInt(w.error_count))) : 1;

    // Colors
    const bg = darkMode ? '#1a1a1a' : '#f8f9fa';
    const cardBg = darkMode ? '#2d2d2d' : '#fff';
    const text = darkMode ? '#f3f4f6' : '#1f2937';
    const textSecondary = darkMode ? '#9ca3af' : '#6b7280';
    const border = darkMode ? '#404040' : '#e5e7eb';
    const grammarColor = '#ef4444'; // Red
    const pronunciationColor = '#3b82f6'; // Blue
    const vocabularyColor = '#eab308'; // Yellow

    const getCategoryColor = (category) => {
        if (category === 'grammar') return grammarColor;
        if (category === 'pronunciation') return pronunciationColor;
        if (category === 'vocabulary') return vocabularyColor;
        return '#8b5cf6'; // Purple default
    };

    const getCategoryLabel = (category) => {
        if (category === 'grammar') return 'Ngữ pháp';
        if (category === 'pronunciation') return 'Phát âm';
        if (category === 'vocabulary') return 'Từ vựng';
        return category;
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Activity size={24} color="#7137ea" /> Phân Tích Điểm Yếu
                </h2>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${border}`,
                            background: cardBg,
                            color: text,
                            cursor: 'pointer'
                        }}
                    >
                        <option value={7}>7 ngày qua</option>
                        <option value={30}>30 ngày qua</option>
                        <option value={90}>90 ngày qua</option>
                    </select>

                    <button
                        onClick={fetchData}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${border}`,
                            background: cardBg,
                            color: text,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <RefreshCw size={16} /> Làm mới
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: textSecondary }}>
                    <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto', marginBottom: '10px', animation: 'spin 1s linear infinite' }} />
                    Đang phân tích dữ liệu học tập của bạn...
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    {/* Top Weaknesses Chart */}
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                            <AlertTriangle size={20} color="#eab308" /> Top Vấn Đề Cần Khắc Phục
                        </h3>

                        {weaknesses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: textSecondary }}>
                                Tuyệt vời! Chúng tôi chưa phát hiện lỗi sai đáng kể nào trong {days} ngày qua.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {weaknesses.map((w, index) => {
                                    const width = `${Math.max(5, (w.error_count / maxErrorCount) * 100)}%`;
                                    const color = getCategoryColor(w.error_category);

                                    return (
                                        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                <span style={{ fontWeight: '500' }}>
                                                    <span style={{
                                                        background: `${color}22`,
                                                        color: color,
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        marginRight: '8px'
                                                    }}>
                                                        {getCategoryLabel(w.error_category)}
                                                    </span>
                                                    {w.error_detail}
                                                </span>
                                                <span style={{ color: textSecondary, fontWeight: 'bold' }}>{w.error_count} lỗi</span>
                                            </div>

                                            <div style={{ width: '100%', height: '10px', background: darkMode ? '#404040' : '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width,
                                                    height: '100%',
                                                    background: color,
                                                    borderRadius: '5px',
                                                    transition: 'width 0.5s ease-out'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {/* Recommended Actions */}
                        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                                <BookOpen size={20} color="#7137ea" /> Gợi Ý Học Tập
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {weaknesses.slice(0, 3).map((w, index) => (
                                    <div key={index} style={{ padding: '12px', border: `1px solid ${border}`, borderRadius: '8px', background: darkMode ? '#333' : '#f8fafc' }}>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                                            Bạn thường xuyên sai <strong>{w.error_detail}</strong> ({getCategoryLabel(w.error_category)}).
                                        </p>
                                        <button style={{
                                            background: '#7137ea',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}>
                                            Khắc phục ngay
                                        </button>
                                    </div>
                                ))}

                                {weaknesses.length === 0 && (
                                    <div style={{ color: textSecondary, fontSize: '0.9rem' }}>
                                        Hãy tiếp tục luyện tập Speaking và Writing để hệ thống phân tích thêm!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Mistakes Log */}
                        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', marginTop: 0 }}>
                                Lịch Sử Lỗi Gần Đây
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                                {recentMistakes.length === 0 ? (
                                    <div style={{ color: textSecondary, fontSize: '0.9rem' }}>Chưa có bản ghi lỗi nào.</div>
                                ) : (
                                    recentMistakes.map((m, index) => (
                                        <div key={index} style={{
                                            padding: '12px',
                                            borderLeft: `4px solid ${getCategoryColor(m.error_category)}`,
                                            background: darkMode ? '#333' : '#f8fafc',
                                            borderRadius: '4px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{m.error_detail}</span>
                                                <span style={{ fontSize: '0.75rem', color: textSecondary }}>
                                                    {new Date(m.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {m.context_text && (
                                                <div style={{ fontSize: '0.85rem', color: textSecondary, fontStyle: 'italic', background: darkMode ? '#222' : '#e2e8f0', padding: '6px', borderRadius: '4px' }}>
                                                    "{m.context_text}"
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.75rem', marginTop: '6px', textTransform: 'uppercase', color: getCategoryColor(m.error_category), fontWeight: 'bold' }}>
                                                Source: {m.source_module}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
        </div>
    );
}
