import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardList, History, Stethoscope, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { litterAlerts, daysSince, type LitterAlert } from "@/lib/farm/litter-alerts";
import { supabase } from "@/integrations/supabase/client";
import { sowsQuery, littersQuery, litterEventsQuery, pensQuery, pigletsQuery, livePiglets, fmtDate, todayISO, LITTER_EVENT_LABEL, type Litter, type LitterEvent } from "@/lib/farm";
import { litterEventError } from "@/lib/farm/reproduction";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field, selectCls } from "@/components/farm/FormDialog";
import { MORTALITY_CAUSES, weaningSexError } from "@/lib/farm/maternity";
import { OUTCOME_MESSAGE, useOfflineSave } from "@/components/farm/OfflineSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/maternidade")({
  head: () => ({
    meta: [
      { title: "Maternidade e leitões | Fazenda Santo Antônio" },
      { name: "description", content: "Partos, leitões, adoções, mortalidade, pesagens, histórico e desmame." },
      { property: "og:title", content: "Maternidade e leitões | Fazenda Santo Antônio" },
      { property: "og:description", content: "Controle completo das leitegadas e dos eventos da maternidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Maternidade,
});

const ACTIONS = [
  { type: "morte", label: "Morte", qty: true, value: false, confirm: true },
  { type: "transferencia_saida", label: "Transferir saída", qty: true, value: false, confirm: true },
  { type: "transferencia_entrada", label: "Adoção / entrada", qty: true, value: false, confirm: true },
  { type: "pesagem", label: "Pesagem média", qty: false, value: true, confirm: false },
  { type: "observacao", label: "Observação", qty: false, value: false, confirm: false },
  { type: "desmame", label: "Desmame", qty: true, value: false, confirm: true },
] as const;

function Maternidade() {
  const qc = useQueryClient();
  const sows = useQuery(sowsQuery);
  const litters = useQuery(littersQuery);
  const events = useQuery(litterEventsQuery);
  const active = (litters.data ?? []).filter((l) => l.status === "maternidade");
  const recentWeaned = (litters.data ?? []).filter((l) => l.status === "desmamada").sort((a, b) => (b.weaning_date ?? "").localeCompare(a.weaning_date ?? "")).slice(0, 6);
  const tag = (id: string) => sows.data?.find((s) => s.id === id)?.ear_tag ?? "?";
  const total = active.reduce((a, l) => a + livePiglets(l), 0);
  const refresh = () => qc.invalidateQueries();
  const ageGroups = useMemo(() => {
    const groups = [{ faixa: "0–7 dias", total: 0 }, { faixa: "8–14 dias", total: 0 }, { faixa: "15–21 dias", total: 0 }, { faixa: "22+ dias", total: 0 }];
    for (const l of active) {
      const age = Math.max(0, Math.floor((Date.now() - new Date(l.farrowing_date + "T12:00:00").getTime()) / 86400000));
      const index = age <= 7 ? 0 : age <= 14 ? 1 : age <= 21 ? 2 : 3;
      groups[index]!.total += livePiglets(l);
    }
    return groups;
  }, [active]);

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Central da maternidade" title="Leitegadas ativas" action={<Link to="/farmacia-ai"><Button variant="outline" size="sm"><Stethoscope className="mr-2 h-4 w-4" />Tratamentos</Button></Link>} />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Leitegadas" v={active.length} />
        <Stat label="Leitões vivos" v={total} tone="text-ok-glow" />
        <Stat label="Mortes registradas" v={active.reduce((a, l) => a + l.deaths, 0)} tone="text-destructive" />
      </div>

      {!litters.isLoading && active.length > 0 && <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel p-4 sm:p-5 lg:col-span-2">
          <SectionTitle kicker="Distribuição etária" title="Leitões por idade" />
          <p className="mb-2 text-xs text-muted-foreground">Quantidade de leitões vivos por faixa de dias desde o parto.</p>
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={ageGroups} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="4 5" /><XAxis dataKey="faixa" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} /><Bar dataKey="total" name="Leitões vivos" fill="var(--ok)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </section>
        <section className="panel overflow-hidden lg:col-span-3">
          <div className="flex items-center gap-2 border-b border-border px-4 py-4"><ClipboardList className="h-4 w-4 text-muted-foreground" /><div><h2 className="text-sm font-semibold">Resumo das leitegadas</h2><p className="text-xs text-muted-foreground">Conferência rápida da maternidade</p></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[570px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Matriz</th><th className="px-3 py-3 font-medium">Parto</th><th className="px-3 py-3 font-medium">Dias</th><th className="px-3 py-3 font-medium">Nascidos vivos</th><th className="px-3 py-3 font-medium">Mortes</th><th className="px-3 py-3 font-medium">Vivos agora</th></tr></thead><tbody className="divide-y divide-border">{active.map((l) => { const days = Math.max(0, Math.floor((Date.now() - new Date(l.farrowing_date + "T12:00:00").getTime()) / 86400000)); return <tr key={l.id}><td className="px-4 py-3 font-mono font-semibold">{tag(l.sow_id)}</td><td className="px-3 py-3 font-mono text-xs">{fmtDate(l.farrowing_date)}</td><td className="px-3 py-3 font-mono">{days}</td><td className="px-3 py-3 font-mono">{l.born_alive}</td><td className="px-3 py-3 font-mono">{l.deaths}</td><td className="px-3 py-3 font-mono font-semibold">{livePiglets(l)}</td></tr>; })}</tbody></table></div>
        </section>
      </div>}

      {!litters.isLoading && active.length > 0 && <Diagnosis active={active} tag={tag} />}

      {litters.isLoading ? <p className="label-tech animate-pulse-soft">Carregando…</p> : active.length === 0 ? (
        <Empty>Nenhuma leitegada na maternidade. Registre um parto em <Link to="/matrizes" className="text-info underline">Matrizes</Link>.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map((l, i) => <LitterCard key={l.id} l={l} tag={tag(l.sow_id)} others={active.filter((o) => o.id !== l.id).map((o) => ({ id: o.id, label: tag(o.sow_id) }))} events={(events.data ?? []).filter((event) => event.litter_id === l.id)} delay={i * 40} onDone={refresh} />)}</div>
      )}

      {recentWeaned.length > 0 && <section><p className="label-tech mb-3">Desmamadas recentemente</p><div className="panel divide-y">{recentWeaned.map((l) => <div key={l.id} className="flex justify-between gap-3 px-4 py-3 text-sm"><span className="font-mono">{tag(l.sow_id)}</span><span className="text-right text-muted-foreground">{l.weaned ?? 0} desmamados · {fmtDate(l.weaning_date)}</span></div>)}</div></section>}
    </div>
  );
}

function Stat({ label, v, tone = "" }: { label: string; v: number; tone?: string }) {
  return <div className="panel p-3"><p className="label-tech !text-[0.6rem]">{label}</p><p className={`mt-1 font-mono text-2xl ${tone}`}>{v}</p></div>;
}

function LitterCard({ l, tag, others, events, delay, onDone }: { l: Litter; tag: string; others: { id: string; label: string }[]; events: LitterEvent[]; delay: number; onDone: () => void }) {
  const live = livePiglets(l);
  const days = Math.floor((Date.now() - new Date(l.farrowing_date + "T12:00:00").getTime()) / 86400000);
  return (
    <div className="panel animate-rise p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between"><div><p className="label-tech">Matriz</p><p className="font-mono text-xl">{tag}</p></div><div className="text-right"><p className="font-mono text-3xl text-ok-glow">{live}</p><p className="text-xs text-muted-foreground">leitões vivos</p></div></div>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`${live} leitões`}>{Array.from({ length: live }).map((_, i) => <span key={i} className="h-3 w-3 rounded-full bg-ok/80" />)}{Array.from({ length: l.deaths }).map((_, i) => <span key={"d" + i} className="h-3 w-3 rounded-full border border-destructive/60" />)}</div>
      <dl className="mt-3 grid grid-cols-4 gap-2 border-t pt-3 font-mono text-xs"><div><dt className="text-muted-foreground">Vivos</dt><dd>{l.born_alive}</dd></div><div><dt className="text-muted-foreground">Mortes</dt><dd>{l.deaths}</dd></div><div><dt className="text-muted-foreground">Transf.</dt><dd>{l.transfers_in - l.transfers_out >= 0 ? "+" : ""}{l.transfers_in - l.transfers_out}</dd></div><div><dt className="text-muted-foreground">Peso</dt><dd>{l.avg_weight ? `${l.avg_weight}kg` : "—"}</dd></div></dl>
      <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">Parto {fmtDate(l.farrowing_date)} · {days} dias</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{litterAlerts(l, live).map((al) => <span key={al.id} className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${LEVEL[al.level].chip}`}>{al.title}</span>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">{ACTIONS.map((a) => <EventAction key={a.type} a={a} l={l} tag={tag} live={live} onDone={onDone} />)}<AdoptionAction l={l} tag={tag} live={live} others={others} onDone={onDone} /><LitterHistory tag={tag} events={events} /><ArchiveLitter l={l} tag={tag} onDone={onDone} /></div>
    </div>
  );
}

function LitterHistory({ tag, events }: { tag: string; events: LitterEvent[] }) {
  return <FormDialog title={`Histórico da leitegada · ${tag}`} trigger={<Button size="sm" variant="outline" className="h-10"><History className="mr-2 h-4 w-4" />Histórico</Button>}>{() => events.length === 0 ? <Empty>Nenhum evento lançado nesta leitegada.</Empty> : <ul className="divide-y">{events.map((event) => <li key={event.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{LITTER_EVENT_LABEL[event.event_type] ?? event.event_type}</strong><span className="font-mono text-xs text-muted-foreground">{fmtDate(event.event_date)}</span></div><p className="mt-1 text-sm">{event.quantity > 0 ? `${event.quantity} leitão(ões)` : ""}{event.value ? ` · ${event.value} kg` : ""}</p>{event.note && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{event.note}</p>}</li>)}</ul>}</FormDialog>;
}

function ArchiveLitter({ l, tag, onDone }: { l: Litter; tag: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title={`Arquivar cadastro · ${tag}`} trigger={<Button size="sm" variant="outline" className="col-span-2 h-10">Arquivar cadastro incorreto</Button>}>
      {(close) => <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const reason = String(new FormData(e.currentTarget).get("reason") || "").trim();
        if (reason.length < 8) { toast.error("Descreva o motivo do arquivamento."); return; }
        if (!confirm(`Arquivar o cadastro da matriz ${tag}? A leitegada e todos os eventos serão preservados no histórico, mas sairão dos indicadores operacionais. Esta ação não altera a situação da matriz.`)) return;
        setBusy(true);
        const archiveNote = `[ARQUIVADO EM ${todayISO()}] Motivo: ${reason}`;
        const farrowingNotes = [l.farrowing_notes?.trim(), archiveNote].filter(Boolean).join("\n\n");
        const { error } = await supabase.from("litters").update({
          status: "cancelada",
          farrowing_notes: farrowingNotes,
        }).eq("id", l.id).eq("status", "maternidade").select("id").single();
        setBusy(false);
        if (error) { toast.error(friendlyError(error)); return; }
        toast.success("Cadastro arquivado. Dados e histórico preservados.");
        onDone();
        close();
      }}>
        <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">Use somente para cadastros incorretos ou duplicados. Nenhum dado ou evento será apagado. A situação da matriz não será alterada automaticamente.</p>
        <Field label="Motivo do arquivamento"><Textarea name="reason" rows={3} maxLength={500} required placeholder="Ex.: cadastro duplicado; parto correto registrado em outra ficha."/></Field>
        <SubmitRow busy={busy} label="Arquivar sem excluir"/>
      </form>}
    </FormDialog>
  );
}

