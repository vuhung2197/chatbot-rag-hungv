
import React from 'react';

/**
 * RoadMap Component (Bead Plate)
 * Displays history as a grid of dots using CSS Grid.
 * Commonly used in casinos to spot patterns (streaks/dragons).
 * 
 * @param {Array} history - Recent game history desc
 */
const RoadMap = ({ history }) => {
    // We want to fill columns from left to right, top to bottom logic or similar.
    // Bead Plate standard: 6 rows. Fill col 1 row 1->6, then col 2 row 1->6.

    const ROWS = 6;
    const COLS = 20; // Show last ~120 results max

    // Prepare grid data structure
    // We assume history is ordered Newest -> Oldest.
    // For bead plate, we usually want Oldest -> Newest filling the grid.

    const sortedHistory = [...history].reverse(); // Oldest First

    // Create a matrix of size COLS x ROWS
    const matrix = Array.from({ length: COLS }, () => Array(ROWS).fill(null));

    sortedHistory.slice(0, ROWS * COLS).forEach((game, index) => {
        const col = Math.floor(index / ROWS);
        const row = index % ROWS;

        if (col < COLS) {
            matrix[col][row] = {
                result: game.result_type,
                score: game.total_score
            };
        }
    });

    return (
        <div className="w-full overflow-x-auto bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 backdrop-blur-sm mt-4">
            <div className="text-xs text-gray-400 mb-2">Lịch sử phiên (Bead Plate)</div>
            <div
                className="grid gap-[2px]"
                style={{
                    gridTemplateColumns: `repeat(${COLS}, minmax(20px, 1fr))`,
                    width: 'max-content' // Ensure grid doesn't shrink dots too much
                }}
            >
                {/* Render Column by Column */}
                {matrix.map((colData, colIndex) => (
                    <div key={colIndex} className="flex flex-col gap-[2px]">
                        {colData.map((cell, rowIndex) => {
                            // Determine visuals
                            let bgClass = "bg-slate-800"; // Empty cell
                            let text = "";
                            let textColor = "";

                            if (cell) {
                                if (cell.result === 'TAI') {
                                    bgClass = "bg-red-500";
                                    text = "T";
                                    textColor = "text-white";
                                } else if (cell.result === 'XIU') {
                                    bgClass = "bg-blue-500";
                                    text = "X";
                                    textColor = "text-white";
                                } else {
                                    // Triple
                                    bgClass = "bg-green-500";
                                    text = "★";
                                    textColor = "text-white";
                                }
                            }

                            return (
                                <div
                                    key={`${colIndex}-${rowIndex}`}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${bgClass} ${textColor} transition-all hover:scale-110 cursor-default`}
                                    title={cell ? `${cell.result} (${cell.score})` : ''}
                                >
                                    {text}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RoadMap;
