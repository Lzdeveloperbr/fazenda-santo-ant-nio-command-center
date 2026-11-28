/**
 * Mapa das leitegadas: ferro, vacinas e manejos dos leitões pelo protocolo do veterinário
 * (dias a partir do parto). Feito = aplicação registrada para a leitegada ou, no ferro,
 * a data de ferro anotada nos leitões identificados.
 */
import { norm } from "./vaccine-map";

export type LitterColumn = {
  id: string;
  name: string;
  kind: string;
  offset: number;
  doseInstructions: string | null;
  validated: boolean;
};
export type LitterState = "feito" | "parcial" | "atrasada" | "hoje" | "programada";
export type LitterCell = {
  state: LitterState;
  due: string;
  doneOn: string | null;
  done: number;
  total: number;
};

type Proto = {
  id: string;
  name: string;
  product: string | null;
  kind: string;
  target: string;
  active: boolean;
  anchor: string;
  offset_days: number;
  dose_instructions: string | null;
  validated_at: string | null;
};
type Vac = { litter_id: string | null; vaccine_name: string; vaccination_date: string };
type Med = { litter_id: string | null; product_name: string; administration_start: string };
type Pig = { litter_id: string; status: string; iron_date: string | null };

const addDays = (iso: string, d: number) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);

export function litterColumns(protocols: Proto[]): LitterColumn[] {
  return protocols
    .filter(
      (p) =>
        p.active && p.target === "leitegada" && (p.anchor === "parto" || p.anchor === "nascimento"),
    )
    .sort((a, b) => a.offset_days - b.offset_days || a.name.localeCompare(b.name, "pt-BR"))
    .map((p) => ({
      id: p.id,
      name: p.product?.trim() || p.name,
      kind: p.kind,
      offset: p.offset_days,
      doseInstructions: p.dose_instructions,
      validated: !!p.validated_at,
    }));
}

export function litterCell(
  col: LitterColumn,
  protoNames: Set<string>,
  litter: { id: string; farrowing_date: string },
  d: { vacs: Vac[]; meds: Med[]; piglets: Pig[] },
  today: string,
): LitterCell {
  const due = addDays(litter.farrowing_date, col.offset);
  const dates = [
    ...d.vacs
      .filter((v) => v.litter_id === litter.id && protoNames.has(norm(v.vaccine_name)))
      .map((v) => v.vaccination_date),
    ...d.meds
      .filter((m) => m.litter_id === litter.id && protoNames.has(norm(m.product_name)))
      .map((m) => m.administration_start),
  ]
    .filter((x) => x >= litter.farrowing_date)
    .sort();
  const alive = d.piglets.filter((p) => p.litter_id === litter.id && p.status === "ativo");
  if (dates.length)
    return {
      state: "feito",
      due,
      doneOn: dates[dates.length - 1]!,
      done: alive.length,
      total: alive.length,
    };
  if (col.kind === "ferro" && alive.length) {
    const ironed = alive.filter((p) => p.iron_date);
    if (ironed.length === alive.length)
      return {
        state: "feito",
        due,
        doneOn: ironed
          .map((p) => p.iron_date!)
          .sort()
          .at(-1)!,
        done: ironed.length,
        total: alive.length,
      };
    if (ironed.length)
      return { state: "parcial", due, doneOn: null, done: ironed.length, total: alive.length };
  }
  const state: LitterState = due < today ? "atrasada" : due === today ? "hoje" : "programada";
  return { state, due, doneOn: null, done: 0, total: alive.length };
}

export const LITTER_LABEL: Record<LitterState, string> = {
  feito: "Feito",
  parcial: "Parcial",
  atrasada: "Atrasado",
  hoje: "Hoje",
  programada: "Programado",
};