function EventAction({ a, l, tag, live, onDone }: { a: (typeof ACTIONS)[number]; l: Litter; tag: string; live: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const saveOffline = useOfflineSave();
  return (
    <FormDialog title={`${a.label} · ${tag}`} trigger={<Button size="sm" variant={a.type === "morte" ? "destructive" : "outline"} className="h-10">{a.label}</Button>}>
      {(close) => <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const qty = Number(f.get("qty") || 0);
        const value = a.value ? Number(f.get("value")) : null;
        const ruleError = litterEventError({ eventType: a.type, quantity: qty, live, value });
        if (ruleError) { toast.error(ruleError); return; }
        if (a.confirm && !confirm(`Confirmar ${a.label.toLowerCase()} de ${qty} leitão(ões) na matriz ${tag}?`)) return;
        const opt = (k: string) => { const v = String(f.get(k) ?? "").trim(); return v === "" ? null : v; };
        const num = (k: string) => { const v = opt(k); return v === null ? null : Number(v.replace(",", ".")); };
        const details = a.type === "morte"
          ? { cause: opt("cause"), weight_kg: num("weight_kg"), responsible: opt("responsible"), piglet_id: opt("piglet_id") }
          : a.type === "desmame"
            ? { males: num("males"), females: num("females"), weight_kg: num("weight_kg"), destination: opt("destination"), destination_pen_id: opt("destination_pen_id"), responsible: opt("responsible") }
            : a.qty ? { responsible: opt("responsible") } : {};
        if (a.type === "morte" && !details.cause) { toast.error("Informe o motivo observado."); return; }
        if (a.type === "desmame") { const sexErr = weaningSexError(qty, num("males"), num("females")); if (sexErr) { toast.error(sexErr); return; } }
        const row: Record<string, unknown> & { event_type: string; litter_id: string } = { litter_id: l.id, event_type: a.type, quantity: qty, value, note: String(f.get("note") || "") || null, event_date: String(f.get("date")), ...details };
        setBusy(true);
        if (a.type === "desmame") {
          // Desmame encerra a leitegada e muda a matriz: exige confirmação do servidor na hora.
          if (!navigator.onLine) { setBusy(false); toast.error("O desmame precisa de conexão com a internet para ser confirmado."); return; }
          const { error } = await supabase.from("litter_events").insert(row as never);
          if (!error) await supabase.from("sows").update({ status: "vazia" }).eq("id", l.sow_id);
          setBusy(false);
          if (error) { toast.error(friendlyError(error)); return; }
          toast.success("Desmame salvo no servidor."); onDone(); close(); return;
        }
        const outcome = await saveOffline("litter_events", row, `${a.label} · ${tag} · ${String(f.get("date")).split("-").reverse().join("/")}`);
        setBusy(false);
        if (outcome.state === "erro") { toast.error(friendlyError(outcome)); return; }
        if (outcome.state === "na_fila") toast.warning(OUTCOME_MESSAGE.na_fila); else toast.success(OUTCOME_MESSAGE.salvo);
        onDone(); close();
      }}>
        <Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} required className="h-11" /></Field>
        {a.qty && <Field label="Quantidade de leitões"><Input name="qty" type="number" min={1} step={1} inputMode="numeric" defaultValue={a.type === "desmame" ? live : undefined} required className="h-11" /></Field>}
        {a.type === "desmame" && <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">O desmame encerra a leitegada e precisa incluir todos os {live} leitões vivos registrados.</p>}
        {a.type === "morte" && <MortalityFields litterId={l.id} />}
        {a.type === "desmame" && <WeaningFields />}
        {a.qty && a.type !== "morte" && a.type !== "desmame" && <Field label="Responsável"><Input name="responsible" className="h-11" /></Field>}
        {a.value && <Field label="Peso médio (kg)"><Input name="value" type="number" step="0.01" min={0.01} inputMode="decimal" required className="h-11" /></Field>}
        <Field label="Observação"><Textarea name="note" rows={2} required={a.type === "observacao"} /></Field>
        <SubmitRow busy={busy} label="Confirmar" />
      </form>}
    </FormDialog>
  );
}

