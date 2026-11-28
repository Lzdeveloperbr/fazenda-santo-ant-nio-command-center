import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";
import { selectCls } from "@/components/farm/FormDialog";
import { accessQuery, isRole, ROLE_INFO, ROLES, type Role } from "@/lib/access";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Equipe e permissões | Fazenda Santo Antônio" },
      {
        name: "description",
        content: "Perfis de acesso, ativação de usuários, último acesso e ativação da equipe.",
      },
    ],
  }),
  component: Usuarios,
});

const dateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Nunca registrado";

function Usuarios() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const access = useQuery(accessQuery(user.id));
  const team = useQuery({
    queryKey: ["farm-users"],
    enabled: !!access.data?.canViewAudit,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("farm_users");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [busy, setBusy] = useState<string | null>(null);

  if (access.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando permissões…</p>;
  if (!access.data?.canViewAudit)
    return <Empty>Somente administrador ou gerente pode ver a equipe e os perfis de acesso.</Empty>;
  const canManage = access.data.canManageUsers;

  async function save(userId: string, role: Role, active: boolean) {
    setBusy(userId);
    const { error } = await supabase.rpc("set_user_access", {
      p_user_id: userId,
      p_role: role,
      p_active: active,
    });
    setBusy(null);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Perfil atualizado no servidor.");
    qc.invalidateQueries({ queryKey: ["farm-users"] });
    qc.invalidateQueries({ queryKey: ["access-role"] });
  }

  return (
    <div className="space-y-8">
      <SectionTitle kicker="Gestão" title="Equipe e permissões" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((r) => (
          <div key={r} className="panel p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {ROLE_INFO[r].label}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {ROLE_INFO[r].description}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        As permissões são aplicadas pelo banco de dados (não só pela tela). Usuário desativado perde
        o acesso aos dados imediatamente; seu histórico é preservado.
      </p>

      {team.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando equipe…</p>
      ) : team.isError ? (
        <Empty>Não foi possível carregar a equipe: {(team.error as Error).message}</Empty>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Pessoa</th>
                <th className="p-3">Perfil</th>
                <th className="p-3">Situação</th>
                <th className="p-3">Último acesso</th>
                <th className="p-3">Na granja desde</th>
              </tr>
            </thead>
            <tbody>
              {(team.data ?? []).map((m) => {
                const role: Role = isRole(m.role) ? m.role : "funcionario";
                const self = m.user_id === user.id;
                return (
                  <tr key={m.user_id} className="border-b border-border/60 last:border-0">
                    <td className="p-3">
                      <p className="font-semibold">
                        {m.display_name || "Sem nome"}
                        {self && <span className="ml-2 text-xs text-primary">(você)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="p-3">
                      {canManage ? (
                        <select
                          aria-label={`Perfil de ${m.display_name}`}
                          className={selectCls}
                          value={role}
                          disabled={busy === m.user_id}
                          onChange={(e) => save(m.user_id, e.target.value as Role, m.active)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_INFO[r].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        ROLE_INFO[role].label
                      )}
                    </td>
                    <td className="p-3">
                      {canManage && !self ? (
                        <Button
                          size="sm"
                          variant={m.active ? "outline" : "default"}
                          disabled={busy === m.user_id}
                          onClick={() => save(m.user_id, role, !m.active)}
                        >
                          {m.active ? (
                            <>
                              <UserX className="mr-1 h-4 w-4" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-1 h-4 w-4" />
                              Reativar
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className={m.active ? "text-ok-glow" : "text-destructive"}>
                          {m.active ? "Ativo" : "Desativado"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 tabular-nums text-muted-foreground">
                      {dateTime(m.last_seen_at)}
                    </td>
                    <td className="p-3 tabular-nums text-muted-foreground">
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Para convidar alguém, gere o código em{" "}
        <Link to="/baias" className="font-semibold text-primary underline">
          Baias › Equipe
        </Link>
        . Quem entra com o código começa como <b>Funcionário</b>; depois ajuste o perfil aqui.
      </p>
    </div>
  );
}
