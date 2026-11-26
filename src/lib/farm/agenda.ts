/**
 * Agenda unificada da granja. Tudo é derivado de registros e parâmetros;
 * nada aqui é gravado. Previsões vêm marcadas como `estimated`.
 */
import { addDays, type GestationConfig } from "./gestation";

export type AgendaKind =
  | "cobertura" | "cio" | "diagnostico" | "transferencia" | "parto" | "desmame"
  | "vacina" | "tratamento" | "revisao" | "protocolo" | "tarefa" | "conta" | "validade";

export const AGENDA_KIND_LABEL: Record<AgendaKind, string> = {
  cobertura: "Inseminação / cobertura",
  cio: "Verificar retorno ao cio",
  diagnostico: "Diagnóstico de gestação",
  transferencia: "Transferência para maternidade",
  parto: "Parto",
  desmame: "Desmame",
  vacina: "Vacinação",
  tratamento: "Fim de tratamento",
  revisao: "Revisão sanitária",
  protocolo: "Protocolo sanitário",
  tarefa: "Tarefa",
  conta: "Vencimento financeiro",
  validade: "Validade de produto",
};

export type AgendaRoute = "/gestacao" | "/maternidade" | "/sanidade" | "/farmacia-ai" | "/tarefas" | "/financeiro" | "/almoxarifado" | "/agenda" | "/lotes";

export type AgendaItem = {
  id: string;
  date: string;
  kind: AgendaKind;
  title: string;
  detail?: string | undefined;
  estimated: boolean;
  done: boolean;
  href: AgendaRoute;
  taskId?: string;
  sowId?: string | undefined;
};

export type AgendaSettings = { gestation: GestationConfig; diagnosisDay: number | null; maternityTransferDay: number | null; weaningAgeDays: number | null };

type Breeding = { id: string; sow_id: string; breeding_date: string; cycle_status: string; pregnancy_check: string };
type Litter = { id: string; sow_id: string; farrowing_date: string; status: string; weaning_date: string | null };
type Protocol = { id: string; name: string; kind: string; target: string; anchor: string; offset_days: number; repeat_every_days: number | null; product: string | null; validated_at: string | null; active: boolean };
type Batch = { id: string; name: string; entry_date: string; status: string };

export type AgendaInput = {
  breedings: Breeding[];
  litters: Litter[];
  weaningPlans: { litter_id: string; weaning_date: string }[];
  vaccinations: { id: string; vaccine_name: string; next_due_date: string | null; sow_id: string | null }[];
  medications: { id: string; product_name: string; administration_end: string | null; sow_id: string | null }[];
  healthEvents: { id: string; follow_up_date: string | null; clinical_signs: string; status?: string }[];
  tasks: { id: string; title: string; due_date: string | null; status: string; sector: string | null; sow_id: string | null }[];
  finance: { id: string; entry_type: string; category: string; amount: number | string; status: string; due_date: string | null }[];
  medLots: { id: string; medication_id: string; lot_number: string | null; expiry_date: string | null; quantity: number }[];
  protocols: Protocol[];
  batches: Batch[];
  sowTag: (id: string) => string;
  medName: (id: string) => string;
};

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

/** Datas de um protocolo a partir da data-base, com repetições até `to`. */
export function protocolDates(base: string, offset: number, repeat: number | null, from: string, to: string): string[] {
  const out: string[] = [];
  let d = addDays(base, offset);
  for (let i = 0; i < 60 && d <= to; i++) {
    if (d >= from) out.push(d);
    if (!repeat) break;
    d = addDays(d, repeat);
  }
  return out;
}

