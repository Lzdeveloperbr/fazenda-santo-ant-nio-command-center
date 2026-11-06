import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Sow = Database["public"]["Tables"]["sows"]["Row"];
export type Breeding = Database["public"]["Tables"]["breedings"]["Row"];
export type Litter = Database["public"]["Tables"]["litters"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];

export const SOW_STATUS: Record<string, { label: string; tone: string }> = {
  vazia: { label: "Vazia", tone: "text-muted-foreground" },
  coberta: { label: "Coberta", tone: "text-info" },
  gestante: { label: "Gestante", tone: "text-cyan" },
  lactante: { label: "Lactante", tone: "text-ok-glow" },
  descartada: { label: "Descartada", tone: "text-destructive" },
};

export const PRIORITY: Record<string, { label: string; tone: string }> = {
  alta: { label: "Alta", tone: "text-destructive" },
  media: { label: "Média", tone: "text-warn" },
  baixa: { label: "Baixa", tone: "text-info" },
};

/** Live piglets in a litter, from recorded numbers only. */
export function livePiglets(l: Pick<Litter, "born_alive" | "deaths" | "transfers_in" | "transfers_out" | "weaned" | "status">) {
  if (l.status === "desmamada") return 0;
  return Math.max(0, l.born_alive - l.deaths + l.transfers_in - l.transfers_out);
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
  queryFn: () => unwrap<Breeding[]>(supabase.from("breedings").select("*").order("breeding_date", { ascending: false })),
});
export const littersQuery = queryOptions({
  queryKey: ["litters"],
  queryFn: () => unwrap<Litter[]>(supabase.from("litters").select("*").order("farrowing_date", { ascending: false })),
});
export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: () => unwrap<Task[]>(supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false })),
});
export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: () => unwrap<{ id: string; display_name: string }[]>(supabase.from("profiles").select("id, display_name")),
});
