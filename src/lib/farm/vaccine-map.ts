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
};
export type CellState = "nunca" | "aplicada" | "em_dia" | "vence" | "atrasada";
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
  const order: CellState[] = ["atrasada", "nunca", "vence", "aplicada", "em_dia"];
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
};