export function buildAgenda(input: AgendaInput, s: AgendaSettings, from: string, to: string, today: string): AgendaItem[] {
  const out: AgendaItem[] = [];
  const push = (i: AgendaItem) => { if (inRange(i.date, from, to)) out.push(i); };
  const g = s.gestation;
  const active = input.breedings.filter((b) => b.cycle_status === "ativo");

  for (const b of input.breedings)
    push({ id: `cob-${b.id}`, date: b.breeding_date, kind: "cobertura", title: `Cobertura · ${input.sowTag(b.sow_id)}`, estimated: false, done: true, href: "/gestacao", sowId: b.sow_id });

  for (const b of active) {
    const tag = input.sowTag(b.sow_id);
    if (b.pregnancy_check === "pendente") {
      push({ id: `cio-${b.id}`, date: addDays(b.breeding_date, g.heatStart), kind: "cio", title: `Observar retorno ao cio · ${tag}`, detail: `Janela do dia ${g.heatStart} ao ${g.heatEnd} após a cobertura.`, estimated: true, done: false, href: "/gestacao", sowId: b.sow_id });
      if (s.diagnosisDay !== null)
        push({ id: `dg-${b.id}`, date: addDays(b.breeding_date, s.diagnosisDay), kind: "diagnostico", title: `Diagnóstico de gestação · ${tag}`, detail: `Dia ${s.diagnosisDay} configurado pela granja.`, estimated: true, done: false, href: "/gestacao", sowId: b.sow_id });
    }
    if (s.maternityTransferDay !== null)
      push({ id: `tr-${b.id}`, date: addDays(b.breeding_date, s.maternityTransferDay), kind: "transferencia", title: `Transferir para maternidade · ${tag}`, estimated: true, done: false, href: "/gestacao", sowId: b.sow_id });
    push({ id: `pt-${b.id}`, date: addDays(b.breeding_date, g.gestationDays), kind: "parto", title: `Parto previsto · ${tag}`, detail: `Referência de ${g.gestationDays} dias de gestação.`, estimated: true, done: false, href: "/gestacao", sowId: b.sow_id });
  }

  const planned = new Map(input.weaningPlans.map((w) => [w.litter_id, w.weaning_date]));
  for (const l of input.litters) {
    if (l.status === "cancelada") continue;
    const tag = input.sowTag(l.sow_id);
    push({ id: `pr-${l.id}`, date: l.farrowing_date, kind: "parto", title: `Parto realizado · ${tag}`, estimated: false, done: true, href: "/maternidade", sowId: l.sow_id });
    if (l.status === "desmamada" && l.weaning_date)
      push({ id: `dr-${l.id}`, date: l.weaning_date, kind: "desmame", title: `Desmame realizado · ${tag}`, estimated: false, done: true, href: "/maternidade", sowId: l.sow_id });
    if (l.status === "maternidade") {
      const plan = planned.get(l.id);
      const date = plan ?? (s.weaningAgeDays !== null ? addDays(l.farrowing_date, s.weaningAgeDays) : null);
      if (date) push({ id: `dp-${l.id}`, date, kind: "desmame", title: `Desmame previsto · ${tag}`, detail: plan ? "Data definida em Marcação e desmame." : `Idade de desmame configurada: ${s.weaningAgeDays} dias.`, estimated: true, done: false, href: "/maternidade", sowId: l.sow_id });
    }
  }

  for (const v of input.vaccinations)
    if (v.next_due_date) push({ id: `vc-${v.id}`, date: v.next_due_date, kind: "vacina", title: `Reforço: ${v.vaccine_name}${v.sow_id ? ` · ${input.sowTag(v.sow_id)}` : ""}`, detail: "Próxima data informada no registro da vacinação.", estimated: false, done: false, href: "/sanidade", sowId: v.sow_id ?? undefined });
  for (const m of input.medications)
    if (m.administration_end) push({ id: `md-${m.id}`, date: m.administration_end, kind: "tratamento", title: `Fim do tratamento: ${m.product_name}${m.sow_id ? ` · ${input.sowTag(m.sow_id)}` : ""}`, estimated: false, done: m.administration_end < today, href: "/sanidade", sowId: m.sow_id ?? undefined });
  for (const h of input.healthEvents)
    if (h.follow_up_date && h.status !== "encerrado") push({ id: `hv-${h.id}`, date: h.follow_up_date, kind: "revisao", title: "Revisão de ocorrência sanitária", detail: h.clinical_signs, estimated: false, done: false, href: "/sanidade" });

  for (const t of input.tasks)
    if (t.due_date) push({ id: `tk-${t.id}`, date: t.due_date, kind: "tarefa", title: t.title, detail: t.sector ?? undefined, estimated: false, done: t.status === "concluida", href: "/tarefas", taskId: t.id, sowId: t.sow_id ?? undefined });
  for (const f of input.finance)
    if (f.status === "pendente" && f.due_date) push({ id: `fn-${f.id}`, date: f.due_date, kind: "conta", title: `${f.entry_type === "receita" ? "A receber" : "A pagar"}: ${f.category}`, detail: Number(f.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), estimated: false, done: false, href: "/financeiro" });
  for (const l of input.medLots)
    if (l.expiry_date && Number(l.quantity) > 0) push({ id: `vl-${l.id}`, date: l.expiry_date, kind: "validade", title: `Vence: ${input.medName(l.medication_id)}`, detail: `Lote ${l.lot_number ?? "sem identificação"}, ${l.quantity} em estoque.`, estimated: false, done: false, href: "/farmacia-ai" });

  // Protocolos: só os validados geram lembrete.
  for (const p of input.protocols) {
    if (!p.active || !p.validated_at) continue;
    const label = `${p.name}${p.product ? ` (${p.product})` : ""}`;
    const add = (base: string, who: string, est: boolean, key: string, sowId?: string, href: AgendaRoute = "/sanidade") => {
      for (const d of protocolDates(base, p.offset_days, p.repeat_every_days, from, to))
        push({ id: `pc-${p.id}-${key}-${d}`, date: d, kind: "protocolo", title: `${label} · ${who}`, detail: est ? "Calculado sobre data prevista." : undefined, estimated: est, done: false, href, sowId });
    };
    if (p.anchor === "cobertura") for (const b of active) add(b.breeding_date, input.sowTag(b.sow_id), false, b.id, b.sow_id);
    if (p.anchor === "parto") {
      for (const b of active) add(addDays(b.breeding_date, g.gestationDays), input.sowTag(b.sow_id), true, b.id, b.sow_id);
      for (const l of input.litters) if (l.status === "maternidade") add(l.farrowing_date, `${p.target === "leitegada" ? "leitegada de " : ""}${input.sowTag(l.sow_id)}`, false, l.id, l.sow_id);
    }
    if (p.anchor === "nascimento") for (const l of input.litters) if (l.status === "maternidade") add(l.farrowing_date, `leitegada de ${input.sowTag(l.sow_id)}`, false, l.id, l.sow_id);
    if (p.anchor === "desmame") for (const l of input.litters) if (l.status === "desmamada" && l.weaning_date) add(l.weaning_date, input.sowTag(l.sow_id), false, l.id, l.sow_id);
    if (p.anchor === "entrada_lote") for (const b of input.batches) if (b.status === "ativo") add(b.entry_date, `lote ${b.name}`, false, b.id, undefined, "/lotes");
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || Number(a.done) - Number(b.done) || a.kind.localeCompare(b.kind));
}

/** Pendências vencidas (não concluídas, data anterior a hoje, não estimadas). */
export function overdue(items: AgendaItem[], today: string) {
  return items.filter((i) => !i.done && i.date < today && (i.kind === "tarefa" || i.kind === "conta" || i.kind === "revisao" || i.kind === "vacina"));
}
