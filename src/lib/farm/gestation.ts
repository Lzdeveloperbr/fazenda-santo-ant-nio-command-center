/** Pure reproductive-cycle math. All dates are ISO "YYYY-MM-DD", computed in UTC (leap years and month/year turns handled by Date). */
export type GestationConfig = { heatPrep: number; heatStart: number; heatEnd: number; attentionStart: number; approachDay: number; intensiveDay: number; gestationDays: number };
export const DEFAULT_CONFIG: GestationConfig = { heatPrep: 18, heatStart: 19, heatEnd: 21, attentionStart: 105, approachDay: 110, intensiveDay: 112, gestationDays: 114 };
/** Reject impossible or fractional day settings before they affect farm alerts. */
export function validateGestationConfig(c: GestationConfig): string | null {
  const values = Object.values(c);
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 130)) {
    return "Todos os prazos devem ser números inteiros entre 1 e 130 dias.";
  }
  if (!(c.heatPrep < c.heatStart && c.heatStart <= c.heatEnd && c.heatEnd < c.attentionStart && c.attentionStart <= c.approachDay && c.approachDay <= c.intensiveDay && c.intensiveDay <= c.gestationDays)) {
    return "Os dias precisam estar em ordem crescente.";
  }
  return null;
}


const DAY = 86400000;
const toUTC = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return Date.UTC(y!, m! - 1, d!); };
export function addDays(iso: string, days: number) { return new Date(toUTC(iso) + days * DAY).toISOString().slice(0, 10); }
export function daysBetween(fromISO: string, toISO: string) { return Math.round((toUTC(toISO) - toUTC(fromISO)) / DAY); }

export function cycleDates(breedingDate: string, c: GestationConfig = DEFAULT_CONFIG) {
  return {
    heatPrep: addDays(breedingDate, c.heatPrep), heatStart: addDays(breedingDate, c.heatStart), heatEnd: addDays(breedingDate, c.heatEnd),
    attention: addDays(breedingDate, c.attentionStart), approach: addDays(breedingDate, c.approachDay), intensive: addDays(breedingDate, c.intensiveDay),
    farrowing: addDays(breedingDate, c.gestationDays),
  };
}

export type CycleLike = { id: string; sow_id: string; breeding_date: string; heat_check: string; pregnancy_check: string; cycle_status: string };
export type Priority = "info" | "atencao" | "importante" | "urgente";
export const PRIORITY_LABEL: Record<Priority, string> = { info: "Informativo", atencao: "Atenção", importante: "Importante", urgente: "Urgente" };
export const PRIORITY_RANK: Record<Priority, number> = { urgente: 0, importante: 1, atencao: 2, info: 3 };

/** Situation of an open cycle on a given day. Absence of heat never means confirmed pregnancy. */
export function cycleStage(b: CycleLike, today: string, c: GestationConfig = DEFAULT_CONFIG) {
  if (b.cycle_status !== "ativo") return { key: b.cycle_status, label: CLOSED_LABEL[b.cycle_status] ?? b.cycle_status };
  const day = daysBetween(b.breeding_date, today);
  if (day > c.gestationDays) return { key: "ultrapassada", label: "Previsão de parto ultrapassada" };
  if (day >= c.attentionStart) return { key: "proxima_parto", label: "Próxima do parto" };
  if (b.pregnancy_check === "positivo") return { key: "gestante", label: "Gestante confirmada" };
  if (b.heat_check === "nao_apresentou") return { key: "possivel", label: b.pregnancy_check === "inconclusivo" ? "Diagnóstico inconclusivo" : "Possível gestante · aguardando diagnóstico" };
  if (day < c.heatStart) return { key: "aguardando_retorno", label: "Aguardando janela de retorno ao cio" };
  if (day <= c.heatEnd) return { key: "janela_retorno", label: "Em janela de retorno ao cio" };
  return { key: "retorno_pendente", label: "Verificação de cio pendente" };
}
export const CLOSED_LABEL: Record<string, string> = { retorno: "Retornou ao cio", negativo: "Diagnóstico negativo", perda: "Perda gestacional", parido: "Parto registrado", encerrado: "Ciclo encerrado" };

export type Alert = { key: string; breedingId: string; sowId: string; date: string; priority: Priority; title: string; action: string };

