import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isCountedLitter, livePiglets } from "@/lib/farm/litter-status";
export { isCountedLitter, livePiglets } from "@/lib/farm/litter-status";

export type Sow = Database["public"]["Tables"]["sows"]["Row"];
export type Breeding = Database["public"]["Tables"]["breedings"]["Row"];
export type Litter = Database["public"]["Tables"]["litters"]["Row"];
export type LitterEvent = Database["public"]["Tables"]["litter_events"]["Row"];
export type SowEvent = Database["public"]["Tables"]["sow_events"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];

export const SOW_STATUS: Record<string, { label: string; tone: string }> = {
  vazia: { label: "Vazia", tone: "text-muted-foreground" },
  coberta: { label: "Coberta", tone: "text-info" },
  gestante: { label: "Gestante", tone: "text-cyan" },
  lactante: { label: "Lactante", tone: "text-ok-glow" },
  descartada: { label: "Descartada", tone: "text-destructive" },
  morta: { label: "Morte registrada", tone: "text-destructive" },
  transferida: { label: "Transferida", tone: "text-warn" },
};

export const SOW_EVENT_LABEL: Record<string, string> = {
  retorno_cio: "Retorno ao cio",
  descarte: "Descarte / retirada",
  morte: "Morte",
  transferencia: "Transferência",
  reativacao: "Retorno ao plantel",
  observacao: "Observação",
};

export const LITTER_EVENT_LABEL: Record<string, string> = {
  morte: "Morte",
  transferencia_saida: "Transferência de saída",
  transferencia_entrada: "Adoção / transferência de entrada",
  pesagem: "Pesagem média",
  observacao: "Observação",
  desmame: "Desmame",
};

export const PRIORITY: Record<string, { label: string; tone: string }> = {
  alta: { label: "Alta", tone: "text-destructive" },
  media: { label: "Média", tone: "text-warn" },
  baixa: { label: "Baixa", tone: "text-info" },
};

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

/** Todas as matrizes, inclusive cadastros arquivados (exclusão lógica). */
export const allSowsQuery = queryOptions({
  queryKey: ["sows", "all"],
  queryFn: () => unwrap<Sow[]>(supabase.from("sows").select("*").order("ear_tag")),
});

/**
 * Matrizes do plantel: sem cadastros arquivados (duplicados/errados), que
 * ficam fora de listas e indicadores mas continuam acessíveis na ficha.
 * Filtro no cliente para funcionar também antes da migration 0016.
 */
