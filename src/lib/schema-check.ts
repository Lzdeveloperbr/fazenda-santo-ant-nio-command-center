import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isMissingSchema } from "@/lib/errors";

/** O que cada migration criou e que dá para conferir pela API (tabela + coluna). */
export const MIGRATION_PROBES = [
  { id: "0015", label: "Perfis de acesso e auditoria", table: "user_access", column: "role" },
  {
    id: "0016",
    label: "Prontuário da matriz e parâmetros",
    table: "farm_settings",
    column: "diagnosis_day",
  },
  { id: "0017", label: "Maternidade, leitões e instalações", table: "litters", column: "runts" },
  { id: "0018", label: "Estoque, fornecedores e financeiro", table: "stock_items", column: "id" },
  { id: "0019", label: "Agenda e protocolos sanitários", table: "health_protocols", column: "id" },
  { id: "0020", label: "Assistente (perguntas)", table: "ai_questions", column: "id" },
  { id: "0021", label: "Cio, sêmen, condição e nutrição", table: "semen_batches", column: "id" },
  { id: "0022", label: "Isolamento por granja", table: "farms", column: "id" },
  { id: "0023", label: "Fluxos guiados, turnos e problemas", table: "issue_reports", column: "id" },
  { id: "0025", label: "Histórico de peso das matrizes", table: "sow_weighings", column: "id" },
] as const;

export type ProbeState = "ok" | "faltando" | "indefinido";
export type ProbeResult = { id: string; label: string; state: ProbeState };

export function classifyProbe(error: unknown): ProbeState {
  if (!error) return "ok";
  return isMissingSchema(error as { code?: unknown; message?: unknown })
    ? "faltando"
    : "indefinido";
}

export function pendingIds(results: ProbeResult[]) {
  return results.filter((r) => r.state === "faltando").map((r) => r.id);
}

export const schemaStatusQuery = queryOptions({
  queryKey: ["schema-status"],
  staleTime: 30 * 60_000,
  retry: false,
  queryFn: async (): Promise<ProbeResult[]> =>
    Promise.all(
      MIGRATION_PROBES.map(async (p) => {
        const { error } = await supabase
          .from(p.table as any)
          .select(p.column, { head: true, count: "exact" })
          .limit(1);
        return { id: p.id, label: p.label, state: classifyProbe(error) };
      }),
    ),
});