/** At most one alert per cycle per stage: the key is stable for the stage, so it never duplicates day after day. */
export function cycleAlert(b: CycleLike, today: string, c: GestationConfig = DEFAULT_CONFIG): Alert | null {
  if (b.cycle_status !== "ativo") return null;
  const d = cycleDates(b.breeding_date, c);
  const day = daysBetween(b.breeding_date, today);
  const mk = (stage: string, date: string, priority: Priority, title: string, action: string): Alert => ({ key: `${b.id}:${stage}`, breedingId: b.id, sowId: b.sow_id, date, priority, title, action });
  if (day > c.gestationDays) return mk("parto_atrasado", d.farrowing, "urgente", `Dia ${day}: data de referência do parto passou`, "Verificar se houve parto ou perda e comunicar o responsável.");
  if (day === c.gestationDays) return mk("parto_ref", d.farrowing, "urgente", "Dia de referência do parto", "Acompanhar a matriz e registrar o parto quando ocorrer.");
  if (day >= c.intensiveDay) return mk("intensiva", d.intensive, "importante", `Dia ${day}: preparação intensificada`, "Conferir checklist de maternidade e observar sinais de parto.");
  if (day >= c.approachDay) return mk("aproximando", d.approach, "importante", `Dia ${day}: parto se aproximando`, "Confirmar baia de maternidade e transferência.");
  if (day >= c.attentionStart) return mk("janela_parto", d.attention, "atencao", `Dia ${day}: início da janela de atenção`, "Incluir na preparação de maternidade.");
  if (b.heat_check === "pendente") {
    if (day > c.heatEnd) return mk("cio_pendente", d.heatEnd, "urgente", `Dia ${day}: observação de cio não registrada`, "Registrar se apresentou ou não cio.");
    if (day === c.heatEnd) return mk("cio_final", d.heatEnd, "importante", "Dia 21: finalizar verificação de cio", "Registrar o resultado da observação.");
    if (day >= c.heatStart) return mk("cio_janela", d.heatStart, "atencao", `Dia ${day}: verificar retorno ao cio`, "Observar a matriz com o cachaço/sinais de cio.");
    if (day === c.heatPrep) return mk("cio_prep", d.heatPrep, "info", "Dia 18: preparar verificação de cio", "Programar a observação a partir de amanhã.");
    return null;
  }
  if (b.heat_check === "nao_apresentou" && b.pregnancy_check !== "positivo" && day > c.heatEnd)
    return mk(b.pregnancy_check === "inconclusivo" ? "reavaliar" : "diagnostico", d.heatEnd, "importante", b.pregnancy_check === "inconclusivo" ? "Reavaliar diagnóstico inconclusivo" : "Diagnóstico de gestação pendente", "Registrar o diagnóstico (ultrassom ou avaliação veterinária).");
  return null;
}

type Closed = { breeding_date: string; cycle_status: string; heat_check_date: string | null };
type LitterLike = { breeding_id: string | null; farrowing_date: string; born_total: number; born_alive: number; stillborn: number; mummified: number };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const rate = (n: number, d: number) => (d ? n / d : null);

/** Rates use only cycles with a known result (retorno, negativo, perda, parido); open cycles never enter a denominator. */
export function reproductiveIndicators(cycles: (Closed & { id: string })[], litters: LitterLike[], diagnoses: { result: string }[]) {
  const known = cycles.filter((c) => ["retorno", "negativo", "perda", "parido"].includes(c.cycle_status));
  const returns = known.filter((c) => c.cycle_status === "retorno");
  const farrowed = known.filter((c) => c.cycle_status === "parido");
  const pos = diagnoses.filter((d) => d.result === "positivo").length, neg = diagnoses.filter((d) => d.result === "negativo").length;
  const byId = new Map(cycles.map((c) => [c.id, c]));
  const linked = litters.filter((l) => l.breeding_id && byId.has(l.breeding_id));
  return {
    knownCycles: known.length,
    returnRate: rate(returns.length, known.length),
    farrowRate: rate(farrowed.length, known.length),
    pregnancyRate: rate(known.length - returns.length - known.filter((c) => c.cycle_status === "negativo").length, known.length),
    confirmationRate: rate(pos, pos + neg),
    avgReturnInterval: avg(returns.filter((c) => c.heat_check_date).map((c) => daysBetween(c.breeding_date, c.heat_check_date!))),
    avgGestation: avg(linked.map((l) => daysBetween(byId.get(l.breeding_id!)!.breeding_date, l.farrowing_date))),
    avgBornTotal: avg(litters.map((l) => l.born_total)), avgBornAlive: avg(litters.map((l) => l.born_alive)),
    avgStillborn: avg(litters.map((l) => l.stillborn)), avgMummified: avg(litters.map((l) => l.mummified)),
  };
}

/** Farrowing count check: total must equal alive + stillborn + mummified. Returns a warning, never blocks. */
export function farrowingWarning(total: number, alive: number, still: number, mummified: number) {
  if ([total, alive, still, mummified].some((n) => !Number.isInteger(n) || n < 0)) return "Use números inteiros sem valores negativos.";
  if (alive + still + mummified !== total) return `A soma (vivos ${alive} + natimortos ${still} + mumificados ${mummified} = ${alive + still + mummified}) difere do total informado (${total}).`;
  return null;
}
