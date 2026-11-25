import { useState } from "react";
import { Input } from "@/components/ui/input";
import { addDaysISO, todayISO } from "@/lib/farm";
import { PERIOD_LABEL, periodStart, type PeriodKey } from "@/lib/farm/period";

export type Period = { key: PeriodKey; from: string; to: string };

/** Período no mesmo padrão do painel (hoje, 7/30/90 dias, 12 meses, personalizado). */
export function usePeriod(initial: Exclude<PeriodKey, "custom"> = "30d") {
  const today = todayISO();
  const [p, setP] = useState<Period>({
    key: initial,
    from: periodStart(initial, today, addDaysISO),
    to: today,
  });
  const choose = (key: PeriodKey) =>
    setP((cur) =>
      key === "custom"
        ? { ...cur, key }
        : { key, from: periodStart(key, today, addDaysISO), to: today },
    );
  return {
    period: p,
    choose,
    setRange: (from: string, to: string) => setP({ key: "custom", from, to }),
  };
}

export function PeriodFilter({ period, choose, setRange }: ReturnType<typeof usePeriod>) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => choose(k)}
          aria-pressed={period.key === k}
          className={`h-9 rounded-full border px-3 text-xs font-semibold transition ${period.key === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
        >
          {PERIOD_LABEL[k]}
        </button>
      ))}
      {period.key === "custom" && (
        <span className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Início"
            value={period.from}
            max={period.to}
            onChange={(e) => setRange(e.target.value, period.to)}
            className="h-9 w-auto"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            aria-label="Fim"
            value={period.to}
            min={period.from}
            onChange={(e) => setRange(period.from, e.target.value)}
            className="h-9 w-auto"
          />
        </span>
      )}
    </div>
  );
}

/** Barras horizontais simples para contagens (acessível, sem biblioteca de gráfico). */
export function CountBars({
  title,
  rows,
  unit = "",
}: {
  title: string;
  rows: [string, number][];
  unit?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="panel p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem registros no período.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(([k, v]) => (
            <li key={k} className="text-xs">
              <div className="mb-1 flex justify-between gap-2">
                <span className="truncate">{k}</span>
                <span className="font-mono font-semibold tabular-nums">
                  {v}
                  {unit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(v / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
