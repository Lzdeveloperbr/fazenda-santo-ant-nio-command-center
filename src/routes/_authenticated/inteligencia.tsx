import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { breedingsQuery, litterEventsQuery, littersQuery, sowsQuery, tasksQuery, addDaysISO, fmtDate, todayISO } from "@/lib/farm";
import { isActiveSowStatus } from "@/lib/farm/reproduction";
import { deathsByMonth, litterMortality, sowProductivity, weaningForecast } from "@/lib/farm/insights";
import { Empty, SectionTitle } from "@/components/farm/Kpi";

export const Route = createFileRoute("/_authenticated/inteligencia")({
  head: () => ({ meta: [
    { title: "Inteligência operacional | Fazenda Santo Antônio" },
    { name: "description", content: "Calendário reprodutivo, pendências, previsão de desmames, mapa de mortalidade e comparação de matrizes." },
    { property: "og:title", content: "Inteligência operacional | Fazenda Santo Antônio" },
    { property: "og:description", content: "Calendário, pendências, previsões e comparações a partir dos registros." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Inteligencia,
});

type CalItem = { date: string; kind: string; label: string; tone: string; sowId?: string | null };

function Inteligencia() {
  const sows = useQuery(sowsQuery), breedings = useQuery(breedingsQuery), litters = useQuery(littersQuery), events = useQuery(litterEventsQuery), tasks = useQuery(tasksQuery);
  const [sort, setSort] = useState<"mortalidade" | "vivos">("mortalidade");
  const today = todayISO(); const horizon = addDaysISO(today, 30);
  const tag = useMemo(() => new Map((sows.data ?? []).map((s) => [s.id, s.ear_tag])), [sows.data]);

  const calendar = useMemo(() => {
    const items: CalItem[] = [];
    const seen = new Set<string>();
    for (const b of breedings.data ?? []) {
      if (seen.has(b.sow_id)) continue; seen.add(b.sow_id);
      const sow = sows.data?.find((s) => s.id === b.sow_id);
      if (!sow || !["coberta", "gestante"].includes(sow.status) || !b.expected_farrowing) continue;
      if (b.pregnancy_check === "pendente" && addDaysISO(b.breeding_date, 21) <= horizon) items.push({ date: addDaysISO(b.breeding_date, 21), kind: "Diagnóstico", label: `Verificar retorno ao cio · ${sow.ear_tag}`, tone: "text-info", sowId: sow.id });
      if (b.expected_farrowing <= horizon) items.push({ date: b.expected_farrowing, kind: "Parto previsto", label: sow.ear_tag, tone: "text-cyan", sowId: sow.id });
    }
    for (const w of weaningForecast(litters.data ?? [], addDaysISO)) if (w.expected <= horizon) items.push({ date: w.expected, kind: "Desmame previsto", label: `${tag.get(w.sowId) ?? "?"} · ${w.piglets} leitões`, tone: "text-ok", sowId: w.sowId });
    for (const t of tasks.data ?? []) if (t.status !== "concluida" && t.due_date && t.due_date <= horizon) items.push({ date: t.due_date, kind: "Tarefa", label: t.title, tone: t.due_date < today ? "text-destructive" : "text-warn", sowId: t.sow_id });
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [breedings.data, sows.data, litters.data, tasks.data, tag, horizon, today]);
  const overdue = calendar.filter((c) => c.date < today);
  const upcoming = calendar.filter((c) => c.date >= today);
  const forecast = weaningForecast(litters.data ?? [], addDaysISO);
  const forecastPiglets = forecast.filter((f) => f.expected <= horizon).reduce((s, f) => s + f.piglets, 0);

  const months = useMemo(() => { const out: string[] = []; const d = new Date(today + "T12:00:00"); for (let i = 11; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`); } return out; }, [today]);
  const deaths = deathsByMonth(events.data ?? []);
  const maxDeaths = Math.max(1, ...months.map((m) => deaths[m] ?? 0));

  const litterRows = (litters.data ?? []).map((l) => ({ l, mort: litterMortality(l) })).sort((a, b) => sort === "vivos" ? b.l.born_alive - a.l.born_alive : (b.mort ?? -1) - (a.mort ?? -1));
  const culling = (sows.data ?? []).filter((s) => isActiveSowStatus(s.status)).map((s) => ({ s, p: sowProductivity(s.id, litters.data ?? []) })).filter((x) => x.p).sort((a, b) => a.p!.mediaVivos - b.p!.mediaVivos);
  const loading = [sows, breedings, litters, events, tasks].some((q) => q.isLoading);
  if (loading) return <div className="panel p-8 text-center text-sm text-muted-foreground">Analisando os registros…</div>;

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Inteligência operacional" title="Central de pendências e previsões" />
      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Atenção agora" title={`Atrasados (${overdue.length})`} />
        {overdue.length === 0 ? <Empty>Nada atrasado nos registros.</Empty> : <CalList items={overdue} />}
      </section>
      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Próximos 30 dias" title="Calendário reprodutivo e de manejo" />
        {upcoming.length === 0 ? <Empty>Nenhum parto, desmame, diagnóstico ou tarefa previstos nos próximos 30 dias.</Empty> : <CalList items={upcoming} />}
        <p className="mt-3 text-xs text-muted-foreground">Parto previsto = cobertura + 114 dias. Diagnóstico = cobertura + 21 dias. Desmame previsto = parto + 21 dias. São estimativas a partir dos registros.</p>
      </section>
      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Previsão de produção" title="Desmames estimados" />
        {forecast.length === 0 ? <Empty>Nenhuma leitegada em maternidade.</Empty> : <p className="text-sm">Nos próximos 30 dias, se não houver novas mortes: <strong className="font-mono text-lg">{forecastPiglets}</strong> leitões disponíveis para desmame, de {forecast.filter((f) => f.expected <= horizon).length} leitegada(s). <span className="text-xs text-muted-foreground">(estimativa)</span></p>}
      </section>
      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Mortalidade" title="Mapa de calor — mortes por mês" />
        {Object.keys(deaths).length === 0 ? <Empty>Nenhuma morte registrada nas leitegadas.</Empty> : <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">{months.map((m) => { const v = deaths[m] ?? 0; return <div key={m} className="rounded-lg border p-2 text-center" style={{ background: v ? `color-mix(in oklab, var(--destructive) ${15 + (v / maxDeaths) * 60}%, transparent)` : undefined }}><p className="text-[10px] text-muted-foreground">{m.slice(5)}/{m.slice(2, 4)}</p><p className="font-mono font-bold">{v}</p></div>; })}</div>}
      </section>
      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Comparação" title="Leitegadas lado a lado" action={<select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 rounded-md border bg-card px-2 text-xs"><option value="mortalidade">Maior mortalidade</option><option value="vivos">Mais nascidos vivos</option></select>} />
        {litterRows.length === 0 ? <Empty>Nenhum parto registrado.</Empty> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Matriz</th><th>Parto</th><th className="text-right">Vivos</th><th className="text-right">Mortes</th><th className="text-right">Mortalidade</th><th className="text-right">Desmamados</th></tr></thead><tbody>{litterRows.map(({ l, mort }) => <tr key={l.id} className="border-b last:border-0"><td className="py-2 font-mono font-semibold"><Link to="/matrizes/$sowId" params={{ sowId: l.sow_id }} className="underline">{tag.get(l.sow_id) ?? "?"}</Link></td><td>{fmtDate(l.farrowing_date)}</td><td className="text-right font-mono">{l.born_alive}</td><td className="text-right font-mono">{l.deaths}</td><td className="text-right font-mono">{mort == null ? "—" : `${mort.toFixed(1)}%`}</td><td className="text-right font-mono">{l.status === "desmamada" ? l.weaned ?? 0 : "—"}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Descarte" title="Avaliação de produtividade das matrizes" />
        {culling.length === 0 ? <Empty>Nenhuma matriz ativa com parto registrado.</Empty> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Matriz</th><th className="text-right">Partos</th><th className="text-right">Média vivos</th><th className="text-right">Média desmam.</th><th className="text-right">Mortalidade</th></tr></thead><tbody>{culling.map(({ s, p }) => <tr key={s.id} className="border-b last:border-0"><td className="py-2 font-mono font-semibold"><Link to="/matrizes/$sowId" params={{ sowId: s.id }} className="underline">{s.ear_tag}</Link></td><td className="text-right font-mono">{p!.partos}</td><td className="text-right font-mono">{p!.mediaVivos.toFixed(1)}</td><td className="text-right font-mono">{p!.mediaDesmamados == null ? "—" : p!.mediaDesmamados.toFixed(1)}</td><td className="text-right font-mono">{p!.mortalidade == null ? "—" : `${p!.mortalidade.toFixed(1)}%`}</td></tr>)}</tbody></table><p className="mt-3 text-xs text-muted-foreground">Ordenado da menor para a maior média de nascidos vivos. Use como apoio — a decisão de descarte considera também idade, saúde e custos.</p></div>}
      </section>
    </div>
  );
}

function CalList({ items }: { items: CalItem[] }) {
  return <ul className="divide-y">{items.map((c, i) => <li key={i} className="flex items-center gap-3 py-2.5 text-sm"><span className="w-20 shrink-0 font-mono text-xs">{fmtDate(c.date)}</span><span className={`w-32 shrink-0 text-xs font-semibold ${c.tone}`}>{c.kind}</span>{c.sowId ? <Link to="/matrizes/$sowId" params={{ sowId: c.sowId }} className="min-w-0 truncate underline">{c.label}</Link> : <span className="min-w-0 truncate">{c.label}</span>}</li>)}</ul>;
}
