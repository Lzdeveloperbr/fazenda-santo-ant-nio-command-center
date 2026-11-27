/** Period indicators computed only from recorded data. */
export type PeriodKey = "hoje" | "7d" | "30d" | "90d" | "12m" | "custom";
export const PERIOD_LABEL: Record<PeriodKey, string> = {
  hoje: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  "12m": "12 meses",
  custom: "Personalizado",
};

export function periodStart(
  key: Exclude<PeriodKey, "custom">,
  today: string,
  addDays: (iso: string, d: number) => string,
) {
  const days = { hoje: 0, "7d": 6, "30d": 29, "90d": 89, "12m": 364 }[key];
  return addDays(today, -days);
}

type Breeding = { breeding_date: string; breeding_type: string };
type Litter = {
  farrowing_date: string;
  born_total: number;
  born_alive: number;
  stillborn: number;
  mummified: number;
  weaned: number | null;
  weaning_date: string | null;
};
type Ev = { event_type: string; event_date: string; quantity: number };
type Diag = { diagnosis_date: string; result: string };
type Fin = { entry_type: string; amount: number; entry_date: string; status: string };

export function periodStats(
  from: string,
  to: string,
  d: { breedings: Breeding[]; litters: Litter[]; events: Ev[]; diagnoses: Diag[]; finance: Fin[] },
) {
  const inR = (x?: string | null) => !!x && x >= from && x <= to;
  const br = d.breedings.filter((b) => inR(b.breeding_date));
  const ls = d.litters.filter((l) => inR(l.farrowing_date));
  const dg = d.diagnoses.filter((x) => inR(x.diagnosis_date));
  const fin = d.finance.filter((f) => inR(f.entry_date) && f.status === "pago");
  const sum = <T>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);
  const pos = dg.filter((x) => x.result === "positivo").length,
    neg = dg.filter((x) => x.result === "negativo").length;
  const receitas = sum(
    fin.filter((f) => f.entry_type === "receita"),
    (f) => Number(f.amount),
  );
  const despesas = sum(
    fin.filter((f) => f.entry_type !== "receita"),
    (f) => Number(f.amount),
  );
  return {
    coberturas: br.length,
    inseminacoes: br.filter(
      (b) => b.breeding_type === "inseminacao" || b.breeding_type === "reinseminacao",
    ).length,
    diagPositivos: pos,
    diagNegativos: neg,
    taxaConcepcao: pos + neg > 0 ? (pos / (pos + neg)) * 100 : null,
    partos: ls.length,
    nascidosTotais: sum(ls, (l) => l.born_total),
    nascidosVivos: sum(ls, (l) => l.born_alive),
    natimortos: sum(ls, (l) => l.stillborn),
    mumificados: sum(ls, (l) => l.mummified),
    mediaVivos: ls.length ? sum(ls, (l) => l.born_alive) / ls.length : null,
    mediaTotais: ls.length ? sum(ls, (l) => l.born_total) / ls.length : null,
    mortesLeitoes: sum(
      d.events.filter((e) => e.event_type === "morte" && inR(e.event_date)),
      (e) => e.quantity,
    ),
    desmamados: sum(
      d.litters.filter((l) => inR(l.weaning_date)),
      (l) => l.weaned ?? 0,
    ),
    receitas,
    despesas,
    resultado: receitas - despesas,
  };
}

/** Período anterior de mesmo tamanho, terminando no dia antes de `from`. */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const day = 86_400_000;
  const a = Date.parse(`${from}T12:00:00Z`),
    b = Date.parse(`${to}T12:00:00Z`);
  const len = Math.max(0, Math.round((b - a) / day));
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  return { from: iso(a - (len + 1) * day), to: iso(a - day) };
}
