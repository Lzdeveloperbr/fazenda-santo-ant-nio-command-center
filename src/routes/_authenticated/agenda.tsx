import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Plus, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgenda } from "@/components/farm/useAgenda";
import { fmtDate, healthProtocolsQuery, profilesQuery, tasksQuery, todayISO, type HealthProtocol } from "@/lib/farm";
import { addDays } from "@/lib/farm/gestation";
import { AGENDA_KIND_LABEL, type AgendaItem, type AgendaKind } from "@/lib/farm/agenda";
import { usePermissions } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [
    { title: "Agenda da granja | Fazenda Santo Antônio" },
    { name: "description", content: "Calendário diário, semanal e mensal com partos, coberturas, diagnósticos, vacinas, tratamentos, desmames, vencimentos e tarefas." },
  ] }),
  component: Agenda,
});

type View = "dia" | "semana" | "mes";
const KIND_TONE: Record<AgendaKind, string> = {
  cobertura: "bg-info/15 text-info", cio: "bg-info/15 text-info", diagnostico: "bg-info/15 text-info", transferencia: "bg-warn/15 text-warn",
  parto: "bg-primary/15 text-primary", desmame: "bg-primary/15 text-primary", vacina: "bg-accent text-accent-foreground", tratamento: "bg-accent text-accent-foreground",
  revisao: "bg-warn/15 text-warn", protocolo: "bg-accent text-accent-foreground", tarefa: "bg-muted text-foreground", conta: "bg-destructive/10 text-destructive", validade: "bg-destructive/10 text-destructive",
};
const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

function rangeFor(view: View, anchor: string): [string, string] {
  if (view === "dia") return [anchor, anchor];
  if (view === "semana") { const start = addDays(anchor, -dow(anchor)); return [start, addDays(start, 6)]; }
  const first = `${anchor.slice(0, 7)}-01`;
  const [y, m] = anchor.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return [first, last];
}