export const sowsQuery = queryOptions({
  queryKey: ["sows"],
  queryFn: async () =>
    (await unwrap<Sow[]>(supabase.from("sows").select("*").order("ear_tag"))).filter(
      (s) => !s.archived_at,
    ),
});
export const breedingsQuery = queryOptions({
  queryKey: ["breedings"],
  queryFn: () =>
    unwrap<Breeding[]>(
      supabase
        .from("breedings")
        .select("*")
        .order("breeding_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});
export const littersQuery = queryOptions({
  queryKey: ["litters"],
  queryFn: () =>
    unwrap<Litter[]>(
      supabase
        .from("litters")
        .select("*")
        .order("farrowing_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});
export const litterEventsQuery = queryOptions({
  queryKey: ["litter_events"],
  queryFn: () =>
    unwrap<LitterEvent[]>(
      supabase
        .from("litter_events")
        .select("*")
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});
export const sowEventsQuery = queryOptions({
  queryKey: ["sow_events"],
  queryFn: () =>
    unwrap<SowEvent[]>(
      supabase
        .from("sow_events")
        .select("*")
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});
export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: () =>
    unwrap<Task[]>(
      supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    ),
});
export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: () =>
    unwrap<{ id: string; display_name: string }[]>(
      supabase.from("profiles").select("id, display_name"),
    ),
});

export type FinanceEntry = Database["public"]["Tables"]["finance_entries"]["Row"];
export type InventoryCheck = Database["public"]["Tables"]["inventory_checks"]["Row"];
export type Pen = Database["public"]["Tables"]["farm_pens"]["Row"];
export type PenRecord = Database["public"]["Tables"]["pen_records"]["Row"];
export const financeQuery = queryOptions({
  queryKey: ["finance_entries"],
  queryFn: () =>
    unwrap<FinanceEntry[]>(
      supabase
        .from("finance_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});
export const inventoryQuery = queryOptions({
  queryKey: ["inventory_checks"],
  queryFn: () =>
    unwrap<InventoryCheck[]>(
      supabase
        .from("inventory_checks")
        .select("*")
        .order("check_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});
export const pensQuery = queryOptions({
  queryKey: ["farm_pens"],
  queryFn: () =>
    unwrap<Pen[]>(supabase.from("farm_pens").select("*").order("sector").order("code")),
});
export const penRecordsQuery = queryOptions({
  queryKey: ["pen_records", "plain"],
  queryFn: () =>
    unwrap<PenRecord[]>(
      supabase
        .from("pen_records")
        .select("*")
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});

export type Boar = Database["public"]["Tables"]["boars"]["Row"];
export type PregnancyDiagnosis = Database["public"]["Tables"]["pregnancy_diagnoses"]["Row"];
export type GestationEvent = Database["public"]["Tables"]["gestation_events"]["Row"];
export const boarsQuery = queryOptions({
  queryKey: ["boars"],
  queryFn: () => unwrap<Boar[]>(supabase.from("boars").select("*").order("code")),
});
export const diagnosesQuery = queryOptions({
  queryKey: ["pregnancy_diagnoses"],
  queryFn: () =>
    unwrap<PregnancyDiagnosis[]>(
      supabase
        .from("pregnancy_diagnoses")
        .select("*")
        .order("diagnosis_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});
export const gestationEventsQuery = queryOptions({
  queryKey: ["gestation_events"],
  queryFn: () =>
    unwrap<GestationEvent[]>(
      supabase.from("gestation_events").select("*").order("event_date", { ascending: false }),
    ),
});

export type Piglet = Database["public"]["Tables"]["piglet_identifications"]["Row"];
/** Leitões identificados (mesma chave e ordem usadas na tela de marcação). */
export const pigletsQuery = queryOptions({
  queryKey: ["piglet_identifications"],
  queryFn: () =>
    unwrap<Piglet[]>(
      supabase
        .from("piglet_identifications")
        .select("*")
        .order("australian_number", { ascending: false }),
    ),
});

export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type StockItem = Database["public"]["Tables"]["stock_items"]["Row"];
export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];
export const suppliersQuery = queryOptions({
  queryKey: ["suppliers"],
  queryFn: () => unwrap<Supplier[]>(supabase.from("suppliers").select("*").order("name")),
});
export const stockItemsQuery = queryOptions({
  queryKey: ["stock_items"],
  queryFn: () => unwrap<StockItem[]>(supabase.from("stock_items").select("*").order("name")),
});
export const stockMovementsQuery = queryOptions({
  queryKey: ["stock_movements"],
  queryFn: () =>
    unwrap<StockMovement[]>(
      supabase
        .from("stock_movements")
        .select("*")
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000),
    ),
});
/** Mesmas chaves usadas nas telas de ração e farmácia. */
export const feedProductsQuery = queryOptions({
  queryKey: ["feed_products"],
  queryFn: () =>
    unwrap<Database["public"]["Tables"]["feed_products"]["Row"][]>(
      supabase.from("feed_products").select("*").order("name"),
    ),
});
export const medicationsQuery = queryOptions({
  queryKey: ["farm_medications"],
  queryFn: () =>
    unwrap<Database["public"]["Tables"]["farm_medications"]["Row"][]>(
      supabase.from("farm_medications").select("*").order("name"),
    ),
});
export const medicationLotsQuery = queryOptions({
  queryKey: ["farm_medication_lots"],
  queryFn: () =>
    unwrap<Database["public"]["Tables"]["farm_medication_lots"]["Row"][]>(
      supabase.from("farm_medication_lots").select("*").order("expiry_date"),
    ),
});

export type HealthProtocol = Database["public"]["Tables"]["health_protocols"]["Row"];
export const healthProtocolsQuery = queryOptions({
  queryKey: ["health_protocols"],
  queryFn: () =>
    unwrap<HealthProtocol[]>(supabase.from("health_protocols").select("*").order("name")),
});

export type SemenBatch = Database["public"]["Tables"]["semen_batches"]["Row"];
export type HeatDetection = Database["public"]["Tables"]["heat_detections"]["Row"];
export type SowCondition = Database["public"]["Tables"]["sow_condition_records"]["Row"];
export type FeedPlan = Database["public"]["Tables"]["feed_plans"]["Row"];
export const semenBatchesQuery = queryOptions({
  queryKey: ["semen_batches"],
  queryFn: () =>
    unwrap<SemenBatch[]>(
      supabase.from("semen_batches").select("*").order("received_date", { ascending: false }),
    ),
});
export const heatDetectionsQuery = queryOptions({
  queryKey: ["heat_detections"],
  queryFn: () =>
    unwrap<HeatDetection[]>(
      supabase
        .from("heat_detections")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1000),
    ),
});
export const sowConditionQuery = queryOptions({
  queryKey: ["sow_condition_records"],
  queryFn: () =>
    unwrap<SowCondition[]>(
      supabase.from("sow_condition_records").select("*").order("record_date", { ascending: false }),
    ),
});
export const feedPlansQuery = queryOptions({
  queryKey: ["feed_plans"],
  queryFn: () =>
    unwrap<FeedPlan[]>(supabase.from("feed_plans").select("*").order("category").order("day_from")),
});

export type IssueReport = Database["public"]["Tables"]["issue_reports"]["Row"];
export type ShiftHandover = Database["public"]["Tables"]["shift_handovers"]["Row"];
export const issueReportsQuery = queryOptions({
  queryKey: ["issue_reports"],
  queryFn: () =>
    unwrap<IssueReport[]>(
      supabase
        .from("issue_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
    ),
});
export const shiftHandoversQuery = queryOptions({
  queryKey: ["shift_handovers"],
  queryFn: () =>
    unwrap<ShiftHandover[]>(
      supabase
        .from("shift_handovers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ),
});
/** Registros de auditoria de um dia (RLS: só administrador/gerente da mesma granja). */
export const dailyActivityQuery = (day: string) =>
  queryOptions({
    queryKey: ["audit-day", day],
    queryFn: () => {
      const start = new Date(`${day}T00:00:00`);
      const end = new Date(start.getTime() + 86_400_000);
      return unwrap<
        { actor_id: string | null; table_name: string; action: string; occurred_at: string }[]
      >(
        supabase
          .from("audit_logs")
          .select("actor_id, table_name, action, occurred_at")
          .gte("occurred_at", start.toISOString())
          .lt("occurred_at", end.toISOString())
          .order("occurred_at")
          .limit(5000),
      );
    },
  });

export type Farm = Database["public"]["Tables"]["farms"]["Row"];
/** A granja do usuário (RLS devolve só a própria). */
export const farmQuery = queryOptions({
  queryKey: ["farm"],
  queryFn: async () => (await unwrap<Farm[]>(supabase.from("farms").select("*").limit(1)))[0] ?? null,
});

export type Favorite = Database["public"]["Tables"]["user_favorites"]["Row"];
/** Favoritos do próprio usuário (RLS: cada um vê só os seus). */
export const favoritesQuery = queryOptions({
  queryKey: ["user_favorites"],
  queryFn: () => unwrap<Favorite[]>(supabase.from("user_favorites").select("*").order("created_at")),
});

export type VaccinationRecord = Database["public"]["Tables"]["vaccination_records"]["Row"];
/** Vacinações individuais de matrizes (para o mapa de vacinação). */
export const sowVaccinationsQuery = queryOptions({
  queryKey: ["vaccination_records", "matrizes"],
  queryFn: () =>
    unwrap<VaccinationRecord[]>(
      supabase.from("vaccination_records").select("*").eq("animal_scope", "matriz").order("vaccination_date", { ascending: false }).limit(5000),
    ),
});

export type SowWeighing = Database["public"]["Tables"]["sow_weighings"]["Row"];
/** Histórico de pesagens das matrizes (mais recente primeiro). */
export const sowWeighingsQuery = queryOptions({
  queryKey: ["sow_weighings"],
  queryFn: () =>
    unwrap<SowWeighing[]>(supabase.from("sow_weighings").select("*").order("weighed_on", { ascending: false }).limit(10000)),
});

/** Aplicações feitas em leitegadas (vacinas e tratamentos), para o mapa das leitegadas. */
export const litterHealthQuery = queryOptions({
  queryKey: ["vaccination_records", "leitegadas"],
  queryFn: async () => {
    const [v, m] = await Promise.all([
      unwrap<Pick<VaccinationRecord, "litter_id" | "vaccine_name" | "vaccination_date">[]>(
        supabase.from("vaccination_records").select("litter_id, vaccine_name, vaccination_date").not("litter_id", "is", null).limit(5000),
      ),
      unwrap<{ litter_id: string | null; product_name: string; administration_start: string }[]>(
        supabase.from("medication_records").select("litter_id, product_name, administration_start").not("litter_id", "is", null).limit(5000),
      ),
    ]);
    return { vacs: v, meds: m };
  },
});
