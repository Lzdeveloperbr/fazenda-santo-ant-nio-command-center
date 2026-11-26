import { lazy, Suspense, useEffect, useState } from "react";
import { useReducedMotion } from "@/components/farm/motion";
import type { LandscapeSow } from "@/components/farm3d/FarmLandscape";

const FarmLandscape = lazy(() => import("@/components/farm3d/FarmLandscape"));

function canUseWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Paisagem 3D carregada só no navegador, com fundo estático se não houver WebGL. */
export function Landscape3D({
  sows,
  className = "absolute inset-0",
  interactive = false,
  framing = "right",
}: {
  sows?: LandscapeSow[] | undefined;
  className?: string;
  interactive?: boolean;
  framing?: "right" | "center";
}) {
  const reduced = useReducedMotion();
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    setOk(canUseWebGL());
  }, []);
  const fallback = (
    <div
      className={`${className} bg-[radial-gradient(ellipse_at_60%_70%,rgba(111,186,126,.35),transparent_60%)]`}
    />
  );
  if (!ok) return fallback;
  return (
    <Suspense fallback={fallback}>
      <FarmLandscape
        sows={sows}
        className={className}
        interactive={interactive}
        reducedMotion={reduced}
        framing={framing}
      />
    </Suspense>
  );
}
