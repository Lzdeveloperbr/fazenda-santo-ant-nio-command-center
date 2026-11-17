import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Vector3 } from "three";
import { Pig, Piglet } from "./Pig";
import type { LitterAlert } from "@/lib/farm/litter-alerts";

const ANCHOR: Record<LitterAlert["anchor"], [number, number, number]> = {
  cabeca: [0.75, 0.85, 0], ventre: [0, 0.25, 0.3], dorso: [-0.1, 1.02, 0], leitoes: [-0.5, 0.2, 0.8], patas: [0.32, 0.08, -0.3],
};
// 3D scene cannot read CSS tokens; mirror the theme's status hues.
const COLOR: Record<LitterAlert["level"], string> = { alerta: "#d9534f", atencao: "#d99a2b", info: "#2f7f93", ok: "#3f8f5f" };
const LABEL_W = 132, LABEL_H = 44, GAP = 10;

type Refs = { line: (SVGLineElement | null)[]; dot: (SVGCircleElement | null)[]; label: (HTMLDivElement | null)[] };

/** Projects each 3D anchor to screen space every frame and moves the SVG leader lines (no React re-render). */
function Projector({ anchors, refs }: { anchors: [number, number, number][]; refs: React.MutableRefObject<Refs> }) {
  const { camera, size } = useThree();
  const v = useRef(new Vector3());
  useFrame(() => {
    anchors.forEach((a, i) => {
      v.current.set(...a).project(camera);
      const x = (v.current.x * 0.5 + 0.5) * size.width, y = (-v.current.y * 0.5 + 0.5) * size.height;
      const left = i % 2 === 0, row = Math.floor(i / 2);
      const lx = left ? GAP + LABEL_W : size.width - GAP - LABEL_W, ly = GAP + row * (LABEL_H + 8) + LABEL_H / 2;
      const line = refs.current.line[i], dot = refs.current.dot[i];
      if (line) { line.setAttribute("x1", String(lx)); line.setAttribute("y1", String(ly)); line.setAttribute("x2", String(x)); line.setAttribute("y2", String(y)); }
      if (dot) { dot.setAttribute("cx", String(x)); dot.setAttribute("cy", String(y)); }
    });
  });
  return null;
}

/** Sow + litter with numbered callouts whose arrows point to the recorded issues. */
export default function LitterDiagnosisScene({ alerts, live, deaths }: { alerts: LitterAlert[]; live: number; deaths: number }) {
  const n = Math.min(live, 16);
  const shown = alerts.slice(0, 6);
  const refs = useRef<Refs>({ line: [], dot: [], label: [] });
  return (
    <div data-scene-ready className="relative h-[400px] w-full touch-none overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/30 to-muted/80 sm:h-[460px]">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [2.4, 2.3, 4.6], fov: 44 }}>
        <hemisphereLight args={["#fff8ee", "#7a9a80", 1.1]} />
        <directionalLight position={[3, 6, 3]} intensity={1.6} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[2.6, 48]} /><meshStandardMaterial color="#cdbf9e" roughness={1} /></mesh>
        <group position={[0, 0, -0.2]}><Pig status="lactante" idle /></group>
        {Array.from({ length: n }).map((_, i) => <group key={i} position={[((i % 8) - 3.5) * 0.24, 0, 0.75 + Math.floor(i / 8) * 0.38]} rotation={[0, Math.PI / 2 + (i % 2 ? 0.25 : -0.25), 0]}><Piglet /></group>)}
        {Array.from({ length: Math.min(deaths, 6) }).map((_, i) => <mesh key={"d" + i} position={[-1.6 + i * 0.22, 0.05, -1.3]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#8794A6" transparent opacity={0.6} /></mesh>)}
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} blur={2.5} scale={5} />
        <Projector anchors={shown.map((a) => ANCHOR[a.anchor])} refs={refs} />
        <OrbitControls target={[0, 0.5, 0.2]} enablePan={false} minDistance={3} maxDistance={9} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>{shown.map((al) => <marker key={al.id} id={`arw-${al.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={COLOR[al.level]} /></marker>)}</defs>
        {shown.map((al, i) => <g key={al.id}>
          <line ref={(el) => { refs.current.line[i] = el; }} stroke={COLOR[al.level]} strokeWidth={2} strokeDasharray={al.level === "info" ? "5 4" : undefined} markerEnd={`url(#arw-${al.id})`} />
          <circle ref={(el) => { refs.current.dot[i] = el; }} r={9} fill={COLOR[al.level]} opacity={0.18} />
        </g>)}
      </svg>
      {shown.map((al, i) => { const left = i % 2 === 0, row = Math.floor(i / 2); return (
        <div key={al.id} className="pointer-events-none absolute flex items-center gap-1.5 rounded-lg border-2 bg-card/95 px-2 shadow-md backdrop-blur" style={{ borderColor: COLOR[al.level], width: LABEL_W, height: LABEL_H, top: GAP + row * (LABEL_H + 8), ...(left ? { left: GAP } : { right: GAP }) }}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-primary-foreground" style={{ background: COLOR[al.level] }}>{i + 1}</span>
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground">{al.title}</span>
        </div>); })}
      <p className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-muted-foreground">Representação ilustrativa · arraste para girar</p>
    </div>
  );
}
