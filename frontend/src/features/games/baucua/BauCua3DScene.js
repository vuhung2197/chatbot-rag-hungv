
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

const Bowl = ({ gameState }) => {
    // A simplified bowl using static planes for physics
    usePlane(() => ({ position: [0, -2, 0], rotation: [-Math.PI / 2, 0, 0] })); // Bottom
    usePlane(() => ({ position: [0, 0, -5], rotation: [0, 0, 0] })); // Back
    usePlane(() => ({ position: [0, 0, 5], rotation: [Math.PI, 0, 0] })); // Front
    usePlane(() => ({ position: [-5, 0, 0], rotation: [0, Math.PI / 2, 0] })); // Left
    usePlane(() => ({ position: [5, 0, 0], rotation: [0, -Math.PI / 2, 0] })); // Right
    usePlane(() => ({ position: [0, 4.5, 0], rotation: [Math.PI / 2, 0, 0] })); // Top (Invisible Lid) to keep dice inside

    const coverRef = useRef();
    const [lidOpen, setLidOpen] = useState(false);

    useEffect(() => {
        if (gameState === 'RESULT') {
            // Wait for dice to settle (and secretly morph) then open lid
            const timer = setTimeout(() => setLidOpen(true), 1500);
            return () => clearTimeout(timer);
        } else {
            setLidOpen(false);
        }
    }, [gameState]);

    useFrame((state, delta) => {
        if (!coverRef.current) return;

        // Target Y position: 1 (Closed) vs 12 (Open - flying up)
        const targetY = lidOpen ? 12 : 1;

        // Smooth lerp
        coverRef.current.position.y = THREE.MathUtils.lerp(coverRef.current.position.y, targetY, delta * 5);

        // Slight wobble when shaking
        if (gameState === 'SHAKING') {
            coverRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 20) * 0.05;
            coverRef.current.position.x = Math.sin(state.clock.elapsedTime * 30) * 0.1;
        } else {
            coverRef.current.rotation.z = THREE.MathUtils.lerp(coverRef.current.rotation.z, 0, delta * 5);
            coverRef.current.position.x = THREE.MathUtils.lerp(coverRef.current.position.x, 0, delta * 5);
        }
    });

    return (
        <group position={[0, -2, 0]}>
            {/* The Plate (Bottom) */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[6, 64]} />
                <meshStandardMaterial color="#f8fafc" />
                {/* Visual rim for plate */}
                <mesh position={[0, 0, -0.1]}>
                    <ringGeometry args={[5.8, 6, 64]} />
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>
            </mesh>

            {/* The Cover (Bowl) - Visual Only */}
            <group ref={coverRef} position={[0, 1, 0]}>
                <mesh castShadow receiveShadow rotation={[0, 0, 0]}>
                    <sphereGeometry args={[5.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial
                        color="#3b82f6"
                        roughness={0.2}
                        metalness={0.1}
                        side={THREE.DoubleSide}
                        transparent={true}
                        opacity={0.9} // Slight transparency to see shadow inside but not content
                    />
                </mesh>
                {/* Handle/Knob on top */}
                <mesh position={[0, 5.5, 0]}>
                    <cylinderGeometry args={[1, 0.5, 1, 16]} />
                    <meshStandardMaterial color="#1e40af" />
                </mesh>
                {/* Rim of the cover */}
                <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[5.5, 0.2, 16, 64]} />
                    <meshStandardMaterial color="#1e3a8a" />
                </mesh>
            </group>
        </group>
    );
};

