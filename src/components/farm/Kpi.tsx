import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Kpi({
  label, value, unit, icon: Icon, tone = "text-foreground", source, to, delay = 0, hint,
}: {
  label: string; value: number | string; unit?: string; icon: LucideIcon; tone?: string;
  source: string; to?: "/painel" | "/matrizes" | "/maternidade" | "/tarefas"; delay?: number; hint?: ReactNode;
}) {
  const body = (
    <div className="panel h-full animate-rise p-4 transition-transform hover:-translate-y-0.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="label-tech leading-snug">{label}</p>
        <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className={`font-mono text-3xl font-medium tabular-nums ${tone}`}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </p>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      <p className="mt-3 border-t pt-2 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">Fonte · {source}</p>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function SectionTitle({ kicker, title, action }: { kicker: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="label-tech">{kicker}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
