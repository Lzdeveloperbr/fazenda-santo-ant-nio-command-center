import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/** Status → accent color for the stylized low-poly pig (3D scene cannot read CSS tokens). */
export const PIG_STATUS_COLOR: Record<string, string> = {
  vazia: "#8794A6", coberta: "#49B9FF", gestante: "#5CE1E6", lactante: "#24C875",
  descartada: "#FF5263", morta: "#FF5263", transferida: "#FFB454",
};
const SKIN = "#f2b8a8";
const SKIN_DARK = "#d98f80";

/** Stylized low-poly pig: a visual representation of a sow's category, linked to its real record. */
export function Pig({ status, pregnant, scale = 1, selected, idle = true, onClick }: {
  status: string; pregnant?: boolean | undefined; scale?: number; selected?: boolean | undefined; idle?: boolean; onClick?: (() => void) | undefined;
}) {
  const ref = useRef<Group>(null);
  const seed = useRef(Math.random() * 10);
  useFrame(({ clock }) => {
    if (!ref.current || !idle) return;
    const t = clock.elapsedTime + seed.current;
    ref.current.position.y = Math.abs(Math.sin(t * 1.6)) * 0.03;
    ref.current.rotation.y = Math.sin(t * 0.4) * 0.15;
  });
  const accent = PIG_STATUS_COLOR[status] ?? "#8794A6";
  const belly = pregnant ? 1.18 : 1;
  return (
    <group scale={scale} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      <group ref={ref}>
        {/* body */}
        <mesh castShadow position={[0, 0.55, 0]} scale={[1, 0.78 * belly, 0.72 * belly]}>
          <icosahedronGeometry args={[0.62, 1]} />
          <meshStandardMaterial color={SKIN} flatShading roughness={0.7} />
        </mesh>
        {/* head */}
        <mesh castShadow position={[0.62, 0.68, 0]}>
          <icosahedronGeometry args={[0.32, 1]} />
          <meshStandardMaterial color={SKIN} flatShading roughness={0.7} />
        </mesh>
        {/* snout */}
        <mesh position={[0.92, 0.64, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.15, 0.12, 8]} />
          <meshStandardMaterial color={SKIN_DARK} flatShading />
        </mesh>
        {/* ears */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.58, 0.98, 0.17 * s]} rotation={[0.4 * s, 0, -0.5]}>
            <coneGeometry args={[0.09, 0.2, 4]} />
            <meshStandardMaterial color={SKIN_DARK} flatShading />
          </mesh>
        ))}
        {/* eyes */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.85, 0.78, 0.13 * s]}>
            <sphereGeometry args={[0.035, 6, 6]} />
            <meshStandardMaterial color="#10151D" />
          </mesh>
        ))}
        {/* legs */}
        {([[-0.32, -0.25], [-0.32, 0.25], [0.32, -0.25], [0.32, 0.25]] as [number, number][]).map(([x, z], i) => (
          <mesh key={i} castShadow position={[x, 0.18, z]}>
            <cylinderGeometry args={[0.08, 0.07, 0.36, 6]} />
            <meshStandardMaterial color={SKIN_DARK} flatShading />
          </mesh>
        ))}
        {/* tail */}
        <mesh position={[-0.62, 0.72, 0]} rotation={[0, 0, 0.8]}>
          <torusGeometry args={[0.06, 0.02, 4, 8, Math.PI * 1.5]} />
          <meshStandardMaterial color={SKIN_DARK} />
        </mesh>
        {/* status collar */}
        <mesh position={[0.42, 0.66, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.3, 0.035, 6, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} />
        </mesh>
      </group>
      {/* base ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.75, selected ? 0.9 : 0.8, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={selected ? 0.9 : 0.45} />
      </mesh>
    </group>
  );
}

/** Small static piglet used for litter and pen representations (by quantity, not identity). */
export function Piglet({ scale = 0.35 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh castShadow position={[0, 0.5, 0]} scale={[1, 0.8, 0.75]}><icosahedronGeometry args={[0.6, 1]} /><meshStandardMaterial color={SKIN} flatShading /></mesh>
      <mesh castShadow position={[0.6, 0.62, 0]}><icosahedronGeometry args={[0.32, 1]} /><meshStandardMaterial color={SKIN} flatShading /></mesh>
      <mesh position={[0.9, 0.58, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.14, 0.1, 8]} /><meshStandardMaterial color={SKIN_DARK} flatShading /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[0.56, 0.92, 0.16 * s]} rotation={[0.4 * s, 0, -0.5]}><coneGeometry args={[0.09, 0.2, 4]} /><meshStandardMaterial color={SKIN_DARK} flatShading /></mesh>)}
      {([[-0.3, -0.22], [-0.3, 0.22], [0.3, -0.22], [0.3, 0.22]] as [number, number][]).map(([x, z], i) => <mesh key={i} position={[x, 0.15, z]}><cylinderGeometry args={[0.08, 0.07, 0.3, 6]} /><meshStandardMaterial color={SKIN_DARK} flatShading /></mesh>)}
    </group>
  );
}
