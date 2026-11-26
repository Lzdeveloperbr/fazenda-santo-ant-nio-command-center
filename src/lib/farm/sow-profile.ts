/**
 * Prontuário da matriz: situação derivada dos registros, validação do
 * cadastro e linha do tempo. Funções puras (sem banco), testadas.
 *
 * A situação NÃO é gravada: é calculada a partir de status (mantido pelos
 * gatilhos do banco), ciclos, partos e parâmetros da granja, e sempre vem
 * com o motivo, para que ninguém confunda previsão com fato registrado.
 */
import { daysBetween, type GestationConfig } from "./gestation";

export const SOW_SITUATIONS = {
  leitoa: "Leitoa",
  em_preparacao: "Em preparação",
  cio_identificado: "Cio identificado",
  inseminada: "Inseminada / coberta",
  gestante: "Gestante",
  vazia: "Vazia",
  em_transferencia: "Transferida",
  pre_parto: "Pré-parto",
  em_maternidade: "Em maternidade (aguardando parto)",
  em_lactacao: "Em lactação",
  desmamada: "Desmamada",
  em_recuperacao: "Em recuperação",
  em_tratamento: "Em tratamento",
  descartada: "Descartada",
  morta: "Morta",
} as const;
export type SowSituation = keyof typeof SOW_SITUATIONS;

export const SOW_CATEGORY_LABEL: Record<string, string> = {
  leitoa: "Leitoa",
  em_preparacao: "Leitoa em preparação",
  matriz: "Matriz",
};
export const SOW_CONDITION_LABEL: Record<string, string> = {
  em_observacao: "Em observação",
  em_tratamento: "Em tratamento",
  em_recuperacao: "Em recuperação",
};

type SowLike = { status: string; category?: string | null; condition?: string | null };
type BreedingLike = {
  breeding_date: string;
  cycle_status: string;
  pregnancy_check: string;
  closed_at?: string | null;
  heat_check?: string;
  heat_check_date?: string | null;
};
type LitterLike = { farrowing_date: string; status: string; weaning_date: string | null };
export type SituationSettings = Pick<GestationConfig, "attentionStart" | "gestationDays"> & {
  maternityTransferDay: number | null;
};

export type SituationResult = {
  key: SowSituation;
  label: string;
  reason: string;
  condition: string | null;
};

const latest = <T>(items: T[], date: (x: T) => string) =>
  [...items].sort((a, b) => date(b).localeCompare(date(a)))[0];

export function sowSituation(
  sow: SowLike,
  breedings: BreedingLike[],
  litters: LitterLike[],
  settings: SituationSettings,
  today: string,
): SituationResult {
  const condition = sow.condition ? (SOW_CONDITION_LABEL[sow.condition] ?? sow.condition) : null;
  const r = (key: SowSituation, reason: string): SituationResult => ({
    key,
    label: SOW_SITUATIONS[key],
    reason,
    condition,
  });

  if (sow.status === "morta") return r("morta", "Morte registrada no histórico.");
  if (sow.status === "descartada") return r("descartada", "Descarte registrado no histórico.");
  if (sow.status === "transferida")
    return r("em_transferencia", "Saída por transferência registrada.");

  const counted = litters.filter((l) => l.status !== "cancelada");
  const nursing = counted.find((l) => l.status === "maternidade");
  if (nursing)
    return r("em_lactacao", `Parto em ${nursing.farrowing_date}, leitegada ainda em maternidade.`);

  const active = breedings.find((b) => b.cycle_status === "ativo");
  if (active) {
    const day = daysBetween(active.breeding_date, today);
    if (settings.maternityTransferDay !== null && day >= settings.maternityTransferDay)
      return r(
        "em_maternidade",
        `Dia ${day} de gestação; transferência para maternidade configurada no dia ${settings.maternityTransferDay}.`,
      );
    if (day >= settings.attentionStart)
      return r(
        "pre_parto",
        `Dia ${day} de gestação; parto estimado no dia ${settings.gestationDays}.`,
      );
    if (active.pregnancy_check === "positivo")
      return r("gestante", `Diagnóstico positivo; dia ${day} de gestação.`);
    return r(
      "inseminada",
      `Cobertura em ${active.breeding_date} (dia ${day}); diagnóstico ainda não positivo.`,
    );
  }

  const lastBreeding = latest(breedings, (b) => b.breeding_date);
  const lastLitter = latest(counted, (l) => l.farrowing_date);
  const weanedAfterBreeding =
    lastLitter?.weaning_date &&
    (!lastBreeding || lastLitter.weaning_date >= lastBreeding.breeding_date);
  if (lastBreeding && lastBreeding.cycle_status === "retorno" && !weanedAfterBreeding)
    return r(
      "cio_identificado",
      `Retorno ao cio em ${lastBreeding.closed_at ?? lastBreeding.heat_check_date ?? "data não informada"}; sem nova cobertura.`,
    );
  if (weanedAfterBreeding)
    return r(
      "desmamada",
      `Desmame em ${lastLitter!.weaning_date}; sem cobertura registrada depois.`,
    );

  if (counted.length === 0 && (sow.category === "leitoa" || sow.category === "em_preparacao"))
    return r(sow.category, "Categoria informada no cadastro; nenhum parto registrado.");

  // Registros antigos sem ciclo vinculado: usa a situação gravada.
  if (sow.status === "gestante")
    return r("gestante", "Situação gravada no cadastro (sem ciclo ativo vinculado).");
  if (sow.status === "coberta")
    return r("inseminada", "Situação gravada no cadastro (sem ciclo ativo vinculado).");
  if (sow.status === "lactante")
    return r("em_lactacao", "Situação gravada no cadastro (sem leitegada em maternidade).");
  if (lastBreeding && ["negativo", "perda"].includes(lastBreeding.cycle_status))
    return r(
      "vazia",
      lastBreeding.cycle_status === "negativo"
        ? "Último diagnóstico negativo."
        : "Perda gestacional registrada no último ciclo.",
    );
  return r("vazia", "Sem ciclo ativo nem leitegada em maternidade.");
}

