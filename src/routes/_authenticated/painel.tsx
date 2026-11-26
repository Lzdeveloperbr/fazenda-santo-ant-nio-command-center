import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PERIOD_LABEL, periodStart, periodStats, type PeriodKey } from "@/lib/farm/period";
import { DashboardCommand } from "@/components/farm/DashboardCommand";
import {
  Activity, AlertTriangle, ArrowRight, Baby, CalendarClock, CheckCircle2,
  ClipboardList, HeartPulse, PiggyBank, Skull, Sprout, TrendingUp, Wheat,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  addDaysISO, breedingsQuery, fmtDate, isCountedLitter, livePiglets,
  littersQuery, sowsQuery, tasksQuery, todayISO, litterEventsQuery, diagnosesQuery, financeQuery,
} from "@/lib/farm";
import { isActiveSowStatus } from "@/lib/farm/reproduction";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [
    { title: "Central de comando | Fazenda Santo Antônio" },
    { name: "description", content: "Visão operacional da suinocultura com dados registrados da Fazenda Santo Antônio." },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const sows = useQuery(sowsQuery);
  const breedings = useQuery(breedingsQuery);
  const litters = useQuery(littersQuery);
  const tasks = useQuery(tasksQuery);
  const events = useQuery(litterEventsQuery);
  const diagnoses = useQuery(diagnosesQuery);
  const finance = useQuery(financeQuery);
  const today = todayISO();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [customFrom, setCustomFrom] = useState(addDaysISO(today, -29));
  const [customTo, setCustomTo] = useState(today);
  const from = period === "custom" ? customFrom : periodStart(period, today, addDaysISO);
  const to = period === "custom" ? customTo : today;
  const ps = useMemo(() => periodStats(from, to, { breedings: breedings.data ?? [], litters: (litters.data ?? []).filter(isCountedLitter), events: events.data ?? [], diagnoses: diagnoses.data ?? [], finance: finance.data ?? [] }), [from, to, breedings.data, litters.data, events.data, diagnoses.data, finance.data]);
  const nextWeek = addDaysISO(today, 7);
  const loading = sows.isLoading || breedings.isLoading || litters.isLoading || tasks.isLoading;
  const error = sows.error || breedings.error || litters.error || tasks.error;

  const data = useMemo(() => {
    const sowRows = sows.data ?? [];
    const breedingRows = breedings.data ?? [];
    const litterRows = (litters.data ?? []).filter(isCountedLitter);
    const taskRows = tasks.data ?? [];
    const activeSows = sowRows.filter((sow) => isActiveSowStatus(sow.status));
    const activeIds = new Set(activeSows.map((sow) => sow.id));
    const latestBreeding = new Map<string, (typeof breedingRows)[number]>();
    for (const breeding of breedingRows) {
      if (!latestBreeding.has(breeding.sow_id)) latestBreeding.set(breeding.sow_id, breeding);
    }
    const farrowingCycles = [...latestBreeding.values()].filter((cycle) =>
      activeIds.has(cycle.sow_id) &&
      cycle.pregnancy_check !== "negativo" &&
      !litterRows.some((litter) => litter.sow_id === cycle.sow_id && litter.farrowing_date >= cycle.breeding_date)
    );
    const dueSoon = farrowingCycles
      .filter((cycle) => cycle.expected_farrowing && cycle.expected_farrowing >= today && cycle.expected_farrowing <= nextWeek)
      .sort((a, b) => (a.expected_farrowing ?? "").localeCompare(b.expected_farrowing ?? ""));
    const overdueFarrowings = farrowingCycles.filter((cycle) => cycle.expected_farrowing && cycle.expected_farrowing < today);
    const maternity = litterRows.filter((litter) => litter.status === "maternidade");
    const openTasks = taskRows.filter((task) => task.status !== "concluida");
    const overdueTasks = openTasks.filter((task) => task.due_date && task.due_date < today);
    const monthKey = today.slice(0, 7);
    const deathsThisMonth = litterRows
      .filter((litter) => litter.farrowing_date.startsWith(monthKey))
      .reduce((total, litter) => total + litter.deaths, 0);
    const monthly = new Map<string, { month: string; bornAlive: number; stillborn: number; weaned: number; deaths: number; litters: number }>();
    for (const litter of [...litterRows].reverse()) {
      const month = litter.farrowing_date.slice(0, 7);
      const row = monthly.get(month) ?? { month, bornAlive: 0, stillborn: 0, weaned: 0, deaths: 0, litters: 0 };
      row.bornAlive += litter.born_alive;
      row.stillborn += litter.stillborn;
      row.weaned += litter.weaned ?? 0;
      row.deaths += litter.deaths;
      row.litters += 1;
      monthly.set(month, row);
    }
    return {
      activeSows: activeSows.length,
      pregnant: sowRows.filter((sow) => sow.status === "gestante").length,
      dueSoon,
      overdueFarrowings,
      maternityCount: maternity.length,
      liveInMaternity: maternity.reduce((total, litter) => total + livePiglets(litter), 0),
      weaned: litterRows.reduce((total, litter) => total + (litter.weaned ?? 0), 0),
      deathsThisMonth,
      openTasks,
      overdueTasks,
      monthly: [...monthly.values()].slice(-8).map((row) => ({
        ...row,
        label: row.month.slice(5, 7) + "/" + row.month.slice(0, 4),
      })),
      sowTag: (id: string) => sowRows.find((sow) => sow.id === id)?.ear_tag ?? "Matriz sem identificação",
    };
  }, [sows.data, breedings.data, litters.data, tasks.data, today, nextWeek]);

  if (loading) return <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Carregando dados registrados da granja…</div>;
  if (error) return <div className="rounded-2xl border border-destructive/30 bg-card p-6"><p className="font-semibold">Não foi possível carregar o painel.</p><p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Verifique a conexão e tente novamente."}</p></div>;

  const alerts = [
    ...data.overdueTasks.map((task) => ({ id: "task-" + task.id, title: task.title, detail: "Tarefa vencida · " + fmtDate(task.due_date), critical: true, href: "/tarefas" as const })),
    ...data.overdueFarrowings.map((cycle) => ({ id: "farrow-" + cycle.id, title: "Revisar previsão · " + data.sowTag(cycle.sow_id), detail: "Previsão: " + fmtDate(cycle.expected_farrowing), critical: true, href: "/gestacao" as const })),
    ...data.dueSoon.map((cycle) => ({ id: "due-" + cycle.id, title: "Parto previsto · " + data.sowTag(cycle.sow_id), detail: fmtDate(cycle.expected_farrowing), critical: false, href: "/gestacao" as const })),
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[26px] bg-[#173D2B] p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-14 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D8BD79]/30 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-[#E7D49E]">
              <Activity className="h-3.5 w-3.5" /> Fazenda Santo Antônio · Operação
            </div>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Central de comando<br /><span className="text-[#DCC58A]">da suinocultura.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Uma visão clara do plantel, dos próximos manejos e dos resultados registrados. Os números abaixo vêm dos dados da granja.</p>
            <p className="mt-5 text-xs font-medium capitalize text-white/55">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
            <HeroStat label="Matrizes ativas" value={data.activeSows} icon={<PiggyBank className="h-4 w-4" />} />
            <HeroStat label="Gestantes" value={data.pregnant} icon={<HeartPulse className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between gap-3">
        <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">Resumo operacional</p><h2 className="mt-1 text-xl font-bold tracking-tight">Indicadores principais</h2></div>
        <span className="hidden rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground sm:inline-flex">Atualizado a partir dos registros</span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Partos em 7 dias" value={data.dueSoon.length} hint="Previsões cadastradas" icon={<CalendarClock />} tone="gold" href="/gestacao" />
        <Metric label="Leitões na maternidade" value={data.liveInMaternity} hint={data.maternityCount + " leitegadas" } icon={<Baby />} tone="green" href="/maternidade" />
        <Metric label="Leitões desmamados" value={data.weaned} hint="Total registrado" icon={<Sprout />} tone="blue" href="/desmame" />
        <Metric label="Mortalidade no mês" value={data.deathsThisMonth} hint="Óbitos registrados" icon={<Skull />} tone="red" href="/maternidade" />
        <Metric label="Tarefas em aberto" value={data.openTasks.length} hint="Manejos pendentes" icon={<ClipboardList />} tone="blue" href="/tarefas" />
        <Metric label="Tarefas atrasadas" value={data.overdueTasks.length} hint="Exigem conferência" icon={<AlertTriangle />} tone="red" href="/tarefas" />
        <Metric label="Previsões vencidas" value={data.overdueFarrowings.length} hint="Conferir situação da matriz" icon={<CalendarClock />} tone="red" href="/gestacao" />
        <Metric label="Matrizes no plantel" value={data.activeSows} hint="Situação ativa" icon={<TrendingUp />} tone="green" href="/matrizes" />
      </div>


      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground">Resultados do período</p><h2 className="mt-1 text-lg font-bold">{fmtDate(from)} a {fmtDate(to)}</h2></div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
            {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => <button key={k} onClick={() => setPeriod(k)} aria-pressed={period === k} className={`h-9 rounded-full border px-3 text-xs font-semibold transition ${period === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{PERIOD_LABEL[k]}</button>)}
          </div>
        </div>
        {period === "custom" && <div className="mt-3 flex flex-wrap gap-3 text-xs"><label className="flex items-center gap-2">De <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 rounded-md border bg-background px-2" /></label><label className="flex items-center gap-2">Até <input type="date" value={customTo} min={customFrom} max={today} onChange={(e) => setCustomTo(e.target.value)} className="h-9 rounded-md border bg-background px-2" /></label></div>}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <PStat label="Coberturas" value={ps.coberturas} />
          <PStat label="Inseminações" value={ps.inseminacoes} />
          <PStat label="Diagnósticos +" value={ps.diagPositivos} />
          <PStat label="Diagnósticos −" value={ps.diagNegativos} />
          <PStat label="Taxa de concepção" value={ps.taxaConcepcao == null ? "—" : ps.taxaConcepcao.toFixed(1) + "%"} />
          <PStat label="Partos" value={ps.partos} />
          <PStat label="Nascidos vivos" value={ps.nascidosVivos} />
          <PStat label="Natimortos" value={ps.natimortos} />
          <PStat label="Mumificados" value={ps.mumificados} />
          <PStat label="Média vivos/parto" value={ps.mediaVivos == null ? "—" : ps.mediaVivos.toFixed(1)} />
          <PStat label="Média totais/parto" value={ps.mediaTotais == null ? "—" : ps.mediaTotais.toFixed(1)} />
          <PStat label="Mortes de leitões" value={ps.mortesLeitoes} />
          <PStat label="Desmamados" value={ps.desmamados} />
          <PStat label="Receitas pagas" value={brl(ps.receitas)} />
          <PStat label="Despesas pagas" value={brl(ps.despesas)} />
          <PStat label="Resultado (pago)" value={brl(ps.resultado)} />
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Somente registros com data dentro do período. Taxa de concepção = diagnósticos positivos ÷ (positivos + negativos). Financeiro considera apenas lançamentos pagos; pendentes ficam de fora.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground">Histórico produtivo</p><h2 className="mt-1 text-lg font-bold">Produção por mês</h2></div><Wheat className="h-5 w-5 text-muted-foreground" /></div>
          {data.monthly.length === 0 ? <EmptyChart /> : (
            <div className="mt-5 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar dataKey="bornAlive" name="Nascidos vivos" fill="#2F7650" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="stillborn" name="Natimortos" fill="#C17B55" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="weaned" name="Desmamados" fill="#5B8FA8" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">Consolidação pela data do parto. O gráfico não preenche meses sem registros com estimativas.</p>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground">Ação necessária</p><h2 className="mt-1 text-lg font-bold">Agenda e alertas</h2></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{alerts.length}</span></div>
          {alerts.length === 0 ? (
            <div className="mt-6 rounded-xl bg-muted/50 p-5 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" /><p className="mt-2 text-sm font-semibold">Nenhum alerta identificado</p><p className="mt-1 text-xs text-muted-foreground">Isso considera somente as tarefas e previsões cadastradas.</p></div>
          ) : (
            <ul className="mt-3 divide-y">
              {alerts.slice(0, 7).map((alert) => (
                <li key={alert.id}><Link to={alert.href} className="flex items-center gap-3 py-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${alert.critical ? "bg-red-500" : "bg-amber-500"}`} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{alert.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{alert.detail}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link></li>
              ))}
            </ul>
          )}
          <Link to="/tarefas" className="mt-3 flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:bg-muted"><span>Ver rotina completa</span><ArrowRight className="h-4 w-4" /></Link>
        </section>
      </div>

      <DashboardCommand from={from} to={to} today={today} />

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground">Atalhos de trabalho</p><h2 className="mt-1 text-lg font-bold">Acesse os módulos da granja</h2></div><span className="text-xs text-muted-foreground">Escolha uma área para continuar</span></div>
        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          <QuickLink href="/matrizes" icon={<PiggyBank />} title="Matrizes" detail="Cadastro e reprodução" />
          <QuickLink href="/maternidade" icon={<Baby />} title="Maternidade" detail="Partos e leitegadas" />
          <QuickLink href="/sanidade" icon={<HeartPulse />} title="Sanidade" detail="Saúde e tratamentos" />
          <QuickLink href="/estoque" icon={<Wheat />} title="Estoque" detail="Ração e materiais" />
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/15 bg-white/[.08] p-4 backdrop-blur"><div className="flex items-center justify-between text-white/65"><span className="text-xs">{label}</span>{icon}</div><p className="mt-3 font-mono text-3xl font-bold">{value.toLocaleString("pt-BR")}</p></div>;
}

