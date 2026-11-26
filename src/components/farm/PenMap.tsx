import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Empty } from "@/components/farm/Kpi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, littersQuery, livePiglets, pensQuery, sowsQuery, todayISO } from "@/lib/farm";
import { groupPens, PEN_STATE, penCells, type PenCell, type PenState } from "@/lib/farm/pen-map";

const recordsQuery = {
  queryKey: ["pen_records", "map"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("pen_records")
      .select("pen_id,event_date,animal_count,record_type,notes")
      .order("event_date", { ascending: false })
      .limit(3000);
    if (error) throw error;
    return data ?? [];
  },
};
const batchesQuery = {
  queryKey: ["production_batches", "map"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("production_batches")
      .select("name,pen,phase,current_headcount,status");
    if (error) throw error;
    return data ?? [];
  },
};

/** Mapa 2D das instalações: setor › galpão/sala › baias, colorido pela ocupação. */
export function PenMap() {
  const pens = useQuery(pensQuery),
    sows = useQuery(sowsQuery),
    litters = useQuery(littersQuery),
    records = useQuery(recordsQuery),
    batches = useQuery(batchesQuery);
  const [open, setOpen] = useState<PenCell | null>(null);
  const [filter, setFilter] = useState<PenState | "">("");
  const today = todayISO();
  const cells = useMemo(() => {
    const sowsIn = new Map<string, string[]>();
    for (const s of sows.data ?? [])
      if (s.pen_id && !["morta", "descartada", "transferida"].includes(s.status))
        sowsIn.set(s.pen_id, [...(sowsIn.get(s.pen_id) ?? []), s.ear_tag]);
    const pigs = new Map<string, number>();
    for (const l of litters.data ?? [])
      if (l.pen_id && l.status === "maternidade")
        pigs.set(l.pen_id, (pigs.get(l.pen_id) ?? 0) + livePiglets(l));
    return penCells(pens.data ?? [], sowsIn, pigs, records.data ?? [], today);
  }, [pens.data, sows.data, litters.data, records.data, today]);
  const groups = groupPens(filter ? cells.filter((c) => c.state === filter) : cells);
  const counts = new Map<PenState, number>();
  for (const c of cells) counts.set(c.state, (counts.get(c.state) ?? 0) + 1);

  if (pens.isLoading) return <p className="text-sm text-muted-foreground">Carregando baias…</p>;
  if (!cells.length)
    return <Empty>Nenhuma baia cadastrada. Use “Numerar baias” na aba Baias.</Empty>;
  const penRecords = open
    ? (records.data ?? []).filter((r) => r.pen_id === open.id).slice(0, 6)
    : [];
  const penBatches = open
    ? (batches.data ?? []).filter(
        (b) =>
          b.pen && b.pen.trim().toLowerCase() === open.code.toLowerCase() && b.status === "ativo",
      )
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("")}
          aria-pressed={!filter}
          className={`rounded-full border px-3 py-1 text-xs ${!filter ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
        >
          Todas ({cells.length})
        </button>
        {(Object.keys(PEN_STATE) as PenState[])
          .filter((k) => counts.get(k))
          .map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${filter === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-sm border ${PEN_STATE[k].cls}`} />
              {PEN_STATE[k].label} ({counts.get(k)})
            </button>
          ))}
      </div>
      {[...groups.entries()].map(([sector, places]) => (
        <section key={sector} className="panel p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">{sector}</h3>
          <div className="space-y-3">
            {[...places.entries()].map(([where, list]) => (
              <div key={where}>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{where}</p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-10">
                  {list.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setOpen(c)}
                      title={`${c.code}: ${PEN_STATE[c.state].label}`}
                      className={`min-h-[64px] rounded-lg border-2 p-1.5 text-left transition hover:scale-[1.03] ${PEN_STATE[c.state].cls}`}
                    >
                      <span className="block truncate font-mono text-xs font-bold">{c.code}</span>
                      <span className="block text-[.68rem] tabular-nums">
                        {c.occupancy ?? "?"}/{c.capacity}
                      </span>
                      {c.piglets > 0 && (
                        <span className="block text-[.62rem] text-muted-foreground">
                          +{c.piglets} leitões
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">
        Ocupação = maior valor entre matrizes vinculadas à baia e o último censo do caderno. “Sem
        registro recente”: nenhum censo nos últimos 7 dias e nenhuma matriz vinculada.
      </p>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Baia {open.code}</DialogTitle>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Setor / local</dt>
                  <dd className="font-semibold">
                    {[open.sector, open.building, open.room].filter(Boolean).join(" · ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Situação</dt>
                  <dd className="font-semibold">{PEN_STATE[open.state].label}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Ocupação</dt>
                  <dd className="font-semibold">
                    {open.occupancy ?? "sem registro"} de {open.capacity}
                  </dd>
                  <dd className="text-[.68rem] text-muted-foreground">{open.source}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Leitões em maternidade</dt>
                  <dd className="font-semibold">{open.piglets}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Matrizes vinculadas</dt>
                  <dd className="font-mono">{open.sows.length ? open.sows.join(", ") : "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Lote</dt>
                  <dd>
                    {penBatches.length
                      ? penBatches
                          .map((b) => `${b.name} (${b.phase}, ${b.current_headcount} animais)`)
                          .join("; ")
                      : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-2">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  Últimos registros do caderno
                </p>
                {penRecords.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum registro.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {penRecords.map((r, i) => (
                      <li key={i}>
                        <span className="font-mono">{fmtDate(r.event_date)}</span> · {r.record_type}
                        {r.animal_count !== null ? ` · ${r.animal_count} animais` : ""}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