/** Ordem de parto = partos registrados (não cancelados). */
export function parityOf(litters: { status: string }[]) {
  return litters.filter((l) => l.status !== "cancelada").length;
}

export type SowFormInput = {
  ear_tag: string;
  birth_date: string | null;
  entry_date: string | null;
  weight_kg: number | null;
  weight_date: string | null;
};

/** Mesmas regras das constraints do banco (0016), com mensagens claras. */
export function validateSowForm(f: SowFormInput, today: string): string | null {
  if (!f.ear_tag.trim()) return "Informe o brinco.";
  if (f.birth_date && f.birth_date > today) return "A data de nascimento não pode estar no futuro.";
  if (f.entry_date && f.entry_date > today) return "A data de entrada não pode estar no futuro.";
  if (f.birth_date && f.entry_date && f.entry_date < f.birth_date)
    return "A entrada na granja não pode ser antes do nascimento.";
  if (f.weight_kg !== null) {
    if (!Number.isFinite(f.weight_kg) || f.weight_kg <= 0 || f.weight_kg >= 500)
      return "Peso deve estar entre 0 e 500 kg.";
    if (!f.weight_date) return "Informe a data da pesagem.";
  }
  if (f.weight_date && f.weight_date > today) return "A data da pesagem não pode estar no futuro.";
  return null;
}

export type TimelineKind =
  | "cobertura"
  | "diagnostico"
  | "gestacao"
  | "parto"
  | "leitegada"
  | "desmame"
  | "evento"
  | "vacina"
  | "medicamento"
  | "sanidade";
export type TimelineItem = {
  date: string;
  kind: TimelineKind;
  title: string;
  detail?: string | undefined;
  order: number;
};

export const TIMELINE_KIND_LABEL: Record<TimelineKind, string> = {
  cobertura: "Reprodução",
  diagnostico: "Diagnóstico",
  gestacao: "Gestação",
  parto: "Parto",
  leitegada: "Leitegada",
  desmame: "Desmame",
  evento: "Ocorrência",
  vacina: "Vacinação",
  medicamento: "Medicamento",
  sanidade: "Sanidade",
};

const BREEDING_TYPE_LABEL: Record<string, string> = {
  monta_natural: "Cobertura natural",
  inseminacao: "Inseminação artificial",
  reinseminacao: "Reinseminação",
  complementar: "Cobertura complementar",
};
const GESTATION_EVENT_LABEL: Record<string, string> = {
  aborto: "Aborto",
  suspeita_aborto: "Suspeita de aborto",
  perda_gestacional: "Perda gestacional",
  morte_matriz: "Morte da matriz",
  outra: "Outra ocorrência na gestação",
};

