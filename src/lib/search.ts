/** Busca global: normaliza texto e pontua correspondências. Pura e testável. */
export type SearchKind = "matriz" | "reprodutor" | "baia" | "lote" | "medicamento" | "tarefa";

export type SearchDoc = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string | undefined;
  /** Textos onde procurar, além do título. */
  terms: (string | null | undefined)[];
};

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  matriz: "Matrizes",
  reprodutor: "Reprodutores",
  baia: "Baias",
  lote: "Lotes",
  medicamento: "Medicamentos",
  tarefa: "Tarefas",
};

export function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** 3 = identificação exata, 2 = começa com, 1 = contém; 0 = sem correspondência. */
export function scoreDoc(doc: SearchDoc, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  let best = 0;
  for (const raw of [doc.title, ...doc.terms]) {
    if (!raw) continue;
    const t = normalize(raw);
    const s = t === q ? 3 : t.startsWith(q) ? 2 : t.includes(q) ? 1 : 0;
    if (s > best) best = s;
    if (best === 3) break;
  }
  return best;
}

export function searchDocs(docs: SearchDoc[], query: string, perKind = 6) {
  const scored = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, query) }))
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.doc.title.localeCompare(b.doc.title, "pt-BR", { numeric: true }),
    );
  const groups = new Map<SearchKind, SearchDoc[]>();
  for (const { doc } of scored) {
    const list = groups.get(doc.kind) ?? [];
    if (list.length < perKind) list.push(doc);
    groups.set(doc.kind, list);
  }
  return groups;
}
