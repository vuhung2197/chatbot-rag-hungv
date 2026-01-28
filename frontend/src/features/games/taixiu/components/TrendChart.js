
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

/**
 * TrendChart Component
 * Visualizes the history of total scores (3-18) and individual dice (1-6).
 * 
 * @param {Array} history - Array of recent game sessions: [{ id, total_score, result_type, dice1, dice2, dice3 ... }]
 */
const TrendChart = ({ history }) => {
    // Toggles for chart lines
    const [showDice1, setShowDice1] = useState(false);
    const [showDice2, setShowDice2] = useState(false);
    const [showDice3, setShowDice3] = useState(false);

    // Format data for chart
    const data = useMemo(() => {
        // History usually comes latest first, so we reverse it to plot left-to-right
        return [...history].reverse().map((game, index) => ({
            name: index + 1, // Session Sequence
            score: game.total_score,
            result: game.result_type,
            id: game.id || game.session_id,
            d1: game.dice1,
            d2: game.dice2,
            d3: game.dice3
        }));
    }, [history]);

    // Custom Dot to color code Tai (Red) vs Xiu (Blue) for Total Score
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
        <div className="w-full h-80 bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 backdrop-blur-sm">
            <div className="text-xs text-gray-400 mb-2 flex justify-between px-2 flex-wrap gap-2">
                <span>Diễn biến ({data.length} phiên)</span>
                
                {/* Controls */}
                <div className="flex gap-3 text-[10px] sm:text-xs">
                   <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showDice1} onChange={(e) => setShowDice1(e.target.checked)} className="form-checkbox h-3 w-3 text-purple-500 rounded bg-slate-700 border-none" />
                        <span style={{color: '#a855f7'}}>Dice 1</span>
                   </label>
                   <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showDice2} onChange={(e) => setShowDice2(e.target.checked)} className="form-checkbox h-3 w-3 text-cyan-500 rounded bg-slate-700 border-none" />
                        <span style={{color: '#06b6d4'}}>Dice 2</span>
                   </label>
                   <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showDice3} onChange={(e) => setShowDice3(e.target.checked)} className="form-checkbox h-3 w-3 text-pink-500 rounded bg-slate-700 border-none" />
                        <span style={{color: '#ec4899'}}>Dice 3</span>
                   </label>
                </div>

                <div className="flex gap-2">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> T</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> X</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="name" hide />
                    
                    {/* Y Axis for Total Score (3-18) */}
                    <YAxis
                        yAxisId="total"
                        domain={[0, 18]} 
                        ticks={[3, 6, 9, 12, 15, 18]}
                        stroke="#94a3b8"
                        fontSize={10}
                        width={30}
                    />

                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                        itemStyle={{ padding: 0 }}
                        labelFormatter={(label) => `Phiên #${label}`}
                        formatter={(value, name, props) => {
                            if (name === 'score') return [`Tổng: ${value}`, props.payload.result];
                            if (name === 'd1') return [`D1: ${value}`, ''];
                            if (name === 'd2') return [`D2: ${value}`, ''];
                            if (name === 'd3') return [`D3: ${value}`, ''];
                            return [value, name];
                        }}
                    />
                    
                    <ReferenceLine yAxisId="total" y={10.5} stroke="#fbbf24" strokeDasharray="5 5" opacity={0.3} />

                    {/* Total Score Line (Always Visible) */}
                    <Line
                        yAxisId="total"
                        type="monotone"
                        dataKey="score"
                        stroke="#fbbf24"
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        animationDuration={500}
                        name="score" // for tooltip matching
                    />

                    {/* Individual Dice Lines (Toggleable) */}
                    {showDice1 && (
                        <Line yAxisId="total" type="basis" dataKey="d1" stroke="#a855f7" strokeWidth={1} dot={{r:2}} activeDot={{r:4}} name="d1" animationDuration={300} />
                    )}
                    {showDice2 && (
                        <Line yAxisId="total" type="basis" dataKey="d2" stroke="#06b6d4" strokeWidth={1} dot={{r:2}} activeDot={{r:4}} name="d2" animationDuration={300} />
                    )}
                    {showDice3 && (
                        <Line yAxisId="total" type="basis" dataKey="d3" stroke="#ec4899" strokeWidth={1} dot={{r:2}} activeDot={{r:4}} name="d3" animationDuration={300} />
                    )}

                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
