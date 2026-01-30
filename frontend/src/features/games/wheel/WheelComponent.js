
import React, { useRef, useEffect, useState } from 'react';

// Using constants from Utilities (Injected or duplicated for frontend performance)
const WHEEL_SEGMENTS = [
    1, 2, 1, 5, 1, 2, 1, 10, 1, 2, 1, 5, 1, 2, 1, 20, 1, 2, 1, 5, 1, 2, 1, 10,
    1, 2, 1, 5, 1, 2, 1, 40, 1, 2, 1, 5, 1, 2, 1, 10, 1, 2, 1, 5, 1, 2, 1, 20,
    1, 2, 1, 5, 1, 10
];

const COLORS = {
    1: '#F1C40F',
    2: '#3498DB',
    5: '#9B59B6',
    10: '#2ECC71',
    20: '#E67E22',
    40: '#E74C3C'
};

const WheelComponent = ({ spinning, resultIndex, onSpinEnd }) => {
    const canvasRef = useRef(null);
    const [rotation, setRotation] = useState(0); // Current rotation angle (degrees)
    const [isSpinning, setIsSpinning] = useState(false);

    // Draw Wheel
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2 - 10;
        const sliceAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Segments
        // We need to rotate context to current rotation state
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180); // Apply rotation
        ctx.translate(-centerX, -centerY);

        WHEEL_SEGMENTS.forEach((number, i) => {
            const startAngle = i * sliceAngle;
            const endAngle = (i + 1) * sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.fillStyle = COLORS[number];
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(number.toString(), radius - 20, 5);
            ctx.restore();
        });

        ctx.restore();

        // Draw Center Hub (Static relative to canvas, but we want it stationary)
        // Actually drawing it separate via CSS might be easier, but let's draw a simple hub
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.stroke();

    }, [rotation]);

    // Spin Animation Logic
    useEffect(() => {
        if (spinning && !isSpinning) {
            setIsSpinning(true);
            animateSpin(resultIndex);
        }
    }, [spinning]);

    const animateSpin = (targetIndex) => {
        // Calculate target rotation
        // Each segment is 360 / 54 degrees
        // Target index 0 is at 0 degrees (Right). pointer is at Top (-90 deg).
        // Let's align 0 deg to Top for simplification in logic.
        // Actually slice 0 starts at 0 rad (East).
        // Pointer is North (-90 deg or 270 deg).
        // To land slice K on North, we need to rotate: 
        // Rotation = (270 - (K * SliceAngle)) mod 360 + FullSpins

        const segmentAngle = 360 / WHEEL_SEGMENTS.length;
        // Target rotation to align slice center to -90 deg (Top)
        // angle of center of slice i = (i + 0.5) * segmentAngle
        // Target = 270 - (i + 0.5) * segmentAngle
        const targetRotationBase = 270 - ((targetIndex + 0.5) * segmentAngle);

        // Add random full spins (5 to 10)
        const fullSpins = 360 * (5 + Math.floor(Math.random() * 5));
        const finalRotation = rotation + fullSpins + (targetRotationBase - (rotation % 360));

        // However simple approach:
        // Current Rot -> Target Rot.
        // Delta = Final - Current.

        const duration = 5000; // 5s
        const startTime = performance.now();
        const startRotation = rotation;

        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: Cubic Out
            const easeOut = (t) => 1 - Math.pow(1 - t, 3);

            const currentRot = startRotation + (finalRotation - startRotation) * easeOut(progress);
            setRotation(currentRot);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsSpinning(false);
                onSpinEnd();
            }
        };

        requestAnimationFrame(animate);
    };

    return (
        <div className="wheel-wrapper">
            <div className="wheel-pointer"></div>
            <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="wheel-canvas"
            />
        </div>
    );
};

export default WheelComponent;
