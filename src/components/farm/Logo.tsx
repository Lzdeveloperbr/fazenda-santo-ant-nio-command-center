export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" className="stroke-border" strokeWidth="1" />
      <circle cx="24" cy="24" r="16" stroke="var(--cyan)" strokeOpacity=".5" strokeWidth="1" strokeDasharray="2 4" />
      <path d="M14 30c0-6 4.5-10 10-10s10 4 10 10" stroke="var(--ok-glow)" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 8v8M24 32v8M8 24h4M36 24h4" stroke="var(--foreground)" strokeOpacity=".6" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.5" fill="var(--ok-glow)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight">Fazenda Santo Antônio</div>
        <div className="label-tech !text-[0.6rem]">AgroTech Command Center</div>
      </div>
    </div>
  );
}
