'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, useScroll } from '@react-three/drei';
import * as THREE from 'three';

const WaveToSphere: React.FC = () => {
    // Generate initial grid points for wave
    const wavePoints = useMemo(() => {
        const pts: number[] = [];
        const numRows = 100;
        const numCols = 60;
        const spacing = 0.30;

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                pts.push(
                    (i - numRows / 2) * spacing,
                    0,
                    (j - numCols / 2) * spacing
                );
            }
        }
        return new Float32Array(pts);
    }, []);

    // Generate sphere points maintaining perspective
    const spherePoints = useMemo(() => {
        const pts: number[] = [];
        const numPoints = wavePoints.length / 3;
        const radius = 5;

        for (let i = 0; i < numPoints; i++) {
            const phi = Math.acos(1 - 2 * (i / numPoints));
            const theta = Math.PI * 2 * i * (1 / 1.618033988749895);

            // Adjust sphere points to maintain perspective view
            pts.push(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta) * 0.9, // Compress vertical dimension
                radius * Math.cos(phi)
            );
        }
        return new Float32Array(pts);
    }, [wavePoints]);

    // Create circular texture for points
    const pointTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.beginPath();
            ctx.arc(32, 32, 32, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.premultiplyAlpha = true;
        return texture;
    }, []);

    const AnimatedPoints = () => {
        const pointsRef = useRef<THREE.Points>(null);
        const { clock } = useThree();
        const scroll = useScroll();
        const initialPositions = useRef<Float32Array | null>(null);

        useFrame(() => {
            if (!pointsRef.current) return;

            // Store initial wave positions if not already stored
            if (!initialPositions.current) {
                initialPositions.current = new Float32Array(wavePoints.length);
                for (let i = 0; i < wavePoints.length; i += 3) {
                    const x = wavePoints[i];
                    const z = wavePoints[i + 2];
                    initialPositions.current[i] = x;
                    initialPositions.current[i + 1] = Math.sin(x * 0.5) * 0.5 + Math.cos(z * 0.5) * 0.5;
                    initialPositions.current[i + 2] = z;
                }
            }

            const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
            const time = clock.getElapsedTime();
            const scrollProgress = scroll.offset;

            // Create gathering effect before sphere formation
            const gatheringProgress = Math.min(scrollProgress * 2, 1);
            const sphereProgress = Math.max((scrollProgress - 0.5) * 2, 0);

            for (let i = 0; i < positions.length; i += 3) {
                // Get initial wave positions with animation
                const waveX = initialPositions.current[i];
                const waveZ = initialPositions.current[i + 2];
                const waveY = initialPositions.current[i + 1] +
                    Math.sin(time * 0.5 + waveX * 1.5) * 0.3 +
                    Math.cos(time * 0.5 + waveZ * 1.5) * 0.3;

                // Calculate distance from center for gathering effect
                const distanceFromCenter = Math.sqrt(waveX * waveX + waveZ * waveZ);

                // Create gathering point that maintains perspective
                const gatherX = waveX * (1 - gatheringProgress * 0.5);
                const gatherZ = waveZ * (1 - gatheringProgress * 0.5);
                const gatherY = waveY * (1 - gatheringProgress) +
                    (Math.sin(time + distanceFromCenter) * gatheringProgress);

                // Get sphere positions
                const sphereX = spherePoints[i];
                const sphereY = spherePoints[i + 1] + Math.sin(time * 2 + sphereX * 2) * 0.2;
                const sphereZ = spherePoints[i + 2];

                // Interpolate between wave, gathering point, and sphere
                positions[i] = THREE.MathUtils.lerp(gatherX, sphereX, sphereProgress);
                positions[i + 1] = THREE.MathUtils.lerp(gatherY, sphereY, sphereProgress);
                positions[i + 2] = THREE.MathUtils.lerp(gatherZ, sphereZ, sphereProgress);
            }

            // Remove rotation, let points move naturally
            pointsRef.current.geometry.attributes.position.needsUpdate = true;
        });

        return (
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={wavePoints.length / 3}
                        array={wavePoints}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.10}
                    color="#6366f1"
                    sizeAttenuation={true}
                    transparent={true}
                    opacity={0.8}
                    alphaMap={pointTexture}
                />
            </points>
        );
    };

    return (
        <div className="w-full h-screen">
            <Canvas
                camera={{ position: [0, 3, 13], fov: 50 }}
                className="bg-white w-full h-screen"
            >
                <ScrollControls pages={1} damping={0.1}>
                    <AnimatedPoints />
                </ScrollControls>
            </Canvas>
        </div>
    );
};

export default WaveToSphere;