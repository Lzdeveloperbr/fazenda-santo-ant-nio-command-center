type LogoProps = { className?: string; markClassName?: string };

export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" role="img" aria-label="Símbolo da Fazenda Santo Antônio">
      <defs>
        <linearGradient id="farm-crest" x1="8" y1="5" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7D9A8" />
          <stop offset="1" stopColor="#D7B66C" />
        </linearGradient>
      </defs>
      <path d="M32 3.8 55.5 12v18.4c0 14.1-9.4 23.8-23.5 30C17.9 54.2 8.5 44.5 8.5 30.4V12L32 3.8Z" fill="#173F2B" stroke="url(#farm-crest)" strokeWidth="2.2"/>
      <path d="M18 24.5 32 14l14 10.5v18H18v-18Z" fill="#F5F1E5" fillOpacity=".1" stroke="#D7B66C" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M23 28.5c2.1-3 5.2-4.5 9-4.5s6.9 1.5 9 4.5l4 1.1v7.2l-4.1 1.2c-1.8 3.2-4.8 4.8-8.9 4.8s-7.1-1.6-8.9-4.8L19 36.8v-7.2l4-1.1Z" fill="#E8E4D7" stroke="#F8F5EB" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M25 26.5 22.2 21l7.2 2.2M39 26.5l2.8-5.5-7.2 2.2" fill="#D7B66C" stroke="#F8F5EB" strokeWidth="1.2" strokeLinejoin="round"/>
      <ellipse cx="32" cy="34.2" rx="5.2" ry="3.2" fill="#B6C9AD"/>
      <circle cx="30.2" cy="34.1" r=".8" fill="#173F2B"/><circle cx="33.8" cy="34.1" r=".8" fill="#173F2B"/>
      <circle cx="26.8" cy="29.5" r="1.15" fill="#173F2B"/><circle cx="37.2" cy="29.5" r="1.15" fill="#173F2B"/>
      <path d="M27 44.5c1.6 1.3 3.3 1.9 5 1.9s3.4-.6 5-1.9" stroke="#D7B66C" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <LogoMark className="h-11 w-11 shrink-0 drop-shadow-sm" />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[0.9rem] font-bold tracking-tight text-white">Fazenda Santo Antônio</div>
        <div className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.19em] text-[#D7B66C]">Suinocultura · Gestão rural</div>
      </div>
    </div>
  );
}
