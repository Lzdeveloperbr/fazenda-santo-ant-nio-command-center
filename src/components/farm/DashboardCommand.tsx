import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { breedingsQuery, diagnosesQuery, feedProductsQuery, financeQuery, litterEventsQuery, littersQuery, medicationLotsQuery, medicationsQuery, pensQuery, pigletsQuery, sowEventsQuery, sowsQuery, stockItemsQuery, stockMovementsQuery } from "@/lib/farm";
import { farmSettingsQuery, DEFAULT_FARM_SETTINGS } from "@/lib/farm/farm-settings";
import { sowSituation, SOW_SITUATIONS, type SowSituation } from "@/lib/farm/sow-profile";
import { maternityIndicators } from "@/lib/farm/maternity";
import { reproductiveIndicators, type Ind } from "@/lib/farm/zootech";
import { stockAlerts } from "@/lib/farm/stock";
import { lastMonths } from "@/lib/farm/finance";
import { addDays, daysBetween } from "@/lib/farm/gestation";
import { useAgenda } from "@/components/farm/useAgenda";
import { overdue, AGENDA_KIND_LABEL } from "@/lib/farm/agenda";

const generic = <T,>(key: string, table: string, cols: string) => ({
  queryKey: ["dashboard", key],
  staleTime: 60_000,
  queryFn: async (): Promise<T[]> => {
    const { data, error } = await supabase.from(table as never).select(cols);
    if (error) { if (error.code === "42P01" || error.code === "PGRST205") return []; throw error; }
    return (data ?? []) as T[];
  },
});
const fmt = (i: Ind, digits = 1, unit = "") => (i.value === null ? "—" : `${i.value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}${unit}`);
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="rounded-xl border bg-background/60 p-3"><p className="text-[11px] font-semibold text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xl font-bold tabular-nums">{value}</p>{hint && <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{hint}</p>}</div>;
}

