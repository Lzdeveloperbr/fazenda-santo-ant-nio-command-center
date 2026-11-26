/** Resumo de atividade da equipe a partir do histórico de auditoria (dados registrados, sem estimativa). */
export type ActivityRow = {
  actor_id: string | null;
  table_name: string;
  action: string;
  occurred_at: string;
};
export type ActorSummary = {
  actorId: string | null;
  total: number;
  inserts: number;
  updates: number;
  deletes: number;
  first: string;
  last: string;
  byTable: [string, number][];
};

export function summarizeActivity(rows: ActivityRow[]): ActorSummary[] {
  const map = new Map<string, ActorSummary & { tables: Map<string, number> }>();
  for (const r of rows) {
    const key = r.actor_id ?? "sistema";
    let s = map.get(key);
    if (!s) {
      s = {
        actorId: r.actor_id,
        total: 0,
        inserts: 0,
        updates: 0,
        deletes: 0,
        first: r.occurred_at,
        last: r.occurred_at,
        byTable: [],
        tables: new Map(),
      };
      map.set(key, s);
    }
    s.total++;
    if (r.action === "INSERT") s.inserts++;
    else if (r.action === "UPDATE") s.updates++;
    else if (r.action === "DELETE") s.deletes++;
    if (r.occurred_at < s.first) s.first = r.occurred_at;
    if (r.occurred_at > s.last) s.last = r.occurred_at;
    s.tables.set(r.table_name, (s.tables.get(r.table_name) ?? 0) + 1);
  }
  return [...map.values()]
    .map(({ tables, ...s }) => ({
      ...s,
      byTable: [...tables.entries()].sort((a, b) => b[1] - a[1]),
    }))
    .sort((a, b) => b.total - a.total);
}

export const SHIFT_LABEL: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  integral: "Integral",
};
export const ISSUE_CATEGORY_LABEL: Record<string, string> = {
  erro: "Erro no sistema",
  dado_incorreto: "Dado incorreto",
  sugestao: "Sugestão",
  duvida: "Dúvida",
  outro: "Outro",
};
export const ISSUE_STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  descartado: "Descartado",
};

/** Turno sugerido pelo horário local. */
export function currentShift(d = new Date()): "manha" | "tarde" | "noite" {
  const h = d.getHours();
  return h >= 5 && h < 12 ? "manha" : h >= 12 && h < 18 ? "tarde" : "noite";
}