/** Junta todos os registros da matriz numa linha do tempo, do mais recente ao mais antigo. */
export function buildSowTimeline(input: {
  breedings: {
    breeding_date: string;
    breeding_type?: string | null;
    boar?: string | null;
    semen_code?: string | null;
    created_at: string;
  }[];
  diagnoses: {
    diagnosis_date: string;
    result: string;
    method?: string | null;
    created_at: string;
  }[];
  gestationEvents: {
    event_date: string;
    event_type: string;
    notes?: string | null;
    created_at: string;
  }[];
  litters: {
    farrowing_date: string;
    born_total: number;
    born_alive: number;
    stillborn: number;
    mummified?: number | null;
    status: string;
    weaning_date: string | null;
    weaned: number | null;
    created_at: string;
  }[];
  litterEvents: {
    event_date: string;
    event_type: string;
    quantity: number;
    note?: string | null;
    created_at: string;
  }[];
  sowEvents: {
    event_date: string;
    event_type: string;
    notes?: string | null;
    created_at: string;
  }[];
  vaccines: { vaccination_date: string; vaccine_name: string; created_at: string }[];
  medications: { administration_start: string; product_name: string; created_at: string }[];
  labels: { sowEvent: Record<string, string>; litterEvent: Record<string, string> };
}): TimelineItem[] {
  const out: TimelineItem[] = [];
  const ts = (c: string) => Date.parse(c) || 0;
  for (const b of input.breedings)
    out.push({
      date: b.breeding_date,
      kind: "cobertura",
      order: ts(b.created_at),
      title: BREEDING_TYPE_LABEL[b.breeding_type ?? ""] ?? "Cobertura",
      detail:
        [b.boar && `Reprodutor: ${b.boar}`, b.semen_code && `Sêmen: ${b.semen_code}`]
          .filter(Boolean)
          .join(" · ") || undefined,
    });
  for (const d of input.diagnoses)
    out.push({
      date: d.diagnosis_date,
      kind: "diagnostico",
      order: ts(d.created_at),
      title: `Diagnóstico ${d.result}`,
      detail: d.method ?? undefined,
    });
  for (const g of input.gestationEvents)
    out.push({
      date: g.event_date,
      kind: "gestacao",
      order: ts(g.created_at),
      title: GESTATION_EVENT_LABEL[g.event_type] ?? g.event_type,
      detail: g.notes ?? undefined,
    });
  for (const l of input.litters) {
    out.push({
      date: l.farrowing_date,
      kind: "parto",
      order: ts(l.created_at),
      title: l.status === "cancelada" ? "Parto (cadastro arquivado)" : "Parto",
      detail: `${l.born_total} nascidos: ${l.born_alive} vivos, ${l.stillborn} natimortos${l.mummified ? `, ${l.mummified} mumificados` : ""}`,
    });
  }
  for (const e of input.litterEvents) {
    if (e.event_type === "desmame")
      out.push({
        date: e.event_date,
        kind: "desmame",
        order: ts(e.created_at),
        title: "Desmame",
        detail: `${e.quantity} leitões desmamados`,
      });
    else
      out.push({
        date: e.event_date,
        kind: "leitegada",
        order: ts(e.created_at),
        title: input.labels.litterEvent[e.event_type] ?? e.event_type,
        detail:
          [e.quantity > 0 ? `${e.quantity}` : null, e.note].filter(Boolean).join(" · ") ||
          undefined,
      });
  }
  for (const e of input.sowEvents)
    out.push({
      date: e.event_date,
      kind: "evento",
      order: ts(e.created_at),
      title: input.labels.sowEvent[e.event_type] ?? e.event_type,
      detail: e.notes ?? undefined,
    });
  for (const v of input.vaccines)
    out.push({
      date: v.vaccination_date,
      kind: "vacina",
      order: ts(v.created_at),
      title: `Vacina: ${v.vaccine_name}`,
    });
  for (const m of input.medications)
    out.push({
      date: m.administration_start,
      kind: "medicamento",
      order: ts(m.created_at),
      title: `Medicamento: ${m.product_name}`,
    });
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order);
}