function Metric({ label, value, hint, icon, tone, href }: { label: string; value: number; hint: string; icon: React.ReactNode; tone: "gold" | "green" | "blue" | "red"; href: "/gestacao" | "/maternidade" | "/desmame" | "/tarefas" | "/matrizes" }) {
  const tones = { gold: "bg-amber-50 text-amber-800", green: "bg-emerald-50 text-emerald-800", blue: "bg-sky-50 text-sky-800", red: "bg-rose-50 text-rose-800" };
  return <Link to={href} className="group rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"><div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold leading-5 text-muted-foreground">{label}</span><span className={`rounded-xl p-2 ${tones[tone]}`}>{icon}</span></div><p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value.toLocaleString("pt-BR")}</p><p className="mt-1 text-[11px] text-muted-foreground">{hint}</p></Link>;
}

function QuickLink({ href, icon, title, detail }: { href: "/matrizes" | "/maternidade" | "/sanidade" | "/estoque"; icon: React.ReactNode; title: string; detail: string }) {
  return <Link to={href} className="flex min-w-0 items-center gap-3 p-4 transition hover:bg-muted/60 sm:p-5"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-800">{icon}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{title}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{detail}</span></span></Link>;
}

function EmptyChart() {
  return <div className="mt-5 grid h-[280px] place-items-center rounded-xl bg-muted/40 px-6 text-center"><div><Sprout className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">Ainda não há partos registrados</p><p className="mt-1 text-xs text-muted-foreground">Assim que os dados forem cadastrados, a evolução aparecerá aqui.</p></div></div>;
}

function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); }
function PStat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border bg-background/60 p-3"><p className="text-[11px] font-semibold text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p></div>;
}
