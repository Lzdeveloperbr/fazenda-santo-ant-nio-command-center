import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { boarsQuery, breedingsQuery, diagnosesQuery, gestationEventsQuery, littersQuery, sowsQuery, fmtDate, todayISO, isCountedLitter, type Breeding, type Sow } from "@/lib/farm";
import { addDays, cycleAlert, cycleDates, cycleStage, daysBetween, DEFAULT_CONFIG, farrowingWarning, PRIORITY_LABEL, PRIORITY_RANK, reproductiveIndicators, type GestationConfig } from "@/lib/farm/gestation";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/gestacao")({
  head: () => ({ meta: [
    { title: "Gestação e reprodução | Fazenda Santo Antônio" },
    { name: "description", content: "Coberturas, retorno ao cio, diagnósticos, partos previstos, calendário e indicadores reprodutivos." },
    { property: "og:title", content: "Gestação e reprodução | Fazenda Santo Antônio" },
    { property: "og:description", content: "Gestão reprodutiva completa das matrizes, da cobertura ao parto." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Gestacao,
});

const TYPE_LABEL: Record<string, string> = { monta_natural: "Monta natural", inseminacao: "Inseminação artificial", reinseminacao: "Reinseminação", complementar: "Cobertura complementar" };
const RESULT_LABEL: Record<string, string> = { positivo: "Positivo", negativo: "Negativo", inconclusivo: "Inconclusivo", nao_realizado: "Não realizado" };
const METHOD_LABEL: Record<string, string> = { ultrassom: "Ultrassonografia", veterinario: "Avaliação veterinária", retorno_cio: "Observação de retorno ao cio", outro: "Outro método" };
const OCC_LABEL: Record<string, string> = { aborto: "Aborto", suspeita_aborto: "Suspeita de aborto", perda_gestacional: "Perda gestacional", morte_matriz: "Morte da matriz", outra: "Outra ocorrência" };
const PREP_ITEMS = ["Baia de maternidade preparada", "Limpeza realizada", "Desinfecção realizada", "Equipamentos conferidos", "Água disponível", "Alimentação conferida", "Identificação da matriz conferida", "Responsável informado", "Observações registradas"];
const COMPLICATIONS = ["Parto normal", "Parto prolongado", "Assistência necessária", "Intervenção veterinária", "Retenção ou outra intercorrência"];
const PRIO_TONE: Record<string, string> = { urgente: "bg-destructive/15 text-destructive", importante: "bg-warn/15 text-warn", atencao: "bg-info/15 text-info", info: "bg-muted text-muted-foreground" };
const ACTIVE_SOW = ["vazia", "coberta", "gestante"];

function useConfig() {
  const [cfg, setCfg] = useState<GestationConfig>(DEFAULT_CONFIG);
  useEffect(() => { try { const s = localStorage.getItem("fsa-gestacao-cfg"); if (s) setCfg({ ...DEFAULT_CONFIG, ...JSON.parse(s) }); } catch { /* ignore */ } }, []);
  const save = (c: GestationConfig) => { setCfg(c); localStorage.setItem("fsa-gestacao-cfg", JSON.stringify(c)); };
  return [cfg, save] as const;
}
function csv(name: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [`Fazenda Santo Antônio — ${name}`, `Gerado em ${new Date().toLocaleString("pt-BR")}`, "", header.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" })); a.download = `${name.toLowerCase().replace(/\s+/g, "-")}-${todayISO()}.csv`; a.click();
}
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const num = (v: number | null, d = 1) => (v == null ? "—" : v.toFixed(d));

function Gestacao() {
  const qc = useQueryClient();
  const sows = useQuery(sowsQuery), breedings = useQuery(breedingsQuery), litters = useQuery(littersQuery), boars = useQuery(boarsQuery), diags = useQuery(diagnosesQuery), occs = useQuery(gestationEventsQuery);
  const [cfg, saveCfg] = useConfig();
  const [search, setSearch] = useState("");
  const today = todayISO();
  const refresh = () => ["breedings", "sows", "litters", "boars", "pregnancy_diagnoses", "gestation_events", "sow_events", "litter_events"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const S = sows.data ?? [], B = breedings.data ?? [], L = (litters.data ?? []).filter(isCountedLitter), BO = boars.data ?? [], D = diags.data ?? [], O = occs.data ?? [];
  const sowById = useMemo(() => new Map(S.map((s) => [s.id, s])), [S]);
  const boarName = (b: Breeding) => (b.boar_id ? BO.find((x) => x.id === b.boar_id)?.code : null) ?? b.boar ?? "—";
  const tag = (id: string) => sowById.get(id)?.ear_tag ?? "?";
  const q = search.trim().toLowerCase();
  const match = (b: Breeding) => !q || tag(b.sow_id).toLowerCase().includes(q) || (sowById.get(b.sow_id)?.name ?? "").toLowerCase().includes(q) || boarName(b).toLowerCase().includes(q) || fmtDate(b.breeding_date).includes(q) || fmtDate(cycleDates(b.breeding_date, cfg).farrowing).includes(q);
  const active = B.filter((b) => b.cycle_status === "ativo" && match(b));
  const alerts = active.map((b) => cycleAlert(b, today, cfg)).filter((a): a is NonNullable<typeof a> => !!a).sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.date.localeCompare(b.date));
  const loading = [sows, breedings, litters, boars, diags, occs].some((x) => x.isLoading);
  if (loading) return <div className="panel p-8 text-center text-sm text-muted-foreground">Carregando dados reprodutivos…</div>;

  const pregnant = active.filter((b) => b.pregnancy_check === "positivo");
  const awaitingDx = active.filter((b) => b.heat_check === "nao_apresentou" && b.pregnancy_check !== "positivo");
  const heatPending = active.filter((b) => b.heat_check === "pendente" && daysBetween(b.breeding_date, today) >= cfg.heatPrep);
  const near = active.filter((b) => daysBetween(b.breeding_date, today) >= cfg.attentionStart).sort((a, b) => a.breeding_date.localeCompare(b.breeding_date));
  const month = today.slice(0, 7);
  const farrowedMonth = L.filter((l) => l.farrowing_date.startsWith(month)).length;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[.66rem] font-bold uppercase tracking-[.16em] text-primary">Gestão reprodutiva</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Gestação e reprodução</h1><p className="mt-1 text-sm text-muted-foreground">Do registro da cobertura ao parto. Datas calculadas a partir da cobertura; 114 dias é referência de planejamento, não garantia.</p></div>
      <div className="flex flex-wrap gap-2"><NewBreeding sows={S} boars={BO} breedings={B} onDone={refresh} /><Farrowing cycles={B.filter((b) => b.cycle_status === "ativo")} tag={tag} onDone={refresh} /></div>
    </div>
    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar brinco, nome, reprodutor, data de cobertura ou de parto (dd/mm/aaaa)…" className="h-11" />

    <Tabs defaultValue="painel">
      <div className="-mx-4 overflow-x-auto px-4 pb-1"><TabsList className="h-auto w-max flex-nowrap">{[["painel","Painel"],["cio","Retorno ao cio"],["dx","Diagnóstico"],["gestantes","Gestantes"],["partos","Partos previstos"],["calendario","Calendário"],["vazias","Vazias e descartadas"],["ocorrencias","Perdas"],["historico","Histórico"],["reprodutores","Reprodutores"],["indicadores","Indicadores e relatórios"],["config","Configurações"]].map(([v, l]) => <TabsTrigger key={v} value={v!} className="py-2">{l}</TabsTrigger>)}</TabsList></div>

      <TabsContent value="painel" className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[["Matrizes no plantel", S.filter((s) => ACTIVE_SOW.includes(s.status) || s.status === "lactante").length], ["Gestantes confirmadas", pregnant.length], ["Aguardando diagnóstico", awaitingDx.length], ["Retorno ao cio pendente", heatPending.length], ["Partos próximos (≥ dia " + cfg.attentionStart + ")", near.length], ["Partos no mês", farrowedMonth]].map(([l, v]) => <div key={String(l)} className="panel p-4"><p className="text-xs font-semibold text-muted-foreground">{l}</p><p className="mt-2 text-3xl font-bold tabular-nums">{v}</p></div>)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel p-5"><SectionTitle kicker="Central de alertas" title={`${alerts.length} pendências ativas`} />{alerts.length ? <ul className="space-y-2">{alerts.slice(0, 12).map((a) => <AlertRow key={a.key} a={a} tag={tag(a.sowId)} />)}</ul> : <Empty>Nenhum alerta para hoje.</Empty>}</section>
          <section className="panel p-5"><SectionTitle kicker="Maternidade" title="Próximas do parto" />{near.length ? <CycleTable rows={near} tag={tag} boarName={boarName} today={today} cfg={cfg} /> : <Empty>Nenhuma matriz na janela de atenção.</Empty>}</section>
          <section className="panel p-5"><SectionTitle kicker="Registros" title="Últimas coberturas" />{B.length ? <ul className="divide-y divide-border text-sm">{B.slice(0, 6).map((b) => <li key={b.id} className="flex justify-between py-2"><Link to="/matrizes/$sowId" params={{ sowId: b.sow_id }} className="font-semibold hover:underline">{tag(b.sow_id)}</Link><span className="text-muted-foreground">{fmtDate(b.breeding_date)} · {TYPE_LABEL[b.breeding_type]} · {boarName(b)}</span></li>)}</ul> : <Empty>Nenhuma cobertura registrada.</Empty>}</section>
          <section className="panel p-5"><SectionTitle kicker="Registros" title="Últimos partos" />{L.length ? <ul className="divide-y divide-border text-sm">{L.slice(0, 6).map((l) => <li key={l.id} className="flex justify-between py-2"><span className="font-semibold">{tag(l.sow_id)}</span><span className="text-muted-foreground">{fmtDate(l.farrowing_date)} · {l.born_alive} vivos / {l.born_total} total</span></li>)}</ul> : <Empty>Nenhum parto registrado.</Empty>}</section>
        </div>
      </TabsContent>

      <TabsContent value="cio"><section className="panel p-5"><SectionTitle kicker={`Janela dia ${cfg.heatStart} a ${cfg.heatEnd}`} title="Retorno ao cio" />
        <p className="mb-4 text-sm text-muted-foreground">Ausência de cio não confirma gestação: a matriz passa para "possível gestante" e aguarda diagnóstico.</p>
        {active.filter((b) => b.heat_check === "pendente").length ? <div className="space-y-3">{active.filter((b) => b.heat_check === "pendente").sort((a, b) => a.breeding_date.localeCompare(b.breeding_date)).map((b) => <HeatCard key={b.id} b={b} tag={tag(b.sow_id)} boar={boarName(b)} today={today} cfg={cfg} onDone={refresh} />)}</div> : <Empty>Nenhuma matriz aguardando verificação de cio.</Empty>}
      </section></TabsContent>

      <TabsContent value="dx"><section className="panel p-5"><SectionTitle kicker="Confirmação" title="Diagnóstico de gestação" action={<Diagnosis cycles={B.filter((b) => b.cycle_status === "ativo")} tag={tag} onDone={refresh} />} />
        {awaitingDx.length > 0 && <div className="mb-5"><p className="mb-2 text-sm font-semibold">Aguardando diagnóstico</p><CycleTable rows={awaitingDx} tag={tag} boarName={boarName} today={today} cfg={cfg} /></div>}
        <p className="mb-2 text-sm font-semibold">Histórico de diagnósticos</p>
        {D.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Matriz</th><th className="p-2">Data</th><th className="p-2">Resultado</th><th className="p-2">Método</th><th className="p-2">Responsável</th><th className="p-2">Reavaliar</th><th className="p-2">Obs.</th></tr></thead><tbody>{D.map((d) => <tr key={d.id} className="border-t border-border"><td className="p-2 font-semibold">{tag(d.sow_id)}</td><td className="p-2">{fmtDate(d.diagnosis_date)}</td><td className="p-2">{RESULT_LABEL[d.result]}</td><td className="p-2">{METHOD_LABEL[d.method]}</td><td className="p-2">{d.responsible ?? "—"}</td><td className="p-2">{fmtDate(d.next_check_date)}</td><td className="p-2 text-muted-foreground">{d.notes}</td></tr>)}</tbody></table></div> : <Empty>Nenhum diagnóstico registrado.</Empty>}
      </section></TabsContent>

      <TabsContent value="gestantes"><Pregnant rows={active} tag={tag} boarName={boarName} today={today} cfg={cfg} sowById={sowById} /></TabsContent>

      <TabsContent value="partos"><Farrowings rows={active} tag={tag} today={today} cfg={cfg} onDone={refresh} /></TabsContent>

      <TabsContent value="calendario"><Calendar B={B.filter(match)} L={L} D={D} tag={tag} cfg={cfg} today={today} /></TabsContent>

      <TabsContent value="vazias"><Empties S={S} B={B} D={D} /></TabsContent>

      <TabsContent value="ocorrencias"><section className="panel p-5"><SectionTitle kicker="Sem atribuição automática de causa" title="Abortos e perdas gestacionais" action={<Occurrence cycles={B.filter((b) => b.cycle_status === "ativo")} sows={S} tag={tag} onDone={refresh} />} />
        {O.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Matriz</th><th className="p-2">Data</th><th className="p-2">Tipo</th><th className="p-2">Dia gest.</th><th className="p-2">Perdas</th><th className="p-2">Confirmada</th><th className="p-2">Causa possível</th><th className="p-2">Responsável</th></tr></thead><tbody>{O.map((o) => { const b = B.find((x) => x.id === o.breeding_id); return <tr key={o.id} className="border-t border-border"><td className="p-2 font-semibold">{tag(o.sow_id)}</td><td className="p-2">{fmtDate(o.event_date)}</td><td className="p-2">{OCC_LABEL[o.event_type]}</td><td className="p-2">{b ? daysBetween(b.breeding_date, o.event_date) : "—"}</td><td className="p-2">{o.loss_count ?? "—"}</td><td className="p-2">{o.confirmed ? "Sim" : "Não"}</td><td className="p-2">{o.possible_cause ?? "Não informada"}</td><td className="p-2">{o.responsible ?? "—"}</td></tr>; })}</tbody></table></div> : <Empty>Nenhuma ocorrência gestacional registrada.</Empty>}
      </section></TabsContent>

      <TabsContent value="historico"><History S={S} B={B} L={L} D={D} O={O} boarName={boarName} /></TabsContent>

      <TabsContent value="reprodutores"><Boars boars={BO} B={B} L={L} onDone={refresh} /></TabsContent>

      <TabsContent value="indicadores"><Indicators S={S} B={B} L={L} D={D} O={O} tag={tag} boarName={boarName} cfg={cfg} /></TabsContent>

      <TabsContent value="config"><section className="panel max-w-xl p-5"><SectionTitle kicker="Neste aparelho" title="Configurações reprodutivas" />
        <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const c = Object.fromEntries(Object.keys(DEFAULT_CONFIG).map((k) => [k, Number(f.get(k))])) as GestationConfig; if (!(c.heatPrep < c.heatStart && c.heatStart <= c.heatEnd && c.heatEnd < c.attentionStart && c.attentionStart <= c.approachDay && c.approachDay <= c.intensiveDay && c.intensiveDay <= c.gestationDays)) { toast.error("Os dias precisam estar em ordem crescente."); return; } saveCfg(c); toast.success("Configurações salvas"); }}>
          {([["heatPrep","Preparar observação de cio (dia)"],["heatStart","Início da janela de cio"],["heatEnd","Fim da janela de cio"],["attentionStart","Início da janela de atenção ao parto"],["approachDay","Alerta de proximidade"],["intensiveDay","Preparação intensificada"],["gestationDays","Duração de referência da gestação"]] as const).map(([k, l]) => <Field key={k} label={l}><Input name={k} type="number" min={1} max={130} defaultValue={cfg[k]} className="h-11" /></Field>)}
          <div className="col-span-2 flex gap-2"><Button type="submit" className="h-11 flex-1">Salvar</Button><Button type="button" variant="outline" className="h-11" onClick={() => { saveCfg(DEFAULT_CONFIG); toast.success("Padrão restaurado"); }}>Restaurar padrão</Button></div>
        </form>
      </section></TabsContent>
    </Tabs>
  </div>;
}

function AlertRow({ a, tag }: { a: NonNullable<ReturnType<typeof cycleAlert>>; tag: string }) {
  return <li className="flex items-start gap-3 rounded-lg border border-border p-3"><span className={`shrink-0 rounded px-2 py-0.5 text-[.7rem] font-bold ${PRIO_TONE[a.priority]}`}>{PRIORITY_LABEL[a.priority]}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Matriz {tag} · {a.title}</p><p className="text-xs text-muted-foreground">{fmtDate(a.date)} · {a.action}</p></div><Link to="/matrizes/$sowId" params={{ sowId: a.sowId }} className="shrink-0 text-xs font-semibold text-primary hover:underline">Ficha</Link></li>;
}

function CycleTable({ rows, tag, boarName, today, cfg }: { rows: Breeding[]; tag: (id: string) => string; boarName: (b: Breeding) => string; today: string; cfg: GestationConfig }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Brinco</th><th className="p-2">Cobertura</th><th className="p-2">Reprodutor</th><th className="p-2">Dia</th><th className="p-2">Restam</th><th className="p-2">Parto previsto</th><th className="p-2">Situação</th></tr></thead><tbody>{rows.map((b) => { const day = daysBetween(b.breeding_date, today); return <tr key={b.id} className="border-t border-border"><td className="p-2"><Link to="/matrizes/$sowId" params={{ sowId: b.sow_id }} className="font-semibold hover:underline">{tag(b.sow_id)}</Link></td><td className="p-2">{fmtDate(b.breeding_date)}</td><td className="p-2">{boarName(b)}</td><td className="p-2 font-mono">{day}</td><td className="p-2 font-mono">{cfg.gestationDays - day}</td><td className="p-2">{fmtDate(cycleDates(b.breeding_date, cfg).farrowing)}</td><td className="p-2 text-xs">{cycleStage(b, today, cfg).label}</td></tr>; })}</tbody></table></div>;
}

function NewBreeding({ sows, boars, breedings, onDone }: { sows: Sow[]; boars: { id: string; code: string; name: string | null; status: string }[]; breedings: Breeding[]; onDone: () => void }) {
  const [busy, setBusy] = useState(false); const [sowId, setSowId] = useState(""); const [ack, setAck] = useState(false);
  const eligible = sows.filter((s) => ACTIVE_SOW.includes(s.status));
  const open = breedings.find((b) => b.sow_id === sowId && b.cycle_status === "ativo");
  return <FormDialog title="Nova cobertura" trigger={<Button className="h-11"><Plus className="mr-1 h-4 w-4" />Nova cobertura</Button>}>{(close) => <form className="space-y-3" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const date = String(f.get("date"));
    if (!sowId) return void toast.error("Selecione a matriz."); if (!date || date > todayISO()) return void toast.error("Informe uma data válida (não futura).");
    if (open && !ack) return void toast.error("Confirme que deseja registrar outra cobertura com ciclo ativo.");
    setBusy(true); const boarId = String(f.get("boar_id") || "") || null;
    const { error } = await supabase.from("breedings").insert({ sow_id: sowId, breeding_date: date, breeding_time: String(f.get("time") || "") || null, breeding_type: String(f.get("type")), boar_id: boarId, boar: String(f.get("boar") || "") || null, semen_code: String(f.get("semen") || "") || null, dose_number: String(f.get("dose") || "") || null, responsible: String(f.get("responsible") || "") || null, services_count: Number(f.get("services") || 1), notes: String(f.get("notes") || "") || null });
    if (!error) await supabase.from("sows").update({ status: "coberta" }).eq("id", sowId).in("status", ["vazia", "coberta"]);
    setBusy(false); if (error) return void toast.error(error.message); toast.success("Cobertura registrada e ciclo iniciado"); setSowId(""); setAck(false); onDone(); close();
  }}>
    <Field label="Matriz (brinco) *"><select className={selectCls} value={sowId} onChange={(e) => { setSowId(e.target.value); setAck(false); }} required><option value="">Selecione…</option>{eligible.map((s) => <option key={s.id} value={s.id}>{s.ear_tag}{s.name ? ` · ${s.name}` : ""}</option>)}</select></Field>
    {open && <label className="flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>Esta matriz já tem ciclo ativo (cobertura de {fmtDate(open.breeding_date)}). Confirmo que é repetição de serviço ou cobertura complementar.</span></label>}
    <div className="grid grid-cols-2 gap-3"><Field label="Data *"><Input name="date" type="date" defaultValue={todayISO()} max={todayISO()} required className="h-11" /></Field><Field label="Horário"><Input name="time" type="time" className="h-11" /></Field></div>
    <Field label="Tipo"><select name="type" className={selectCls}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
    <Field label="Reprodutor cadastrado"><select name="boar_id" className={selectCls}><option value="">—</option>{boars.filter((b) => b.status === "ativo").map((b) => <option key={b.id} value={b.id}>{b.code}{b.name ? ` · ${b.name}` : ""}</option>)}</select></Field>
    <Field label="Ou identificação livre do cachaço"><Input name="boar" className="h-11" /></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Código do sêmen"><Input name="semen" className="h-11" /></Field><Field label="Nº da dose"><Input name="dose" className="h-11" /></Field></div>
    <div className="grid grid-cols-2 gap-3"><Field label="Responsável"><Input name="responsible" className="h-11" /></Field><Field label="Serviços realizados"><Input name="services" type="number" min={1} defaultValue={1} className="h-11" /></Field></div>
    <Field label="Observações"><Input name="notes" className="h-11" /></Field>
    <SubmitRow busy={busy} label="Salvar cobertura" />
  </form>}</FormDialog>;
}

