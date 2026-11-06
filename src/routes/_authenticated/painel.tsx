import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { PiggyBank, HeartPulse, CalendarClock, Baby, Sprout, Skull, ListChecks, AlertTriangle } from "lucide-react";
import { Kpi, SectionTitle, Empty } from "@/components/farm/Kpi";
import { sowsQuery, breedingsQuery, littersQuery, tasksQuery, livePiglets, todayISO, addDaysISO, fmtDate, PRIORITY } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel | AgroTech Command Center" }, { name: "description", content: "Indicadores do rebanho em tempo real." }] }),
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

  const s = useMemo(() => {
    const S = sows.data ?? [], B = breedings.data ?? [], L = litters.data ?? [], T = tasks.data ?? [];
    const active = S.filter((x) => x.status !== "descartada");
    const latestBySow = new Map<string, (typeof B)[number]>();
    for (const b of B) if (!latestBySow.has(b.sow_id)) latestBySow.set(b.sow_id, b);
    const farrowedAfter = (sowId: string, date: string) => L.some((l) => l.sow_id === sowId && l.farrowing_date >= date);
    const pending = [...latestBySow.values()].filter((b) => b.pregnancy_check !== "negativo" && !farrowedAfter(b.sow_id, b.breeding_date));
    const due7 = pending.filter((b) => b.expected_farrowing && b.expected_farrowing <= in7);
    const inMat = L.filter((l) => l.status === "maternidade");
    const openTasks = T.filter((t) => t.status !== "concluida");
    const overdue = openTasks.filter((t) => t.due_date && t.due_date < today);
    const month = today.slice(0, 7);
    const deathsMonth = L.filter((l) => l.farrowing_date.startsWith(month)).reduce((a, l) => a + l.deaths, 0);

    const byMonth = new Map<string, { m: string; vivos: number; natimortos: number; desmamados: number }>();
    for (const l of [...L].reverse()) {
      const m = l.farrowing_date.slice(0, 7);
      const row = byMonth.get(m) ?? { m, vivos: 0, natimortos: 0, desmamados: 0 };
      row.vivos += l.born_alive; row.natimortos += l.stillborn; row.desmamados += l.weaned ?? 0;
      byMonth.set(m, row);
    }
    return {
      active: active.length,
      gestantes: S.filter((x) => x.status === "gestante").length,
      due7, inMat,
      liveMat: inMat.reduce((a, l) => a + livePiglets(l), 0),
      weaned: L.reduce((a, l) => a + (l.weaned ?? 0), 0),
      deathsMonth, openTasks, overdue,
      chart: [...byMonth.values()].slice(-12).map((r) => ({ ...r, m: r.m.split("-").reverse().join("/") })),
      sowName: (id: string) => S.find((x) => x.id === id)?.ear_tag ?? "?",
    };
  }, [sows.data, breedings.data, litters.data, tasks.data, today, in7]);

  if (loading) return <p className="label-tech animate-pulse-soft">Carregando telemetria…</p>;

  const attention = [
    ...s.overdue.map((t) => ({ k: "t" + t.id, tone: "text-destructive", text: `Tarefa atrasada: ${t.title}`, sub: `Prevista ${fmtDate(t.due_date)}`, to: "/tarefas" as const })),
    ...s.due7.map((b) => ({ k: "b" + b.id, tone: "text-warn", text: `Parto previsto · matriz ${s.sowName(b.sow_id)}`, sub: fmtDate(b.expected_farrowing), to: "/matrizes" as const })),
  ];

  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <p className="label-tech">Centro de comando</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Visão geral da produção</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Matrizes ativas" value={s.active} icon={PiggyBank} source="Matrizes" to="/matrizes" delay={0} />
        <Kpi label="Gestantes" value={s.gestantes} icon={HeartPulse} tone="text-cyan" source="Matrizes" to="/matrizes" delay={40} />
        <Kpi label="Partos em 7 dias" value={s.due7.length} icon={CalendarClock} tone={s.due7.length ? "text-warn" : "text-foreground"} source="Coberturas +114d" to="/matrizes" delay={80} />
        <Kpi label="Leitões na maternidade" value={s.liveMat} unit={`em ${s.inMat.length} leitegadas`} icon={Baby} tone="text-ok-glow" source="Leitegadas" to="/maternidade" delay={120} />
        <Kpi label="Leitões desmamados" value={s.weaned} unit="total" icon={Sprout} source="Leitegadas" to="/maternidade" delay={160} />
        <Kpi label="Mortes no mês" value={s.deathsMonth} unit="leitegadas do mês" icon={Skull} tone={s.deathsMonth ? "text-destructive" : "text-foreground"} source="Leitegadas" to="/maternidade" delay={200} />
        <Kpi label="Tarefas abertas" value={s.openTasks.length} icon={ListChecks} tone="text-info" source="Tarefas" to="/tarefas" delay={240} />
        <Kpi label="Tarefas atrasadas" value={s.overdue.length} icon={AlertTriangle} tone={s.overdue.length ? "text-destructive" : "text-foreground"} source="Tarefas" to="/tarefas" delay={280} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel p-4 lg:col-span-3">
          <SectionTitle kicker="Produção de leitões" title="Nascimentos por mês" />
          {s.chart.length === 0 ? (
            <Empty>Ainda não há partos registrados. O gráfico aparece após o primeiro parto.</Empty>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={s.chart}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="vivos" name="Nascidos vivos" fill="var(--ok)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="natimortos" name="Natimortos" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="desmamados" name="Desmamados" fill="var(--info)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="panel p-4 lg:col-span-2">
          <SectionTitle kicker="Prioridades" title="Precisa de atenção agora" />
          {attention.length === 0 ? (
            <Empty>Nada pendente. Tudo em dia.</Empty>
          ) : (
            <ul className="divide-y">
              {attention.slice(0, 8).map((a) => (
                <li key={a.k}>
                  <Link to={a.to} className="flex items-center gap-3 py-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full bg-current ${a.tone}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{a.text}</p>
                      <p className="font-mono text-[0.7rem] text-muted-foreground">{a.sub}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {s.openTasks.length > 0 && (
            <p className="mt-3 font-mono text-[0.65rem] text-muted-foreground">
              {s.openTasks.filter((t) => t.priority === "alta").length} tarefa(s) de prioridade alta abertas
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
