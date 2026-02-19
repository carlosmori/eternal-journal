'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Glowing torus (anillo brillante) ── */
const torusVertexShader = `
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vNormal = normal;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const torusFragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
    vec3 color = mix(uColor1, uColor2, fresnel * 0.5 + vUv.x * 0.3);
    float alpha = (0.25 + fresnel * 0.35) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

function GlowingTorus({ isOpening, opacity = 0.6 }: { isOpening?: boolean; opacity?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uColor1: { value: new THREE.Color('#8b5cf6') },
      uColor2: { value: new THREE.Color('#ec4899') },
    }),
    [opacity],
  );

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uOpacity.value = isOpening ? opacity * 0.5 : opacity;
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.PI / 2.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.04;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]} scale={1.4}>
      <torusGeometry args={[0.7, 0.12, 32, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={torusVertexShader}
        fragmentShader={torusFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ── Particle constellation (network / blockchain feel) ── */
const PARTICLE_COUNT = 140;
const CONNECTION_DISTANCE = 0.75;

function ParticleConstellation({
  isOpening,
  opacity = 0.5,
}: {
  isOpening?: boolean;
  opacity?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    return pos;
  }, []);

  const maxLines = Math.floor((PARTICLE_COUNT * (PARTICLE_COUNT - 1)) / 2);
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(maxLines * 6), 3),
    );
    geo.setDrawRange(0, 0);
    return geo;
  }, [maxLines]);

  useFrame((state) => {
    if (!pointsRef.current || !linesRef.current) return;

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3] += Math.sin(time + i * 0.1) * 0.002;
      posArray[i * 3 + 1] += Math.cos(time * 0.7 + i * 0.05) * 0.002;
      posArray[i * 3 + 2] += Math.sin(time * 0.5 + i * 0.08) * 0.001;
    }
    posAttr.needsUpdate = true;

    const lineAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const lineArray = lineAttr.array as Float32Array;
    let lineCount = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x1 = posArray[i * 3];
      const y1 = posArray[i * 3 + 1];
      const z1 = posArray[i * 3 + 2];

      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const x2 = posArray[j * 3];
        const y2 = posArray[j * 3 + 1];
        const z2 = posArray[j * 3 + 2];

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < CONNECTION_DISTANCE) {
          const idx = lineCount * 6;
          lineArray[idx] = x1;
          lineArray[idx + 1] = y1;
          lineArray[idx + 2] = z1;
          lineArray[idx + 3] = x2;
          lineArray[idx + 4] = y2;
          lineArray[idx + 5] = z2;
          lineCount++;
        }
      }
    }

    lineAttr.needsUpdate = true;
    linesRef.current.geometry.setDrawRange(0, lineCount * 2);
  });

  const baseOpacity = isOpening ? 0.15 : opacity;

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#e9d5ff"
          transparent
          opacity={baseOpacity}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={baseOpacity * 0.5}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

/* ── Sparkle stars (twinkling) ── */
const SPARKLE_COUNT = 80;

function SparkleField({ isOpening }: { isOpening?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const { positions } = useMemo(() => {
    const pos = new Float32Array(SPARKLE_COUNT * 3);
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 0.5;
    }
    return { positions: pos };
  }, []);

  useFrame((state) => {
    if (!materialRef.current) return;
    const t = state.clock.elapsedTime;
    materialRef.current.opacity = 0.3 + Math.sin(t * 2) * 0.15;
    if (isOpening) materialRef.current.opacity *= 0.3;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={SPARKLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.08}
        color="#ffffff"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── Hex grid (blockchain / chain feel) ── */
function HexGrid() {
  const lineRef = useRef<THREE.LineSegments>(null);

  const { positions } = useMemo(() => {
    const pos: number[] = [];
    const size = 0.4;
    const cols = 8;
    const rows = 6;

    for (let row = -rows; row <= rows; row++) {
      for (let col = -cols; col <= cols; col++) {
        const x = col * size * 1.732;
        const y = row * size * 1.5 + (col % 2) * size * 0.75;
        const z = -2.5;

        const r = size * 0.5;
        for (let i = 0; i < 6; i++) {
          const a1 = (i / 6) * Math.PI * 2;
          const a2 = ((i + 1) / 6) * Math.PI * 2;
          pos.push(x + Math.cos(a1) * r, y + Math.sin(a1) * r, z);
          pos.push(x + Math.cos(a2) * r, y + Math.sin(a2) * r, z);
        }
      }
    }

    return { positions: new Float32Array(pos) };
  }, []);

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#a78bfa" transparent opacity={0.06} depthWrite={false} />
    </lineSegments>
  );
}

/* ── Scene ── */
function Scene({ isOpening, variant }: { isOpening?: boolean; variant?: 'home' | 'journal' }) {
  const particleOpacity = variant === 'journal' ? 0.35 : 0.5;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 2, 2]} intensity={0.6} color="#a78bfa" />
      <pointLight position={[-2, -1, 2]} intensity={0.35} color="#ec4899" />
      <GlowingTorus isOpening={isOpening} opacity={variant === 'journal' ? 0.45 : 0.6} />
      <HexGrid />
      <ParticleConstellation isOpening={isOpening} opacity={particleOpacity} />
      <SparkleField isOpening={isOpening} />
    </>
  );
}

export interface UniverseSceneProps {
  isOpening?: boolean;
  variant?: 'home' | 'journal';
}

export default function UniverseScene({ isOpening = false, variant = 'home' }: UniverseSceneProps) {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        }}
      >
        <Scene isOpening={isOpening} variant={variant} />
      </Canvas>
    </div>
  );
}
