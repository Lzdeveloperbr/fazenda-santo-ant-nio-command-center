/** Mapa de baias: ocupação e estado de cada baia a partir dos registros. Funções puras. */
import { daysBetween } from "./gestation";

export type PenState = "inativa" | "livre" | "ocupada" | "lotada" | "acima" | "sem_registro";
export const PEN_STATE: Record<PenState, { label: string; cls: string }> = {
  livre: { label: "Livre", cls: "border-emerald-500/50 bg-emerald-500/10" },
  ocupada: { label: "Ocupada", cls: "border-primary/50 bg-primary/15" },
  lotada: { label: "Lotada", cls: "border-amber-500/60 bg-amber-500/15" },
  acima: { label: "Acima da capacidade", cls: "border-destructive/60 bg-destructive/15" },
  sem_registro: {
    label: "Sem registro recente",
    cls: "border-dashed border-muted-foreground/50 bg-muted/40",
  },
  inativa: { label: "Inativa / manutenção", cls: "border-border bg-muted/70 opacity-60" },
};

type Pen = {
  id: string;
  code: string;
  sector: string;
  building?: string | null;
  room?: string | null;
  capacity: number;
  status: string;
};
type Census = { pen_id: string; event_date: string; animal_count: number | null };

export type PenCell = Pen & {
  occupancy: number | null;
  source: string;
  state: PenState;
  sows: string[];
  piglets: number;
  lastCensus: string | null;
};

/**
 * Ocupação = maior valor entre matrizes vinculadas e o último censo do caderno
 * (o censo conta todos os animais da baia). Sem nenhum dos dois: sem registro.
 */
export function penCells(
  pens: Pen[],
  sowsInPen: Map<string, string[]>,
  pigletsInPen: Map<string, number>,
  census: Census[],
  today: string,
  staleDays = 7,
): PenCell[] {
  const last = new Map<string, Census>();
  for (const c of census)
    if (
      c.animal_count !== null &&
      (!last.has(c.pen_id) || last.get(c.pen_id)!.event_date < c.event_date)
    )
      last.set(c.pen_id, c);
  return pens.map((p) => {
    const sows = sowsInPen.get(p.id) ?? [];
    const c = last.get(p.id);
    const candidates = [sows.length > 0 ? sows.length : null, c?.animal_count ?? null].filter(
      (x): x is number => x !== null,
    );
    const occupancy = candidates.length ? Math.max(...candidates) : null;
    const source =
      c && (c.animal_count ?? 0) >= sows.length
        ? `censo de ${c.event_date.split("-").reverse().join("/")}`
        : sows.length
          ? "matrizes vinculadas"
          : "—";
    let state: PenState;
    if (p.status !== "ativa") state = "inativa";
    else if (
      occupancy === null ||
      (c && daysBetween(c.event_date, today) > staleDays && sows.length === 0)
    )
      state = "sem_registro";
    else if (occupancy > p.capacity) state = "acima";
    else if (occupancy === p.capacity) state = "lotada";
    else if (occupancy === 0) state = "livre";
    else state = "ocupada";
    return {
      ...p,
      occupancy,
      source,
      state,
      sows,
      piglets: pigletsInPen.get(p.id) ?? 0,
      lastCensus: c?.event_date ?? null,
    };
  });
}

/** Agrupa por setor › galpão › sala, mantendo a ordem dos códigos. */
export function groupPens(cells: PenCell[]) {
  const out = new Map<string, Map<string, PenCell[]>>();
  for (const c of [...cells].sort((a, b) =>
    a.code.localeCompare(b.code, "pt-BR", { numeric: true }),
  )) {
    const sector = out.get(c.sector) ?? new Map<string, PenCell[]>();
    const where = [c.building, c.room].filter(Boolean).join(" · ") || "Sem galpão/sala";
    sector.set(where, [...(sector.get(where) ?? []), c]);
    out.set(c.sector, sector);
  }
  return out;
}
