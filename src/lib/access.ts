import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Perfis de acesso. A segurança real está no banco (migration 0015:
 * políticas RLS restritivas + funções can_write/can_delete/is_farm_admin);
 * estas regras só decidem o que a interface mostra.
 */
export const ROLES = ["admin", "gerente", "veterinario", "funcionario", "consulta"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_INFO: Record<Role, { label: string; description: string }> = {
  admin: {
    label: "Administrador",
    description: "Acesso completo, inclusive equipe, perfis e exclusões.",
  },
  gerente: { label: "Gerente", description: "Gestão geral, relatórios, auditoria e exclusões." },
  veterinario: {
    label: "Veterinário",
    description: "Registros sanitários e clínicos; não exclui histórico.",
  },
  funcionario: {
    label: "Funcionário",
    description: "Registra manejos e tarefas; não exclui histórico.",
  },
  consulta: { label: "Consulta", description: "Somente visualização; não grava nada." },
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export type Permissions = {
  role: Role | null;
  canWrite: boolean;
  canDelete: boolean;
  canViewAudit: boolean;
  canManageUsers: boolean;
  /** Protocolos sanitários: administrador, gerente ou veterinário. */
  canManageHealth: boolean;
};

export function permissionsFor(role: Role | null): Permissions {
  return {
    role,
    canWrite: role !== null && role !== "consulta",
    canDelete: role === "admin" || role === "gerente",
    canViewAudit: role === "admin" || role === "gerente",
    canManageUsers: role === "admin",
    canManageHealth: role === "admin" || role === "gerente" || role === "veterinario",
  };
}

/** Perfil efetivo do usuário atual, calculado pelo próprio banco. */
export const accessQuery = (userId: string) =>
  queryOptions({
    queryKey: ["access-role", userId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("access_role");
      if (error) {
        // Banco ainda sem a migration 0015: mantém o comportamento anterior
        // (membro = acesso completo), sem inventar restrições.
        if (error.code === "PGRST202" || error.code === "42883") {
          const roles = await supabase.from("user_roles").select("role").eq("user_id", userId);
          if (roles.error) throw roles.error;
          const member = (roles.data ?? []).some((r) => r.role === "member");
          return permissionsFor(member ? "admin" : null);
        }
        throw error;
      }
      return permissionsFor(isRole(data) ? data : null);
    },
  });

export const AUDIT_TABLE_LABEL: Record<string, string> = {
  sows: "Matrizes",
  breedings: "Coberturas / ciclos",
  pregnancy_diagnoses: "Diagnósticos de gestação",
  gestation_events: "Eventos de gestação",
  sow_events: "Eventos da matriz",
  boars: "Reprodutores",
  litters: "Leitegadas",
  litter_events: "Eventos de leitegada",
  piglet_identifications: "Identificação de leitões",
  weaning_feed_schedules: "Ração pós-desmame",
  production_batches: "Lotes",
  batch_events: "Eventos de lote",
  batch_weights: "Pesagens de lote",
  batch_feed_products: "Rações de lote",
  batch_feed_movements: "Movimentos de ração do lote",
  farm_pens: "Baias",
  pen_records: "Caderno de baia",
  feed_products: "Rações",
  feed_movements: "Movimentos de ração",
  health_records: "Registros sanitários",
  health_events: "Ocorrências sanitárias",
  health_samples: "Amostras",
  medication_records: "Medicações",
  vaccination_records: "Vacinações",
  veterinary_treatment_records: "Tratamentos veterinários",
  farm_medications: "Medicamentos",
  farm_medication_lots: "Lotes de medicamento",
  farm_medication_movements: "Movimentos da farmácia",
  monitoring_records: "Monitoramento",
  biosecurity_checks: "Biosseguridade",
  farm_visit_reports: "Visitas técnicas",
  ai_health_analyses: "Análises da IA",
  inventory_checks: "Conferências (mutirão)",
  finance_entries: "Financeiro",
  tasks: "Tarefas",
  user_access: "Perfis de acesso",
  user_roles: "Entrada na granja",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  insert: "Inclusão",
  update: "Alteração",
  delete: "Exclusão",
};

export const AUDIT_ORIGIN_LABEL: Record<string, string> = {
  app: "Aplicativo",
  automatico: "Cálculo automático do banco",
  sistema: "Sistema / administração",
};

/** Campos alterados com valor anterior e novo, para exibição. */
export function auditDiff(
  oldData: unknown,
  newData: unknown,
  changed: string[] | null,
): { field: string; before: string; after: string }[] {
  const o = (oldData && typeof oldData === "object" ? oldData : {}) as Record<string, unknown>;
  const n = (newData && typeof newData === "object" ? newData : {}) as Record<string, unknown>;
  const fields = changed ?? Array.from(new Set([...Object.keys(o), ...Object.keys(n)])).sort();
  const show = (v: unknown) =>
    v === undefined || v === null || v === ""
      ? "—"
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
  return fields
    .filter((f) => f !== "created_at")
    .map((field) => ({ field, before: show(o[field]), after: show(n[field]) }));
}

/** Permissões do usuário logado, para componentes dentro da área autenticada. */
export function usePermissions(): Permissions | undefined {
  const { user } = useRouteContext({ from: "/_authenticated" });
  return useQuery(accessQuery(user.id)).data;
}
