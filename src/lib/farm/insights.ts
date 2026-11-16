/** Pure farm analytics computed only from recorded data. */
export type LitterLike = { id: string; sow_id: string; farrowing_date: string; born_total: number; born_alive: number; stillborn: number; deaths: number; transfers_in: number; transfers_out: number; weaned: number | null; status: string; weaning_date: string | null };
export type FinanceLike = { entry_type: string; amount: number; entry_date: string; status: string };

export const WEANING_DAYS = 21;

/** Pre-weaning mortality %, only when piglets entered the litter. */
export function litterMortality(l: LitterLike): number | null {
  const base = l.born_alive + l.transfers_in;
  return base > 0 ? (l.deaths / base) * 100 : null;
}

/** Deaths grouped by month (YYYY-MM) from death events. */
export function deathsByMonth(events: { event_type: string; event_date: string; quantity: number }[]) {
  const out: Record<string, number> = {};
  for (const e of events) if (e.event_type === "morte") out[e.event_date.slice(0, 7)] = (out[e.event_date.slice(0, 7)] ?? 0) + e.quantity;
  return out;
}

/** Weaning forecast: litters still in farrowing, expected at farrowing + WEANING_DAYS, with live piglets now. */
export function weaningForecast(litters: LitterLike[], addDays: (iso: string, d: number) => string) {
  return litters.filter((l) => l.status === "maternidade").map((l) => ({
    litterId: l.id, sowId: l.sow_id, expected: addDays(l.farrowing_date, WEANING_DAYS),
    piglets: Math.max(0, l.born_alive - l.deaths + l.transfers_in - l.transfers_out),
  })).sort((a, b) => a.expected.localeCompare(b.expected));
}

/** Totals for a period; result is "estimado" because pending entries are included separately. */
export function financeSummary(entries: FinanceLike[]) {
  let receitaPaga = 0, receitaPendente = 0, despesaPaga = 0, despesaPendente = 0;
  for (const e of entries) {
    const v = Number(e.amount);
    if (e.entry_type === "receita") e.status === "pago" ? (receitaPaga += v) : (receitaPendente += v);
    else e.status === "pago" ? (despesaPaga += v) : (despesaPendente += v);
  }
  return { receitaPaga, receitaPendente, despesaPaga, despesaPendente, saldo: receitaPaga - despesaPaga, resultadoEstimado: receitaPaga + receitaPendente - despesaPaga - despesaPendente };
}

/** Cost per weaned piglet: all expenses in the period / piglets weaned in the period. Null without weaned piglets. */
export function costPerWeaned(totalExpenses: number, weaned: number): number | null {
  return weaned > 0 && totalExpenses > 0 ? totalExpenses / weaned : null;
}

/** Per-sow productivity for culling evaluation, only with at least one litter. */
export function sowProductivity(sowId: string, litters: LitterLike[]) {
  const ls = litters.filter((l) => l.sow_id === sowId);
  if (!ls.length) return null;
  const done = ls.filter((l) => l.status === "desmamada");
  const alive = ls.reduce((s, l) => s + l.born_alive, 0);
  return {
    partos: ls.length,
    mediaVivos: alive / ls.length,
    mediaDesmamados: done.length ? done.reduce((s, l) => s + (l.weaned ?? 0), 0) / done.length : null,
    mortalidade: (() => { const b = ls.reduce((s, l) => s + l.born_alive + l.transfers_in, 0); return b ? (ls.reduce((s, l) => s + l.deaths, 0) / b) * 100 : null; })(),
  };
}
