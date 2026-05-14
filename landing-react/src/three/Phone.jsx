/**
 * Phone.jsx — Procedural 3D iPhone mesh.
 *
 * Built from drei's <RoundedBox> + planes (no external GLB → 0 asset weight).
 * Tracks cursor via useFrame for natural tilt with damping.
 * <Html transform> mounts the chat content INSIDE the screen plane.
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html, Float, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import ChatStack from './ChatStack.jsx';

export default function Phone({ cursorRef }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Tilt-on-cursor via useFrame (60fps, framer-motion not involved here)
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const cx = cursorRef.current?.x ?? 0;       // -1 .. 1
    const cy = cursorRef.current?.y ?? 0;       // -1 .. 1

    // Target rotation (max ±0.18 rad ~ 10°)
    const targetY = cx * 0.18;
    const targetX = -cy * 0.12;

    // Critical-damped interpolation
    const k = Math.min(1, dt * 4);
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * k;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * k;

    // Subtle scale on hover (lift)
    const targetScale = hovered ? 1.03 : 1;
    const s = groupRef.current.scale.x;
    groupRef.current.scale.setScalar(s + (targetScale - s) * k);
  });

  // Phone dimensions (relative units — camera FOV controls visible size)
  const W = 1.7;
  const H = 3.5;
  const D = 0.18;
  const screenInset = 0.06;

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
      <group
        ref={groupRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* ── Phone body (dark space-grey-ish) ───────────────────── */}
        <RoundedBox args={[W, H, D]} radius={0.22} smoothness={6} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#1f1d1b"
            metalness={0.85}
            roughness={0.32}
            clearcoat={0.6}
            clearcoatRoughness={0.4}
          />
        </RoundedBox>

        {/* ── Glass screen plane (slightly forward) ──────────────── */}
        <mesh position={[0, 0, D / 2 + 0.001]}>
          <planeGeometry args={[W - screenInset, H - screenInset]} />
          <meshPhysicalMaterial
            color="#0a0a0a"
            metalness={0.1}
            roughness={0.05}
            transmission={0.05}
            ior={1.5}
          />
        </mesh>

        {/* ── Screen content (HTML mounted in 3D space) ─────────── */}
        <Html
          transform
          occlude
          distanceFactor={1.5}
          position={[0, 0, D / 2 + 0.012]}
          style={{
            width:  `${(W - screenInset) * 200}px`,
            height: `${(H - screenInset) * 200}px`,
            pointerEvents: 'none',
          }}
        >
          <ChatStack />
        </Html>

        {/* ── Side button (volume) ───────────────────────────────── */}
        <RoundedBox args={[0.02, 0.5, 0.05]} radius={0.005} position={[-W/2, 0.6, 0]}>
          <meshStandardMaterial color="#2a2826" metalness={0.7} roughness={0.4} />
        </RoundedBox>
        <RoundedBox args={[0.02, 0.3, 0.05]} radius={0.005} position={[-W/2, 0.05, 0]}>
          <meshStandardMaterial color="#2a2826" metalness={0.7} roughness={0.4} />
        </RoundedBox>

        {/* ── Soft contact shadow under phone ───────────────────── */}
        <mesh position={[0, -H / 2 - 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 32]} />
          <meshBasicMaterial color="#1A1A1A" transparent opacity={0.08} />
        </mesh>
      </group>
    </Float>
  );
}
