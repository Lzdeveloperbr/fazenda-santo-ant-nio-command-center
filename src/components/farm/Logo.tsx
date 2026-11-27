import { useId } from "react";

/**
 * Identidade da Fazenda Santo Antônio: selo verde com sol nascente dourado,
 * cabeça de porco geométrica (mesmo estilo low-poly do 3D do app) e ramos de trigo.
 * `animated` desenha o arco do sol, acende os raios e faz o selo "respirar"
 * (desativado automaticamente quando o aparelho pede menos movimento).
 */
export function LogoMark({
  className = "h-10 w-10",
  animated = false,
  title = "Fazenda Santo Antônio",
}: {
  className?: string;
  animated?: boolean;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${n}-${uid}`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} ${animated ? "logo-animated" : ""}`}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={id("bg")} x1="8" y1="2" x2="58" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E5A3C" />
          <stop offset=".55" stopColor="#124530" />
          <stop offset="1" stopColor="#0A2A1C" />
        </linearGradient>
        <linearGradient
          id={id("gold")}
          x1="14"
          y1="10"
          x2="50"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F6E3A6" />
          <stop offset="1" stopColor="#C99A3E" />
        </linearGradient>
        <radialGradient id={id("sun")} cx="32" cy="27" r="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3D88C" stopOpacity=".55" />
          <stop offset="1" stopColor="#F3D88C" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={id("face")}
          x1="20"
          y1="18"
          x2="44"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FBF6E9" />
          <stop offset="1" stopColor="#E6DCC3" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${id("bg")})`} />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="16.3"
        fill="none"
        stroke={`url(#${id("gold")})`}
        strokeOpacity=".55"
        strokeWidth="1.2"
      />
      <circle className="logo-glow" cx="32" cy="27" r="20" fill={`url(#${id("sun")})`} />
      <path
        className="logo-arc"
        d="M16.5 30a15.5 15.5 0 0 1 31 0"
        fill="none"
        stroke={`url(#${id("gold")})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        pathLength={1}
      />
      <g
        className="logo-rays"
        stroke="#F3D88C"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity=".9"
      >
        <path d="M32 9.2v3.2" />
        <path d="M21.3 12.6l1.7 2.7" />
        <path d="M42.7 12.6l-1.7 2.7" />
        <path d="M13.6 20.4l2.8 1.5" />
        <path d="M50.4 20.4l-2.8 1.5" />
      </g>
      <g className="logo-pig">
        <path d="M23.6 20.6l-8.4-6.1 2.9 11.2z" fill="#EFE5CF" />
        <path d="M22.1 21.3l-5.2-3.9 1.9 6.9z" fill="#E8A79E" />
        <path d="M40.4 20.6l8.4-6.1-2.9 11.2z" fill="#DDD0B2" />
        <path d="M41.9 21.3l5.2-3.9-1.9 6.9z" fill="#D9958C" />
        <path
          d="M32 17.8l9.8 4 3.4 8.9-3.1 8.4L32 43.4l-10.1-4.3-3.1-8.4 3.4-8.9z"
          fill={`url(#${id("face")})`}
        />
        <path d="M32 17.8l9.8 4-9.8 5.2z" fill="#FFFFFF" fillOpacity=".55" />
        <path d="M41.8 21.8l3.4 8.9-6.4-1.4z" fill="#D8CCAE" />
        <path d="M22.2 21.8l-3.4 8.9 6.4-1.4z" fill="#EFE6D2" />
        <path d="M42.1 39.1L32 43.4l4.8-6.2z" fill="#D1C4A3" />
        <path d="M26.2 28.2l2.2-.8.4 1.8-2.1.6z" fill="#123B28" />
        <path d="M37.8 28.2l-2.2-.8-.4 1.8 2.1.6z" fill="#123B28" />
        <path d="M25.4 32.4h13.2l2 4-2.5 3.7H25.9l-2.5-3.7z" fill="#E39E95" />
        <path d="M25.4 32.4h13.2l2 4H23.4z" fill="#EFB8AE" />
        <ellipse cx="29.3" cy="36.4" rx="1.3" ry="1.75" fill="#6E3029" />
        <ellipse cx="34.7" cy="36.4" rx="1.3" ry="1.75" fill="#6E3029" />
      </g>
      <g className="logo-wheat" fill={`url(#${id("gold")})`}>
        <path d="M13.5 44.5c4 6.2 10.3 9.6 18.5 10.3-7.5 1.3-14.8-2.3-19.2-9.6z" />
        <path d="M50.5 44.5c-4 6.2-10.3 9.6-18.5 10.3 7.5 1.3 14.8-2.3 19.2-9.6z" />
        <path d="M15.2 41.2c.6-2.6 2.4-4.1 4.6-4.3-.4 2.4-2.2 4-4.6 4.3z" />
        <path d="M17.6 46.6c.9-2.5 2.9-3.7 5.1-3.6-.7 2.3-2.6 3.6-5.1 3.6z" />
        <path d="M21.8 50.6c1.2-2.3 3.3-3.2 5.5-2.8-1 2.1-3 3.1-5.5 2.8z" />
        <path d="M48.8 41.2c-.6-2.6-2.4-4.1-4.6-4.3.4 2.4 2.2 4 4.6 4.3z" />
        <path d="M46.4 46.6c-.9-2.5-2.9-3.7-5.1-3.6.7 2.3 2.6 3.6 5.1 3.6z" />
        <path d="M42.2 50.6c-1.2-2.3-3.3-3.2-5.5-2.8 1 2.1 3 3.1 5.5 2.8z" />
      </g>
    </svg>
  );
}

/** Logo + nome para a barra lateral (fundo escuro). */
export function Wordmark({ animated = false }: { animated?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <LogoMark
        className="h-11 w-11 shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,.35)]"
        animated={animated}
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[0.95rem] font-extrabold tracking-tight text-sidebar-foreground">
          Fazenda Santo Antônio
        </div>
        <div className="mt-1 text-[0.56rem] font-bold uppercase tracking-[0.22em] text-gold">
          Gestão de suinocultura
        </div>
      </div>
    </div>
  );
}

/** Assinatura grande para página inicial e login. `tone` ajusta o texto ao fundo. */
export function BrandLockup({
  tone = "light",
  animated = true,
  size = "md",
}: {
  tone?: "light" | "dark";
  animated?: boolean;
  size?: "md" | "lg";
}) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-3.5">
      <LogoMark
        className={`${big ? "h-16 w-16" : "h-12 w-12"} shrink-0 drop-shadow-[0_10px_24px_rgba(0,0,0,.3)]`}
        animated={animated}
      />
      <div className="leading-tight">
        <p
          className={`${big ? "text-2xl" : "text-base sm:text-lg"} font-extrabold tracking-tight ${tone === "light" ? "text-white" : "text-[#123B28]"}`}
        >
          Fazenda Santo Antônio
        </p>
        <p
          className={`mt-1 text-[.62rem] font-bold uppercase tracking-[.24em] ${tone === "light" ? "text-[#E3C77F]" : "text-[#9A7A2E]"}`}
        >
          Gestão de suinocultura
        </p>
      </div>
    </div>
  );
}
