import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileSearch, ShieldAlert } from "lucide-react";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";
import { sowsQuery, breedingsQuery, littersQuery, tasksQuery, inventoryQuery, todayISO, addDaysISO, fmtDate,  } from "@/lib/farm";
import { isActiveSowStatus } from "@/lib/farm/reproduction";

type Severity = "alta" | "media" | "informativa";
type AuditRoute = "/mutirao" | "/matrizes" | "/maternidade" | "/inteligencia" | "/tarefas";
type AuditItem = { id: string; title: string; detail: string; severity: Severity; href: AuditRoute; animal?: string };

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [
    { title: "Auditoria e qualidade dos dados | Fazenda Santo Antônio" },
    { name: "description", content: "Conferência de cadastros, histórico reprodutivo, leitegadas e tarefas antes do lançamento." },
    { property: "og:title", content: "Auditoria operacional | Fazenda Santo Antônio" },
    { property: "og:description", content: "Qualidade, consistência e confiabilidade dos registros da granja." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Auditoria,
});

function Auditoria() {
  const sowsQ = useQuery(sowsQuery);
  const breedingsQ = useQuery(breedingsQuery);
  const littersQ = useQuery(littersQuery);
  const tasksQ = useQuery(tasksQuery);
  const checksQ = useQuery(inventoryQuery);
  const [filter, setFilter] = useState<"todas" | Severity>("todas");
  const today = todayISO();
  const staleBefore = addDaysISO(today, -30);
  const loading = [sowsQ, breedingsQ, littersQ, tasksQ, checksQ].some((q) => q.isLoading);
  const failed = [sowsQ, breedingsQ, littersQ, tasksQ, checksQ].some((q) => q.isError);

  const audit = useMemo(() => {
    const sows = sowsQ.data ?? [];
    const breedings = breedingsQ.data ?? [];
    const litters = littersQ.data ?? [];
    const tasks = tasksQ.data ?? [];
    const checks = checksQ.data ?? [];
    const activeSows = sows.filter((s) => isActiveSowStatus(s.status));
    const latestCheck = new Map<string, (typeof checks)[number]>();
    const orderedChecks = [...checks].sort((a, b) => b.check_date.localeCompare(a.check_date) || b.created_at.localeCompare(a.created_at));
    for (const check of orderedChecks) if (check.sow_id && !latestCheck.has(check.sow_id)) latestCheck.set(check.sow_id, check);
    const latestBreeding = new Map<string, (typeof breedings)[number]>();
    for (const breeding of breedings) if (!latestBreeding.has(breeding.sow_id)) latestBreeding.set(breeding.sow_id, breeding);
    const latestBreedingIds = new Set(Array.from(latestBreeding.values(), (breeding) => breeding.id));
    const activeLitters = new Map<string, (typeof litters)[number]>();
    for (const litter of litters) if (litter.status === "maternidade" && !activeLitters.has(litter.sow_id)) activeLitters.set(litter.sow_id, litter);

    const animalItems: AuditItem[] = [];
    const breedingItems: AuditItem[] = [];
    const litterItems: AuditItem[] = [];
    const taskItems: AuditItem[] = [];

    for (const sow of activeSows) {
      const check = latestCheck.get(sow.id);
      const breeding = latestBreeding.get(sow.id);
      if (!check) {
        animalItems.push({ id: "check-missing-" + sow.id, title: "Matriz sem conferência física", detail: "Ainda não existe uma conferência registrada no Mutirão. Confira a situação real antes de atualizar o cadastro.", severity: "alta", href: "/mutirao", animal: sow.ear_tag });
      } else if (check.confidence !== "comprovada" || check.observed_status === "desconhecida") {
        animalItems.push({ id: "check-unconfirmed-" + sow.id, title: "Situação ainda não confirmada", detail: "Última conferência em " + fmtDate(check.check_date) + ". Confirme visualmente ou com documento/exame.", severity: "media", href: "/mutirao", animal: sow.ear_tag });
      } else if (check.check_date < staleBefore) {
        animalItems.push({ id: "check-stale-" + sow.id, title: "Conferência antiga", detail: "Última conferência comprovada em " + fmtDate(check.check_date) + ". Atualize se a situação mudou.", severity: "informativa", href: "/mutirao", animal: sow.ear_tag });
      }
      if (sow.status === "gestante" && (!breeding || breeding.pregnancy_check !== "positivo")) {
        animalItems.push({ id: "pregnancy-" + sow.id, title: "Gestação sem confirmação positiva no histórico", detail: "O cadastro está como gestante, mas a cobertura/diagnóstico mais recente não apresenta confirmação positiva. Revise o histórico; não alteramos o status automaticamente.", severity: "alta", href: "/matrizes", animal: sow.ear_tag });
      }
      if (sow.status === "coberta" && !breeding) {
        animalItems.push({ id: "service-" + sow.id, title: "Matriz coberta sem cobertura registrada", detail: "Registre a data e o reprodutor/sêmen, se essas informações forem conhecidas.", severity: "media", href: "/matrizes", animal: sow.ear_tag });
      }
      if (sow.status === "lactante" && !activeLitters.has(sow.id)) {
        animalItems.push({ id: "litter-" + sow.id, title: "Matriz lactante sem leitegada ativa", detail: "Confira se o parto/leitegada foi cadastrado ou se a situação da matriz precisa ser revisada.", severity: "alta", href: "/maternidade", animal: sow.ear_tag });
      }
    }

    for (const breeding of breedings) {
      if (!latestBreedingIds.has(breeding.id)) continue;
      const sow = sows.find((item) => item.id === breeding.sow_id);
      const hasFarrowing = litters.some((l) => l.sow_id === breeding.sow_id && l.farrowing_date >= breeding.breeding_date);
      if (breeding.pregnancy_check !== "negativo" && !hasFarrowing && breeding.expected_farrowing && breeding.expected_farrowing < today) {
        breedingItems.push({ id: "farrow-overdue-" + breeding.id, title: "Previsão de parto vencida sem parto lançado", detail: "Previsão " + fmtDate(breeding.expected_farrowing) + ". Confirme se houve parto, perda gestacional ou se a data foi cadastrada incorretamente.", severity: "alta", href: "/matrizes", animal: sow?.ear_tag });
      }
      if (!breeding.expected_farrowing && breeding.pregnancy_check !== "negativo") {
        breedingItems.push({ id: "farrow-date-" + breeding.id, title: "Cobertura sem previsão de parto", detail: "A data estimada não foi preenchida. Revise a data da cobertura e o diagnóstico antes de usar o calendário.", severity: "media", href: "/inteligencia", animal: sow?.ear_tag });
      }
    }

    for (const litter of litters) {
      const sow = sows.find((item) => item.id === litter.sow_id);
      if (litter.born_total < litter.born_alive || litter.born_total < litter.stillborn) {
        litterItems.push({ id: "litter-count-" + litter.id, title: "Contagem da leitegada precisa de revisão", detail: "Total nascido está abaixo de nascidos vivos ou natimortos. Confira a ficha do parto e corrija somente com informação confirmada.", severity: "alta", href: "/maternidade", animal: sow?.ear_tag });
      }
      if (litter.status === "desmamada" && (!litter.weaning_date || litter.weaned == null)) {
        litterItems.push({ id: "weaning-data-" + litter.id, title: "Desmame com dados incompletos", detail: "Falta data do desmame ou quantidade desmamada. Complete o registro para melhorar os indicadores.", severity: "media", href: "/maternidade", animal: sow?.ear_tag });
      }
    }

    for (const task of tasks) {
      if (task.status !== "concluida" && task.due_date && task.due_date < today) {
        taskItems.push({ id: "task-" + task.id, title: "Tarefa atrasada: " + task.title, detail: "Prazo " + fmtDate(task.due_date) + (task.sector ? " · " + task.sector : "") + ". Conclua ou atualize o prazo.", severity: task.priority === "alta" ? "alta" : "media", href: "/tarefas" });
      }
    }

    const all = [...animalItems, ...breedingItems, ...litterItems, ...taskItems];
    return {
      activeSows: activeSows.length,
      checked: activeSows.filter((s) => latestCheck.has(s.id)).length,
      confirmed: activeSows.filter((s) => latestCheck.get(s.id)?.confidence === "comprovada" && latestCheck.get(s.id)?.observed_status !== "desconhecida").length,
      animalItems, breedingItems, litterItems, taskItems, all,
      high: all.filter((x) => x.severity === "alta").length,
      medium: all.filter((x) => x.severity === "media").length,
      info: all.filter((x) => x.severity === "informativa").length,
    };
  }, [sowsQ.data, breedingsQ.data, littersQ.data, tasksQ.data, checksQ.data, today, staleBefore]);

  const visible = audit.all.filter((item) => filter === "todas" || item.severity === filter);
  function exportCsv() {
    const header = ["Prioridade", "Matriz", "Pendência", "Detalhe", "Módulo"];
    const rows = audit.all.map((item) => [item.severity, item.animal ?? "", item.title, item.detail, item.href]);
    const csv = [header, ...rows].map((row) => row.map((cell) => {
      const value = String(cell);
      const safe = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
      return '"' + safe.replace(/"/g, '""') + '"';
    }).join(";")).join("\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    anchor.download = "auditoria-fazenda-santo-antonio.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  if (loading) return <div className="panel p-8 text-center text-sm text-muted-foreground">Conferindo a consistência dos registros…</div>;

  return <div className="space-y-6">
    <SectionTitle kicker="Preparação para lançamento" title="Auditoria e qualidade dos dados" action={<Button variant="outline" onClick={exportCsv} disabled={!audit.all.length}><Download className="mr-2 h-4 w-4" />Exportar pendências</Button>} />
    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">Esta central aponta informações que merecem conferência antes de tomar decisões. Ela não altera matrizes, partos, diagnósticos ou tarefas automaticamente. Quando o histórico da granja é desconhecido, mantenha como não informado até confirmar.</p>
    {failed && <div className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">Uma ou mais consultas falharam. Os totais abaixo podem estar incompletos; atualize a página quando a conexão voltar.</div>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="Matrizes ativas" value={audit.activeSows} />
      <Metric label="Conferidas" value={audit.checked + "/" + audit.activeSows} />
      <Metric label="Comprovadas" value={audit.confirmed} />
      <Metric label="Pendências altas" value={audit.high} tone={audit.high ? "text-destructive" : "text-ok"} />
    </div>
    <div className="grid grid-cols-3 gap-3">
      <Metric label="Alta prioridade" value={audit.high} tone="text-destructive" />
      <Metric label="Revisar" value={audit.medium} tone="text-warn" />
      <Metric label="Informativas" value={audit.info} />
    </div>
    <section className="panel space-y-3 p-4 sm:p-5">
      <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /><h2 className="font-semibold">Conferência física do plantel</h2></div>
      <p className="text-xs text-muted-foreground">Use o Mutirão para comparar o que está no sistema com o que realmente está nas baias.</p>
      <div className="flex flex-wrap gap-2"><Link to="/mutirao"><Button size="sm">Abrir Mutirão de Organização</Button></Link><Link to="/matrizes"><Button size="sm" variant="outline">Ver matrizes</Button></Link></div>
    </section>
    <div className="flex flex-wrap items-center gap-2">
      {(["todas", "alta", "media", "informativa"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={"rounded-full border px-3 py-2 text-xs font-semibold " + (filter === value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{value === "todas" ? "Todas" : value === "alta" ? "Alta" : value === "media" ? "Revisar" : "Informativas"}</button>)}
      <span className="ml-auto text-xs text-muted-foreground">{visible.length} pendência(s)</span>
    </div>
    {visible.length === 0 ? <div className="panel p-6"><Empty><CheckCircle2 className="mr-2 inline h-5 w-5 text-ok" />Nenhuma pendência nesta seleção com os registros disponíveis.</Empty></div> : <div className="space-y-2">
      {visible.map((item) => <article key={item.id} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3"><span className={"mt-0.5 rounded-lg p-2 " + (item.severity === "alta" ? "bg-destructive/10 text-destructive" : item.severity === "media" ? "bg-warn/10 text-warn" : "bg-muted text-muted-foreground")}>{item.severity === "alta" ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span><div className="min-w-0"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.animal ? "Matriz " + item.animal + " · " : ""}{item.detail}</p></div></div>
        <Link to={item.href} className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline">Abrir módulo</Link>
      </article>)}
    </div>}
    <section className="rounded-xl border border-border/70 bg-muted/30 p-4">
      <div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Como interpretar a auditoria</h2></div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
        <li>“Sem conferência” significa que não há conferência física salva; não significa que a matriz esteja em situação errada.</li>
        <li>“Sem confirmação” indica que o dado precisa ser comprovado; não muda o status cadastrado.</li>
        <li>Previsões vencidas são alertas para revisar o registro, não prova de aborto ou parto ocorrido.</li>
        <li>Os alertas dependem dos dados já lançados e não substituem a conferência da equipe nem a orientação veterinária.</li>
      </ul>
    </section>
  </div>;
}

function Metric({ label, value, tone = "text-foreground" }: { label: string; value: number | string; tone?: string }) {
  return <div className="panel p-4"><p className="label-tech">{label}</p><p className={"mt-2 font-mono text-2xl font-bold tabular-nums " + tone}>{value}</p></div>;
}
