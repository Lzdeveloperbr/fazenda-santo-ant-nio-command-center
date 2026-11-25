import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectCls } from "@/components/farm/FormDialog";
import {
  accessQuery,
  auditDiff,
  AUDIT_ACTION_LABEL,
  AUDIT_ORIGIN_LABEL,
  AUDIT_TABLE_LABEL,
  ROLE_INFO,
  isRole,
} from "@/lib/access";
import { addDaysISO, todayISO } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de alterações | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Trilha de auditoria: quem incluiu, alterou ou excluiu cada registro, com valor anterior e novo.",
      },
    ],
  }),
  component: Historico,
});

const PAGE = 100;

function Historico() {
  const { user } = Route.useRouteContext();
  const access = useQuery(accessQuery(user.id));
  const [from, setFrom] = useState(() => addDaysISO(todayISO(), -7));
  const [to, setTo] = useState(todayISO);
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);

  const team = useQuery({
    queryKey: ["farm-users"],
    enabled: !!access.data?.canViewAudit,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("farm_users");
      if (error) throw error;
      return data ?? [];
    },
  });
  const names = useMemo(
    () =>
      new Map((team.data ?? []).map((m) => [m.user_id, m.display_name || m.email || "Usuário"])),
    [team.data],
  );

  const logs = useQuery({
    queryKey: ["audit-logs", from, to, table, action, actor, limit],
    enabled: !!access.data?.canViewAudit,
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("*")
        .gte("occurred_at", `${from}T00:00:00`)
        .lt("occurred_at", `${addDaysISO(to, 1)}T00:00:00`)
        .order("occurred_at", { ascending: false })
        .limit(limit + 1);
      if (table) q = q.eq("table_name", table);
      if (action) q = q.eq("action", action);
      if (actor) q = q.eq("actor_id", actor);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (access.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando permissões…</p>;
  if (!access.data?.canViewAudit)
    return (
      <Empty>Somente administrador ou gerente pode consultar o histórico de alterações.</Empty>
    );

  const rows = (logs.data ?? []).slice(0, limit);
  const hasMore = (logs.data?.length ?? 0) > limit;

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Gestão" title="Histórico de alterações" />
      <p className="max-w-3xl text-sm text-muted-foreground">
        Cada inclusão, alteração e exclusão feita no banco fica registrada aqui, com o usuário, o
        horário, a origem e os valores antes e depois. Ninguém pode editar ou apagar esta trilha
        pelo aplicativo. Registros anteriores à ativação da auditoria não aparecem.
      </p>

      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold text-muted-foreground">
          De
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setFrom(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Até
          <Input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setTo(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Módulo
          <select
            className={selectCls}
            value={table}
            onChange={(e) => {
              setTable(e.target.value);
              setLimit(PAGE);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(AUDIT_TABLE_LABEL)
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Ação
          <select
            className={selectCls}
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setLimit(PAGE);
            }}
          >
            <option value="">Todas</option>
            {Object.entries(AUDIT_ACTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Usuário
          <select
            className={selectCls}
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setLimit(PAGE);
            }}
          >
            <option value="">Todos</option>
            {(team.data ?? []).map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name || m.email}
              </option>
            ))}
          </select>
        </label>
      </div>

      {logs.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : logs.isError ? (
        <Empty>Não foi possível carregar o histórico: {(logs.error as Error).message}</Empty>
      ) : rows.length === 0 ? (
        <Empty>Nenhuma alteração registrada com estes filtros.</Empty>
      ) : (
        <div className="panel divide-y divide-border/60">
          {rows.map((r) => {
            const diff = auditDiff(
              r.old_data,
              r.new_data,
              r.action === "update" ? r.changed_fields : null,
            );
            const who = r.actor_id ? (names.get(r.actor_id) ?? "Usuário removido") : "Sistema";
            return (
              <div key={r.id} className="p-3 text-sm">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  aria-expanded={open === r.id}
                >
                  <History className="h-4 w-4 shrink-0 text-primary" />
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(r.occurred_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${r.action === "delete" ? "bg-destructive/15 text-destructive" : r.action === "insert" ? "bg-primary/15 text-primary" : "bg-accent"}`}
                  >
                    {AUDIT_ACTION_LABEL[r.action] ?? r.action}
                  </span>
                  <span className="font-semibold">
                    {AUDIT_TABLE_LABEL[r.table_name] ?? r.table_name}
                  </span>
                  <span className="text-muted-foreground">
                    por {who}
                    {r.actor_role && isRole(r.actor_role)
                      ? ` (${ROLE_INFO[r.actor_role].label})`
                      : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {AUDIT_ORIGIN_LABEL[r.origin] ?? r.origin}
                  </span>
                  {r.action === "update" && r.changed_fields && (
                    <span className="text-xs text-muted-foreground">
                      · {r.changed_fields.join(", ")}
                    </span>
                  )}
                </button>
                {open === r.id && (
                  <div className="mt-3 overflow-x-auto">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Registro: <code>{r.record_id ?? "—"}</code>
                    </p>
                    <table className="w-full min-w-[480px] text-xs">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="py-1 pr-3">Campo</th>
                          <th className="py-1 pr-3">Valor anterior</th>
                          <th className="py-1">Valor novo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diff.map((d) => (
                          <tr key={d.field} className="border-t border-border/50">
                            <td className="py-1 pr-3 font-mono">{d.field}</td>
                            <td className="break-all py-1 pr-3">{d.before}</td>
                            <td className="break-all py-1">{d.after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {hasMore && (
        <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
          Carregar mais
        </Button>
      )}
    </div>
  );
}
