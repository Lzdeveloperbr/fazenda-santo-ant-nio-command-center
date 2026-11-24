import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, ArrowUpDown, Download, RotateCcw, FileText, Pencil, ClipboardPlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sowsQuery, breedingsQuery, littersQuery, SOW_STATUS, isCountedLitter, SOW_EVENT_LABEL, fmtDate, todayISO, addDaysISO, type Sow, type Breeding, type Litter } from "@/lib/farm";
import { breedingDateError, isActiveSowStatus } from "@/lib/farm/reproduction";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/matrizes")({
  head: () => ({
    meta: [
      { title: "Matrizes e reprodução | Fazenda Santo Antônio" },
      { name: "description", content: "Cadastro, coberturas, gestação, saídas e histórico individual das matrizes." },
      { property: "og:title", content: "Matrizes e reprodução | Fazenda Santo Antônio" },
      { property: "og:description", content: "Controle reprodutivo e histórico individual das matrizes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Matrizes,
});

type SortKey = "ear_tag" | "status" | "parity" | "expected";
type Row = { s: Sow; lastB: Breeding | undefined; lastL: Litter | undefined; parity: number };

function Matrizes() {
  const isDetail = useRouterState({ select: (state) => state.location.pathname !== "/matrizes" });
  const qc = useQueryClient();
  const sows = useQuery(sowsQuery);
  const breedings = useQuery(breedingsQuery);
  const litters = useQuery(littersQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todas");
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>({ k: "ear_tag", asc: true });
  const refresh = () => qc.invalidateQueries();

  const rows = useMemo(() => {
    const B = breedings.data ?? [], L = (litters.data ?? []).filter(isCountedLitter);
    return (sows.data ?? []).map((s) => {
      const lastB = B.find((b) => b.sow_id === s.id);
      const sowL = L.filter((l) => l.sow_id === s.id);
      return { s, lastB, lastL: sowL[0], parity: sowL.length };
    })
      .filter((r) => status === "todas" || r.s.status === status)
      .filter((r) => !q || `${r.s.ear_tag} ${r.s.name ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const v = (r: Row) => sort.k === "ear_tag" ? r.s.ear_tag : sort.k === "status" ? r.s.status : sort.k === "parity" ? r.parity : r.lastB?.expected_farrowing ?? "9";
        const x = v(a), y = v(b);
        return (x < y ? -1 : x > y ? 1 : 0) * (sort.asc ? 1 : -1);
      });
  }, [sows.data, breedings.data, litters.data, q, status, sort]);

  if (isDetail) return <Outlet />;

  function exportCsv() {
    const head = ["Brinco", "Nome", "Situação", "Última cobertura", "Diagnóstico", "Parto estimado", "Último parto", "Partos"];
    const lines = rows.map((r) => [r.s.ear_tag, r.s.name ?? "", SOW_STATUS[r.s.status]?.label ?? r.s.status, r.lastB?.breeding_date ?? "", r.lastB?.pregnancy_check ?? "", r.lastB?.expected_farrowing ?? "", r.lastL?.farrowing_date ?? "", r.parity]);
    const csv = [head, ...lines].map((l) => l.map((c) => {
      const value = String(c);
      const safe = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
      return '"' + safe.replace(/"/g, '""') + '"';
    }).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = "matrizes.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const th = (k: SortKey, label: string) => (
    <th className="px-3 py-2 text-left font-normal">
      <button className="label-tech inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort({ k, asc: sort.k === k ? !sort.asc : true })}>
        {label}<ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Rebanho reprodutivo" title="Matrizes" action={<NewSow onDone={refresh} />} />
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar brinco ou nome" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" />
        </div>
        <select aria-label="Filtrar por situação" value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} w-auto`}>
          <option value="todas">Todas</option>
          {Object.entries(SOW_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button variant="outline" className="h-11" onClick={exportCsv} disabled={!rows.length}><Download className="mr-2 h-4 w-4" />CSV</Button>
      </div>

      {sows.isLoading ? <p className="label-tech animate-pulse-soft">Carregando…</p> : rows.length === 0 ? (
        <Empty>{sows.data?.length ? "Nenhuma matriz com esses filtros." : "Nenhuma matriz cadastrada. Toque em “Nova matriz” para começar."}</Empty>
      ) : (
        <>
          <div className="space-y-3 md:hidden">{rows.map((r) => <SowCard key={r.s.id} r={r} onDone={refresh} />)}</div>
          <div className="panel hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>{th("ear_tag", "Brinco")}<th className="label-tech px-3 py-2 text-left font-normal">Nome</th>{th("status", "Situação")}
                  <th className="label-tech px-3 py-2 text-left font-normal">Últ. cobertura</th><th className="label-tech px-3 py-2 text-left font-normal">Diagnóstico</th>
                  {th("expected", "Parto est.")}<th className="label-tech px-3 py-2 text-left font-normal">Últ. parto</th>{th("parity", "Partos")}<th /></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.s.id} className="transition-colors hover:bg-accent/50">
                    <td className="px-3 py-2.5 font-mono">{r.s.ear_tag}</td>
                    <td className="px-3 py-2.5">{r.s.name ?? "—"}</td>
                    <td className={`px-3 py-2.5 ${SOW_STATUS[r.s.status]?.tone}`}>{SOW_STATUS[r.s.status]?.label ?? r.s.status}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtDate(r.lastB?.breeding_date)}</td>
                    <td className="px-3 py-2.5 text-xs">{r.lastB?.pregnancy_check ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtDate(r.lastB?.expected_farrowing)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtDate(r.lastL?.farrowing_date)}</td>
                    <td className="px-3 py-2.5 font-mono">{r.parity}</td>
                    <td className="px-3 py-2.5"><SowActions s={r.s} lastB={r.lastB} onDone={refresh} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SowCard({ r, onDone }: { r: Row; onDone: () => void }) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-mono text-lg">{r.s.ear_tag}</p><p className="text-sm text-muted-foreground">{r.s.name ?? "Sem nome"} · {r.parity} parto(s)</p></div>
        <span className={`text-right text-sm ${SOW_STATUS[r.s.status]?.tone}`}>{SOW_STATUS[r.s.status]?.label}</span>
      </div>
      {r.lastB && <p className="mt-2 font-mono text-xs text-muted-foreground">Cobertura {fmtDate(r.lastB.breeding_date)} · {r.lastB.pregnancy_check} · parto est. {fmtDate(r.lastB.expected_farrowing)}</p>}
      <div className="mt-3"><SowActions s={r.s} lastB={r.lastB} onDone={onDone} /></div>
    </div>
  );
}

function SowActions({ s, lastB, onDone }: { s: Sow; lastB: Breeding | undefined; onDone: () => void }) {
  const active = isActiveSowStatus(s.status);
  return (
    <div className="flex flex-wrap gap-2">
      <Link to="/matrizes/$sowId" params={{ sowId: s.id }}><Button size="sm" variant="outline"><FileText className="mr-1 h-3.5 w-3.5" />Ficha</Button></Link>
      {active && <NewBreeding sow={s} onDone={onDone} />}
      {active && lastB && lastB.pregnancy_check === "pendente" && <PregCheck sow={s} breedingId={lastB.id} onDone={onDone} />}
      {active && <NewLitter sow={s} onDone={onDone} />}
      {active && <SowEventDialog sow={s} onDone={onDone} />}
      {(s.status === "descartada" || s.status === "transferida") && <ReactivateSow sow={s} onDone={onDone} />}
      <EditSow sow={s} onDone={onDone} />
      <DeleteSow sow={s} onDone={onDone} />
    </div>
  );
}

function EditSow({ sow, onDone }: { sow: Sow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title={`Editar cadastro · ${sow.ear_tag}`} trigger={<Button size="sm" variant="ghost"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>}>
      {(close) => <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        const { error } = await supabase.from("sows").update({
          ear_tag: String(f.get("ear_tag")).trim(), name: String(f.get("name") || "") || null,
          breed: String(f.get("breed") || "") || null, birth_date: String(f.get("birth_date") || "") || null,
          notes: String(f.get("notes") || "") || null,
        }).eq("id", sow.id);
        setBusy(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Cadastro atualizado"); onDone(); close();
      }}>
        <Field label="Brinco *"><Input name="ear_tag" defaultValue={sow.ear_tag} required className="h-11" /></Field>
        <Field label="Nome"><Input name="name" defaultValue={sow.name ?? ""} className="h-11" /></Field>
        <Field label="Raça / genética"><Input name="breed" defaultValue={sow.breed ?? ""} className="h-11" /></Field>
        <Field label="Nascimento"><Input name="birth_date" type="date" defaultValue={sow.birth_date ?? ""} className="h-11" /></Field>
        <Field label="Observações do cadastro"><Textarea name="notes" defaultValue={sow.notes ?? ""} rows={3} /></Field>
        <SubmitRow busy={busy} />
      </form>}
    </FormDialog>
  );
}

const sowHistoryTables = [
  "breedings",
  "gestation_events",
  "health_records",
  "inventory_checks",
  "litters",
  "medication_records",
  "pregnancy_diagnoses",
  "sow_events",
  "tasks",
  "vaccination_records",
] as const;

function DeleteSow({ sow, onDone }: { sow: Sow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function removeSow() {
    if (busy) return;
    setBusy(true);
    try {
      const db = supabase as any;
      const checks = await Promise.all(sowHistoryTables.map(async (table) => {
        const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq("sow_id", sow.id);
        return { table, count: count ?? 0, error };
      }));
      const failed = checks.find((item) => item.error);
      if (failed) {
        toast.error("Não foi possível verificar todo o histórico. A exclusão foi cancelada por segurança.");
        return;
      }
      const linked = checks.filter((item) => item.count > 0);
      if (linked.length) {
        const total = linked.reduce((sum, item) => sum + item.count, 0);
        toast.error(`Esta matriz possui ${total} registro(s) vinculado(s). Use “Evento / saída” para descartá-la e preservar o histórico.`);
        return;
      }
      if (!window.confirm(`Excluir definitivamente a matriz ${sow.ear_tag}?

Esta ação só será permitida porque não existem registros de reprodução, parto, saúde ou manejo vinculados. Não será possível desfazer.`)) return;
      const { error } = await db.from("sows").delete().eq("id", sow.id);
      if (error) {
        toast.error(error.message || "Não foi possível excluir a matriz.");
        return;
      }
      toast.success(`Matriz ${sow.ear_tag} excluída.`);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao verificar a matriz.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={removeSow}>
      <Trash2 className="mr-1 h-3.5 w-3.5" />{busy ? "Verificando…" : "Excluir"}
    </Button>
  );
}

function SowEventDialog({ sow, onDone }: { sow: Sow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [eventType, setEventType] = useState("retorno_cio");
  return (
    <FormDialog title={`Evento da matriz · ${sow.ear_tag}`} trigger={<Button size="sm" variant="outline"><ClipboardPlus className="mr-1 h-3.5 w-3.5" />Evento / saída</Button>}>
      {(close) => <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const notes = String(f.get("notes") || "").trim();
        if (["descarte", "morte", "transferencia"].includes(eventType) && !confirm(`Confirmar ${SOW_EVENT_LABEL[eventType]?.toLowerCase()} da matriz ${sow.ear_tag}? O evento ficará no histórico e não poderá ser apagado.`)) return;
        setBusy(true);
        const { error } = await supabase.from("sow_events").insert({ sow_id: sow.id, event_type: eventType, event_date: String(f.get("date")), notes: notes || null });
        setBusy(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Evento registrado no histórico"); onDone(); close();
      }}>
        <Field label="Tipo de evento"><select name="type" className={selectCls} value={eventType} onChange={(e) => setEventType(e.target.value)}>{["retorno_cio", "descarte", "morte", "transferencia", "observacao"].map((type) => <option key={type} value={type}>{SOW_EVENT_LABEL[type]}</option>)}</select></Field>
        <Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} required className="h-11" /></Field>
        <Field label={eventType === "transferencia" ? "Destino e detalhes" : eventType === "morte" ? "Causa ou circunstância" : "Motivo / observação"}><Textarea name="notes" rows={3} required={eventType !== "retorno_cio"} /></Field>
        {eventType === "retorno_cio" && <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">A matriz ficará vazia e a cobertura mais recente será marcada como diagnóstico negativo.</p>}
        <SubmitRow busy={busy} label="Registrar no histórico" />
      </form>}
    </FormDialog>
  );
}

function ReactivateSow({ sow, onDone }: { sow: Sow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function reactivate() {
    if (!confirm(`Confirmar o retorno da matriz ${sow.ear_tag} ao plantel como vazia?`)) return;
    setBusy(true);
    const { error } = await supabase.from("sow_events").insert({ sow_id: sow.id, event_type: "reativacao", event_date: todayISO(), notes: "Retorno ao plantel registrado na ficha da matriz." });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Matriz reintegrada ao plantel"); onDone();
  }
  return <Button size="sm" variant="outline" disabled={busy} onClick={reactivate}><RotateCcw className="mr-1 h-3.5 w-3.5" />{sow.status === "transferida" ? "Registrar retorno" : "Reativar"}</Button>;
}

function NewSow({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title="Nova matriz" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4" />Nova matriz</Button>}>
      {(close) => <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        const { error } = await supabase.from("sows").insert({
          ear_tag: String(f.get("ear_tag")).trim(), name: String(f.get("name") || "") || null,
          breed: String(f.get("breed") || "") || null, birth_date: String(f.get("birth_date") || "") || null,
          status: String(f.get("status")), notes: String(f.get("notes") || "") || null,
        });
        setBusy(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Matriz cadastrada"); onDone(); close();
      }}>
        <Field label="Brinco *"><Input name="ear_tag" required className="h-11" /></Field>
        <Field label="Nome"><Input name="name" className="h-11" /></Field>
        <Field label="Raça / genética"><Input name="breed" className="h-11" /></Field>
        <Field label="Nascimento"><Input name="birth_date" type="date" className="h-11" /></Field>
        <Field label="Situação inicial"><select name="status" className={selectCls} defaultValue="vazia">{["vazia", "coberta", "gestante", "lactante"].map((k) => <option key={k} value={k}>{SOW_STATUS[k]?.label}</option>)}</select></Field>
        <Field label="Observações"><Textarea name="notes" rows={3} /></Field>
        <SubmitRow busy={busy} />
      </form>}
    </FormDialog>
  );
}

function NewBreeding({ sow, onDone }: { sow: Sow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title={`Cobertura · ${sow.ear_tag}`} trigger={<Button size="sm" variant="outline">Cobertura</Button>}>
      {(close) => <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const date = String(f.get("date") || "");
        const dateError = breedingDateError(date, todayISO());
        if (dateError) { toast.error(dateError); return; }
        const services = Number(f.get("services_count") || 1);
        if (!Number.isInteger(services) || services < 1) { toast.error("Informe uma quantidade inteira de serviços maior que zero."); return; }
        setBusy(true);
        const { error } = await supabase.from("breedings").insert({
          sow_id: sow.id,
          breeding_date: date,
          expected_farrowing: addDaysISO(date, 114),
          boar: String(f.get("boar") || "").trim() || null,
          breeding_type: String(f.get("breeding_type") || "inseminacao"),
          services_count: services,
          semen_code: String(f.get("semen_code") || "").trim() || null,
          responsible: String(f.get("responsible") || "").trim() || null,
          notes: String(f.get("notes") || "").trim() || null,
        });
        if (error) { setBusy(false); toast.error(error.message); return; }
        const statusResult = await supabase.from("sows").update({ status: "coberta" }).eq("id", sow.id);
        setBusy(false);
        if (statusResult.error) {
          toast.error("Cobertura salva, mas não foi possível atualizar a situação da matriz. Confira a ficha.");
          onDone();
          close();
          return;
        }
        toast.success("Cobertura registrada · parto previsto para 114 dias após a data informada"); onDone(); close();
      }}>
        <Field label="Data da cobertura"><Input name="date" type="date" required max={todayISO()} defaultValue={todayISO()} className="h-11" /></Field>
        <Field label="Tipo de serviço"><select name="breeding_type" className={selectCls} defaultValue="inseminacao"><option value="inseminacao">Inseminação artificial</option><option value="monta_natural">Monta natural</option><option value="repasse">Repasse</option></select></Field>
        <Field label="Reprodutor / sêmen"><Input name="boar" className="h-11" placeholder="Código do macho ou identificação" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nº de serviços"><Input name="services_count" type="number" min={1} step={1} defaultValue={1} required className="h-11" /></Field>
          <Field label="Código da dose"><Input name="semen_code" className="h-11" /></Field>
        </div>
        <Field label="Responsável"><Input name="responsible" className="h-11" /></Field>
        <Field label="Observações"><Textarea name="notes" rows={2} /></Field>
        <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Previsão calculada automaticamente para 114 dias após a cobertura. Confirme o calendário com o manejo da granja.</p>
        <SubmitRow busy={busy} />
      </form>}
    </FormDialog>
  );
}

function PregCheck({ sow, breedingId, onDone }: { sow: Sow; breedingId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function set(result: "positivo" | "negativo") {
    setBusy(true);
    const { error } = await supabase.from("breedings").update({ pregnancy_check: result }).eq("id", breedingId);
    if (!error) await supabase.from("sows").update({ status: result === "positivo" ? "gestante" : "vazia" }).eq("id", sow.id);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success(`Diagnóstico ${result}`); onDone(); return true;
  }
  return (
    <FormDialog title={`Diagnóstico · ${sow.ear_tag}`} trigger={<Button size="sm" variant="outline">Diagnóstico</Button>}>
      {(close) => <div className="grid grid-cols-2 gap-3">
        <Button disabled={busy} className="h-12" onClick={async () => { if (await set("positivo")) close(); }}>Positivo</Button>
        <Button disabled={busy} className="h-12" variant="outline" onClick={async () => { if (await set("negativo")) close(); }}>Negativo</Button>
      </div>}
    </FormDialog>
  );
}

function NewLitter({ sow, onDone }: { sow: Sow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title={`Registrar parto · ${sow.ear_tag}`} trigger={<Button size="sm">Parto</Button>}>
      {(close) => <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const alive = Number(f.get("alive")), still = Number(f.get("still"));
        if (!Number.isInteger(alive) || alive < 0 || !Number.isInteger(still) || still < 0) { toast.error("Informe quantidades inteiras e válidas."); return; }
        if (!confirm(`Confirmar parto: ${alive} vivos e ${still} natimortos?`)) return;
        setBusy(true);
        const { error } = await supabase.from("litters").insert({ sow_id: sow.id, farrowing_date: String(f.get("date")), born_alive: alive, stillborn: still, born_total: alive + still });
        if (!error) await supabase.from("sows").update({ status: "lactante" }).eq("id", sow.id);
        setBusy(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Parto registrado"); onDone(); close();
      }}>
        <Field label="Data do parto"><Input name="date" type="date" required defaultValue={todayISO()} className="h-11" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nascidos vivos"><Input name="alive" type="number" min={0} step={1} required inputMode="numeric" className="h-11" /></Field>
          <Field label="Natimortos"><Input name="still" type="number" min={0} step={1} defaultValue={0} inputMode="numeric" className="h-11" /></Field>
        </div>
        <SubmitRow busy={busy} label="Registrar parto" />
      </form>}
    </FormDialog>
  );
}
