import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

/** Live piglets in a litter, from recorded numbers only. */
export function livePiglets(l: Pick<Litter, "born_alive" | "deaths" | "transfers_in" | "transfers_out" | "weaned" | "status">) {
  if (l.status !== "maternidade") return 0;
  return Math.max(0, l.born_alive - l.deaths + l.transfers_in - l.transfers_out);
}

/** Archived/cancelled litter records remain in history but are excluded from operating indicators. */
export function isCountedLitter(l: Pick<Litter, "status">) {
  return l.status !== "cancelada";
}

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

export const sowsQuery = queryOptions({
  queryKey: ["sows"],
  queryFn: () => unwrap<Sow[]>(supabase.from("sows").select("*").order("ear_tag")),
});
export const breedingsQuery = queryOptions({
  queryKey: ["breedings"],
  queryFn: () => unwrap<Breeding[]>(supabase.from("breedings").select("*").order("breeding_date", { ascending: false }).order("created_at", { ascending: false })),
});
export const littersQuery = queryOptions({
  queryKey: ["litters"],
  queryFn: () => unwrap<Litter[]>(supabase.from("litters").select("*").order("farrowing_date", { ascending: false }).order("created_at", { ascending: false })),
});
export const litterEventsQuery = queryOptions({
  queryKey: ["litter_events"],
  queryFn: () => unwrap<LitterEvent[]>(supabase.from("litter_events").select("*").order("event_date", { ascending: false }).order("created_at", { ascending: false })),
});
export const sowEventsQuery = queryOptions({
  queryKey: ["sow_events"],
  queryFn: () => unwrap<SowEvent[]>(supabase.from("sow_events").select("*").order("event_date", { ascending: false }).order("created_at", { ascending: false })),
});
export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: () => unwrap<Task[]>(supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false })),
});
export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: () => unwrap<{ id: string; display_name: string }[]>(supabase.from("profiles").select("id, display_name")),
});

export type FinanceEntry = Database["public"]["Tables"]["finance_entries"]["Row"];
export type InventoryCheck = Database["public"]["Tables"]["inventory_checks"]["Row"];
export type Pen = Database["public"]["Tables"]["farm_pens"]["Row"];
export type PenRecord = Database["public"]["Tables"]["pen_records"]["Row"];
export const financeQuery = queryOptions({
  queryKey: ["finance_entries"],
  queryFn: () => unwrap<FinanceEntry[]>(supabase.from("finance_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false })),
});
export const inventoryQuery = queryOptions({
  queryKey: ["inventory_checks"],
  queryFn: () => unwrap<InventoryCheck[]>(supabase.from("inventory_checks").select("*").order("check_date", { ascending: false }).order("created_at", { ascending: false })),
});
export const pensQuery = queryOptions({
  queryKey: ["farm_pens"],
  queryFn: () => unwrap<Pen[]>(supabase.from("farm_pens").select("*").order("sector").order("code")),
});
export const penRecordsQuery = queryOptions({
  queryKey: ["pen_records", "plain"],
  queryFn: () => unwrap<PenRecord[]>(supabase.from("pen_records").select("*").order("event_date", { ascending: false }).order("created_at", { ascending: false })),
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
  queryFn: () => unwrap<PregnancyDiagnosis[]>(supabase.from("pregnancy_diagnoses").select("*").order("diagnosis_date", { ascending: false }).order("created_at", { ascending: false })),
});
export const gestationEventsQuery = queryOptions({
  queryKey: ["gestation_events"],
  queryFn: () => unwrap<GestationEvent[]>(supabase.from("gestation_events").select("*").order("event_date", { ascending: false })),
});
