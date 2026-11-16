import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Pig } from "./Pig";

/** Interactive single-pig viewer used in the sow record. Drag to rotate, pinch/scroll to zoom. */
export default function PigViewer({ status }: { status: string }) {
  return (
    <div data-scene-ready className="h-64 w-full touch-none overflow-hidden rounded-xl bg-muted/60 sm:h-72">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [2.2, 1.6, 2.4], fov: 40 }}>
        <hemisphereLight args={["#fff8ee", "#7a9a80", 1.1]} />
        <directionalLight position={[3, 5, 2]} intensity={1.6} castShadow />
        <Pig status={status} pregnant={status === "gestante"} />
        <ContactShadows position={[0, 0, 0]} opacity={0.35} blur={2.5} scale={4} />
        <OrbitControls target={[0.15, 0.55, 0]} enablePan={false} minDistance={1.8} maxDistance={6} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </div>
  );
}
