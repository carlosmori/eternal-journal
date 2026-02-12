'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Book dimensions ── */
const COVER_W = 1.4;
const COVER_H = 2;
const COVER_D = 0.05;
const PAGES_W = 1.3;
const PAGES_H = 1.9;
const PAGES_D = 0.22;
const SPINE_W = 0.06;

/* ── Colors ── */
const COVER_COLOR = '#6d28d9';
const COVER_BACK_COLOR = '#5b21b6';
const SPINE_COLOR = '#4c1d95';
const PAGE_COLOR = '#faf5ef';
const ACCENT_COLOR = '#7c3aed';

/* ── Book component ── */
interface BookProps {
  isOpening: boolean;
  onOpenComplete: () => void;
}

function Book({ isOpening, onOpenComplete }: BookProps) {
  const bookRef = useRef<THREE.Group>(null);
  const frontCoverRef = useRef<THREE.Group>(null);
  const openProgress = useRef(0);
  const completedRef = useRef(false);

  useFrame((state, delta) => {
    if (!bookRef.current || !frontCoverRef.current) return;

    if (isOpening) {
      // Animate the front cover opening with ease-out cubic
      openProgress.current = Math.min(openProgress.current + delta * 1.2, 1);
      const t = openProgress.current;
      const eased = 1 - Math.pow(1 - t, 3);

      frontCoverRef.current.rotation.y = -eased * Math.PI * 0.85;

      // Straighten the book as it opens
      bookRef.current.rotation.x = THREE.MathUtils.lerp(
        bookRef.current.rotation.x,
        -0.05,
        delta * 2,
      );
      bookRef.current.rotation.y = THREE.MathUtils.lerp(
        bookRef.current.rotation.y,
        0,
        delta * 2,
      );

      if (t >= 0.92 && !completedRef.current) {
        completedRef.current = true;
        onOpenComplete();
      }
    } else {
      // Idle: subtle floating animation
      const elapsed = state.clock.elapsedTime;
      bookRef.current.rotation.y = 0.3 + Math.sin(elapsed * 0.5) * 0.03;
      bookRef.current.rotation.x = 0.15 + Math.sin(elapsed * 0.7) * 0.02;
      bookRef.current.position.y = 0.3 + Math.sin(elapsed * 0.6) * 0.04;
    }
  });

  return (
    <group ref={bookRef} position={[0, 0.3, 0]} rotation={[0.15, 0.3, 0]}>
      {/* Back cover */}
      <mesh position={[0, 0, -(PAGES_D / 2 + COVER_D / 2)]}>
        <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
        <meshStandardMaterial color={COVER_BACK_COLOR} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Pages block */}
      <mesh position={[0.03, 0, 0]}>
        <boxGeometry args={[PAGES_W, PAGES_H, PAGES_D]} />
        <meshStandardMaterial color={PAGE_COLOR} roughness={0.95} />
      </mesh>

      {/* Page lines on the right side for realism */}
      {[...Array(5)].map((_, i) => (
        <mesh
          key={i}
          position={[
            PAGES_W / 2 + 0.035,
            0,
            -PAGES_D / 2 + (PAGES_D / 5) * i + PAGES_D / 10,
          ]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[PAGES_D / 6, PAGES_H * 0.92]} />
          <meshStandardMaterial color="#efe8dc" side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Spine */}
      <mesh position={[-(COVER_W / 2 + SPINE_W / 2), 0, 0]}>
        <boxGeometry args={[SPINE_W, COVER_H, PAGES_D + COVER_D * 2]} />
        <meshStandardMaterial color={SPINE_COLOR} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Front cover -- pivots at spine (left edge) */}
      <group
        ref={frontCoverRef}
        position={[-(COVER_W / 2), 0, PAGES_D / 2 + COVER_D / 2]}
      >
        {/* Cover body */}
        <mesh position={[COVER_W / 2, 0, 0]}>
          <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
          <meshStandardMaterial color={COVER_COLOR} roughness={0.65} metalness={0.12} />
        </mesh>

        {/* Subtle decorative rectangle on cover face */}
        <mesh position={[COVER_W / 2, 0, COVER_D / 2 + 0.001]}>
          <planeGeometry args={[COVER_W * 0.65, COVER_H * 0.65]} />
          <meshStandardMaterial
            color={ACCENT_COLOR}
            transparent
            opacity={0.12}
            roughness={0.5}
          />
        </mesh>

        {/* Inner border accent */}
        <mesh position={[COVER_W / 2, 0, COVER_D / 2 + 0.002]}>
          <ringGeometry args={[0.55, 0.57, 4]} />
          <meshStandardMaterial
            color="#c4b5fd"
            transparent
            opacity={0.2}
            metalness={0.6}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

/* ── Scene wrapper ── */
interface DiarySceneProps {
  isOpening: boolean;
  onOpenComplete: () => void;
}

export default function DiaryScene({ isOpening, onOpenComplete }: DiarySceneProps) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
    <Canvas
      camera={{ position: [0, 1.2, 4.5], fov: 35 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-3, 2, 4]} intensity={0.4} color="#a78bfa" />
      <pointLight position={[2, -1, 3]} intensity={0.15} color="#e9d5ff" />

      {/* Book */}
      <Book isOpening={isOpening} onOpenComplete={onOpenComplete} />

      {/* Soft ground plane */}
      <mesh position={[0, -0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial color="#1a0535" transparent opacity={0.4} />
      </mesh>
    </Canvas>
    </div>
  );
}
