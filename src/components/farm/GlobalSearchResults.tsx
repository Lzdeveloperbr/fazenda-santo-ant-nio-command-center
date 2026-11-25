import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Fence, Layers3, ListChecks, Pill, PiggyBank, Dna, type LucideIcon } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { boarsQuery, pensQuery, sowsQuery, tasksQuery, SOW_STATUS } from "@/lib/farm";
import { SEARCH_KIND_LABEL, searchDocs, type SearchDoc, type SearchKind } from "@/lib/search";

const ICON: Record<SearchKind, LucideIcon> = {
  matriz: PiggyBank,
  reprodutor: Dna,
  baia: Fence,
  lote: Layers3,
  medicamento: Pill,
  tarefa: ListChecks,
};

const batchesQuery = {
  queryKey: ["search-batches"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("production_batches")
      .select("id,name,phase,pen,status,origin");
    if (error) throw error;
    return data ?? [];
  },
};
const medsQuery = {
  queryKey: ["search-medications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("farm_medications")
      .select("id,name,active_ingredient,manufacturer");
    if (error) throw error;
    return data ?? [];
  },
};

/** Resultados de dados reais na busca global (Ctrl+K). Só consulta quando aberta. */
export function GlobalSearchResults({
  query,
  enabled,
  onPick,
}: {
  query: string;
  enabled: boolean;
  onPick: () => void;
}) {
  const navigate = useNavigate();
  const sows = useQuery({ ...sowsQuery, enabled });
  const boars = useQuery({ ...boarsQuery, enabled });
  const pens = useQuery({ ...pensQuery, enabled });
  const tasks = useQuery({ ...tasksQuery, enabled });
  const batches = useQuery({ ...batchesQuery, enabled });
  const meds = useQuery({ ...medsQuery, enabled });

  const docs = useMemo<SearchDoc[]>(
    () => [
      ...(sows.data ?? []).map((s) => ({
        kind: "matriz" as const,
        id: s.id,
        title: s.ear_tag,
        subtitle: [s.name, SOW_STATUS[s.status]?.label ?? s.status].filter(Boolean).join(" · "),
        terms: [s.name, s.breed],
      })),
      ...(boars.data ?? []).map((b) => ({
        kind: "reprodutor" as const,
        id: b.id,
        title: b.code,
        subtitle: b.name ?? undefined,
        terms: [b.name, b.breed],
      })),
      ...(pens.data ?? []).map((p) => ({
        kind: "baia" as const,
        id: p.id,
        title: p.code,
        subtitle: p.sector,
        terms: [p.sector],
      })),
      ...(batches.data ?? []).map((l) => ({
        kind: "lote" as const,
        id: l.id,
        title: l.name,
        subtitle: [l.phase, l.pen].filter(Boolean).join(" · "),
        terms: [l.pen, l.origin],
      })),
      ...(meds.data ?? []).map((m) => ({
        kind: "medicamento" as const,
        id: m.id,
        title: m.name,
        subtitle: m.active_ingredient ?? undefined,
        terms: [m.active_ingredient, m.manufacturer],
      })),
      ...(tasks.data ?? [])
        .filter((t) => t.status !== "concluida")
        .map((t) => ({
          kind: "tarefa" as const,
          id: t.id,
          title: t.title,
          subtitle: t.sector ?? undefined,
          terms: [t.sector],
        })),
    ],
    [sows.data, boars.data, pens.data, batches.data, meds.data, tasks.data],
  );

  const groups = useMemo(() => (query.trim() ? searchDocs(docs, query) : new Map()), [docs, query]);
  if (!query.trim()) return null;

  function open(doc: SearchDoc) {
    onPick();
    if (doc.kind === "matriz") navigate({ to: "/matrizes/$sowId", params: { sowId: doc.id } });
    else if (doc.kind === "reprodutor") navigate({ to: "/gestacao" });
    else if (doc.kind === "baia") navigate({ to: "/baias" });
    else if (doc.kind === "lote") navigate({ to: "/lotes" });
    else if (doc.kind === "medicamento") navigate({ to: "/farmacia-ai" });
    else navigate({ to: "/tarefas" });
  }

  return (
    <>
      {[...groups.entries()].map(([kind, list]: [SearchKind, SearchDoc[]]) => {
        const Icon = ICON[kind];
        return (
          <CommandGroup key={kind} heading={SEARCH_KIND_LABEL[kind]}>
            {list.map((doc) => (
              <CommandItem
                key={`${kind}-${doc.id}`}
                value={`${kind} ${doc.title} ${doc.id} ${query}`}
                onSelect={() => open(doc)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span className="font-semibold">{doc.title}</span>
                {doc.subtitle && (
                  <span className="ml-2 truncate text-xs text-muted-foreground">
                    {doc.subtitle}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        );
      })}
    </>
  );
}
