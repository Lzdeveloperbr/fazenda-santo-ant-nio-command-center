import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";
import { CountBars, PeriodFilter, usePeriod } from "@/components/farm/PeriodFilter";
import {
  allSowsQuery,
  fmtDate,
  litterEventsQuery,
  littersQuery,
  pensQuery,
  pigletsQuery,
  sowEventsQuery,
  SOW_EVENT_LABEL,
} from "@/lib/farm";
import { maternityIndicators, mortalityRows, sumBy, type Indicator } from "@/lib/farm/maternity";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/mortalidade")({
  head: () => ({
    meta: [
      { title: "Mortalidade e descarte | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Ficha de mortalidade, motivos, idade, dia da semana, descartes e indicadores de maternidade.",
      },
    ],
  }),
  component: Mortalidade,
});

const batchEventsQuery = {
  queryKey: ["batch_events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("batch_events")
      .select("*")
      .order("event_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};
const batchesQuery = {
  queryKey: ["production_batches"],
  queryFn: async () => {
    const { data, error } = await supabase.from("production_batches").select("id,name,phase");
    if (error) throw error;
    return data ?? [];
  },
};

const fmt = (i: Indicator, digits = 1, unit = "") =>
  i.value === null
    ? "—"
    : `${i.value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}${unit}`;

function Mortalidade() {
  const p = usePeriod("30d");
  const { from, to } = p.period;
  const sows = useQuery(allSowsQuery),
    litters = useQuery(littersQuery),
    events = useQuery(litterEventsQuery),
    pens = useQuery(pensQuery);
  const piglets = useQuery(pigletsQuery),
    sowEvents = useQuery(sowEventsQuery),
    batchEvents = useQuery(batchEventsQuery),
    batches = useQuery(batchesQuery);
  const loading = [sows, litters, events, pens].some((q) => q.isLoading);

  const tag = useMemo(() => {
    const m = new Map((sows.data ?? []).map((s) => [s.id, s.ear_tag]));
    return (id: string) => m.get(id) ?? "?";
  }, [sows.data]);
  const pen = useMemo(() => {
    const m = new Map((pens.data ?? []).map((x) => [x.id, `${x.code} · ${x.sector}`]));
    return (id?: string | null) => (id ? (m.get(id) ?? "—") : "Não informada");
  }, [pens.data]);
  const piglet = useMemo(() => {
    const m = new Map(
      (piglets.data ?? []).map((x) => [
        x.id,
        `Nº ${x.piglet_number} (marca ${x.australian_number})`,
      ]),
    );
    return (id?: string | null) => (id ? (m.get(id) ?? "") : "");
  }, [piglets.data]);

  const rows = useMemo(
    () => mortalityRows(events.data ?? [], litters.data ?? [], tag, pen, piglet, from, to),
    [events.data, litters.data, tag, pen, piglet, from, to],
  );
  const total = rows.reduce((a, r) => a + r.quantity, 0);
  const ind = useMemo(
    () =>
      maternityIndicators(
        litters.data ?? [],
        piglets.data ?? [],
        (events.data ?? []).filter((e) => e.event_type === "desmame"),
        from,
        to,
      ),
    [litters.data, piglets.data, events.data, from, to],
  );
  const sowExits = (sowEvents.data ?? []).filter(
    (e) =>
      (e.event_type === "morte" || e.event_type === "descarte") &&
      e.event_date >= from &&
      e.event_date <= to,
  );
  const batchName = new Map((batches.data ?? []).map((b) => [b.id, `${b.name} (${b.phase})`]));
  const batchDeaths = (batchEvents.data ?? []).filter(
    (e) => e.event_type === "morte" && e.event_date >= from && e.event_date <= to,
  );

  function exportCsv() {
    downloadCsv(
      `Ficha de mortalidade ${from} a ${to}`,
      [
        "Data",
        "Dia da semana",
        "Idade (dias)",
        "Matriz",
        "Baia",
        "Leitão",
        "Quantidade",
        "Peso (kg)",
        "Motivo observado",
        "Responsável",
        "Observação",
      ],
      rows.map((r) => [
        fmtDate(r.date),
        r.weekday,
        r.ageDays,
        r.sow,
        r.pen,
        r.piglet,
        r.quantity,
        r.weight,
        r.cause,
        r.responsible,
        r.note,
      ]),
    );
  }

  const kpis: [string, string, string][] = [
    ["Partos no período", String(ind.farrowings), "leitegadas não canceladas"],
    ["Nascidos totais / parto", fmt(ind.bornTotalPerLitter), `${ind.bornTotalPerLitter.n} partos`],
    ["Nascidos vivos / parto", fmt(ind.bornAlivePerLitter), `${ind.bornAlivePerLitter.n} partos`],
    ["Natimortalidade", fmt(ind.stillbornRate, 1, "%"), "natimortos ÷ nascidos totais"],
    ["Mumificação", fmt(ind.mummifiedRate, 1, "%"), "mumificados ÷ nascidos totais"],
    [
      "Mortalidade pré-desmame",
      fmt(ind.preWeaningMortality, 1, "%"),
      `mortes ÷ (vivos + adotados) · ${ind.weanedLitters} leitegadas desmamadas`,
    ],
    ["Desmamados / leitegada", fmt(ind.weanedPerLitter), `${ind.weanedPerLitter.n} desmames`],
    ["Idade ao desmame", fmt(ind.weaningAgeDays, 0, " dias"), `${ind.weaningAgeDays.n} desmames`],
    ["Peso ao nascer", fmt(ind.birthWeight, 2, " kg"), `${ind.birthWeight.n} leitões pesados`],
    ["Peso ao desmame", fmt(ind.weaningWeight, 2, " kg"), `${ind.weaningWeight.n} registros`],
  ];

  return (
    <div className="mortality-report space-y-6">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body * { visibility: hidden !important; } .mortality-report, .mortality-report * { visibility: visible !important; } .mortality-report { position: absolute !important; inset: 0 !important; } .no-print { display: none !important; } }`}</style>
      <SectionTitle
        kicker="Rebanho"
        title="Mortalidade, descarte e maternidade"
        action={
          <div className="no-print flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir / PDF
            </Button>
          </div>
        }
      />
      <PeriodFilter {...p} />
      <p className="text-xs text-muted-foreground">
        Período: {fmtDate(from)} a {fmtDate(to)}. Valores calculados só com registros lançados; “—”
        significa sem dados suficientes. Motivos são observações da equipe, não diagnósticos.
      </p>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map(([k, v, hint]) => (
          <div key={k} className="panel p-4">
            <p className="text-xs font-semibold text-muted-foreground">{k}</p>
            <p className="mt-2 font-mono text-2xl font-bold">{v}</p>
            <p className="mt-1 text-[.68rem] leading-4 text-muted-foreground">{hint}</p>
          </div>
        ))}
      </section>

      <section>
        <SectionTitle
          kicker="Leitões na maternidade"
          title={`${total} leitão(ões) mortos em ${rows.length} registro(s)`}
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CountBars
            title="Por motivo observado"
            rows={sumBy(
              rows,
              (r) => r.cause,
              (r) => r.quantity,
            )}
          />
          <CountBars
            title="Por idade"
            rows={sumBy(
              rows,
              (r) => r.ageBand,
              (r) => r.quantity,
            )}
          />
          <CountBars
            title="Por dia da semana"
            rows={sumBy(
              rows,
              (r) => r.weekday,
              (r) => r.quantity,
            )}
          />
          <CountBars
            title="Por matriz"
            rows={sumBy(
              rows,
              (r) => r.sow,
              (r) => r.quantity,
            ).slice(0, 8)}
          />
        </div>
      </section>

      <section className="panel overflow-x-auto p-0">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Carregando…</p>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <Empty>Nenhuma morte de leitão registrada no período.</Empty>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                {[
                  "Data",
                  "Dia",
                  "Idade",
                  "Matriz",
                  "Baia",
                  "Leitão",
                  "Qtd.",
                  "Peso",
                  "Motivo",
                  "Responsável",
                  "Obs.",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2">{r.weekday}</td>
                  <td className="px-3 py-2 tabular-nums">{r.ageDays} d</td>
                  <td className="px-3 py-2 font-mono">{r.sow}</td>
                  <td className="px-3 py-2">{r.pen}</td>
                  <td className="px-3 py-2 text-xs">{r.piglet || "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{r.quantity}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.weight ? `${String(r.weight).replace(".", ",")} kg` : "—"}
                  </td>
                  <td className="px-3 py-2">{r.cause}</td>
                  <td className="px-3 py-2">{r.responsible}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <SectionTitle
            kicker="Matrizes"
            title={`${sowExits.length} saída(s) por morte ou descarte`}
          />
          {sowExits.length === 0 ? (
            <Empty>Nenhuma morte ou descarte de matriz no período.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {sowExits.map((e) => (
                <li key={e.id} className="py-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {fmtDate(e.event_date)}
                  </span>{" "}
                  · <strong>{tag(e.sow_id)}</strong> · {SOW_EVENT_LABEL[e.event_type]}
                  {e.notes ? <span className="text-muted-foreground"> — {e.notes}</span> : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            A taxa anual de mortalidade/descarte de matrizes precisa do plantel médio do período,
            que o sistema ainda não guarda historicamente; por isso aqui aparecem só as contagens.
          </p>
        </section>
        <section className="panel p-4">
          <SectionTitle
            kicker="Lotes (creche, crescimento, terminação)"
            title={`${batchDeaths.reduce((a, e) => a + e.quantity, 0)} morte(s) em lotes`}
          />
          {batchDeaths.length === 0 ? (
            <Empty>Nenhuma morte em lotes no período.</Empty>
          ) : (
            <CountBars
              title="Por lote"
              rows={sumBy(
                batchDeaths,
                (e) => batchName.get(e.batch_id) ?? "Lote",
                (e) => e.quantity,
              )}
            />
          )}
        </section>
      </div>
    </div>
  );
}
