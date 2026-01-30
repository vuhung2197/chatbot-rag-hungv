
// 3D Scene for Bau Cua Game
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import { Text, useTexture, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

// --- VISUAL ASSETS GENERATION ---
// Create textures programmatically to avoid external asset dependency
const createMascotTexture = (icon, color, name) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);

    // Border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 246);

    // Icon (Emoji)
    ctx.font = '100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(icon, 128, 110);

    // Name
    ctx.font = 'bold 40px Arial';
    ctx.fillText(name, 128, 190);

    return new THREE.CanvasTexture(canvas);
};

// Define Mascots with distinct colors
// ORDER IS CRITICAL FOR PHYSICS MAPPING: 0:Right(+x), 1:Left(-x), 2:Top(+y), 3:Bot(-y), 4:Front(+z), 5:Back(-z)
const MASCOTS = [
    { id: 'NAI', icon: '🦌', color: '#854d0e', name: 'NAI' }, // Index 0: +x
    { id: 'BAU', icon: '🎃', color: '#16a34a', name: 'BẦU' }, // Index 1: -x
    { id: 'GA', icon: '🐓', color: '#ef4444', name: 'GÀ' }, // Index 2: +y
    { id: 'CA', icon: '🐟', color: '#3b82f6', name: 'CÁ' }, // Index 3: -y
    { id: 'CUA', icon: '🦀', color: '#f97316', name: 'CUA' }, // Index 4: +z
    { id: 'TOM', icon: '🦐', color: '#db2777', name: 'TÔM' }, // Index 5: -z
];

const MASCOT_TEXTURES = {};
MASCOTS.forEach(m => {
    MASCOT_TEXTURES[m.id] = createMascotTexture(m.icon, m.color, m.name);
});

// Mapping from Mascot ID to Euler Rotation [x, y, z] to make that mascot face UP (+y)
const ROTATION_MAP = {
    'NAI': [0, 0, Math.PI / 2],       // +x needs to point to +y -> Rotate Z +90
    'BAU': [0, 0, -Math.PI / 2],      // -x needs to point to +y -> Rotate Z -90
    'GA': [0, 0, 0],                 // +y is already up -> No rotation (or multiple of 2PI)
    'CA': [Math.PI, 0, 0],           // -y needs to point to +y -> Rotate X 180
    'CUA': [-Math.PI / 2, 0, 0],      // +z needs to point to +y -> Rotate X -90
    'TOM': [Math.PI / 2, 0, 0]        // -z needs to point to +y -> Rotate X +90
};


// --- COMPONENTS ---

const Floor = () => {
    const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -2, 0] }));
    return (
        <mesh ref={ref} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <shadowMaterial color="#171717" transparent opacity={0.4} />
        </mesh>
    );
};

const Bowl = () => {
    // A simplified bowl using static planes
    usePlane(() => ({ position: [0, -2, 0], rotation: [-Math.PI / 2, 0, 0] })); // Bottom
    usePlane(() => ({ position: [0, 0, -5], rotation: [0, 0, 0] })); // Back
    usePlane(() => ({ position: [0, 0, 5], rotation: [Math.PI, 0, 0] })); // Front
    usePlane(() => ({ position: [-5, 0, 0], rotation: [0, Math.PI / 2, 0] })); // Left
    usePlane(() => ({ position: [5, 0, 0], rotation: [0, -Math.PI / 2, 0] })); // Right
    usePlane(() => ({ position: [0, 8, 0], rotation: [Math.PI / 2, 0, 0] })); // Top (Lid) to keep dice inside

    return (
        <group position={[0, -2, 0]}>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[5, 64]} />
                <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
            </mesh>
            <mesh receiveShadow position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[5, 0.5, 16, 100]} />
                <meshStandardMaterial color="#475569" />
            </mesh>
        </group>
    );
};

const Die = ({ position, resultMascot, gameState, onStop }) => {
    const [ref, api] = useBox(() => ({ mass: 1, position, args: [1.5, 1.5, 1.5], linearDamping: 0.5, angularDamping: 0.5 }));
    const stoppedRef = useRef(false);

    useFrame(() => {
        if (gameState === 'SHAKING') {
            // Shake logic
            if (Math.random() < 0.15) {
                api.applyImpulse(
                    [(Math.random() - 0.5) * 15, (Math.random()) * 10, (Math.random() - 0.5) * 15],
                    [0, 0, 0]
                );
                api.applyTorque([(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20]);
            }
            stoppedRef.current = false;
        }
    });

    // Magic Rotation Logic (Plan B)
    useEffect(() => {
        if (gameState === 'RESULT' && resultMascot) {
            const timer = setTimeout(() => {
                // 1. Stop Physics
                api.velocity.set(0, 0, 0);
                api.angularVelocity.set(0, 0, 0);

                // 2. Get Target Rotation
                const targetRotation = ROTATION_MAP[resultMascot];

                if (targetRotation) {
                    // 3. Snap to rotation
                    // Add a random Y rotation (yaw) so they don't look identically aligned
                    const randomYaw = Math.random() * Math.PI * 2;

                    // We need to compose the rotations: Result Rotation * Random Yaw
                    // But simplest is just setting the basic rotation. 
                    // To make it look natural, we might accept that they are grid-aligned for now.
                    // Or better: ROTATION_MAP gives 'local up'. We can rotate around world Y freely.

                    // Implementation: Use Quaternion to be precise
                    // Step A: Orientation to bring desired face UP
                    const qUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(...targetRotation));

                    // Step B: Random yaw around World Y (0,1,0)
                    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), randomYaw);

                    // Combine: qYaw * qUp (Apply Up orientation, then Yaw? No, apply Local-to-Up then World-Yaw)
                    const finalQ = qYaw.multiply(qUp);

                    api.quaternion.set(finalQ.x, finalQ.y, finalQ.z, finalQ.w);
                }

                if (onStop) onStop();

            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [gameState, resultMascot]);

    return (
        <mesh ref={ref} castShadow receiveShadow>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            {/* Apply 6 materials for 6 faces: Right, Left, Top, Bot, Front, Back */}
            {/* These indices match the MASCOTS array order exactly */}
            {MASCOTS.map((m, i) => (
                <meshStandardMaterial key={i} attach={`material-${i}`} map={MASCOT_TEXTURES[m.id]} />
            ))}
        </mesh>
    );
};

const BauCua3DScene = ({ result, gameState, onAnimationComplete }) => {
    // result: ['NAI', 'BAU', 'GA'] or null
    const targets = result || [null, null, null];

    return (
        <Canvas shadows camera={{ position: [0, 15, 0], fov: 45 }}>
            <ambientLight intensity={1.5} />
            <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={2} castShadow />
            <pointLight position={[-10, 10, -10]} intensity={1} />

            <Physics gravity={[0, -30, 0]}>
                <Bowl />
                <Die position={[-1, 5, 0]} resultMascot={targets[0]} gameState={gameState} />
                <Die position={[1, 5, 0]} resultMascot={targets[1]} gameState={gameState} />
                <Die position={[0, 6, 1]} resultMascot={targets[2]} gameState={gameState} onStop={onAnimationComplete} />
            </Physics>
        </Canvas>
    );
};

export default BauCua3DScene;
