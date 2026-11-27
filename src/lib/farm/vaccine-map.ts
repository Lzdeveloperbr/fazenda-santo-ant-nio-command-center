/**
 * Mapa de vacinação das matrizes.
 * Prazos vêm só do que foi registrado (próxima dose anotada na aplicação) ou do
 * intervalo de reforço do protocolo cadastrado pelo veterinário. Nada é inventado.
 */
export type VaccineColumn = {
  key: string;
  name: string;
  protocolId: string | null;
  repeatEvery: number | null;
  doseInstructions: string | null;
  validated: boolean;
  anchor?: string | null;
  offset?: number;
};
export type CellState =
  "nunca" | "aplicada" | "em_dia" | "vence" | "atrasada" | "programada" | "fora_ciclo";
export type Cell = { state: CellState; last: string | null; due: string | null; count: number };

type Proto = {
  id: string;
  name: string;
  product: string | null;
  kind: string;
  target: string;
  active: boolean;
  repeat_every_days: number | null;
  dose_instructions: string | null;
  validated_at: string | null;
  anchor?: string;
  offset_days?: number;
};
type Rec = {
  sow_id: string | null;
  animal_scope: string;
  vaccine_name: string;
  vaccination_date: string;
  next_due_date: string | null;
};

export const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
const addDays = (iso: string, d: number) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);

