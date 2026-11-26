import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Pig } from "./Pig";

/**
 * Paisagem estilizada da granja (low-poly, procedural): colinas, galpões,
 * silos, cata-vento, árvores, nuvens e lavoura. Porcos só aparecem quando
 * `sows` é informado — um por matriz real cadastrada (regra do projeto).
 */
export type LandscapeSow = { id: string; status: string };

const GREEN = "#5f9a5c",
  GREEN_D = "#3f7a46",
  SOIL = "#9b7a4f",
  ROOF = "#dfe5e3",
  WALL = "#f3ead6",
  WOOD = "#7a5b3a",
  GOLD = "#d9b35e";

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Hills() {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(30, 64, 0, Math.PI * 2);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      const d = Math.hypot(x, z);
      const h =
        d < 9
          ? 0
          : Math.sin(x * 0.35) * Math.cos(z * 0.3) * 0.9 * Math.min(1, (d - 9) / 6) +
            (d > 18 ? (d - 18) * 0.12 : 0);
      pos.setY(i, h);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color={GREEN} flatShading roughness={1} />
    </mesh>
  );
}

function Shed({
  position,
  length = 7,
  rotation = 0,
}: {
  position: [number, number, number];
  length?: number;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 1.1, 2.2]} />
        <meshStandardMaterial color={WALL} flatShading />
      </mesh>
      {/* telhado em duas águas */}
      <mesh position={[0, 1.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.85, 0.85, length + 0.3, 3, 1]} />
        <meshStandardMaterial color={ROOF} flatShading />
      </mesh>
      {/* janelas/cortinas laterais */}
      {Array.from({ length: Math.floor(length / 1.1) }).map((_, i) => (
        <mesh key={i} position={[-length / 2 + 0.7 + i * 1.1, 0.62, 1.11]}>
          <boxGeometry args={[0.7, 0.32, 0.02]} />
          <meshStandardMaterial color="#3d6f55" />
        </mesh>
      ))}
    </group>
  );
}

function Silo({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 2.6, 10]} />
        <meshStandardMaterial color="#cfd6d6" flatShading metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.9, 0]} castShadow>
        <coneGeometry args={[0.66, 0.65, 10]} />
        <meshStandardMaterial color="#b9c2c2" flatShading />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.18, 0.4, 0.25, 8]} />
        <meshStandardMaterial color="#9aa4a4" />
      </mesh>
    </group>
  );
}

function Windmill({ position }: { position: [number, number, number] }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 1.2;
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.16, 3.6, 6]} />
        <meshStandardMaterial color="#8a9497" />
      </mesh>
      <group ref={blades} position={[0, 3.6, 0.15]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]} position={[0, 0, 0]}>
            <boxGeometry args={[0.12, 1.3, 0.02]} />
            <meshStandardMaterial color="#e9ece9" />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={GOLD} />
        </mesh>
      </group>
    </group>
  );
}

function Tree({
  position,
  scale = 1,
  seed,
}: {
  position: [number, number, number];
  scale?: number;
  seed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + seed) * 0.035;
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.7, 6]} />
        <meshStandardMaterial color={WOOD} flatShading />
      </mesh>
      <group ref={ref} position={[0, 0.7, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <coneGeometry args={[0.55, 1, 7]} />
          <meshStandardMaterial color={GREEN_D} flatShading />
        </mesh>
        <mesh position={[0, 0.95, 0]} castShadow>
          <coneGeometry args={[0.4, 0.8, 7]} />
          <meshStandardMaterial color="#4c8a52" flatShading />
        </mesh>
      </group>
    </group>
  );
}

function Cloud({
  y,
  radius,
  speed,
  offset,
}: {
  y: number;
  radius: number;
  speed: number;
  offset: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const a = clock.elapsedTime * speed + offset;
    ref.current.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
  });
  return (
    <group ref={ref}>
      {[
        [0, 0, 0, 0.9],
        [0.8, -0.1, 0.2, 0.7],
        [-0.8, -0.15, -0.1, 0.65],
        [0.2, 0.35, 0, 0.6],
      ].map(([x, yy, z, s], i) => (
        <mesh key={i} position={[x!, yy!, z!]}>
          <icosahedronGeometry args={[s!, 0]} />
          <meshStandardMaterial color="#ffffff" flatShading transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

function Fields() {
  return (
    <group position={[-7.5, 0.02, 4]} rotation={[-Math.PI / 2, 0, 0.35]}>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.55, 0]} receiveShadow>
          <planeGeometry args={[5, 0.42]} />
          <meshStandardMaterial color={i % 2 ? GOLD : "#c9a253"} />
        </mesh>
      ))}
    </group>
  );
}