/** Complemento do painel: situação do plantel, estoque, gráficos e alertas — tudo de registros reais. */
export function DashboardCommand({ from, to, today }: { from: string; to: string; today: string }) {
  const sows = useQuery(sowsQuery), breedings = useQuery(breedingsQuery), litters = useQuery(littersQuery), events = useQuery(litterEventsQuery);
  const diagnoses = useQuery(diagnosesQuery), sowEvents = useQuery(sowEventsQuery), piglets = useQuery(pigletsQuery), settings = useQuery(farmSettingsQuery);
  const feeds = useQuery(feedProductsQuery), lots = useQuery(medicationLotsQuery), meds = useQuery(medicationsQuery), items = useQuery(stockItemsQuery), moves = useQuery(stockMovementsQuery);
  const finance = useQuery(financeQuery), pens = useQuery(pensQuery);
  const feedUse = useQuery(generic<{ movement_type: string; quantity_kg: number; movement_date: string }>("feed", "feed_movements", "movement_type,quantity_kg,movement_date"));
  const penRecords = useQuery(generic<{ pen_id: string; event_date: string; animal_count: number | null }>("penrec", "pen_records", "pen_id,event_date,animal_count"));
  const cfg = settings.data ?? DEFAULT_FARM_SETTINGS;
  const agenda = useAgenda(today, today, today);
  const past = useAgenda(addDays(today, -90), today, today);

  const situation = useMemo(() => {
    const counts = new Map<SowSituation, number>();
    let observation = 0;
    for (const s of sows.data ?? []) {
      const r = sowSituation(s, (breedings.data ?? []).filter((b) => b.sow_id === s.id), (litters.data ?? []).filter((l) => l.sow_id === s.id), { attentionStart: cfg.gestation.attentionStart, gestationDays: cfg.gestation.gestationDays, maternityTransferDay: cfg.maternityTransferDay }, today);
      counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
      if (s.condition) observation++;
    }
    return { counts, observation };
  }, [sows.data, breedings.data, litters.data, cfg, today]);

  const repro = reproductiveIndicators({ breedings: breedings.data ?? [], diagnoses: diagnoses.data ?? [], litters: litters.data ?? [], sowEvents: sowEvents.data ?? [] }, from, to);
  const mat = maternityIndicators(litters.data ?? [], piglets.data ?? [], (events.data ?? []).filter((e) => e.event_type === "desmame"), from, to);
  const days = Math.max(1, daysBetween(from, to) + 1);
  const consumed = (feedUse.data ?? []).filter((m) => m.movement_type === "consumo" && m.movement_date >= from && m.movement_date <= to).reduce((a, m) => a + Number(m.quantity_kg), 0);
  const medLotsInStock = (lots.data ?? []).filter((l) => Number(l.quantity) > 0);
  const feedTotal = (feeds.data ?? []).reduce((a, f) => a + Number(f.stock_kg), 0);
  const medName = new Map((meds.data ?? []).map((m) => [m.id, m.name]));
  const stock = stockAlerts({ items: items.data ?? [], movements: moves.data ?? [], feeds: (feeds.data ?? []).map((f) => ({ id: f.id, name: f.name, stock_kg: Number(f.stock_kg), minimum_stock_kg: Number(f.minimum_stock_kg) })), medLots: medLotsInStock.map((l) => ({ ...l, quantity: Number(l.quantity) })), medName: (id) => medName.get(id) ?? "Medicamento" }, today);

  // Gráficos dos últimos 12 meses.
  const months = lastMonths(today, 12);
  const charts = months.map((m) => {
    const L = (litters.data ?? []).filter((l) => l.status !== "cancelada");
    const label = `${m.slice(5)}/${m.slice(2, 4)}`;
    const medSpend = (finance.data ?? []).filter((e) => e.entry_type === "despesa" && e.status === "pago" && /medic|vacin|farm/i.test(e.category) && (e.paid_at ?? e.entry_date).startsWith(m)).reduce((a, e) => a + Number(e.amount), 0);
    return {
      mes: label,
      "Nascidos vivos": L.filter((l) => l.farrowing_date.startsWith(m)).reduce((a, l) => a + l.born_alive, 0),
      Desmamados: L.filter((l) => l.weaning_date?.startsWith(m)).reduce((a, l) => a + (l.weaned ?? 0), 0),
      "Mortes de leitões": (events.data ?? []).filter((e) => e.event_type === "morte" && e.event_date.startsWith(m)).reduce((a, e) => a + e.quantity, 0),
      "Ração consumida (kg)": (feedUse.data ?? []).filter((x) => x.movement_type === "consumo" && x.movement_date.startsWith(m)).reduce((a, x) => a + Number(x.quantity_kg), 0),
      "Gastos com medicamentos/vacinas": medSpend,
    };
  });

  // Alertas inteligentes.
  const lastCensus = new Map<string, string>();
  for (const r of penRecords.data ?? []) if (r.animal_count !== null && (lastCensus.get(r.pen_id) ?? "") < r.event_date) lastCensus.set(r.pen_id, r.event_date);
  const pensNoCensus = (pens.data ?? []).filter((p) => p.status === "ativa" && (!lastCensus.get(p.id) || daysBetween(lastCensus.get(p.id)!, today) > 7));
  const noIron = (piglets.data ?? []).filter((p) => (p.status ?? "ativo") === "ativo" && !p.iron_date);
  const emptyNoBreeding = (sows.data ?? []).filter((s) => { const r = sowSituation(s, (breedings.data ?? []).filter((b) => b.sow_id === s.id), (litters.data ?? []).filter((l) => l.sow_id === s.id), { attentionStart: cfg.gestation.attentionStart, gestationDays: cfg.gestation.gestationDays, maternityTransferDay: cfg.maternityTransferDay }, today); return r.key === "vazia" || r.key === "desmamada" || r.key === "cio_identificado"; });
  const late = overdue(past.items, today);
  const todayItems = agenda.items.filter((i) => !i.done);
  type A = { key: string; tone: "alta" | "media"; text: string; to: "/agenda" | "/almoxarifado" | "/leitoes" | "/baias" | "/matrizes" | "/gestacao" };
  const alerts: A[] = [
    ...(late.length ? [{ key: "late", tone: "alta" as const, text: `${late.length} pendência(s) atrasada(s): ${[...new Set(late.map((i) => AGENDA_KIND_LABEL[i.kind]))].join(", ")}`, to: "/agenda" as const }] : []),
    ...todayItems.filter((i) => i.kind === "parto" || i.kind === "diagnostico" || i.kind === "cio" || i.kind === "transferencia").slice(0, 6).map((i) => ({ key: i.id, tone: "media" as const, text: `Hoje: ${i.title}${i.estimated ? " (previsão)" : ""}`, to: "/gestacao" as const })),
    ...todayItems.filter((i) => i.kind === "protocolo" || i.kind === "vacina").slice(0, 4).map((i) => ({ key: i.id, tone: "media" as const, text: `Hoje: ${i.title}`, to: "/agenda" as const })),
    ...stock.filter((s) => s.level === "alta").slice(0, 5).map((s) => ({ key: s.key, tone: "alta" as const, text: `${s.module}: ${s.title}`, to: "/almoxarifado" as const })),
    ...(stock.filter((s) => s.level === "media").length ? [{ key: "stockm", tone: "media" as const, text: `${stock.filter((s) => s.level === "media").length} alerta(s) de estoque (mínimo, validade próxima, lote sem identificação)`, to: "/almoxarifado" as const }] : []),
    ...(noIron.length ? [{ key: "iron", tone: "media" as const, text: `${noIron.length} leitão(ões) identificado(s) sem registro de ferro`, to: "/leitoes" as const }] : []),
    ...(emptyNoBreeding.length ? [{ key: "empty", tone: "media" as const, text: `${emptyNoBreeding.length} matriz(es) vazia(s), desmamada(s) ou em cio sem cobertura registrada`, to: "/matrizes" as const }] : []),
    ...(pensNoCensus.length ? [{ key: "pens", tone: "media" as const, text: `${pensNoCensus.length} baia(s) ativa(s) sem ocupação registrada nos últimos 7 dias`, to: "/baias" as const }] : []),
  ];

  const order: SowSituation[] = ["leitoa", "em_preparacao", "cio_identificado", "inseminada", "gestante", "pre_parto", "em_maternidade", "em_lactacao", "desmamada", "vazia"];
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /><h2 className="font-bold">Alertas inteligentes</h2><span className="text-xs text-muted-foreground">calculados dos registros</span></div>
        {alerts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum alerta agora.</p> : <ul className="grid gap-2 md:grid-cols-2">{alerts.map((a) => <li key={a.key}><Link to={a.to} className={`flex items-start gap-2 rounded-xl border p-3 text-sm transition hover:bg-muted ${a.tone === "alta" ? "border-destructive/30 bg-destructive/5" : "border-warn/40 bg-warn/5"}`}><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${a.tone === "alta" ? "text-destructive" : "text-warn"}`} />{a.text}</Link></li>)}</ul>}
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 font-bold">Situação atual do plantel</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {order.map((k) => <Tile key={k} label={SOW_SITUATIONS[k]} value={situation.counts.get(k) ?? 0} />)}
          <Tile label="Em observação / tratamento" value={situation.observation} hint="condição sanitária no cadastro" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Descartadas e mortas aparecem nos relatórios; este quadro mostra o plantel ativo (cadastros não arquivados).</p>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 font-bold">Indicadores do período</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          <Tile label="Taxa de parto" value={fmt(repro.farrowingRate, 1, "%")} hint={`${repro.farrowingRate.n} ciclos com desfecho`} />
          <Tile label="Taxa de concepção" value={fmt(repro.conceptionRate, 1, "%")} hint={`${repro.conceptionRate.n} diagnósticos`} />
          <Tile label="Desmamados por leitegada" value={fmt(mat.weanedPerLitter)} hint={`${mat.weanedPerLitter.n} desmames`} />
          <Tile label="Mortalidade pré-desmame" value={fmt(mat.preWeaningMortality, 1, "%")} hint={`${mat.weanedLitters} leitegadas desmamadas`} />
          <Tile label="Mortes de matrizes" value={repro.sowDeaths} />
          <Tile label="Descartes de matrizes" value={repro.discards} />
          <Tile label="Medicamentos em estoque" value={medLotsInStock.length} hint="lotes com saldo" />
          <Tile label="Ração em estoque" value={`${feedTotal.toLocaleString("pt-BR")} kg`} />
          <Tile label="Consumo diário de ração" value={consumed ? `${(consumed / days).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg` : "—"} hint={`média de ${days} dia(s), consumo lançado`} />
          <Tile label="Itens de estoque em alerta" value={stock.length} />
          <Tile label="Retornos ao cio" value={repro.returns} />
          <Tile label="Intervalo desmame-cio" value={fmt(repro.weaningToEstrus, 0, " d")} hint={`${repro.weaningToEstrus.n} desmames`} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5"><h2 className="mb-3 font-bold">Nascimentos, desmames e mortalidade (12 meses)</h2>
          <div className="h-64"><ResponsiveContainer><LineChart data={charts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Legend />
            <Line dataKey="Nascidos vivos" stroke="hsl(150 45% 30%)" strokeWidth={2} dot={false} /><Line dataKey="Desmamados" stroke="hsl(200 60% 40%)" strokeWidth={2} dot={false} /><Line dataKey="Mortes de leitões" stroke="hsl(0 60% 50%)" strokeWidth={2} dot={false} />
          </LineChart></ResponsiveContainer></div></section>
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5"><h2 className="mb-3 font-bold">Consumo de ração e gastos com medicamentos (12 meses)</h2>
          <div className="h-64"><ResponsiveContainer><BarChart data={charts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" fontSize={11} /><YAxis yAxisId="kg" fontSize={11} /><YAxis yAxisId="rs" orientation="right" fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v: number, n: string) => (n.startsWith("Gastos") ? brl(v) : `${v.toLocaleString("pt-BR")} kg`)} /><Legend />
            <Bar yAxisId="kg" dataKey="Ração consumida (kg)" fill="hsl(40 70% 45%)" /><Bar yAxisId="rs" dataKey="Gastos com medicamentos/vacinas" fill="hsl(150 45% 30%)" />
          </BarChart></ResponsiveContainer></div>
          <p className="mt-2 text-xs text-muted-foreground">Gastos = despesas pagas com categoria de medicamentos, vacinas ou farmácia.</p></section>
      </div>
    </div>
  );
}