/** Colunas: protocolos ativos de vacina para matriz + vacinas registradas fora de protocolo. */
export function vaccineColumns(protocols: Proto[], records: Rec[]): VaccineColumn[] {
  const cols: VaccineColumn[] = protocols
    .filter((p) => p.active && p.kind === "vacina" && p.target === "matriz")
    .map((p) => ({
      key: `p:${p.id}`,
      name: p.product?.trim() || p.name,
      protocolId: p.id,
      repeatEvery: p.repeat_every_days,
      doseInstructions: p.dose_instructions,
      validated: !!p.validated_at,
      anchor: p.anchor ?? null,
      offset: p.offset_days ?? 0,
    }));
  const known = new Set<string>();
  for (const p of protocols.filter(
    (x) => x.active && x.kind === "vacina" && x.target === "matriz",
  )) {
    known.add(norm(p.name));
    if (p.product) known.add(norm(p.product));
  }
  const extra = new Map<string, string>();
  for (const r of records) {
    if (r.animal_scope !== "matriz" || !r.sow_id) continue;
    const k = norm(r.vaccine_name);
    if (!k || known.has(k) || extra.has(k)) continue;
    extra.set(k, r.vaccine_name.trim());
  }
  return [
    ...cols,
    ...[...extra.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
      .map(([k, name]) => ({
        key: `n:${k}`,
        name,
        protocolId: null,
        repeatEvery: null,
        doseInstructions: null,
        validated: false,
      })),
  ];
}

/** Nomes que contam como esta vacina (nome do protocolo e produto). */
export function columnAliases(col: VaccineColumn, protocols: Proto[]): Set<string> {
  if (!col.protocolId) return new Set([col.key.slice(2)]);
  const p = protocols.find((x) => x.id === col.protocolId);
  return new Set([p?.name, p?.product].filter((x): x is string => !!x).map(norm));
}

export function cellFor(
  records: Rec[],
  sowId: string,
  aliases: Set<string>,
  repeatEvery: number | null,
  today: string,
  warnDays = 15,
): Cell {
  const mine = records
    .filter(
      (r) => r.animal_scope === "matriz" && r.sow_id === sowId && aliases.has(norm(r.vaccine_name)),
    )
    .sort((a, b) => b.vaccination_date.localeCompare(a.vaccination_date));
  const lastRec = mine[0];
  if (!lastRec) return { state: "nunca", last: null, due: null, count: 0 };
  const due =
    lastRec.next_due_date ?? (repeatEvery ? addDays(lastRec.vaccination_date, repeatEvery) : null);
  let state: CellState = "aplicada";
  if (due) state = due < today ? "atrasada" : due <= addDays(today, warnDays) ? "vence" : "em_dia";
  return { state, last: lastRec.vaccination_date, due, count: mine.length };
}

/** Pior situação de uma matriz (para ordenar e filtrar). */
export function worst(cells: Cell[]): CellState {
  const order: CellState[] = [
    "atrasada",
    "nunca",
    "vence",
    "programada",
    "aplicada",
    "em_dia",
    "fora_ciclo",
  ];
  for (const s of order) if (cells.some((c) => c.state === s)) return s;
  return "em_dia";
}

export function ageLabel(birth: string | null, today: string): string | null {
  if (!birth || birth > today) return null;
  const days = Math.round((Date.parse(today) - Date.parse(birth)) / 86_400_000);
  if (days < 60) return `${days} dias`;
  const months = Math.floor(days / 30.4375);
  if (months < 24) return `${months} meses`;
  const y = Math.floor(months / 12),
    m = months % 12;
  return m ? `${y} anos e ${m} ${m === 1 ? "mês" : "meses"}` : `${y} anos`;
}

/** Peso registrado é "antigo" depois de 90 dias. */
export function weightStale(weightDate: string | null, today: string, days = 90) {
  return !weightDate || Date.parse(today) - Date.parse(weightDate) > days * 86_400_000;
}

export const CELL_LABEL: Record<CellState, string> = {
  nunca: "Sem registro",
  aplicada: "Aplicada",
  em_dia: "Em dia",
  vence: "Vence em breve",
  atrasada: "Atrasada",
  programada: "Programada",
  fora_ciclo: "Fora do ciclo",
};

/** Ciclo atual da matriz: cobertura ativa ou leitegada em maternidade. */
export type SowCycle = {
  start: string;
  cover: string | null;
  farrowing: string | null;
  estimated: boolean;
};
type Br = {
  id: string;
  sow_id: string;
  breeding_date: string;
  cycle_status: string;
  expected_farrowing: string | null;
};
type Lt = { sow_id: string; breeding_id: string | null; farrowing_date: string; status: string };

export function sowCycle(sowId: string, breedings: Br[], litters: Lt[]): SowCycle | null {
  const b = breedings
    .filter((x) => x.sow_id === sowId && x.cycle_status === "ativo")
    .sort((a, c) => c.breeding_date.localeCompare(a.breeding_date))[0];
  if (b)
    return {
      start: b.breeding_date,
      cover: b.breeding_date,
      farrowing: b.expected_farrowing,
      estimated: true,
    };
  const l = litters
    .filter((x) => x.sow_id === sowId && x.status === "maternidade")
    .sort((a, c) => c.farrowing_date.localeCompare(a.farrowing_date))[0];
  if (!l) return null;
  const lb = l.breeding_id ? breedings.find((x) => x.id === l.breeding_id) : undefined;
  return {
    start: lb?.breeding_date ?? l.farrowing_date,
    cover: lb?.breeding_date ?? null,
    farrowing: l.farrowing_date,
    estimated: false,
  };
}

/** Vacina ligada ao ciclo (dias da cobertura ou do parto): feita se aplicada neste ciclo. */
export function cycleCell(
  records: Rec[],
  sowId: string,
  aliases: Set<string>,
  anchor: string,
  offset: number,
  cycle: SowCycle | null,
  today: string,
  warnDays = 15,
): Cell {
  const mine = records
    .filter(
      (r) => r.animal_scope === "matriz" && r.sow_id === sowId && aliases.has(norm(r.vaccine_name)),
    )
    .sort((a, b) => b.vaccination_date.localeCompare(a.vaccination_date));
  const last = mine[0]?.vaccination_date ?? null;
  const base = !cycle
    ? null
    : anchor === "cobertura"
      ? cycle.cover
      : anchor === "parto"
        ? cycle.farrowing
        : null;
  if (!cycle || !base) return { state: "fora_ciclo", last, due: null, count: mine.length };
  const due = addDays(base, offset);
  if (mine.some((r) => r.vaccination_date >= cycle.start))
    return { state: "em_dia", last, due, count: mine.length };
  const state: CellState =
    due < today ? "atrasada" : due <= addDays(today, warnDays) ? "vence" : "programada";
  return { state, last, due, count: mine.length };
}

/** Situação de uma coluna para a matriz: pelo ciclo (protocolos ancorados) ou pelo reforço. */
export function cellForColumn(
  records: Rec[],
  sowId: string,
  aliases: Set<string>,
  col: VaccineColumn,
  cycle: SowCycle | null,
  today: string,
): Cell {
  if (col.protocolId && (col.anchor === "cobertura" || col.anchor === "parto") && !col.repeatEvery)
    return cycleCell(records, sowId, aliases, col.anchor, col.offset ?? 0, cycle, today);
  return cellFor(records, sowId, aliases, col.repeatEvery, today);
}

/** Cores (classes) de cada situação, iguais no mapa e na ficha. */
export const CELL_TONE: Record<CellState, string> = {
  atrasada: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  nunca: "border-border bg-muted/60 text-muted-foreground",
  vence: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  programada: "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-300",
  aplicada: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  em_dia: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  fora_ciclo: "border-dashed border-border bg-transparent text-muted-foreground",
};
