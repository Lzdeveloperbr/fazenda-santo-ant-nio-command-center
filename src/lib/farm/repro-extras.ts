/** Regras puras da Fase 7 (cio, sêmen, condição corporal, planos). */
import { daysBetween } from "./gestation";

/** Duração do cio em horas (null enquanto não houver término). */
export function heatDurationHours(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) return null;
  const h = (Date.parse(endedAt) - Date.parse(startedAt)) / 3_600_000;
  return h >= 0 ? Math.round(h * 10) / 10 : null;
}

export type SemenState = "ok" | "acabando" | "sem_doses" | "vencido" | "vence_logo";
/** Situação do lote de sêmen para escolher na cobertura. */
export function semenState(
  b: { doses_available: number; doses_received: number; expiry_date: string | null },
  today: string,
): SemenState {
  if (b.expiry_date && b.expiry_date < today) return "vencido";
  if (b.doses_available <= 0) return "sem_doses";
  if (b.expiry_date && daysBetween(today, b.expiry_date) <= 2) return "vence_logo";
  if (b.doses_available <= Math.max(1, Math.ceil(b.doses_received * 0.2))) return "acabando";
  return "ok";
}
export const SEMEN_STATE_LABEL: Record<SemenState, string> = {
  ok: "Disponível",
  acabando: "Poucas doses",
  sem_doses: "Sem doses",
  vencido: "Vencido",
  vence_logo: "Vence em até 2 dias",
};

export function validateCondition(r: {
  body_condition_score: number | null;
  backfat_mm: number | null;
  feed_kg_day: number | null;
  notes: string | null;
}): string | null {
  if (
    r.body_condition_score !== null &&
    (r.body_condition_score < 1 ||
      r.body_condition_score > 5 ||
      Math.round(r.body_condition_score * 2) !== r.body_condition_score * 2)
  )
    return "Escore corporal de 1 a 5, de meio em meio ponto.";
  if (r.backfat_mm !== null && !(r.backfat_mm > 0 && r.backfat_mm < 60))
    return "Espessura de toucinho entre 0 e 60 mm.";
  if (r.feed_kg_day !== null && !(r.feed_kg_day > 0 && r.feed_kg_day < 20))
    return "Ração por dia entre 0 e 20 kg.";
  if (
    r.body_condition_score === null &&
    r.backfat_mm === null &&
    r.feed_kg_day === null &&
    !r.notes?.trim()
  )
    return "Preencha pelo menos um campo.";
  return null;
}

export const FEED_PLAN_CATEGORY: Record<string, string> = {
  gestacao: "Gestação",
  lactacao: "Lactação",
  pre_inicial: "Pré-inicial",
  inicial: "Inicial",
  crescimento: "Crescimento",
  terminacao: "Terminação",
  reproducao: "Reprodução",
  outra: "Outra",
};

/** Plano vigente (ativo e validado) para uma categoria e dia de fase. */
export function activePlanFor<
  T extends {
    category: string;
    day_from: number | null;
    day_to: number | null;
    validated_at: string | null;
    active: boolean;
  },
>(plans: T[], category: string, day: number | null): T | undefined {
  return plans.find(
    (p) =>
      p.active &&
      p.validated_at &&
      p.category === category &&
      (day === null || ((p.day_from ?? 0) <= day && (p.day_to === null || day <= p.day_to))),
  );
}