function Agenda() {
  const today = todayISO();
  const [view, setView] = useState<View>("semana");
  const [anchor, setAnchor] = useState(today);
  const [kinds, setKinds] = useState<Set<AgendaKind>>(new Set());
  const [from, to] = rangeFor(view, anchor);
  const { items, loading, error } = useAgenda(from, to, today);
  const shown = items.filter((i) => kinds.size === 0 || kinds.has(i.kind));
  const step = (dir: 1 | -1) => {
    if (view === "dia") setAnchor(addDays(anchor, dir));
    else if (view === "semana") setAnchor(addDays(anchor, 7 * dir));
    else { const [y, m] = anchor.split("-").map(Number) as [number, number]; setAnchor(new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 10)); }
  };
  const byDay = useMemo(() => { const m = new Map<string, AgendaItem[]>(); for (const i of shown) m.set(i.date, [...(m.get(i.date) ?? []), i]); return m; }, [shown]);
  const present = Array.from(new Set(items.map((i) => i.kind)));
  const title = view === "dia" ? fmtDate(anchor) : view === "semana" ? `${fmtDate(from)} a ${fmtDate(to)}` : new Date(`${anchor}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Gestão" title="Agenda da granja" action={<Link to="/tarefas"><Button variant="outline"><Plus className="mr-1 h-4 w-4" />Nova tarefa</Button></Link>} />
      <Tabs defaultValue="agenda">
        <TabsList><TabsTrigger value="agenda">Agenda</TabsTrigger><TabsTrigger value="protocolos">Protocolos sanitários</TabsTrigger></TabsList>
        <TabsContent value="agenda" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5">{(["dia", "semana", "mes"] as const).map((v) => <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-md px-3 py-1.5 text-sm ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}</button>)}</div>
            <Button variant="outline" size="icon" aria-label="Anterior" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setAnchor(today)}>Hoje</Button>
            <Button variant="outline" size="icon" aria-label="Próximo" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
            <span className="ml-1 text-sm font-semibold capitalize">{title}</span>
          </div>
          {present.length > 1 && <div className="flex flex-wrap gap-1.5">{present.map((k) => <button key={k} type="button" aria-pressed={kinds.has(k)} onClick={() => setKinds((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })} className={`rounded-full border px-2.5 py-1 text-xs ${kinds.has(k) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{AGENDA_KIND_LABEL[k]}</button>)}</div>}
          <p className="text-xs text-muted-foreground">Itens marcados como <b>previsão</b> são calculados pelos parâmetros da granja (Gestação › Configurações) e não substituem a observação. Diagnóstico, transferência e desmame só aparecem se o prazo estiver configurado.</p>
          {error ? <Empty>Não foi possível carregar a agenda: {error.message}</Empty> : loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : view === "mes" ? <MonthGrid from={from} to={to} today={today} byDay={byDay} onPick={(d) => { setAnchor(d); setView("dia"); }} /> : (
            shown.length === 0 ? <Empty>Nada na agenda neste período.</Empty> : <div className="space-y-4">{Array.from(byDay.entries()).map(([d, list]) => <DayBlock key={d} date={d} today={today} items={list} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="protocolos"><Protocols /></TabsContent>
      </Tabs>
    </div>
  );
}

function MonthGrid({ from, to, today, byDay, onPick }: { from: string; to: string; today: string; byDay: Map<string, AgendaItem[]>; onPick: (d: string) => void }) {
  const cells: (string | null)[] = Array.from({ length: dow(from) }, () => null);
  for (let d = from; d <= to; d = addDays(d, 1)) cells.push(d);
  return (
    <div className="panel p-2">
      <div className="grid grid-cols-7 gap-1 text-center text-[.68rem] font-semibold text-muted-foreground">{WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">{cells.map((d, i) => {
        if (!d) return <div key={`e${i}`} />;
        const list = byDay.get(d) ?? [];
        const open = list.filter((x) => !x.done).length;
        return <button key={d} type="button" onClick={() => onPick(d)} className={`min-h-[72px] rounded-lg border p-1.5 text-left text-xs transition hover:bg-muted ${d === today ? "border-primary" : "border-border/60"}`}>
          <span className={`font-mono ${d === today ? "font-bold text-primary" : ""}`}>{Number(d.slice(8))}</span>
          {list.length > 0 && <span className="mt-1 block space-y-0.5">{list.slice(0, 2).map((x) => <span key={x.id} className={`block truncate rounded px-1 ${KIND_TONE[x.kind]} ${x.done ? "opacity-50" : ""}`}>{x.title}</span>)}{list.length > 2 && <span className="block text-muted-foreground">+{list.length - 2}</span>}</span>}
          {open > 0 && <span className="sr-only">{open} pendente(s)</span>}
        </button>;
      })}</div>
    </div>
  );
}

function DayBlock({ date, today, items }: { date: string; today: string; items: AgendaItem[] }) {
  return (
    <section>
      <p className={`mb-2 text-sm font-semibold ${date === today ? "text-primary" : date < today ? "text-muted-foreground" : ""}`}>{WEEK[dow(date)]}, {fmtDate(date)}{date === today && " · hoje"}</p>
      <ul className="space-y-1.5">{items.map((i) => <AgendaRow key={i.id} item={i} today={today} />)}</ul>
    </section>
  );
}

