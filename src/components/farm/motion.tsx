import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** true quando o aparelho pede menos movimento (acessibilidade). */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Aparece suavemente ao entrar na tela (uma vez). */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;
  return (
    <Tag
      ref={ref as never}
      data-reveal={shown ? "shown" : "hidden"}
      style={style}
      className={className}
    >
      {children}
    </Tag>
  );
}

/** Interpolação usada pelo contador (exportada para teste). */
export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

/**
 * Número que "conta" até o valor real. Só anima números; textos aparecem como vieram.
 * Mantém as casas decimais do valor final e o formato pt-BR.
 */
export function CountUp({
  value,
  duration = 900,
  decimals,
}: {
  value: number | string;
  duration?: number;
  decimals?: number;
}) {
  const reduced = useReducedMotion();
  const target = typeof value === "number" ? value : NaN;
  const places = decimals ?? (Number.isFinite(target) && !Number.isInteger(target) ? 1 : 0);
  const [shown, setShown] = useState(Number.isFinite(target) ? 0 : target);
  const from = useRef(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (reduced) {
      setShown(target);
      from.current = target;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const origin = from.current;
    const tick = (now: number) => {
      const v = origin + (target - origin) * easeOutCubic((now - start) / duration);
      setShown(v);
      if (now - start < duration) raf = requestAnimationFrame(tick);
      else {
        setShown(target);
        from.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  if (!Number.isFinite(target)) return <>{value}</>;
  return (
    <span className="kpi-number">
      {Number(shown).toLocaleString("pt-BR", {
        minimumFractionDigits: places,
        maximumFractionDigits: places,
      })}
    </span>
  );
}
