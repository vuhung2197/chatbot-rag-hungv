
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

/**
 * TrendChart Component
 * Visualizes the history of total scores (3-18).
 * 
 * @param {Array} history - Array of recent game sessions: [{ id, total_score, result_type, ... }]
 */
const TrendChart = ({ history }) => {

    // Format data for chart (reverse chronological order for display usually needs chronological for line chart left-to-right)
    const data = useMemo(() => {
        // History usually comes latest first, so we reverse it to plot left-to-right
        return [...history].reverse().map((game, index) => ({
            name: index + 1, // Session Sequence
            score: game.total_score,
            result: game.result_type,
            id: game.id || game.session_id // Fallback if needed
        }));
    }, [history]);

    // Custom Dot to color code Tai (Red) vs Xiu (Blue)
    const CustomDot = (props) => {
        const { cx, cy, payload } = props;
        const isTai = payload.score >= 11;
        const isTriple = payload.result === 'TRIPLE';

        let fill = '#3b82f6'; // Xiu - Blue
        if (isTai) fill = '#ef4444'; // Tai - Red
        if (isTriple) fill = '#22c55e'; // Triple - Green

        return (
            <svg x={cx - 4} y={cy - 4} width={8} height={8} fill="none" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="4" fill={fill} stroke="white" strokeWidth="1" />
            </svg>
        );
    };

    if (!data || data.length === 0) {
        return <div className="text-gray-500 text-center py-4">Chưa có dữ liệu cầu</div>;
    }

    return (
        <div className="w-full h-64 bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 backdrop-blur-sm">
            <div className="text-xs text-gray-400 mb-2 flex justify-between px-2">
                <span>Diễn biến tổng điểm (Gần nhất {data.length} phiên)</span>
                <div className="flex gap-3">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Tài</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Xỉu</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" hide />
                    <YAxis
                        domain={[3, 18]}
                        ticks={[3, 6, 9, 12, 15, 18]}
                        stroke="#94a3b8"
                        fontSize={12}
                        width={30}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#fff' }}
                        labelFormatter={() => ''}
                        formatter={(value, name, props) => [`Điểm: ${value}`, props.payload.result]}
                    />
                    {/* Reference Line dividing Tai and Xiu */}
                    <ReferenceLine y={10.5} stroke="#fbbf24" strokeDasharray="5 5" opacity={0.5} />

                    <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#fbbf24"
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        animationDuration={500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
