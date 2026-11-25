/**
 * Maternidade: ficha de mortalidade e indicadores. Funções puras.
 * Cada indicador devolve também o denominador (n) para a tela mostrar
 * sobre quantos registros foi calculado; sem dados, o valor é null.
 */
import { daysBetween } from "./gestation";

/** Motivos observados pela equipe. Não são diagnósticos veterinários. */
export const MORTALITY_CAUSES = [
  "Esmagamento",
  "Baixo peso / inanição",
  "Fraqueza ao nascer",
  "Diarreia observada",
  "Sinais respiratórios observados",
  "Malformação",
  "Frio / hipotermia",
  "Causa não identificada",
  "Outro",
] as const;

export const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export function weekdayOf(iso: string) {
  return WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()]!;
}

export function ageBand(days: number) {
  if (days <= 0) return "Dia do parto";
  if (days <= 3) return "1–3 dias";
  if (days <= 7) return "4–7 dias";
  if (days <= 14) return "8–14 dias";
  return "15+ dias";
}

type LitterLite = {
  id: string;
  sow_id: string;
  farrowing_date: string;
  pen_id?: string | null;
  status: string;
};
type EventLite = {
  id: string;
  litter_id: string;
  event_type: string;
  event_date: string;
  quantity: number;
  cause?: string | null;
  weight_kg?: number | null;
  responsible?: string | null;
  note?: string | null;
  piglet_id?: string | null;
};

export type MortalityRow = {
  id: string;
  date: string;
  weekday: string;
  ageDays: number;
  ageBand: string;
  quantity: number;
  sow: string;
  pen: string;
  cause: string;
  weight: number | null;
  responsible: string;
  note: string;
  piglet: string;
};

export function mortalityRows(
  events: EventLite[],
  litters: LitterLite[],
  sowTag: (id: string) => string,
  penName: (id: string | null | undefined) => string,
  pigletName: (id: string | null | undefined) => string,
  from: string,
  to: string,
): MortalityRow[] {
  const byId = new Map(litters.map((l) => [l.id, l]));
  return events
    .filter((e) => e.event_type === "morte" && e.event_date >= from && e.event_date <= to)
    .flatMap((e) => {
      const l = byId.get(e.litter_id);
      if (!l || l.status === "cancelada") return [];
      const age = daysBetween(l.farrowing_date, e.event_date);
      return [
        {
          id: e.id,
          date: e.event_date,
          weekday: weekdayOf(e.event_date),
          ageDays: age,
          ageBand: ageBand(age),
          quantity: e.quantity,
          sow: sowTag(l.sow_id),
          pen: penName(l.pen_id),
          cause: e.cause?.trim() || "Não informado",
          weight: e.weight_kg ?? null,
          responsible: e.responsible?.trim() || "—",
          note: e.note?.trim() || "",
          piglet: pigletName(e.piglet_id),
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Soma de leitões mortos por chave, do maior para o menor. */
export function sumBy<T>(rows: T[], key: (r: T) => string, qty: (r: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + qty(r));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

type LitterFull = LitterLite & {
  born_total: number;
  born_alive: number;
  stillborn: number;
  mummified: number | null;
  deaths: number;
  transfers_in: number;
  transfers_out: number;
  weaned: number | null;
  weaning_date: string | null;
};
type PigletLite = {
  birth_date: string | null;
  birth_weight_kg: number | null;
  weaning_weight_kg: number | null;
  weaning_date: string | null;
  litter_id: string;
};
export type Indicator = { value: number | null; n: number };

const avg = (xs: number[]): Indicator => ({
  value: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null,
  n: xs.length,
});
const ratio = (num: number, den: number, n: number): Indicator => ({
  value: den > 0 ? (num / den) * 100 : null,
  n,
});

/**
 * Partos do período = leitegadas não canceladas com parto entre from e to.
 * Desmames do período = leitegadas desmamadas com data de desmame entre from e to.
 */
export function maternityIndicators(
  litters: LitterFull[],
  piglets: PigletLite[],
  weaningEvents: { litter_id: string; event_date: string; weight_kg?: number | null }[],
  from: string,
  to: string,
) {
  const counted = litters.filter((l) => l.status !== "cancelada");
  const farrowed = counted.filter((l) => l.farrowing_date >= from && l.farrowing_date <= to);
  const weaned = counted.filter(
    (l) => l.weaning_date && l.weaning_date >= from && l.weaning_date <= to,
  );
  const total = farrowed.reduce((a, l) => a + l.born_total, 0);
  const farrowedIds = new Set(farrowed.map((l) => l.id));
  const weanedIds = new Set(weaned.map((l) => l.id));
  const preWeanBase = weaned.reduce((a, l) => a + l.born_alive + l.transfers_in, 0);
  return {
    farrowings: farrowed.length,
    weanedLitters: weaned.length,
    bornTotalPerLitter: avg(farrowed.map((l) => l.born_total)),
    bornAlivePerLitter: avg(farrowed.map((l) => l.born_alive)),
    stillbornRate: ratio(
      farrowed.reduce((a, l) => a + l.stillborn, 0),
      total,
      farrowed.length,
    ),
    mummifiedRate: ratio(
      farrowed.reduce((a, l) => a + (l.mummified ?? 0), 0),
      total,
      farrowed.length,
    ),
    preWeaningMortality: ratio(
      weaned.reduce((a, l) => a + l.deaths, 0),
      preWeanBase,
      weaned.length,
    ),
    weanedPerLitter: avg(weaned.map((l) => l.weaned ?? 0)),
    weaningAgeDays: avg(weaned.map((l) => daysBetween(l.farrowing_date, l.weaning_date!))),
    birthWeight: avg(
      piglets
        .filter((p) => farrowedIds.has(p.litter_id) && p.birth_weight_kg)
        .map((p) => Number(p.birth_weight_kg)),
    ),
    weaningWeight: (() => {
      const individual = piglets
        .filter((p) => weanedIds.has(p.litter_id) && p.weaning_weight_kg)
        .map((p) => Number(p.weaning_weight_kg));
      if (individual.length) return avg(individual);
      return avg(
        weaningEvents
          .filter((e) => weanedIds.has(e.litter_id) && e.weight_kg)
          .map((e) => Number(e.weight_kg)),
      );
    })(),
  };
}

/** Saldo de sexo no desmame: só aceita quando a soma não passa do total. */
export function weaningSexError(
  quantity: number,
  males: number | null,
  females: number | null,
): string | null {
  if ((males ?? 0) < 0 || (females ?? 0) < 0) return "Quantidades não podem ser negativas.";
  if ((males ?? 0) + (females ?? 0) > quantity)
    return "Machos + fêmeas não pode passar do total desmamado.";
  return null;
}
