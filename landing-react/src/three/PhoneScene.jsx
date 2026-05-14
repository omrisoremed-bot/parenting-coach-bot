/**
 * PhoneScene.jsx — Canvas wrapper + lighting + camera setup.
 *
 * Lazy-loaded by Hero so the R3F bundle (~200KB) doesn't block FCP.
 * Cursor position is captured at App level and passed via ref to Phone
 * for tilt animation (60fps via useFrame).
 */
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import Phone from './Phone.jsx';

export default function PhoneScene({ cursorRef }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      shadows
    >
      {/* Soft 3-point lighting — warm fill, cool key */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 4, 3]}
        intensity={1.2}
        color="#FFE4C4"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-3, 2, 4]}
        intensity={0.6}
        color="#F5F1E8"
      />
      <pointLight position={[0, -2, 3]} intensity={0.4} color="#C2613E" />

      {/* HDRI lite — adds reflections without an actual image */}
      <Environment preset="apartment" environmentIntensity={0.4} />

      {/* Phone (tilts toward cursor) */}
      <Phone cursorRef={cursorRef} />

      {/* Soft ground shadow */}
      <ContactShadows
        position={[0, -2.0, 0]}
        opacity={0.32}
        scale={4.5}
        blur={2.4}
        far={3}
        color="#1A1A1A"
      />
    </Canvas>
  );
}