function MortalityFields({ litterId }: { litterId: string }) {
  const piglets = useQuery(pigletsQuery);
  const alive = (piglets.data ?? []).filter((p) => p.litter_id === litterId && (p.status ?? "ativo") === "ativo");
  return <>
    <Field label="Motivo observado *">
      <select name="cause" className={selectCls} required defaultValue=""><option value="" disabled>Selecione…</option>{MORTALITY_CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
    </Field>
    <p className="-mt-2 text-xs text-muted-foreground">É o que a equipe observou, não um diagnóstico. Suspeita de doença deve ser avaliada pelo veterinário.</p>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Peso (kg)"><Input name="weight_kg" inputMode="decimal" placeholder="Se pesado" className="h-11" /></Field>
      <Field label="Responsável"><Input name="responsible" className="h-11" /></Field>
    </div>
    {alive.length > 0 && <Field label="Leitão identificado (opcional)">
      <select name="piglet_id" className={selectCls} defaultValue=""><option value="">Não identificado</option>{alive.map((p) => <option key={p.id} value={p.id}>Nº {p.piglet_number} · marca {p.australian_number}</option>)}</select>
    </Field>}
  </>;
}

function WeaningFields() {
  const pens = useQuery(pensQuery);
  return <>
    <div className="grid grid-cols-3 gap-3">
      <Field label="Machos"><Input name="males" type="number" min={0} inputMode="numeric" className="h-11" /></Field>
      <Field label="Fêmeas"><Input name="females" type="number" min={0} inputMode="numeric" className="h-11" /></Field>
      <Field label="Peso médio (kg)"><Input name="weight_kg" inputMode="decimal" className="h-11" /></Field>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Destino"><select name="destination" className={selectCls} defaultValue=""><option value="">Não informado</option>{["Creche da granja", "Venda", "Outra granja", "Outro"].map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
      <Field label="Baia de destino"><select name="destination_pen_id" className={selectCls} defaultValue=""><option value="">Não informada</option>{(pens.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.sector}</option>)}</select></Field>
    </div>
    <Field label="Responsável"><Input name="responsible" className="h-11" /></Field>
  </>;
}

