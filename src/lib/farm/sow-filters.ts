/** Filtros avançados da lista de matrizes e filtros salvos (no aparelho). */
export type SowFilter = {
  q: string;
  status: string;
  parityMin: number | null;
  parityMax: number | null;
  farrowWithin: number | null;
  breed: string;
};
export const EMPTY_FILTER: SowFilter = {
  q: "",
  status: "todas",
  parityMin: null,
  parityMax: null,
  farrowWithin: null,
  breed: "",
};
export type SavedFilter = { name: string; filter: SowFilter };

type RowLike = {
  s: { ear_tag: string; name: string | null; status: string; breed?: string | null };
  parity: number;
  expected: string | null;
};

export function matchesFilter(r: RowLike, f: SowFilter, today: string): boolean {
  if (f.q && !`${r.s.ear_tag} ${r.s.name ?? ""}`.toLowerCase().includes(f.q.toLowerCase()))
    return false;
  if (f.status !== "todas" && f.status !== "arquivadas" && r.s.status !== f.status) return false;
  if (f.parityMin !== null && r.parity < f.parityMin) return false;
  if (f.parityMax !== null && r.parity > f.parityMax) return false;
  if (f.breed && (r.s.breed ?? "").trim().toLowerCase() !== f.breed.trim().toLowerCase())
    return false;
  if (f.farrowWithin !== null) {
    if (!r.expected || r.s.status !== "gestante") return false;
    const days = Math.round((Date.parse(r.expected) - Date.parse(today)) / 86_400_000);
    if (days < 0 || days > f.farrowWithin) return false;
  }
  return true;
}

export function activeFilterCount(f: SowFilter) {
  return [
    f.q,
    f.status !== "todas",
    f.parityMin !== null,
    f.parityMax !== null,
    f.farrowWithin !== null,
    f.breed,
  ].filter(Boolean).length;
}

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
/** Lê filtros salvos sem confiar no conteúdo guardado. */
export function parseSaved(raw: string | null): SavedFilter[] {
  try {
    const list: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(list)) return [];
    return list
      .flatMap((x): SavedFilter[] => {
        if (!x || typeof x !== "object") return [];
        const { name, filter } = x as { name?: unknown; filter?: Record<string, unknown> };
        if (typeof name !== "string" || !name.trim() || !filter || typeof filter !== "object")
          return [];
        return [
          {
            name: name.slice(0, 40),
            filter: {
              q: typeof filter["q"] === "string" ? filter["q"].slice(0, 60) : "",
              status: typeof filter["status"] === "string" ? filter["status"] : "todas",
              parityMin: num(filter["parityMin"]),
              parityMax: num(filter["parityMax"]),
              farrowWithin: num(filter["farrowWithin"]),
              breed: typeof filter["breed"] === "string" ? filter["breed"].slice(0, 40) : "",
            },
          },
        ];
      })
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function saveFilter(list: SavedFilter[], name: string, filter: SowFilter): SavedFilter[] {
  const n = name.trim().slice(0, 40);
  if (!n) return list;
  return [
    ...list.filter((x) => x.name.toLowerCase() !== n.toLowerCase()),
    { name: n, filter },
  ].slice(-20);
}
