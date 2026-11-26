/**
 * Indicadores zootécnicos com denominadores documentados. Funções puras.
 * Cada indicador devolve { value, n } — sem dados suficientes, value = null.
 */
import { addDays, daysBetween } from "./gestation";

export type Ind = { value: number | null; n: number };
const avg = (xs: number[]): Ind => ({ value: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, n: xs.length });
const pct = (num: number, den: number): Ind => ({ value: den > 0 ? (num / den) * 100 : null, n: den });
const inP = (d: string | null | undefined, from: string, to: string) => !!d && d >= from && d <= to;

type Breeding = { id: string; sow_id: string; breeding_date: string; cycle_status: string; services_count?: number | null };
type Diagnosis = { diagnosis_date: string; result: string };
type Litter = { id: string; sow_id: string; farrowing_date: string; status: string; weaning_date: string | null; born_alive: number; weaned: number | null };
type SowEvent = { event_type: string; event_date: string };
type Weight = { batch_id: string; weigh_date: string; average_weight_kg: number | string };
type BatchFeed = { batch_id: string; movement_type: string; quantity: number | string; movement_date: string };
type Batch = { id: string; name: string; initial_headcount: number; current_headcount: number };

export function reproductiveIndicators(d: { breedings: Breeding[]; diagnoses: Diagnosis[]; litters: Litter[]; sowEvents: SowEvent[] }, from: string, to: string) {
  const dx = d.diagnoses.filter((x) => inP(x.diagnosis_date, from, to));
  const pos = dx.filter((x) => x.result === "positivo").length;
  const neg = dx.filter((x) => x.result === "negativo").length;
  // Ciclos cobertos no período e já com desfecho reprodutivo (exclui ativos e saídas do plantel).
  const closed = d.breedings.filter((b) => inP(b.breeding_date, from, to) && ["parido", "retorno", "negativo", "perda"].includes(b.cycle_status));
  const farrowed = closed.filter((b) => b.cycle_status === "parido");
  const services = farrowed.map((b) => Number(b.services_count ?? 1)).filter((x) => x > 0);
  const counted = d.litters.filter((l) => l.status !== "cancelada");

  // Intervalo desmame-cio: do desmame (no período) até a cobertura seguinte da mesma matriz.
  const wei: number[] = [];
  for (const l of counted) {
    if (!inP(l.weaning_date, from, to)) continue;
    const next = d.breedings.filter((b) => b.sow_id === l.sow_id && b.breeding_date >= l.weaning_date!).sort((a, b) => a.breeding_date.localeCompare(b.breeding_date))[0];
    if (next) wei.push(daysBetween(l.weaning_date!, next.breeding_date));
  }
  // Intervalo entre partos: partos do período comparados ao parto anterior da mesma matriz.
  const ifi: number[] = [];
  const bySow = new Map<string, Litter[]>();
  for (const l of counted) bySow.set(l.sow_id, [...(bySow.get(l.sow_id) ?? []), l]);
  for (const list of bySow.values()) {
    const s = [...list].sort((a, b) => a.farrowing_date.localeCompare(b.farrowing_date));
    for (let i = 1; i < s.length; i++) if (inP(s[i]!.farrowing_date, from, to)) ifi.push(daysBetween(s[i - 1]!.farrowing_date, s[i]!.farrowing_date));
  }
  const interval = avg(ifi);
  return {
    conceptionRate: pct(pos, pos + neg),
    farrowingRate: pct(farrowed.length, closed.length),
    servicesPerFarrowing: avg(services),
    returns: closed.filter((b) => b.cycle_status === "retorno").length,
    weaningToEstrus: avg(wei),
    farrowingInterval: interval,
    littersPerSowYear: { value: interval.value ? 365 / interval.value : null, n: interval.n } as Ind,
    discards: d.sowEvents.filter((e) => e.event_type === "descarte" && inP(e.event_date, from, to)).length,
    sowDeaths: d.sowEvents.filter((e) => e.event_type === "morte" && inP(e.event_date, from, to)).length,
  };
}

/**
 * Ganho médio diário por lote: entre a primeira e a última pesagem dentro do
 * período (precisa de pelo menos duas). Conversão alimentar = ração consumida
 * entre as pesagens ÷ (ganho × animais atuais) — só com consumo registrado.
 */
export function batchPerformance(batches: Batch[], weights: Weight[], feed: BatchFeed[], from: string, to: string) {
  return batches.map((b) => {
    const w = weights.filter((x) => x.batch_id === b.id && inP(x.weigh_date, from, to)).sort((a, c) => a.weigh_date.localeCompare(c.weigh_date));
    if (w.length < 2) return { batch: b, adg: null as number | null, fcr: null as number | null, days: 0, weighings: w.length };
    const first = w[0]!, last = w[w.length - 1]!;
    const days = daysBetween(first.weigh_date, last.weigh_date);
    const gain = Number(last.average_weight_kg) - Number(first.average_weight_kg);
    const adg = days > 0 ? gain / days : null;
    const kg = feed.filter((f) => f.batch_id === b.id && f.movement_type === "saida" && f.movement_date > first.weigh_date && f.movement_date <= last.weigh_date).reduce((a, f) => a + Number(f.quantity), 0);
    const totalGain = gain * b.current_headcount;
    const fcr = kg > 0 && totalGain > 0 ? kg / totalGain : null;
    return { batch: b, adg, fcr, days, weighings: w.length };
  });
}

/** Período anterior de mesmo tamanho e mesmo período do ano anterior. */
export function comparisonPeriods(from: string, to: string) {
  const len = daysBetween(from, to) + 1;
  const prevTo = addDays(from, -1);
  const shiftYear = (iso: string) => `${Number(iso.slice(0, 4)) - 1}${iso.slice(4)}`.replace(/-02-29$/, "-02-28");
  return { previous: { from: addDays(prevTo, -(len - 1)), to: prevTo }, lastYear: { from: shiftYear(from), to: shiftYear(to) } };
}

/** Variação em pontos (para %) ou relativa; null quando falta um dos lados. */
export function delta(cur: number | null, prev: number | null) {
  if (cur === null || prev === null) return null;
  return cur - prev;
}

/** Matriz × média do plantel (partos não cancelados). */
export function sowVsHerd(litters: Litter[]) {
  const counted = litters.filter((l) => l.status !== "cancelada");
  const herdNV = avg(counted.map((l) => l.born_alive));
  const weanedL = counted.filter((l) => l.status === "desmamada");
  const herdW = avg(weanedL.map((l) => l.weaned ?? 0));
  const bySow = new Map<string, Litter[]>();
  for (const l of counted) bySow.set(l.sow_id, [...(bySow.get(l.sow_id) ?? []), l]);
  const rows = [...bySow.entries()].map(([sowId, ls]) => {
    const nv = avg(ls.map((l) => l.born_alive));
    const w = avg(ls.filter((l) => l.status === "desmamada").map((l) => l.weaned ?? 0));
    return { sowId, litters: ls.length, bornAlive: nv, weaned: w, nvDiff: delta(nv.value, herdNV.value), wDiff: delta(w.value, herdW.value) };
  });
  return { herdNV, herdW, rows: rows.sort((a, b) => (b.bornAlive.value ?? -1) - (a.bornAlive.value ?? -1)) };
}