function AdoptionAction({ l, tag, live, others, onDone }: { l: Litter; tag: string; live: number; others: { id: string; label: string }[]; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  if (others.length === 0 || live <= 0) return null;
  return (
    <FormDialog title={`Adoção para outra matriz · ${tag}`} trigger={<Button size="sm" variant="outline" className="h-10">Adoção entre matrizes</Button>}>
      {(close) => <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const qty = Number(f.get("qty") || 0);
        if (!Number.isInteger(qty) || qty < 1 || qty > live) { toast.error(`Informe de 1 a ${live} leitões.`); return; }
        setBusy(true);
        const { error } = await supabase.rpc("transfer_piglets", { p_from: l.id, p_to: String(f.get("to")), p_quantity: qty, p_date: String(f.get("date")), p_reason: String(f.get("reason") || ""), p_responsible: String(f.get("responsible") || "") });
        setBusy(false);
        if (error) { toast.error(friendlyError(error)); return; }
        toast.success("Adoção registrada nas duas leitegadas."); onDone(); close();
      }}>
        <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">Registra a saída desta leitegada e a entrada na receptora numa única operação: se uma falhar, nenhuma é gravada.</p>
        <Field label="Matriz receptora *"><select name="to" className={selectCls} required defaultValue=""><option value="" disabled>Selecione…</option>{others.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Quantidade (máx. ${live})`}><Input name="qty" type="number" min={1} max={live} required className="h-11" /></Field>
          <Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} max={todayISO()} required className="h-11" /></Field>
        </div>
        <Field label="Motivo"><Input name="reason" placeholder="Ex.: equalização de leitegada" className="h-11" /></Field>
        <Field label="Responsável"><Input name="responsible" className="h-11" /></Field>
        <SubmitRow busy={busy} label="Registrar adoção" />
      </form>}
    </FormDialog>
  );
}

const LEVEL: Record<LitterAlert["level"], { label: string; chip: string; icon: typeof Info; text: string }> = {
  alerta: { label: "Alerta", chip: "border-destructive/30 bg-destructive/10 text-destructive", icon: AlertTriangle, text: "text-destructive" },
  atencao: { label: "Atenção", chip: "border-warn/40 bg-warn/10 text-warn", icon: AlertCircle, text: "text-warn" },
  info: { label: "Informação", chip: "border-info/30 bg-info/10 text-info", icon: Info, text: "text-info" },
  ok: { label: "Em dia", chip: "border-ok/30 bg-ok/10 text-ok", icon: CheckCircle2, text: "text-ok" },
};

function Diagnosis({ active, tag }: { active: Litter[]; tag: (id: string) => string }) {
  const ranked = useMemo(() => active.map((l) => ({ l, live: livePiglets(l), alerts: litterAlerts(l, livePiglets(l)) })).sort((a, b) => b.alerts.filter((x) => x.level === "alerta").length - a.alerts.filter((x) => x.level === "alerta").length || b.alerts.filter((x) => x.level === "atencao").length - a.alerts.filter((x) => x.level === "atencao").length), [active]);
  const [sel, setSel] = useState(ranked[0]?.l.id);
  const cur = ranked.find((r) => r.l.id === sel) ?? ranked[0];
  if (!cur) return null;
  const { l, live, alerts } = cur;
  const base = l.born_alive + l.transfers_in;
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3"><span className="rounded-lg bg-accent p-2 text-primary"><Stethoscope className="h-5 w-5" /></span><div><p className="label-tech">Diagnóstico da leitegada</p><h2 className="text-lg font-bold">Porca {tag(l.sow_id)} e leitegada</h2></div></div>
        <label className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Leitegada</span><select value={l.id} onChange={(e) => setSel(e.target.value)} className="h-10 rounded-lg border border-input bg-card px-3 font-mono text-sm">{ranked.map((r) => <option key={r.l.id} value={r.l.id}>{tag(r.l.sow_id)} · {r.alerts.filter((x) => x.level === "alerta" || x.level === "atencao").length} ponto(s)</option>)}</select></label>
      </div>
      <div className="grid gap-0">
        <div className="p-4 sm:p-5">
          <dl className="grid grid-cols-4 gap-2 rounded-xl bg-muted/50 p-3 text-center">
            <Mini k="Dias" v={daysSince(l.farrowing_date)} /><Mini k="Vivos" v={live} /><Mini k="Mortes" v={l.deaths} /><Mini k="Mortal." v={base > 0 ? `${Math.round((l.deaths / base) * 100)}%` : "—"} />
          </dl>
          <p className="label-tech mb-2 mt-5">Pontos indicados no desenho</p>
          <ol className="space-y-2">{alerts.map((al, i) => { const L = LEVEL[al.level]; return <li key={al.id} className={`flex gap-3 rounded-xl border p-3 ${L.chip.split(" ").slice(0, 2).join(" ")}`}><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card font-mono text-xs font-bold">{i + 1}</span><div className="min-w-0"><p className={`flex items-center gap-1.5 text-sm font-bold ${L.text}`}><L.icon className="h-4 w-4" />{al.title}</p><p className="mt-0.5 text-xs leading-5 text-foreground/80">{al.detail}</p></div></li>; })}</ol>
          <p className="mt-4 text-[0.7rem] leading-5 text-muted-foreground">Leitura automática dos números lançados nesta leitegada. Não é um diagnóstico veterinário.</p>
        </div>
      </div>
    </section>
  );
}
function Mini({ k, v }: { k: string; v: number | string }) { return <div><dt className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="font-mono text-lg font-bold">{v}</dd></div>; }
