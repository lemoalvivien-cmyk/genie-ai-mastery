/**
 * GenieAvatarR3F — React Three Fiber morphing 3D avatar
 * Fixed: forwardRef on all mesh components to silence React warnings
 * Icosahedron + MeshDistortMaterial + orbital rings + particles
 */
import { useRef, useMemo, forwardRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/* ── Outer glow sphere ───────────────────────────────────────── */
const GlowSphere = forwardRef<THREE.Mesh>((_, ref) => (
  <mesh ref={ref}>
    <sphereGeometry args={[1.15, 48, 48]} />
    <meshPhysicalMaterial
      color="#3466A8"
      transparent
      opacity={0.06}
      roughness={0.2}
      metalness={0.9}
      side={THREE.BackSide}
    />
  </mesh>
));
GlowSphere.displayName = "GlowSphere";

/* ── Core morphing icosahedron ────────────────────────────────── */
const MorphCore = forwardRef<THREE.Group>((_, ref) => {
  const meshRef   = useRef<THREE.Mesh>(null);
  const glowRef   = useRef<THREE.Mesh>(null);
  const ringsRef  = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.22;
      meshRef.current.rotation.y = t * 0.31;
      meshRef.current.scale.setScalar(0.85 + Math.sin(t * 2.1) * 0.08);
    }
    if (glowRef.current) {
      glowRef.current.rotation.x = -t * 0.12;
      glowRef.current.rotation.z =  t * 0.09;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.y = t * 0.18;
    }
  });

  const rings = useMemo(() => [
    { rx: 0,           ry: Math.PI / 2, rz: 0,            r: 1.35, tube: 0.014, color: "#5257D8", op: 0.45 },
    { rx: Math.PI / 3, ry: 0,           rz: Math.PI / 5,  r: 1.55, tube: 0.010, color: "#00F0FF", op: 0.30 },
    { rx: Math.PI / 6, ry: Math.PI / 4, rz: Math.PI / 3,  r: 1.75, tube: 0.008, color: "#3466A8", op: 0.22 },
  ], []);

  return (
    <group ref={ref}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.15, 48, 48]} />
        <meshPhysicalMaterial color="#3466A8" transparent opacity={0.06} roughness={0.2} metalness={0.9} side={THREE.BackSide} />
      </mesh>

      {/* Main morphing core */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.88, 4]} />
        <MeshDistortMaterial
          color="#5257D8"
          distort={0.45}
          speed={2.2}
          roughness={0.12}
          metalness={0.85}
          emissive="#1a1e5c"
          emissiveIntensity={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Inner white core */}
      <mesh>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#8088ff" emissiveIntensity={2.5} roughness={0.0} metalness={0.0} />
      </mesh>

      {/* Orbital rings */}
      <group ref={ringsRef}>
        {rings.map((r, i) => (
          <mesh key={i} rotation={[r.rx, r.ry, r.rz]}>
            <torusGeometry args={[r.r, r.tube, 16, 120]} />
            <meshBasicMaterial color={r.color} transparent opacity={r.op} />
          </mesh>
        ))}
      </group>
    </group>
  );
});
MorphCore.displayName = "MorphCore";

/* ── Single orbit particle ───────────────────────────────────── */
function OrbitParticle({ index }: { index: number }) {
  const ref    = useRef<THREE.Mesh>(null);
  const phase  = (index / 10) * Math.PI * 2;
  const radius = 1.0 + (index % 3) * 0.25;
  const speed  = 0.8 + index * 0.07;
  const color  = index % 2 === 0 ? "#5257D8" : "#00F0FF";

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase;
    if (ref.current) {
      ref.current.position.set(
        Math.cos(t) * radius,
        Math.sin(t * 0.7) * radius * 0.45,
        Math.sin(t) * radius,
      );
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.7 + (index % 3) * 0.1} />
    </mesh>
  );
}

/* ── Exported wrapper ─────────────────────────────────────────── */
export function GenieAvatarR3F({
  size = 220,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        filter: "drop-shadow(0 0 32px rgba(82,87,216,0.55))",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3.6], fov: 42 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        {/* Lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[3, 3, 3]}    intensity={1.8} color="#5257D8" />
        <pointLight position={[-3, -2, -3]} intensity={0.9} color="#00F0FF" />
        <pointLight position={[0, -4, 2]}   intensity={0.5} color="#FE2C40" />

        <MorphCore />

        {/* Orbital particles — not given refs from parent, internal refs only */}
        {Array.from({ length: 10 }).map((_, i) => (
          <OrbitParticle key={i} index={i} />
        ))}
      </Canvas>

      {/* Label */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "rgba(82,87,216,0.8)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        GENIE · ACTIF
      </div>
    </div>
  );
}