function HeatCard({ b, tag, boar, today, cfg, onDone }: { b: Breeding; tag: string; boar: string; today: string; cfg: GestationConfig; onDone: () => void }) {
  const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false);
  const day = daysBetween(b.breeding_date, today); const d = cycleDates(b.breeding_date, cfg); const a = cycleAlert(b, today, cfg);
  async function act(kind: "sim" | "nao" | "pendente") {
    setBusy(true); let error;
    if (kind === "sim") ({ error } = await supabase.from("sow_events").insert({ sow_id: b.sow_id, event_type: "retorno_cio", event_date: today, notes: `Retorno ao cio ${day} dias após cobertura. ${notes}`.trim() }));
    else if (kind === "nao") ({ error } = await supabase.from("breedings").update({ heat_check: "nao_apresentou", heat_check_date: today, heat_notes: notes || null }).eq("id", b.id));
    else ({ error } = await supabase.from("breedings").update({ heat_notes: notes || b.heat_notes }).eq("id", b.id));
    setBusy(false); if (error) return void toast.error(error.message);
    toast.success(kind === "sim" ? "Retorno ao cio registrado; ciclo encerrado e histórico preservado" : kind === "nao" ? "Marcada como possível gestante — diagnóstico pendente" : "Mantida pendente"); onDone();
  }
  return <div className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><Link to="/matrizes/$sowId" params={{ sowId: b.sow_id }} className="text-lg font-bold hover:underline">{tag}</Link><p className="text-xs text-muted-foreground">Cobertura {fmtDate(b.breeding_date)} · {boar} · resp. {b.responsible ?? "—"}</p></div><div className="text-right"><p className="font-mono text-2xl font-bold">Dia {day}</p><p className="text-xs text-muted-foreground">Observar {fmtDate(d.heatStart)} a {fmtDate(d.heatEnd)}</p></div></div>
    {a && <p className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-bold ${PRIO_TONE[a.priority]}`}>{a.title}</p>}
    {b.heat_notes && <p className="mt-2 text-xs text-muted-foreground">Anotações: {b.heat_notes}</p>}
    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sinais e comportamento observados (opcional)" className="mt-3 h-10" />
    <div className="mt-3 grid gap-2 sm:grid-cols-3"><Button disabled={busy} variant="destructive" onClick={() => act("sim")}>Apresentou cio</Button><Button disabled={busy || day < cfg.heatStart} onClick={() => act("nao")} title={day < cfg.heatStart ? "Disponível a partir da janela de observação" : ""}>Não apresentou cio</Button><Button disabled={busy} variant="outline" onClick={() => act("pendente")}>Ainda não verificado</Button></div>
  </div>;
}

function Diagnosis({ cycles, tag, onDone }: { cycles: Breeding[]; tag: (id: string) => string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return <FormDialog title="Registrar diagnóstico" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4" />Diagnóstico</Button>}>{(close) => <form className="space-y-3" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const b = cycles.find((c) => c.id === f.get("cycle")); if (!b) return void toast.error("Selecione o ciclo."); const date = String(f.get("date")); if (date < b.breeding_date) return void toast.error("Data anterior à cobertura.");
    setBusy(true); const { error } = await supabase.from("pregnancy_diagnoses").insert({ breeding_id: b.id, sow_id: b.sow_id, diagnosis_date: date, result: String(f.get("result")), method: String(f.get("method")), responsible: String(f.get("responsible") || "") || null, next_check_date: String(f.get("next") || "") || null, notes: String(f.get("notes") || "") || null });
    setBusy(false); if (error) return void toast.error(error.message); toast.success("Diagnóstico registrado"); onDone(); close();
  }}>
    <Field label="Matriz / ciclo ativo *"><select name="cycle" className={selectCls} required><option value="">Selecione…</option>{cycles.map((c) => <option key={c.id} value={c.id}>{tag(c.sow_id)} · cobertura {fmtDate(c.breeding_date)}</option>)}</select></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Data *"><Input name="date" type="date" defaultValue={todayISO()} max={todayISO()} required className="h-11" /></Field><Field label="Resultado"><select name="result" className={selectCls}>{Object.entries(RESULT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
    <Field label="Método"><select name="method" className={selectCls}>{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Responsável"><Input name="responsible" className="h-11" /></Field><Field label="Reavaliar em"><Input name="next" type="date" className="h-11" /></Field></div>
    <Field label="Observações"><Input name="notes" className="h-11" /></Field>
    <p className="text-xs text-muted-foreground">Positivo confirma a gestação. Negativo encerra o ciclo sem apagar a cobertura. Inconclusivo mantém pendente para reavaliação.</p>
    <SubmitRow busy={busy} />
  </form>}</FormDialog>;
}

function Farrowing({ cycles, tag, onDone, preset }: { cycles: Breeding[]; tag: (id: string) => string; onDone: () => void; preset?: string }) {
  const [busy, setBusy] = useState(false); const [n, setN] = useState({ total: 0, alive: 0, still: 0, mum: 0 }); const [ack, setAck] = useState(false);
  const warn = farrowingWarning(n.total, n.alive, n.still, n.mum);
  return <FormDialog title="Registrar parto" trigger={preset ? <Button size="sm">Registrar parto</Button> : <Button variant="outline" className="h-11">Registrar parto</Button>}>{(close) => <form className="space-y-3" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const b = cycles.find((c) => c.id === f.get("cycle")); if (!b) return void toast.error("Selecione o ciclo."); const date = String(f.get("date"));
    if (date < b.breeding_date || date > todayISO()) return void toast.error("Data de parto inválida.");
    if (warn && !ack) return void toast.error("Confirme e justifique a diferença nos números.");
    const deadAfter = Number(f.get("deadAfter") || 0); if (deadAfter > n.alive) return void toast.error("Mortos após nascimento não pode passar dos nascidos vivos.");
    setBusy(true); const notes = [String(f.get("notes") || ""), Number(f.get("followup") || 0) ? `Leitões encaminhados para acompanhamento: ${f.get("followup")}` : ""].filter(Boolean).join(" · ") || null;
    const { data, error } = await supabase.from("litters").insert({ sow_id: b.sow_id, breeding_id: b.id, farrowing_date: date, born_total: n.total, born_alive: n.alive, stillborn: n.still, mummified: n.mum, start_time: String(f.get("start") || "") || null, end_time: String(f.get("end") || "") || null, responsible: String(f.get("responsible") || "") || null, complications: f.getAll("comp").map(String), farrowing_notes: notes }).select("id").single();
    if (!error) { await supabase.from("sows").update({ status: "lactante" }).eq("id", b.sow_id); if (deadAfter > 0 && data) await supabase.from("litter_events").insert({ litter_id: data.id, event_type: "morte", quantity: deadAfter, event_date: date, note: "Morte após nascimento (registro do parto)" }); }
    setBusy(false); if (error) return void toast.error(error.message.includes("litters_breeding_unique") ? "Este ciclo já tem parto registrado." : error.message);
    toast.success(`Parto registrado · gestação de ${daysBetween(b.breeding_date, date)} dias. Leitegada enviada à Maternidade.`); onDone(); close();
  }}>
    <Field label="Matriz / ciclo *"><select name="cycle" defaultValue={preset} className={selectCls} required><option value="">Selecione…</option>{cycles.map((c) => <option key={c.id} value={c.id}>{tag(c.sow_id)} · cobertura {fmtDate(c.breeding_date)}</option>)}</select></Field>
    <div className="grid grid-cols-3 gap-3"><Field label="Data *"><Input name="date" type="date" defaultValue={todayISO()} max={todayISO()} required className="h-11" /></Field><Field label="Início"><Input name="start" type="time" className="h-11" /></Field><Field label="Término"><Input name="end" type="time" className="h-11" /></Field></div>
    <Field label="Responsável"><Input name="responsible" className="h-11" /></Field>
    <div className="grid grid-cols-2 gap-3">{([["total","Total nascidos"],["alive","Nascidos vivos"],["still","Natimortos"],["mum","Mumificados"]] as const).map(([k, l]) => <Field key={k} label={l}><Input type="number" min={0} value={n[k]} onChange={(e) => setN({ ...n, [k]: Number(e.target.value) })} className="h-11" /></Field>)}
      <Field label="Mortos após nascimento"><Input name="deadAfter" type="number" min={0} defaultValue={0} className="h-11" /></Field><Field label="Encaminhados p/ acompanhamento"><Input name="followup" type="number" min={0} defaultValue={0} className="h-11" /></Field></div>
    {warn && <label className="flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>{warn} Confirmo que é uma situação especial (justifique nas observações).</span></label>}
    <fieldset className="space-y-1"><legend className="text-sm">Intercorrências</legend>{COMPLICATIONS.map((c) => <label key={c} className="flex items-center gap-2 text-sm"><input type="checkbox" name="comp" value={c} />{c}</label>)}</fieldset>
    <Field label="Observações"><Input name="notes" className="h-11" /></Field>
    <SubmitRow busy={busy} label="Salvar parto" />
  </form>}</FormDialog>;
}

function Occurrence({ cycles, sows, tag, onDone }: { cycles: Breeding[]; sows: Sow[]; tag: (id: string) => string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return <FormDialog title="Registrar ocorrência gestacional" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4" />Ocorrência</Button>}>{(close) => <form className="space-y-3" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const b = cycles.find((c) => c.id === f.get("cycle")); const sowId = b?.sow_id ?? String(f.get("sow") || ""); if (!sowId) return void toast.error("Selecione o ciclo ou a matriz.");
    const type = String(f.get("type")); if (type === "morte_matriz" && !confirm("Registrar a morte da matriz? Esta ação encerra o ciclo e altera a situação para morta.")) return undefined;
    setBusy(true); const { error } = await supabase.from("gestation_events").insert({ breeding_id: b?.id ?? null, sow_id: sowId, event_date: String(f.get("date")), event_type: type, confirmed: f.get("confirmed") === "on", loss_count: f.get("count") ? Number(f.get("count")) : null, signs: String(f.get("signs") || "") || null, possible_cause: String(f.get("cause") || "") || null, vet_evaluation: String(f.get("vet") || "") || null, responsible: String(f.get("responsible") || "") || null, notes: String(f.get("notes") || "") || null });
    setBusy(false); if (error) return void toast.error(error.message); toast.success("Ocorrência registrada"); onDone(); close();
  }}>
    <Field label="Ciclo ativo"><select name="cycle" className={selectCls}><option value="">—</option>{cycles.map((c) => <option key={c.id} value={c.id}>{tag(c.sow_id)} · cobertura {fmtDate(c.breeding_date)}</option>)}</select></Field>
    <Field label="Ou matriz (sem ciclo)"><select name="sow" className={selectCls}><option value="">—</option>{sows.map((s) => <option key={s.id} value={s.id}>{s.ear_tag}</option>)}</select></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Data *"><Input name="date" type="date" defaultValue={todayISO()} max={todayISO()} required className="h-11" /></Field><Field label="Tipo"><select name="type" className={selectCls}>{Object.entries(OCC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmed" />Perda confirmada (encerra o ciclo, preservando o histórico)</label>
    <div className="grid grid-cols-2 gap-3"><Field label="Fetos/perdas (se conhecido)"><Input name="count" type="number" min={0} className="h-11" /></Field><Field label="Responsável"><Input name="responsible" className="h-11" /></Field></div>
    <Field label="Sinais observados"><Input name="signs" className="h-11" /></Field><Field label="Possível causa (se conhecida)"><Input name="cause" className="h-11" /></Field><Field label="Avaliação veterinária"><Input name="vet" className="h-11" /></Field><Field label="Observações"><Input name="notes" className="h-11" /></Field>
    <SubmitRow busy={busy} />
  </form>}</FormDialog>;
}

function Pregnant({ rows, tag, boarName, today, cfg, sowById }: { rows: Breeding[]; tag: (id: string) => string; boarName: (b: Breeding) => string; today: string; cfg: GestationConfig; sowById: Map<string, Sow> }) {
  const [stage, setStage] = useState(""); const [minDay, setMinDay] = useState(""); const [boar, setBoar] = useState("");
  const list = rows.filter((b) => (!stage || cycleStage(b, today, cfg).key === stage) && (!minDay || daysBetween(b.breeding_date, today) >= Number(minDay)) && (!boar || boarName(b) === boar)).sort((a, b) => a.breeding_date.localeCompare(b.breeding_date));
  return <section className="panel p-5"><SectionTitle kicker="Atualizado diariamente" title={`${list.length} matrizes em ciclo`} action={<Button variant="outline" size="sm" onClick={() => csv("Matrizes em gestação", ["Brinco", "Cobertura", "Reprodutor", "Dia", "Restam", "Parto previsto", "Situação"], list.map((b) => [tag(b.sow_id), fmtDate(b.breeding_date), boarName(b), daysBetween(b.breeding_date, today), cfg.gestationDays - daysBetween(b.breeding_date, today), fmtDate(cycleDates(b.breeding_date, cfg).farrowing), cycleStage(b, today, cfg).label]))}><Download className="mr-1 h-4 w-4" />CSV</Button>} />
    <div className="mb-4 grid gap-2 sm:grid-cols-3"><select className={selectCls} value={stage} onChange={(e) => setStage(e.target.value)}><option value="">Todas as situações</option>{[["aguardando_retorno","Aguardando janela de cio"],["janela_retorno","Em janela de cio"],["retorno_pendente","Cio pendente"],["possivel","Possível gestante"],["gestante","Gestante confirmada"],["proxima_parto","Próxima do parto"],["ultrapassada","Previsão ultrapassada"]].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><Input type="number" placeholder="Dias de gestação mínimos" value={minDay} onChange={(e) => setMinDay(e.target.value)} className="h-11" /><select className={selectCls} value={boar} onChange={(e) => setBoar(e.target.value)}><option value="">Todos os reprodutores</option>{[...new Set(rows.map(boarName))].map((x) => <option key={x}>{x}</option>)}</select></div>
    {list.length ? <><CycleTable rows={list} tag={tag} boarName={boarName} today={today} cfg={cfg} /><p className="mt-3 text-xs text-muted-foreground">{list.filter((b) => sowById.get(b.sow_id)?.status === "gestante").length} com gestação confirmada por diagnóstico.</p></> : <Empty>Nenhuma matriz nesse filtro.</Empty>}
  </section>;
}

function Farrowings({ rows, tag, today, cfg, onDone }: { rows: Breeding[]; tag: (id: string) => string; today: string; cfg: GestationConfig; onDone: () => void }) {
  const items = rows.map((b) => ({ b, due: cycleDates(b.breeding_date, cfg).farrowing, left: cfg.gestationDays - daysBetween(b.breeding_date, today), day: daysBetween(b.breeding_date, today) })).sort((a, b) => a.due.localeCompare(b.due));
  const groups: [string, typeof items][] = [["Previsão ultrapassada", items.filter((i) => i.left < 0)], ["Hoje", items.filter((i) => i.left === 0)], ["Na janela de atenção", items.filter((i) => i.day >= cfg.attentionStart && i.left > 0)], ["Próximos 7 dias", items.filter((i) => i.left > 0 && i.left <= 7)], ["Próximos 15 dias", items.filter((i) => i.left > 7 && i.left <= 15)], ["Próximos 30 dias", items.filter((i) => i.left > 15 && i.left <= 30)]];
  return <div className="space-y-5">{groups.map(([title, list]) => <section key={title} className="panel p-5"><SectionTitle kicker="Partos previstos" title={`${title} · ${list.length}`} />{list.length ? <div className="space-y-3">{list.map(({ b, due, left, day }) => { const prep = (b.prep_checklist ?? {}) as Record<string, string>; const done = PREP_ITEMS.filter((p) => prep[p] === "concluido" || prep[p] === "na").length; return <div key={b.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-lg font-bold">{tag(b.sow_id)}</p><p className="text-xs text-muted-foreground">Cobertura {fmtDate(b.breeding_date)} · dia {day} · previsto {fmtDate(due)} · {left >= 0 ? `faltam ${left} dias` : `${-left} dias após a referência`} · resp. {b.responsible ?? "—"}</p></div><div className="flex gap-2"><Link to="/matrizes/$sowId" params={{ sowId: b.sow_id }}><Button size="sm" variant="outline">Ficha</Button></Link><Farrowing cycles={[b]} preset={b.id} tag={tag} onDone={onDone} /></div></div>{day >= cfg.attentionStart && <PrepChecklist b={b} onDone={onDone} />}{day < cfg.attentionStart && <p className="mt-2 text-xs text-muted-foreground">Preparação: {done}/{PREP_ITEMS.length} itens resolvidos.</p>}</div>; })}</div> : <Empty>Nenhum.</Empty>}</section>)}</div>;
}

function PrepChecklist({ b, onDone }: { b: Breeding; onDone: () => void }) {
  const prep = (b.prep_checklist ?? {}) as Record<string, string>;
  async function set(item: string, v: string) { const { error } = await supabase.from("breedings").update({ prep_checklist: { ...prep, [item]: v } }).eq("id", b.id); if (error) toast.error(error.message); else onDone(); }
  return <div className="mt-3 rounded-lg bg-muted/50 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Preparação de maternidade</p><div className="grid gap-1.5 sm:grid-cols-2">{PREP_ITEMS.map((item) => <div key={item} className="flex items-center justify-between gap-2 text-sm"><span>{item}</span><select value={prep[item] ?? "pendente"} onChange={(e) => set(item, e.target.value)} className="h-8 rounded border border-input bg-transparent px-1 text-xs"><option value="pendente">Pendente</option><option value="concluido">Concluído</option><option value="na">Não aplicável</option></select></div>)}</div></div>;
}

type Ev = { date: string; label: string; sowId: string; color: string; kind: string };
function Calendar({ B, L, D, tag, cfg, today }: { B: Breeding[]; L: { sow_id: string; farrowing_date: string }[]; D: { sow_id: string; diagnosis_date: string; result: string }[]; tag: (id: string) => string; cfg: GestationConfig; today: string }) {
  const [ym, setYm] = useState(today.slice(0, 7)); const [kind, setKind] = useState("");
  const evs: Ev[] = [];
  for (const b of B) { const d = cycleDates(b.breeding_date, cfg); evs.push({ date: b.breeding_date, label: `Cobertura ${tag(b.sow_id)}`, sowId: b.sow_id, color: "bg-primary/15 text-primary", kind: "Cobertura" }); if (b.heat_check_date && b.cycle_status === "retorno") evs.push({ date: b.heat_check_date, label: `Retorno ao cio ${tag(b.sow_id)}`, sowId: b.sow_id, color: "bg-destructive/15 text-destructive", kind: "Retorno ao cio" });
    if (b.cycle_status === "ativo") { if (b.heat_check === "pendente") evs.push({ date: d.heatStart, label: `Observar cio ${tag(b.sow_id)}`, sowId: b.sow_id, color: "bg-info/15 text-info", kind: "Retorno ao cio" }); evs.push({ date: d.attention, label: `Preparar maternidade ${tag(b.sow_id)}`, sowId: b.sow_id, color: "bg-warn/15 text-warn", kind: "Preparação de maternidade" }); evs.push({ date: d.farrowing, label: `Parto previsto ${tag(b.sow_id)}`, sowId: b.sow_id, color: "bg-accent text-accent-foreground", kind: "Parto previsto" }); } }
  for (const x of D) evs.push({ date: x.diagnosis_date, label: `Diagnóstico ${RESULT_LABEL[x.result]} ${tag(x.sow_id)}`, sowId: x.sow_id, color: "bg-info/15 text-info", kind: "Diagnóstico" });
  for (const l of L) evs.push({ date: l.farrowing_date, label: `Parto ${tag(l.sow_id)}`, sowId: l.sow_id, color: "bg-ok-glow/15 text-ok-glow", kind: "Parto realizado" });
  const first = `${ym}-01`; const startOffset = new Date(first + "T12:00:00Z").getUTCDay(); const daysIn = daysBetween(first, addDays(`${addDays(first, 32).slice(0, 7)}-01`, 0));
  const shift = (n: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y!, m! - 1 + n, 1)); setYm(d.toISOString().slice(0, 7)); };
  const shown = evs.filter((e) => e.date.startsWith(ym) && (!kind || e.kind === kind));
  return <section className="panel p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Button size="icon" variant="outline" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button><h2 className="min-w-40 text-center text-lg font-bold capitalize">{new Date(first + "T12:00:00Z").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2><Button size="icon" variant="outline" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button></div><select className={selectCls + " sm:w-60"} value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Todos os eventos</option>{[...new Set(evs.map((e) => e.kind))].map((k) => <option key={k}>{k}</option>)}</select></div>
    <div className="hidden grid-cols-7 gap-1 md:grid">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => <p key={d} className="p-1 text-center text-xs font-bold text-muted-foreground">{d}</p>)}{Array.from({ length: startOffset }).map((_, i) => <div key={"x" + i} />)}{Array.from({ length: daysIn }).map((_, i) => { const date = addDays(first, i); const de = shown.filter((e) => e.date === date); return <div key={date} className={`min-h-24 rounded-lg border p-1 ${date === today ? "border-primary" : "border-border"}`}><p className="text-xs font-semibold">{i + 1}</p>{de.map((e, j) => <Link key={j} to="/matrizes/$sowId" params={{ sowId: e.sowId }} className={`mt-0.5 block truncate rounded px-1 text-[.65rem] ${e.color}`}>{e.label}</Link>)}</div>; })}</div>
    <ul className="space-y-1 md:hidden">{shown.sort((a, b) => a.date.localeCompare(b.date)).map((e, j) => <li key={j}><Link to="/matrizes/$sowId" params={{ sowId: e.sowId }} className={`block rounded px-2 py-2 text-sm ${e.color}`}><span className="font-mono">{fmtDate(e.date)}</span> · {e.label}</Link></li>)}{!shown.length && <Empty>Nenhum evento neste mês.</Empty>}</ul>
  </section>;
}

function Empties({ S, B, D }: { S: Sow[]; B: Breeding[]; D: { sow_id: string; result: string }[] }) {
  const last = new Map<string, Breeding>(); for (const b of B) if (!last.has(b.sow_id)) last.set(b.sow_id, b);
  const attempts = (id: string) => B.filter((b) => b.sow_id === id).length;
  const empty = S.filter((s) => s.status === "vazia");
  const groups: [string, Sow[]][] = [["Retornaram ao cio", empty.filter((s) => last.get(s.id)?.cycle_status === "retorno")], ["Diagnóstico negativo", empty.filter((s) => last.get(s.id)?.cycle_status === "negativo")], ["Perda gestacional", empty.filter((s) => last.get(s.id)?.cycle_status === "perda")], ["Aguardando nova cobertura (sem histórico ou ciclo encerrado)", empty.filter((s) => !last.get(s.id) || ["parido", "encerrado"].includes(last.get(s.id)!.cycle_status))], ["Histórico de repetição (2+ retornos/negativos)", S.filter((s) => B.filter((b) => b.sow_id === s.id && ["retorno", "negativo"].includes(b.cycle_status)).length >= 2)], ["Descartadas", S.filter((s) => s.status === "descartada")], ["Mortas", S.filter((s) => s.status === "morta")]];
  return <div className="grid gap-5 lg:grid-cols-2">{groups.map(([t, list]) => <section key={t} className="panel p-5"><SectionTitle kicker="Matrizes" title={`${t} · ${list.length}`} />{list.length ? <ul className="divide-y divide-border text-sm">{list.map((s) => <li key={s.id} className="flex justify-between py-2"><Link to="/matrizes/$sowId" params={{ sowId: s.id }} className="font-semibold hover:underline">{s.ear_tag}</Link><span className="text-muted-foreground">{attempts(s.id)} coberturas · {D.filter((d) => d.sow_id === s.id && d.result === "negativo").length} diag. negativos</span></li>)}</ul> : <Empty>Nenhuma.</Empty>}</section>)}</div>;
}

function History({ S, B, L, D, O, boarName }: { S: Sow[]; B: Breeding[]; L: { breeding_id: string | null; born_total: number; born_alive: number; stillborn: number; mummified: number; farrowing_date: string; complications: string[] }[]; D: { breeding_id: string; diagnosis_date: string; result: string }[]; O: { breeding_id: string | null; event_type: string; event_date: string }[]; boarName: (b: Breeding) => string }) {
  const [sowId, setSowId] = useState(S[0]?.id ?? ""); const [year, setYear] = useState("");
  const cycles = B.filter((b) => b.sow_id === sowId && (!year || b.breeding_date.startsWith(year))).sort((a, b) => a.breeding_date.localeCompare(b.breeding_date));
  const years = [...new Set(B.filter((b) => b.sow_id === sowId).map((b) => b.breeding_date.slice(0, 4)))];
  return <section className="panel p-5"><SectionTitle kicker="Comparação entre ciclos" title="Histórico reprodutivo" action={sowId ? <Link to="/matrizes/$sowId" params={{ sowId }}><Button variant="outline" size="sm">Ficha completa</Button></Link> : null} />
    <div className="mb-4 grid gap-2 sm:grid-cols-2"><select className={selectCls} value={sowId} onChange={(e) => setSowId(e.target.value)}>{S.map((s) => <option key={s.id} value={s.id}>{s.ear_tag}{s.name ? ` · ${s.name}` : ""}</option>)}</select><select className={selectCls} value={year} onChange={(e) => setYear(e.target.value)}><option value="">Todos os anos</option>{years.map((y) => <option key={y}>{y}</option>)}</select></div>
    {cycles.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Ciclo</th><th className="p-2">Cobertura</th><th className="p-2">Tipo / reprodutor</th><th className="p-2">Cio</th><th className="p-2">Diagnósticos</th><th className="p-2">Resultado</th><th className="p-2">Gestação</th><th className="p-2">Nasc. tot/vivos/nat/mum</th><th className="p-2">Ocorrências</th></tr></thead><tbody>{cycles.map((b, i) => { const l = L.find((x) => x.breeding_id === b.id); return <tr key={b.id} className="border-t border-border align-top"><td className="p-2 font-mono">{i + 1}</td><td className="p-2">{fmtDate(b.breeding_date)}</td><td className="p-2">{TYPE_LABEL[b.breeding_type]} · {boarName(b)}</td><td className="p-2">{b.heat_check === "apresentou" ? `Retorno ${fmtDate(b.heat_check_date)}` : b.heat_check === "nao_apresentou" ? "Não apresentou" : "Pendente"}</td><td className="p-2 text-xs">{D.filter((d) => d.breeding_id === b.id).map((d) => `${fmtDate(d.diagnosis_date)} ${RESULT_LABEL[d.result]}`).join(", ") || "—"}</td><td className="p-2">{b.cycle_status === "ativo" ? "Em andamento" : ({ retorno: "Retorno ao cio", negativo: "Negativo", perda: "Perda", parido: "Parto", encerrado: "Encerrado" } as Record<string, string>)[b.cycle_status]}</td><td className="p-2">{l ? `${daysBetween(b.breeding_date, l.farrowing_date)} d` : "—"}</td><td className="p-2 font-mono">{l ? `${l.born_total}/${l.born_alive}/${l.stillborn}/${l.mummified}` : "—"}</td><td className="p-2 text-xs">{[...(l?.complications ?? []), ...O.filter((o) => o.breeding_id === b.id).map((o) => OCC_LABEL[o.event_type])].join(", ") || "—"}</td></tr>; })}</tbody></table></div> : <Empty>Sem ciclos registrados para esta matriz.</Empty>}
  </section>;
}

function Boars({ boars, B, L, onDone }: { boars: { id: string; code: string; name: string | null; breed: string | null; origin: string | null; status: string }[]; B: Breeding[]; L: { breeding_id: string | null; born_total: number }[]; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return <section className="panel p-5"><SectionTitle kicker="Comparativo sem atribuir causa" title="Reprodutores" action={<FormDialog title="Novo reprodutor" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4" />Reprodutor</Button>}>{(close) => <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); const { error } = await supabase.from("boars").insert({ code: String(f.get("code")), name: String(f.get("name") || "") || null, breed: String(f.get("breed") || "") || null, birth_date: String(f.get("birth") || "") || null, origin: String(f.get("origin") || "") || null, notes: String(f.get("notes") || "") || null }); setBusy(false); if (error) return void toast.error(error.message); toast.success("Reprodutor cadastrado"); onDone(); close(); }}>
      <Field label="Identificação *"><Input name="code" required className="h-11" /></Field><Field label="Nome"><Input name="name" className="h-11" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Raça"><Input name="breed" className="h-11" /></Field><Field label="Nascimento"><Input name="birth" type="date" className="h-11" /></Field></div><Field label="Origem"><Input name="origin" className="h-11" /></Field><Field label="Observações"><Input name="notes" className="h-11" /></Field><SubmitRow busy={busy} /></form>}</FormDialog>} />
    <p className="mb-3 text-xs text-muted-foreground">Resultados também dependem da matriz, do manejo e do momento da cobertura; as taxas usam só ciclos com resultado conhecido.</p>
    {boars.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Reprodutor</th><th className="p-2">Situação</th><th className="p-2">Coberturas</th><th className="p-2">Ciclos concluídos</th><th className="p-2">Retorno ao cio</th><th className="p-2">Parto/cobertura</th><th className="p-2">Leitões nascidos</th><th className="p-2"></th></tr></thead><tbody>{boars.map((bo) => { const cs = B.filter((b) => b.boar_id === bo.id); const known = cs.filter((c) => ["retorno", "negativo", "perda", "parido"].includes(c.cycle_status)); const ids = new Set(cs.map((c) => c.id)); return <tr key={bo.id} className="border-t border-border"><td className="p-2 font-semibold">{bo.code}{bo.name ? ` · ${bo.name}` : ""}</td><td className="p-2">{bo.status}</td><td className="p-2">{cs.length}</td><td className="p-2">{known.length}</td><td className="p-2">{pct(known.length ? known.filter((c) => c.cycle_status === "retorno").length / known.length : null)}</td><td className="p-2">{pct(known.length ? known.filter((c) => c.cycle_status === "parido").length / known.length : null)}</td><td className="p-2">{L.filter((l) => l.breeding_id && ids.has(l.breeding_id)).reduce((a, l) => a + l.born_total, 0)}</td><td className="p-2"><Button size="sm" variant="ghost" onClick={async () => { const { error } = await supabase.from("boars").update({ status: bo.status === "ativo" ? "inativo" : "ativo" }).eq("id", bo.id); if (error) toast.error(error.message); else onDone(); }}>{bo.status === "ativo" ? "Inativar" : "Reativar"}</Button></td></tr>; })}</tbody></table></div> : <Empty>Nenhum reprodutor cadastrado. Coberturas antigas mantêm a identificação livre do cachaço.</Empty>}
  </section>;
}

function Indicators({ S, B, L, D, O, tag, boarName, cfg }: { S: Sow[]; B: Breeding[]; L: { id: string; sow_id: string; breeding_id: string | null; farrowing_date: string; born_total: number; born_alive: number; stillborn: number; mummified: number }[]; D: { sow_id: string; diagnosis_date: string; result: string; method: string }[]; O: { sow_id: string; event_date: string; event_type: string; confirmed: boolean }[]; tag: (id: string) => string; boarName: (b: Breeding) => string; cfg: GestationConfig }) {
  const today = todayISO(); const [period, setPeriod] = useState("365"); const [from, setFrom] = useState(addDays(today, -365)); const [to, setTo] = useState(today);
  const start = period === "custom" ? from : addDays(today, -Number(period)); const end = period === "custom" ? to : today;
  const inP = (d: string) => d >= start && d <= end;
  const Bp = B.filter((b) => inP(b.breeding_date)), Lp = L.filter((l) => inP(l.farrowing_date)), Dp = D.filter((d) => inP(d.diagnosis_date)), Op = O.filter((o) => inP(o.event_date));
  const r = reproductiveIndicators(Bp, Lp, Dp);
  const months = new Map<string, { m: string; coberturas: number; retornos: number; partos: number; vivos: number; positivos: number; negativos: number }>();
  const row = (d: string) => { const m = d.slice(0, 7); if (!months.has(m)) months.set(m, { m, coberturas: 0, retornos: 0, partos: 0, vivos: 0, positivos: 0, negativos: 0 }); return months.get(m)!; };
  Bp.forEach((b) => { row(b.breeding_date).coberturas++; if (b.cycle_status === "retorno" && b.heat_check_date) row(b.heat_check_date).retornos++; });
  Lp.forEach((l) => { const x = row(l.farrowing_date); x.partos++; x.vivos += l.born_alive; });
  Dp.forEach((d) => { if (d.result === "positivo") row(d.diagnosis_date).positivos++; if (d.result === "negativo") row(d.diagnosis_date).negativos++; });
  const chart = [...months.values()].sort((a, b) => a.m.localeCompare(b.m)).map((x) => ({ ...x, m: x.m.split("-").reverse().join("/") }));
  const parity = new Map<number, { n: number; total: number; alive: number }>(); const seen = new Map<string, number>();
  [...L].sort((a, b) => a.farrowing_date.localeCompare(b.farrowing_date)).forEach((l) => { const p = (seen.get(l.sow_id) ?? 0) + 1; seen.set(l.sow_id, p); if (!inP(l.farrowing_date)) return; const e = parity.get(p) ?? { n: 0, total: 0, alive: 0 }; e.n++; e.total += l.born_total; e.alive += l.born_alive; parity.set(p, e); });
  const sowsWithLitter = new Set(Lp.map((l) => l.sow_id)).size; const repeats = new Set(Bp.map((b) => b.sow_id)).size;
  const counts: [string, number][] = [["Matrizes cadastradas", S.length], ["Coberturas no período", Bp.length], ["Gestantes confirmadas (agora)", S.filter((s) => s.status === "gestante").length], ["Possíveis gestantes (agora)", B.filter((b) => b.cycle_status === "ativo" && b.heat_check === "nao_apresentou" && b.pregnancy_check !== "positivo").length], ["Matrizes vazias (agora)", S.filter((s) => s.status === "vazia").length], ["Retornos ao cio", Bp.filter((b) => b.cycle_status === "retorno").length], ["Partos previstos (ciclos ativos)", B.filter((b) => b.cycle_status === "ativo").length], ["Partos realizados", Lp.length], ["Abortos registrados", Op.filter((o) => o.event_type === "aborto").length], ["Descartes (situação atual)", S.filter((s) => s.status === "descartada").length]];
  const rates: [string, string, string][] = [["Taxa de retorno ao cio", pct(r.returnRate), `retornos ÷ ${r.knownCycles} ciclos concluídos`], ["Taxa de confirmação", pct(r.confirmationRate), "positivos ÷ (positivos + negativos)"], ["Prenhez por cobertura", pct(r.pregnancyRate), "ciclos sem retorno/negativo ÷ concluídos"], ["Parto por cobertura", pct(r.farrowRate), "partos ÷ ciclos concluídos"], ["Dias cobertura → retorno", num(r.avgReturnInterval), "média"], ["Duração da gestação", num(r.avgGestation), "dias, partos vinculados"], ["Nascidos totais", num(r.avgBornTotal), "média por parto"], ["Nascidos vivos", num(r.avgBornAlive), "média por parto"], ["Natimortos", num(r.avgStillborn), "média por parto"], ["Mumificados", num(r.avgMummified), "média por parto"], ["Partos por matriz", sowsWithLitter ? num(Lp.length / sowsWithLitter) : "—", "matrizes com parto no período"], ["Coberturas por matriz", repeats ? num(Bp.length / repeats) : "—", "repetição de cobertura"]];
  const reports: Record<string, () => void> = {
    "Coberturas": () => csv("Relação de coberturas", ["Matriz", "Data", "Horário", "Tipo", "Reprodutor", "Sêmen", "Responsável", "Situação do ciclo"], Bp.map((b) => [tag(b.sow_id), fmtDate(b.breeding_date), b.breeding_time, TYPE_LABEL[b.breeding_type], boarName(b), b.semen_code, b.responsible, b.cycle_status])),
    "Retornos ao cio": () => csv("Relação de retornos ao cio", ["Matriz", "Cobertura", "Retorno", "Intervalo (dias)"], Bp.filter((b) => b.cycle_status === "retorno").map((b) => [tag(b.sow_id), fmtDate(b.breeding_date), fmtDate(b.heat_check_date), b.heat_check_date ? daysBetween(b.breeding_date, b.heat_check_date) : ""])),
    "Diagnósticos": () => csv("Relação de diagnósticos", ["Matriz", "Data", "Resultado", "Método"], Dp.map((d) => [tag(d.sow_id), fmtDate(d.diagnosis_date), RESULT_LABEL[d.result], METHOD_LABEL[d.method]])),
    "Partos previstos": () => csv("Relação de partos previstos", ["Matriz", "Cobertura", "Parto previsto"], B.filter((b) => b.cycle_status === "ativo").map((b) => [tag(b.sow_id), fmtDate(b.breeding_date), fmtDate(cycleDates(b.breeding_date, cfg).farrowing)])),
    "Partos realizados": () => csv("Relação de partos realizados", ["Matriz", "Data", "Total", "Vivos", "Natimortos", "Mumificados"], Lp.map((l) => [tag(l.sow_id), fmtDate(l.farrowing_date), l.born_total, l.born_alive, l.stillborn, l.mummified])),
    "Perdas gestacionais": () => csv("Relatório de perdas gestacionais", ["Matriz", "Data", "Tipo", "Confirmada"], Op.map((o) => [tag(o.sow_id), fmtDate(o.event_date), OCC_LABEL[o.event_type], o.confirmed ? "Sim" : "Não"])),
    "Indicadores": () => csv("Indicadores reprodutivos", ["Indicador", "Valor", "Base"], [...counts.map(([a, b]) => [a, b, ""]), ...rates]),
  };
  return <div className="space-y-5 print:space-y-3">
    <section className="panel p-5"><div className="flex flex-wrap items-end gap-2"><Field label="Período"><select className={selectCls} value={period} onChange={(e) => setPeriod(e.target.value)}><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="182">6 meses</option><option value="365">12 meses</option><option value="custom">Personalizado</option></select></Field>{period === "custom" && <><Field label="De"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11" /></Field><Field label="Até"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11" /></Field></>}<Button variant="outline" className="h-11" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />PDF / imprimir</Button></div>
      <p className="mt-3 text-xs text-muted-foreground">Fazenda Santo Antônio · período {fmtDate(start)} a {fmtDate(end)} · gerado em {new Date().toLocaleString("pt-BR")}</p>
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">{Object.entries(reports).map(([k, fn]) => <Button key={k} size="sm" variant="secondary" onClick={fn}><Download className="mr-1 h-3.5 w-3.5" />{k} (CSV/Excel)</Button>)}</div></section>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{counts.map(([l, v]) => <div key={l} className="panel p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-bold tabular-nums">{v}</p></div>)}</div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{rates.map(([l, v, base]) => <div key={l} className="panel p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-bold tabular-nums">{v}</p><p className="text-[.65rem] text-muted-foreground">{base}</p></div>)}</div>
    {chart.length ? <div className="grid gap-5 lg:grid-cols-2">{([["Coberturas e retornos por mês", ["coberturas", "retornos"]], ["Partos e nascidos vivos por mês", ["partos", "vivos"]], ["Diagnósticos positivos e negativos", ["positivos", "negativos"]]] as const).map(([t, keys]) => <section key={t} className="panel p-5"><p className="mb-3 font-semibold">{t}</p><div className="h-56"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="m" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip />{keys.map((k, i) => <Bar key={k} dataKey={k} fill={i ? "var(--color-chart-2, hsl(var(--chart-2)))" : "var(--color-primary)"} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer></div></section>)}
      <section className="panel p-5"><p className="mb-3 font-semibold">Desempenho por ordem de parto</p>{parity.size ? <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Ordem</th><th className="p-2">Partos</th><th className="p-2">Média total</th><th className="p-2">Média vivos</th></tr></thead><tbody>{[...parity.entries()].sort((a, b) => a[0] - b[0]).map(([p, e]) => <tr key={p} className="border-t border-border"><td className="p-2">{p}º</td><td className="p-2">{e.n}</td><td className="p-2">{(e.total / e.n).toFixed(1)}</td><td className="p-2">{(e.alive / e.n).toFixed(1)}</td></tr>)}</tbody></table> : <Empty>Sem partos no período.</Empty>}</section></div> : <Empty>Ainda não há registros no período para gerar gráficos.</Empty>}
  </div>;
}