const Die = ({ position, resultMascot, gameState, onStop }) => {
    const [ref, api] = useBox(() => ({ mass: 1, position, args: [1.5, 1.5, 1.5], linearDamping: 0.5, angularDamping: 0.5 }));
    const stoppedRef = useRef(false);

    // State for smooth animation
    const animationState = useRef({
        isMorphing: false,
        startTime: 0,
        targetQ: null,
        startQ: null,
        startPos: null,
        delayOver: false
    });

    useEffect(() => {
        if (gameState === 'RESULT' && resultMascot) {
            // Reset animation state
            animationState.current = {
                isMorphing: true,
                startTime: Date.now(),
                targetQ: null,
                startQ: null,
                startPos: null,
                delayOver: false
            };

            // Calculate Target Quaternion once
            const targetRotation = ROTATION_MAP[resultMascot];
            if (targetRotation) {
                const randomYaw = Math.random() * Math.PI * 2;
                const qUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(...targetRotation));
                const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), randomYaw);
                animationState.current.targetQ = qYaw.multiply(qUp);
            }

            // Fallback stop if something goes wrong
            const safetyTimer = setTimeout(() => {
                if (onStop) onStop();
            }, 2000);
            return () => clearTimeout(safetyTimer);
        } else {
            animationState.current.isMorphing = false;
        }
    }, [gameState, resultMascot]);

    useFrame(() => {
        if (gameState === 'SHAKING') {
            // Apply impulses only occasionally (15% chance per frame)
            if (Math.random() < 0.15) {
                api.applyImpulse(
                    [(Math.random() - 0.5) * 15, (Math.random()) * 10, (Math.random() - 0.5) * 15],
                    [0, 0, 0]
                );
                api.applyTorque([(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20]);
            }
        } else if (gameState === 'RESULT' && animationState.current.isMorphing && animationState.current.targetQ) {
            const now = Date.now();
            const elapsed = now - animationState.current.startTime;

            // Phase 1: Wait for 500ms (Let physics run naturally so dice hit the ground)
            if (elapsed < 500) {
                return;
            }

            // Phase 2: Smooth Morphing (1000ms duration)
            if (!animationState.current.startQ) {
                // Capture current rotation and position
                if (ref.current) {
                    animationState.current.startQ = ref.current.quaternion.clone();
                    animationState.current.startPos = ref.current.position.clone();
                }
                // Kill velocity once to stop sliding
                api.velocity.set(0, 0, 0);
                api.angularVelocity.set(0, 0, 0);
            }

            if (animationState.current.startQ) {
                // Calculate progress (0 to 1) for the morphing phase
                // elapsed includes the 500ms wait, so subtract it
                const progress = Math.min((elapsed - 500) / 800, 1);

                // Ease out function for smoother finish
                const ease = 1 - Math.pow(1 - progress, 3);

                const currentQ = animationState.current.startQ.clone();
                currentQ.slerp(animationState.current.targetQ, ease);

                // Override physics
                // Use captured X/Z, forcing Y to -1.25 (Floor is -2, Half height is 0.75)
                const targetX = animationState.current.startPos ? animationState.current.startPos.x : position[0];
                const targetZ = animationState.current.startPos ? animationState.current.startPos.z : position[2];

                api.position.set(targetX, -1.25, targetZ);

                api.velocity.set(0, 0, 0);
                api.angularVelocity.set(0, 0, 0); // Stop spinning
                api.quaternion.set(currentQ.x, currentQ.y, currentQ.z, currentQ.w);

                if (progress >= 1 && !stoppedRef.current) {
                    stoppedRef.current = true;
                    // Final snap to ensure precision
                    const final = animationState.current.targetQ;
                    api.quaternion.set(final.x, final.y, final.z, final.w);
                    if (onStop) onStop();
                }
            }
        }
    });

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
        <Canvas shadows camera={{ position: [0, 6, 12], fov: 45 }}>
            <ambientLight intensity={1.5} />
            <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={2} castShadow />
            <pointLight position={[-10, 10, -10]} intensity={1} />

            <OrbitControls enableZoom={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 2} />

            <Physics gravity={[0, -30, 0]}>
                <Bowl gameState={gameState} />
                <Die position={[-1, 0, 0]} resultMascot={targets[0]} gameState={gameState} />
                <Die position={[1, 0, 0]} resultMascot={targets[1]} gameState={gameState} />
                <Die position={[0, 1, 1]} resultMascot={targets[2]} gameState={gameState} onStop={onAnimationComplete} />
            </Physics>
        </Canvas>
    );
};

export default BauCua3DScene;
