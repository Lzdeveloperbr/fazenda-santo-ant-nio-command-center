import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Html, Line } from "@react-three/drei";
import { Pig, Piglet } from "./Pig";
import type { LitterAlert } from "@/lib/farm/litter-alerts";

const ANCHOR: Record<LitterAlert["anchor"], [number, number, number]> = {
  cabeca: [0.75, 0.85, 0], ventre: [0, 0.22, 0.35], dorso: [-0.1, 1.02, 0], leitoes: [-0.6, 0.2, 0.8], patas: [0.32, 0.08, -0.3],
};
const LABEL: [number, number, number][] = [[-0.9, 1.6, 0.3], [1.0, 1.55, 0.1], [-1.0, 0.95, 1.3], [1.05, 0.8, 1.2], [0.1, 1.95, -0.5], [-1.1, 1.3, -1.1]];
// 3D scene cannot read CSS tokens; mirror the theme's status hues.
const COLOR: Record<LitterAlert["level"], string> = { alerta: "#d9534f", atencao: "#d99a2b", info: "#2f7f93", ok: "#3f8f5f" };

/** Sow + litter with numbered callouts pointing to the recorded issues. */
export default function LitterDiagnosisScene({ alerts, live, deaths }: { alerts: LitterAlert[]; live: number; deaths: number }) {
  const n = Math.min(live, 16);
  return (
    <div data-scene-ready className="relative h-[380px] w-full touch-none overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/30 to-muted/80 sm:h-[440px]">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [2.6, 2.6, 5.2], fov: 50 }}>
        <hemisphereLight args={["#fff8ee", "#7a9a80", 1.1]} />
        <directionalLight position={[3, 6, 3]} intensity={1.6} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[2.6, 48]} /><meshStandardMaterial color="#cdbf9e" roughness={1} /></mesh>
        <Pig status="lactante" idle />
        {Array.from({ length: n }).map((_, i) => { return <group key={i} position={[((i % 8) - 3.5) * 0.24, 0, 0.75 + Math.floor(i / 8) * 0.38]} rotation={[0, Math.PI / 2 + (i % 2 ? 0.25 : -0.25), 0]}><Piglet /></group>; })}
        {Array.from({ length: Math.min(deaths, 6) }).map((_, i) => <mesh key={"d" + i} position={[-1.7 + i * 0.22, 0.05, -1.4]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#8794A6" transparent opacity={0.6} /></mesh>)}
        {alerts.slice(0, 6).map((al, i) => {
          const from = ANCHOR[al.anchor]; const to = LABEL[i]!; const c = COLOR[al.level];
          return <group key={al.id}>
            <Line points={[from, to]} color={c} lineWidth={2} dashed={al.level === "info"} dashSize={0.08} gapSize={0.05} />
            <mesh position={from}><sphereGeometry args={[0.055, 12, 12]} /><meshBasicMaterial color={c} /></mesh>
          </group>;
        })}
        {alerts.slice(0, 6).map((al, i) => { const c = COLOR[al.level]; const to = LABEL[i]!; return (
            <Html key={"l" + al.id} position={to} center zIndexRange={[20, 0]}>
              <div className="pointer-events-none flex max-w-[120px] items-center gap-1.5 rounded-md border bg-card/95 px-1.5 py-1 shadow-lg backdrop-blur" style={{ borderColor: c }}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-primary-foreground" style={{ background: c }}>{i + 1}</span>
                <span className="text-[11px] font-semibold leading-tight text-foreground">{al.title}</span>
              </div>
            </Html>
        ); })}
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} blur={2.5} scale={5} />
        <OrbitControls target={[0, 0.6, 0.2]} enablePan={false} minDistance={3} maxDistance={9} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-muted-foreground">Representação ilustrativa · arraste para girar</p>
    </div>
  );
}
