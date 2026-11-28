import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/access";
import { pendingIds, schemaStatusQuery } from "@/lib/schema-check";

/** Aviso no topo para administrador/gerente quando falta aplicar migration no banco. */
export function SchemaBanner() {
  const perms = usePermissions();
  const q = useQuery({ ...schemaStatusQuery, enabled: !!perms?.canViewAudit });
  const [closed, setClosed] = useState(false);
  const pending = pendingIds(q.data ?? []);
  if (!perms?.canViewAudit || closed || !pending.length) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1">
        <b>Banco de dados desatualizado.</b> Falta aplicar{" "}
        {pending.length === 1 ? "a migration" : "as migrations"} {pending.join(", ")} no Supabase.
        Até lá, algumas telas não salvam.{" "}
        <a href="/configuracoes?aba=sistema" className="font-semibold underline">
          Ver detalhes
        </a>
      </p>
      <button
        onClick={() => setClosed(true)}
        className="rounded p-1 hover:bg-amber-500/20"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Configurações › Sistema: situação de cada atualização do banco. */
export function SystemStatus() {
  const qc = useQueryClient();
  const q = useQuery(schemaStatusQuery);
  const pending = pendingIds(q.data ?? []);
  return (
    <div className="space-y-4">
      <div className="panel space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Atualizações do banco de dados</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={q.isFetching}
            onClick={() => void qc.invalidateQueries({ queryKey: ["schema-status"] })}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
            Conferir de novo
          </Button>
        </div>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Conferindo…</p>
        ) : (
          <>
            <p
              className={`rounded-lg p-3 text-sm ${pending.length ? "bg-amber-500/10" : "bg-primary/10"}`}
            >
              {pending.length ? (
                <>
                  Faltam <b>{pending.length}</b> atualização(ões). Aplique em ordem, depois de um
                  backup, pelo SQL Editor do Supabase ou pelo fluxo do Lovable, usando os arquivos{" "}
                  <code className="text-xs">drizzle/migrations/{pending[0]}_….sql</code> em diante.
                </>
              ) : (
                "Todas as atualizações conferíveis estão aplicadas."
              )}
            </p>
            <ul className="divide-y text-sm">
              {(q.data ?? []).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2">
                  {r.state === "ok" ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : r.state === "faltando" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="w-12 font-mono text-xs">{r.id}</span>
                  <span className="flex-1">{r.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.state === "ok"
                      ? "Aplicada"
                      : r.state === "faltando"
                        ? "Falta aplicar"
                        : "Não deu para conferir"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              A 0024 só muda permissões e não aparece aqui; aplique junto com as outras. "Não deu
              para conferir" costuma ser falta de internet.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
