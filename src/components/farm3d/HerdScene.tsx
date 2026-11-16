import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Pig } from "./Pig";
import type { Sow } from "@/lib/farm";

/** Herd scene: one stylized pig per registered sow, laid out in a grid of pens. */
export default function HerdScene({ sows, selectedId, onSelect }: { sows: Sow[]; selectedId?: string | undefined; onSelect: (id: string) => void }) {
  const cols = Math.max(1, Math.min(sows.length, Math.ceil(Math.sqrt(sows.length * 1.6))));
  const gap = 2.2;
  const rows = Math.ceil(sows.length / cols);
  const w = cols * gap, d = rows * gap;
  return (
    <div data-scene-ready className="h-[58vh] min-h-80 w-full touch-none overflow-hidden rounded-xl bg-muted/60">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, Math.max(6, d * 0.9), Math.max(7, d * 1.1)], fov: 42 }}>
        <hemisphereLight args={["#fff8ee", "#6f8f72", 1]} />
        <directionalLight position={[6, 10, 4]} intensity={1.5} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[w + 4, d + 4]} />
          <meshStandardMaterial color="#d9cfb6" roughness={1} />
        </mesh>
        {sows.map((s, i) => {
          const x = (i % cols) * gap - (w - gap) / 2;
          const z = Math.floor(i / cols) * gap - (d - gap) / 2;
          return (
            <group key={s.id} position={[x, 0, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
                <planeGeometry args={[gap - 0.15, gap - 0.15]} />
                <meshStandardMaterial color="#c9bea2" roughness={1} />
              </mesh>
              <Pig status={s.status} pregnant={s.status === "gestante"} scale={0.8} selected={s.id === selectedId} onClick={() => onSelect(s.id)} />
              <Html position={[0, 1.25, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
                <button onClick={() => onSelect(s.id)} className="whitespace-nowrap rounded-md border bg-card px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-sm">{s.ear_tag}</button>
              </Html>
            </group>
          );
        })}
        <OrbitControls enablePan maxPolarAngle={Math.PI / 2.2} minDistance={3} maxDistance={40} />
      </Canvas>
    </div>
  );
}
