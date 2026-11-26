import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  allSowsQuery,
  breedingsQuery,
  financeQuery,
  healthProtocolsQuery,
  littersQuery,
  medicationLotsQuery,
  medicationsQuery,
  tasksQuery,
} from "@/lib/farm";
import { farmSettingsQuery, DEFAULT_FARM_SETTINGS } from "@/lib/farm/farm-settings";
import { buildAgenda } from "@/lib/farm/agenda";

const q = <T>(key: string, table: string, cols: string) => ({
  queryKey: ["agenda", key],
  staleTime: 60_000,
  queryFn: async (): Promise<T[]> => {
    const { data, error } = await supabase.from(table as never).select(cols);
    // Tabela ainda inexistente (migration pendente) não derruba a agenda.
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") return [];
      throw error;
    }
    return (data ?? []) as T[];
  },
});

/** Carrega todas as fontes da agenda e monta os itens do intervalo. */
export function useAgenda(from: string, to: string, today: string, enabled = true) {
  const o = { enabled };
  const sows = useQuery({ ...allSowsQuery, ...o }),
    breedings = useQuery({ ...breedingsQuery, ...o }),
    litters = useQuery({ ...littersQuery, ...o });
  const tasks = useQuery({ ...tasksQuery, ...o }),
    finance = useQuery({ ...financeQuery, ...o }),
    lots = useQuery({ ...medicationLotsQuery, ...o }),
    meds = useQuery({ ...medicationsQuery, ...o });
  const protocols = useQuery({ ...healthProtocolsQuery, ...o, retry: false }),
    settings = useQuery({ ...farmSettingsQuery, ...o });
  const plans = useQuery({
    ...q<{ litter_id: string; weaning_date: string }>(
      "plans",
      "weaning_feed_schedules",
      "litter_id,weaning_date",
    ),
    ...o,
  });
  const vacc = useQuery({
    ...q<{ id: string; vaccine_name: string; next_due_date: string | null; sow_id: string | null }>(
      "vacc",
      "vaccination_records",
      "id,vaccine_name,next_due_date,sow_id",
    ),
    ...o,
  });
  const medr = useQuery({
    ...q<{
      id: string;
      product_name: string;
      administration_end: string | null;
      sow_id: string | null;
    }>("medr", "medication_records", "id,product_name,administration_end,sow_id"),
    ...o,
  });
  const hev = useQuery({
    ...q<{ id: string; follow_up_date: string | null; clinical_signs: string; status: string }>(
      "hev",
      "health_events",
      "id,follow_up_date,clinical_signs,status",
    ),
    ...o,
  });
  const batches = useQuery({
    ...q<{ id: string; name: string; entry_date: string; status: string }>(
      "batches",
      "production_batches",
      "id,name,entry_date,status",
    ),
    ...o,
  });
  const all = [
    sows,
    breedings,
    litters,
    tasks,
    finance,
    lots,
    meds,
    settings,
    plans,
    vacc,
    medr,
    hev,
    batches,
  ];
  const items = useMemo(() => {
    const tag = new Map((sows.data ?? []).map((s) => [s.id, s.ear_tag]));
    const medName = new Map((meds.data ?? []).map((m) => [m.id, m.name]));
    return buildAgenda(
      {
        breedings: breedings.data ?? [],
        litters: litters.data ?? [],
        weaningPlans: plans.data ?? [],
        vaccinations: vacc.data ?? [],
        medications: medr.data ?? [],
        healthEvents: hev.data ?? [],
        tasks: tasks.data ?? [],
        finance: finance.data ?? [],
        medLots: (lots.data ?? []).map((l) => ({ ...l, quantity: Number(l.quantity) })),
        protocols: protocols.data ?? [],
        batches: batches.data ?? [],
        sowTag: (id) => tag.get(id) ?? "?",
        medName: (id) => medName.get(id) ?? "Medicamento",
      },
      settings.data ?? DEFAULT_FARM_SETTINGS,
      from,
      to,
      today,
    );
  }, [
    sows.data,
    breedings.data,
    litters.data,
    plans.data,
    vacc.data,
    medr.data,
    hev.data,
    tasks.data,
    finance.data,
    lots.data,
    meds.data,
    protocols.data,
    batches.data,
    settings.data,
    from,
    to,
    today,
  ]);
  return {
    items,
    loading: all.some((x) => x.isLoading),
    error: all.find((x) => x.isError)?.error as Error | undefined,
  };
}
