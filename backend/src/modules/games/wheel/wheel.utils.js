
// Wheel Configuration (54 Segments)
// Mapped to multipliers: 1, 2, 5, 10, 20, 40
// Frequencies based on Dream Catcher standard:
// 1: 23 segments
// 2: 15 segments
// 5: 7 segments
// 10: 4 segments
// 20: 2 segments
// 40: 1 segment
// Total: 52 segments (Standard Casino usually adds 2 multipliers x2/x7 but we simplify to 52 or 54 logic)
// Let's use a standard 54-segment array distribution.

export const WHEEL_SEGMENTS = [
    1, 2, 1, 5, 1, 2, 1, 10, 1, 2, 1, 5, 1, 2, 1, 20, 1, 2, 1, 5, 1, 2, 1, 10,
    1, 2, 1, 5, 1, 2, 1, 40, 1, 2, 1, 5, 1, 2, 1, 10, 1, 2, 1, 5, 1, 2, 1, 20,
    1, 2, 1, 5, 1, 10
];

// Color mapping for frontend and consistency
export const SEGMENT_COLORS = {
    1: '#F1C40F',  // Yellow
    2: '#3498DB',  // Blue
    5: '#9B59B6',  // Purple
    10: '#2ECC71', // Green
    20: '#E67E22', // Orange
    40: '#E74C3C'  // Red
};

export const PAYOUT_RATES = {
    1: 1,   // 1 to 1
    2: 2,   // 1 to 2
    5: 5,   // 1 to 5
    10: 10, // 1 to 10
    20: 20, // 1 to 20
    40: 40  // 1 to 40
};
