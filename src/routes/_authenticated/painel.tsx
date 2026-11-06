import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { PiggyBank, HeartPulse, CalendarClock, Baby, Sprout, Skull, ListChecks, AlertTriangle, ArrowUpRight, CalendarDays, Activity, ClipboardCheck, Clock3 } from "lucide-react";
import { Kpi, SectionTitle, Empty } from "@/components/farm/Kpi";
import { sowsQuery, breedingsQuery, littersQuery, tasksQuery, livePiglets, todayISO, addDaysISO, fmtDate, PRIORITY } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Visão geral | Fazenda Santo Antônio" }, { name: "description", content: "Painel de manejo e indicadores da suinocultura." }] }),
  component: Painel,
});

function Painel() {
  const sows = useQuery(sowsQuery);
  const breedings = useQuery(breedingsQuery);
  const litters = useQuery(littersQuery);
  const tasks = useQuery(tasksQuery);
  const today = todayISO();
  const in7 = addDaysISO(today, 7);
  const loading = sows.isLoading || breedings.isLoading || litters.isLoading || tasks.isLoading;
  const failed = sows.isError || breedings.isError || litters.isError || tasks.isError;

  const s = useMemo(() => {
    const S = sows.data ?? [], B = breedings.data ?? [], L = litters.data ?? [], T = tasks.data ?? [];
    const active = S.filter((x) => x.status !== "descartada");
    const latestBySow = new Map<string, (typeof B)[number]>();
    for (const b of B) if (!latestBySow.has(b.sow_id)) latestBySow.set(b.sow_id, b);
    const alreadyFarrowed = (sowId: string, date: string) => L.some((l) => l.sow_id === sowId && l.farrowing_date >= date);
    const pending = [...latestBySow.values()].filter((b) => b.pregnancy_check !== "negativo" && !alreadyFarrowed(b.sow_id, b.breeding_date));
    const due7 = pending.filter((b) => b.expected_farrowing && b.expected_farrowing >= today && b.expected_farrowing <= in7);
    const overdueBirths = pending.filter((b) => b.expected_farrowing && b.expected_farrowing < today);
    const inMat = L.filter((l) => l.status === "maternidade");
    const openTasks = T.filter((t) => t.status !== "concluida");
    const overdue = openTasks.filter((t) => t.due_date && t.due_date < today);
    const month = today.slice(0, 7);
    const monthLitters = L.filter((l) => l.farrowing_date.startsWith(month));
    const deathsMonth = monthLitters.reduce((a, l) => a + l.deaths, 0);
    const bornMonth = monthLitters.reduce((a, l) => a + l.born_alive + l.stillborn, 0);
    const byMonth = new Map<string, { m: string; vivos: number; natimortos: number; desmamados: number }>();
    for (const l of [...L].reverse()) {
      const m = l.farrowing_date.slice(0, 7);
      const row = byMonth.get(m) ?? { m, vivos: 0, natimortos: 0, desmamados: 0 };
      row.vivos += l.born_alive; row.natimortos += l.stillborn; row.desmamados += l.weaned ?? 0;
      byMonth.set(m, row);
    }
    return {
      active: active.length, gestantes: S.filter((x) => x.status === "gestante").length,
      vazias: S.filter((x) => x.status === "vazia").length,
      due7, overdueBirths, inMat, liveMat: inMat.reduce((a, l) => a + livePiglets(l), 0),
      weaned: L.reduce((a, l) => a + (l.weaned ?? 0), 0),
      deathsMonth, bornMonth, openTasks, overdue,
      chart: [...byMonth.values()].slice(-8).map((r) => ({ ...r, m: r.m.slice(5) + "/" + r.m.slice(0, 4) })),
      sowName: (id: string) => S.find((x) => x.id === id)?.ear_tag ?? "Sem brinco",
      recent: [...L].slice(0, 5),
    };
  }, [sows.data, breedings.data, litters.data, tasks.data, today, in7]);

  if (loading) return <div className="farm-surface p-8 text-center text-sm text-muted-foreground">Carregando indicadores do rebanho…</div>;

  const attention = [
    ...s.overdue.map((t) => ({ k: "t" + t.id, tone: "text-destructive", text: t.title, sub: `Tarefa atrasada · ${fmtDate(t.due_date)}`, to: "/tarefas" as const })),
    ...s.overdueBirths.map((b) => ({ k: "b" + b.id, tone: "text-warn", text: `Parto pendente · ${s.sowName(b.sow_id)}`, sub: `Previsão ${fmtDate(b.expected_farrowing)}`, to: "/matrizes" as const })),
    ...s.due7.map((b) => ({ k: "d" + b.id, tone: "text-primary", text: `Parto previsto · ${s.sowName(b.sow_id)}`, sub: fmtDate(b.expected_farrowing), to: "/matrizes" as const })),
  ];

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 md:p-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-primary"><Activity className="h-3.5 w-3.5" /> Gestão da suinocultura</div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bom trabalho na fazenda.</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Acompanhe o rebanho, organize os manejos e identifique o que precisa de atenção hoje.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />{new Date(today + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Quick label="Matrizes ativas" value={s.active} icon={PiggyBank} />
          <Quick label="Gestantes" value={s.gestantes} icon={HeartPulse} />
          <Quick label="Leitões na maternidade" value={s.liveMat} icon={Baby} />
          <Quick label="Manejos pendentes" value={s.openTasks.length} icon={ClipboardCheck} />
        </div>
      </section>

      {failed && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">Não foi possível atualizar todos os indicadores. Confira a conexão e tente recarregar a página.</div>}

      <section>
        <SectionTitle kicker="Indicadores do plantel" title="Resumo da produção" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label="Matrizes em atividade" value={s.active} icon={PiggyBank} source="Cadastro de matrizes" to="/matrizes" />
          <Kpi label="Matrizes vazias" value={s.vazias} icon={Activity} tone="text-info" source="Cadastro de matrizes" to="/matrizes" />
          <Kpi label="Partos nos próximos 7 dias" value={s.due7.length} icon={CalendarClock} tone={s.due7.length ? "text-warn" : "text-foreground"} source="Coberturas registradas" to="/matrizes" />
          <Kpi label="Leitegadas em maternidade" value={s.inMat.length} unit="leitegadas" icon={Baby} tone="text-primary" source="Partos registrados" to="/maternidade" />
          <Kpi label="Leitões vivos na maternidade" value={s.liveMat} icon={Sprout} source="Eventos de leitegada" to="/maternidade" />
          <Kpi label="Leitões desmamados" value={s.weaned} icon={Sprout} source="Desmames registrados" to="/maternidade" />
          <Kpi label="Mortes registradas no mês" value={s.deathsMonth} unit={`de ${s.bornMonth} nascidos`} icon={Skull} tone={s.deathsMonth ? "text-destructive" : "text-foreground"} source="Eventos de leitegada" to="/maternidade" />
          <Kpi label="Manejos atrasados" value={s.overdue.length} icon={AlertTriangle} tone={s.overdue.length ? "text-destructive" : "text-foreground"} source="Tarefas" to="/tarefas" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-5">
        <section className="farm-surface p-4 md:p-5 xl:col-span-3">
          <SectionTitle kicker="Histórico produtivo" title="Nascimentos e desmames" />
          {s.chart.length === 0 ? <Empty>Cadastre os primeiros partos para visualizar a evolução da produção.</Empty> : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={s.chart} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="vivos" name="Nascidos vivos" fill="var(--ok)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="natimortos" name="Natimortos" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="desmamados" name="Desmamados" fill="var(--info)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="farm-surface p-4 md:p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between"><div><p className="label-tech">Central de alertas</p><h2 className="mt-1 text-lg font-semibold">Atenção necessária</h2></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{attention.length} itens</span></div>
          {attention.length === 0 ? <Empty>Nenhum alerta registrado. Continue mantendo os manejos atualizados.</Empty> : (
            <ul className="divide-y divide-border/70">
              {attention.slice(0, 7).map((a) => <li key={a.k}><Link to={a.to} className="flex items-center gap-3 py-3 transition-colors hover:bg-accent/30"><span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-current ${a.tone}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.text}</p><p className="mt-0.5 text-xs text-muted-foreground">{a.sub}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link></li>)}
            </ul>
          )}
          {s.openTasks.length > 0 && <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{s.openTasks.filter((t) => t.priority === "alta").length} manejo(s) com prioridade alta</p>}
        </section>
      </div>

      <section className="farm-surface p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="label-tech">Rotina operacional</p><h2 className="mt-1 text-lg font-semibold">Próximos manejos</h2></div><Link to="/tarefas" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Abrir tarefas <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        {s.openTasks.length === 0 ? <Empty>Nenhum manejo pendente cadastrado.</Empty> : (
          <div className="grid gap-2 md:grid-cols-2">
            {s.openTasks.slice(0, 6).map((t) => <div key={t.id} className="flex items-center gap-3 rounded-xl border bg-background/40 p-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Clock3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{t.sector ?? "Geral"} · {fmtDate(t.due_date)}</p></div><span className={`text-[0.65rem] font-semibold ${PRIORITY[t.priority]?.tone ?? ""}`}>{PRIORITY[t.priority]?.label ?? t.priority}</span></div>)}
          </div>
        )}
      </section>
    </div>
  );
}

function Quick({ label, value, icon: Icon }: { label: string; value: number; icon: typeof PiggyBank }) {
  return <div className="rounded-2xl border border-border/70 bg-background/45 p-3 backdrop-blur-sm"><div className="flex items-center justify-between gap-2"><p className="text-[0.68rem] text-muted-foreground">{label}</p><Icon className="h-4 w-4 shrink-0 text-primary" /></div><p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p></div>;
}