function AgendaRow({ item, today }: { item: AgendaItem; today: string }) {
  const qc = useQueryClient(); const perms = usePermissions();
  const tasks = useQuery(tasksQuery); const profiles = useQuery(profilesQuery);
  const task = item.taskId ? tasks.data?.find((t) => t.id === item.taskId) : undefined;
  const who = task?.completed_by ? profiles.data?.find((p) => p.id === task.completed_by)?.display_name : undefined;
  const late = !item.done && item.date < today && !item.estimated;
  async function toggle() {
    if (!item.taskId) return;
    const { error } = await supabase.from("tasks").update({ status: item.done ? "pendente" : "concluida" }).eq("id", item.taskId);
    if (error) { toast.error(error.message); return; }
    toast.success(item.done ? "Tarefa reaberta." : "Tarefa concluída e registrada com seu usuário.");
    await qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  return (
    <li className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${late ? "border-destructive/40 bg-destructive/5" : "border-border/70 bg-card"} ${item.done ? "opacity-70" : ""}`}>
      {item.taskId && perms?.canWrite ? (
        <button type="button" onClick={toggle} aria-label={item.done ? "Reabrir tarefa" : "Concluir tarefa"} className="mt-0.5 text-primary">{item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button>
      ) : item.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-muted-foreground" /> : <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-primary/60" />}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2"><span className={`rounded px-1.5 py-0.5 text-[.68rem] font-semibold ${KIND_TONE[item.kind]}`}>{AGENDA_KIND_LABEL[item.kind]}</span>{item.estimated && <span className="rounded border border-dashed px-1.5 py-0.5 text-[.65rem] text-muted-foreground">previsão</span>}{late && <span className="text-[.68rem] font-bold text-destructive">atrasado</span>}<span className={`font-semibold ${item.done ? "line-through" : ""}`}>{item.title}</span></p>
        {item.detail && <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>}
        {task?.status === "concluida" && <p className="mt-0.5 text-xs text-muted-foreground">Concluída{who ? ` por ${who}` : ""}{task.completed_at ? ` em ${new Date(task.completed_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>}
      </div>
      {item.sowId ? <Link to="/matrizes/$sowId" params={{ sowId: item.sowId }} className="shrink-0 text-xs font-semibold text-primary underline">Ficha</Link> : <Link to={item.href} className="shrink-0 text-xs font-semibold text-primary underline">Abrir</Link>}
    </li>
  );
}

const KIND_P: Record<string, string> = { vacina: "Vacinação", vermifugacao: "Vermifugação", ferro: "Ferro", medicacao: "Medicação preventiva", manejo: "Manejo", outro: "Outro" };
const TARGET_P: Record<string, string> = { matriz: "Matrizes", leitegada: "Leitegadas", reprodutor: "Reprodutores", lote: "Lotes" };
const ANCHOR_P: Record<string, string> = { cobertura: "cobertura", parto: "parto (previsto ou realizado)", nascimento: "nascimento da leitegada", desmame: "desmame", entrada_lote: "entrada do lote" };

function Protocols() {
  const protocols = useQuery({ ...healthProtocolsQuery, retry: false });
  const perms = usePermissions();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">Protocolos da granja (vacinação, vermifugação, ferro…). O sistema <b>não traz nenhum protocolo, produto ou dose pronto</b>: tudo é escrito e validado pelo médico-veterinário responsável. Só protocolos validados geram lembretes na agenda, e qualquer alteração de conteúdo exige nova validação.</p>
        {perms?.canManageHealth && <ProtocolDialog />}
      </div>
      {protocols.isError ? <Empty>Protocolos indisponíveis: aplique a migration 0019 no banco.</Empty> : (protocols.data ?? []).length === 0 ? <Empty>Nenhum protocolo cadastrado.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">{(protocols.data ?? []).map((p) => (
          <div key={p.id} className={`panel p-4 text-sm ${p.active ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{KIND_P[p.kind]} · {TARGET_P[p.target]} · {p.offset_days >= 0 ? `${p.offset_days} dia(s) após` : `${-p.offset_days} dia(s) antes`} {ANCHOR_P[p.anchor]}{p.repeat_every_days ? ` · repete a cada ${p.repeat_every_days} dias` : ""}</p></div>
              {p.validated_at ? <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[.68rem] font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" />Validado</span> : <span className="flex items-center gap-1 rounded-full bg-warn/15 px-2 py-1 text-[.68rem] font-semibold text-warn"><ShieldAlert className="h-3.5 w-3.5" />Aguardando validação</span>}
            </div>
            {(p.product || p.dose_instructions) && <p className="mt-2 text-xs"><b>Produto:</b> {p.product ?? "—"} · <b>Dose/uso:</b> {p.dose_instructions ?? "—"}</p>}
            {p.validated_at && <p className="mt-1 text-xs text-muted-foreground">Validado por {p.validated_by_name} em {fmtDate(p.validated_at)}</p>}
            {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
            {perms?.canManageHealth && <div className="mt-3"><ProtocolDialog protocol={p} /></div>}
          </div>
        ))}</div>
      )}
    </div>
  );
}

function ProtocolDialog({ protocol }: { protocol?: HealthProtocol }) {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  const d = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return <FormDialog title={protocol ? `Protocolo · ${protocol.name}` : "Novo protocolo sanitário"} trigger={protocol ? <Button size="sm" variant="outline">Editar / validar</Button> : <Button><Plus className="mr-1 h-4 w-4" />Novo protocolo</Button>}>{(close) => <form className="space-y-3" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const txt = (k: string) => { const v = String(f.get(k) ?? "").trim(); return v === "" ? null : v; };
    const offset = Number(f.get("offset")); const repeat = txt("repeat");
    if (!Number.isInteger(offset)) { toast.error("Informe os dias em número inteiro."); return; }
    const validate = f.get("validate") === "on";
    const validator = txt("validator");
    if (validate && (!validator || validator.length < 3)) { toast.error("Informe o nome e registro de quem validou."); return; }
    const payload = { name: String(f.get("name")).trim(), kind: String(f.get("kind")), target: String(f.get("target")), anchor: String(f.get("anchor")), offset_days: offset, repeat_every_days: repeat ? Number(repeat) : null, product: txt("product"), dose_instructions: txt("dose"), notes: txt("notes"), active: f.get("active") !== "off", ...(validate ? { validated_by_name: validator, validated_at: todayISO() } : {}) };
    setBusy(true);
    const { error } = protocol ? await supabase.from("health_protocols").update(payload).eq("id", protocol.id) : await supabase.from("health_protocols").insert(payload);
    setBusy(false); if (error) { toast.error(error.message); return; }
    toast.success(validate ? "Protocolo salvo e validado." : "Protocolo salvo. Ele só gera lembretes depois de validado."); await qc.invalidateQueries({ queryKey: ["health_protocols"] }); close();
  }}>
    <Field label="Nome *"><Input name="name" required minLength={3} defaultValue={d(protocol?.name)} className="h-11" /></Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Tipo"><select name="kind" className={selectCls} defaultValue={protocol?.kind ?? "vacina"}>{Object.entries(KIND_P).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Para"><select name="target" className={selectCls} defaultValue={protocol?.target ?? "matriz"}>{Object.entries(TARGET_P).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Contado a partir de"><select name="anchor" className={selectCls} defaultValue={protocol?.anchor ?? "parto"}>{Object.entries(ANCHOR_P).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Dias (negativo = antes)"><Input name="offset" type="number" required defaultValue={d(protocol?.offset_days)} className="h-11" /></Field>
      <Field label="Repetir a cada (dias, opcional)"><Input name="repeat" type="number" min={1} defaultValue={d(protocol?.repeat_every_days)} className="h-11" /></Field>
      <Field label="Situação"><select name="active" className={selectCls} defaultValue={protocol?.active === false ? "off" : "on"}><option value="on">Ativo</option><option value="off">Inativo</option></select></Field>
    </div>
    <Field label="Produto (definido pelo veterinário)"><Input name="product" defaultValue={d(protocol?.product)} className="h-11" /></Field>
    <Field label="Dose, via e observações de uso (conforme bula e prescrição)"><Textarea name="dose" rows={2} defaultValue={d(protocol?.dose_instructions)} /></Field>
    <Field label="Observações"><Textarea name="notes" rows={2} defaultValue={d(protocol?.notes)} /></Field>
    <div className="space-y-2 rounded-xl border border-border/70 p-3">
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="validate" className="h-4 w-4" />Validar agora (responsável técnico)</label>
      <Field label="Nome e registro profissional de quem validou"><Input name="validator" placeholder="Ex.: Nome — CRMV-UF 0000" defaultValue={d(protocol?.validated_by_name)} className="h-11" /></Field>
    </div>
    <SubmitRow busy={busy} />
  </form>}</FormDialog>;
}