function Paddock({ sows }: { sows: LandscapeSow[] }) {
  const r = rand(7);
  const spots = useMemo(
    () => sows.map(() => ({ x: (r() - 0.5) * 6.2, z: (r() - 0.5) * 3.2, rot: r() * Math.PI * 2 })),
    [sows.length],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[2.2, 0, 3.4]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7.2, 4.2]} />
        <meshStandardMaterial color={SOIL} roughness={1} />
      </mesh>
      {/* cerca */}
      {[
        [-3.6, 0, 0.06, 4.2],
        [3.6, 0, 0.06, 4.2],
        [0, -2.1, 7.2, 0.06],
        [0, 2.1, 7.2, 0.06],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x!, 0.25, z!]} castShadow>
          <boxGeometry args={[w!, 0.08, d!]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
      {sows.slice(0, 40).map((s, i) => (
        <group
          key={s.id}
          position={[spots[i]!.x, 0.02, spots[i]!.z]}
          rotation={[0, spots[i]!.rot, 0]}
        >
          <Pig status={s.status} scale={0.42} />
        </group>
      ))}
    </group>
  );
}

function Scene({ sows, spin }: { sows?: LandscapeSow[] | undefined; spin: boolean }) {
  const world = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spin && world.current) world.current.rotation.y += dt * 0.05;
  });
  const trees = useMemo(() => {
    const r = rand(42);
    return Array.from({ length: 34 }).map((_, i) => {
      const a = r() * Math.PI * 2,
        d = 10 + r() * 9;
      return {
        key: i,
        p: [Math.cos(a) * d, 0, Math.sin(a) * d] as [number, number, number],
        s: 0.8 + r() * 0.9,
      };
    });
  }, []);
  return (
    <group ref={world}>
      <Hills />
      <Fields />
      <Shed position={[-1.5, 0, -2.4]} length={8} />
      <Shed position={[-1.5, 0, -5.6]} length={8} />
      <Shed position={[6.2, 0, -2.6]} length={4.5} rotation={Math.PI / 2} />
      <Silo position={[3.6, 0, -4.6]} />
      <Silo position={[4.9, 0, -4.4]} />
      <Windmill position={[-7.2, 0, -3.6]} />
      {/* estrada */}
      <mesh position={[1.5, 0.012, 0.6]} rotation={[-Math.PI / 2, 0, 0.08]} receiveShadow>
        <planeGeometry args={[22, 0.9]} />
        <meshStandardMaterial color="#c9b48c" roughness={1} />
      </mesh>
      {sows && sows.length > 0 && <Paddock sows={sows} />}
      {trees.map((t) => (
        <Tree key={t.key} position={t.p} scale={t.s} seed={t.key} />
      ))}
      <Cloud y={7} radius={11} speed={0.03} offset={0} />
      <Cloud y={8.5} radius={14} speed={0.02} offset={2.2} />
      <Cloud y={6.4} radius={9} speed={0.025} offset={4.1} />
    </group>
  );
}

/** framing "right": a granja fica à direita, deixando espaço para texto à esquerda. */
export default function FarmLandscape({
  sows,
  className = "h-full w-full",
  interactive = false,
  reducedMotion = false,
  framing = "right",
}: {
  sows?: LandscapeSow[] | undefined;
  className?: string;
  interactive?: boolean;
  reducedMotion?: boolean;
  framing?: "right" | "center";
}) {
  const right = framing === "right";
  return (
    <div className={className} aria-hidden={!interactive}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? "demand" : "always"}
        camera={{ position: right ? [17, 11, 21] : [16, 12, 19], fov: right ? 36 : 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        onCreated={({ camera, size }) =>
          camera.lookAt(
            right && size.width > 700 ? -7.5 : 0,
            0.3,
            right && size.width > 700 ? 3.5 : 0,
          )
        }
      >
        <hemisphereLight args={["#fff6e0", "#3f6f4a", 1.05]} />
        <directionalLight
          position={[10, 14, 6]}
          intensity={1.6}
          color="#ffe8bd"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
        />
        <fog attach="fog" args={["#cfe0c8", 30, 60]} />
        <Scene sows={sows} spin={!reducedMotion} />
      </Canvas>
    </div>
  );
}
