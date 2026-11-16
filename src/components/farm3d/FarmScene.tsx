import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Piglet } from "./Pig";

export type PenView = { id: string; code: string; sector: string; capacity: number; count: number | null };

/** Schematic farm: pens grouped by sector in rows. Occupancy fill comes only from the latest recorded animal count. */
export default function FarmScene({ pens, selectedId, onSelect }: { pens: PenView[]; selectedId?: string | undefined; onSelect: (id: string) => void }) {
  const sectors = [...new Set(pens.map((p) => p.sector))];
  const W = 1.8, G = 0.25;
  const maxCols = Math.max(1, ...sectors.map((s) => pens.filter((p) => p.sector === s).length));
  const width = maxCols * (W + G), depth = sectors.length * (W + 1.4);
  return (
    <div data-scene-ready className="h-[58vh] min-h-80 w-full touch-none overflow-hidden rounded-xl bg-muted/60">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, Math.max(8, depth), Math.max(9, depth * 1.2)], fov: 42 }}>
        <hemisphereLight args={["#fff8ee", "#6f8f72", 1]} />
        <directionalLight position={[6, 12, 5]} intensity={1.4} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[width + 6, depth + 6]} /><meshStandardMaterial color="#b9c7a3" roughness={1} /></mesh>
        {sectors.map((sector, si) => {
          const row = pens.filter((p) => p.sector === sector);
          const z = si * (W + 1.4) - (depth - W - 1.4) / 2;
          return <group key={sector} position={[0, 0, z]}>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[row.length * (W + G) + 0.4, W + 0.4]} /><meshStandardMaterial color="#d9cfb6" /></mesh>
            <Html position={[-(row.length * (W + G)) / 2 - 0.3, 0.1, 0]} center distanceFactor={12}><span className="whitespace-nowrap rounded bg-card px-1.5 py-0.5 text-[11px] font-bold text-foreground shadow-sm">{sector}</span></Html>
            {row.map((p, i) => {
              const x = i * (W + G) - ((row.length - 1) * (W + G)) / 2;
              const ratio = p.count != null && p.capacity > 0 ? Math.min(1, p.count / p.capacity) : 0;
              const sel = p.id === selectedId;
              const color = p.count == null ? "#8794A6" : ratio >= 1 ? "#FFB454" : "#24C875";
              return <group key={p.id} position={[x, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}>
                {/* fence walls */}
                {[[0, -W / 2, W, 0.06], [0, W / 2, W, 0.06], [-W / 2, 0, 0.06, W], [W / 2, 0, 0.06, W]].map(([fx, fz, sx, sz], k) =>
                  <mesh key={k} position={[fx!, 0.22, fz!]} castShadow><boxGeometry args={[sx!, 0.44, sz!]} /><meshStandardMaterial color={sel ? "#49B9FF" : "#7a5b3a"} /></mesh>)}
                <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W - 0.1, W - 0.1]} /><meshStandardMaterial color={color} transparent opacity={0.18 + ratio * 0.45} /></mesh>
                {Array.from({ length: Math.min(p.count ?? 0, 6) }).map((_, k) => <group key={k} position={[((k % 3) - 1) * 0.5, 0.04, (Math.floor(k / 3) - 0.5) * 0.6]} rotation={[0, k * 1.3, 0]}><Piglet /></group>)}
                <Html position={[0, 0.75, 0]} center distanceFactor={11}><button onClick={() => onSelect(p.id)} className="whitespace-nowrap rounded-md border bg-card px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-sm">{p.code}</button></Html>
              </group>;
            })}
          </group>;
        })}
        <OrbitControls maxPolarAngle={Math.PI / 2.2} minDistance={3} maxDistance={50} />
      </Canvas>
    </div>
  );
}
