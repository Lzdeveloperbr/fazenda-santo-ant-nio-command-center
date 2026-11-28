import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Printer, RotateCcw } from "lucide-react";
import { financeQuery, litterEventsQuery, littersQuery, fmtDate, todayISO, type FinanceEntry } from "@/lib/farm";
import { costPerWeaned, deathsByMonth, financeSummary } from "@/lib/farm/insights";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COST_CENTERS, FINANCE_CATEGORIES, duplicateDraft, possibleDuplicates } from "@/lib/farm/finance";
import { CashFlowTab, CostsTab, EntryLinks, OpenAccountsTab } from "@/components/farm/FinanceTabs";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [
    { title: "Financeiro e relatório mensal | Fazenda Santo Antônio" },
    { name: "description", content: "Receitas, despesas, custo por leitão desmamado e relatório mensal para impressão." },
    { property: "og:title", content: "Financeiro | Fazenda Santo Antônio" },
    { property: "og:description", content: "Receitas, despesas, custo por leitão e relatório mensal." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Financeiro,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function MonthReport() {
  const entries = useQuery(financeQuery), litters = useQuery(littersQuery), events = useQuery(litterEventsQuery);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const inMonth = useMemo(() => (entries.data ?? []).filter((e) => e.entry_date.startsWith(month)), [entries.data, month]);
  const s = financeSummary(inMonth);
  const monthLitters = (litters.data ?? []).filter((l) => l.farrowing_date.startsWith(month));
  const weaned = (litters.data ?? []).filter((l) => l.status === "desmamada" && l.weaning_date?.startsWith(month)).reduce((a, l) => a + (l.weaned ?? 0), 0);
  const cpw = costPerWeaned(s.despesaPaga + s.despesaPendente, weaned);
  const deaths = deathsByMonth(events.data ?? [])[month] ?? 0;
  const byCat = useMemo(() => { const m: Record<string, number> = {}; for (const e of inMonth) if (e.entry_type === "despesa") m[e.category] = (m[e.category] ?? 0) + Number(e.amount); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [inMonth]);
  const maxCat = Math.max(1, ...byCat.map((c) => c[1]));
  const [y, mm] = month.split("-");

  if (entries.isLoading) return <div className="panel p-8 text-center text-sm text-muted-foreground">Carregando o financeiro…</div>;
  return (
    <div className="fin-report space-y-5">
      <style>{`@media print { @page { size: A4; margin: 12mm; } body * { visibility: hidden !important; } .fin-report, .fin-report * { visibility: visible !important; } .fin-report { position: absolute; inset: 0; } .no-print { display: none !important; } }`}</style>
      <SectionTitle kicker="Administração" title={`Financeiro · ${mm}/${y}`} action={<div className="no-print flex flex-wrap gap-2"><EntryDialog /><Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Relatório</Button></div>} />
      <div className="no-print"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-10 w-44" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receita recebida" value={brl(s.receitaPaga)} hint={s.receitaPendente ? `+ ${brl(s.receitaPendente)} a receber` : undefined} />
        <Stat label="Despesa paga" value={brl(s.despesaPaga)} hint={s.despesaPendente ? `+ ${brl(s.despesaPendente)} pendente` : undefined} />
        <Stat label="Saldo do mês (pagos)" value={brl(s.saldo)} tone={s.saldo < 0 ? "text-destructive" : "text-ok"} />
        <Stat label="Resultado estimado" value={brl(s.resultadoEstimado)} hint="Inclui valores pendentes" />
      </div>
      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Relatório para o patrão" title="Resumo do mês" />
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Partos no mês</dt><dd className="font-mono text-xl font-bold">{monthLitters.length}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Nascidos vivos</dt><dd className="font-mono text-xl font-bold">{monthLitters.reduce((a, l) => a + l.born_alive, 0)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Leitões desmamados</dt><dd className="font-mono text-xl font-bold">{weaned}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Mortes de leitões</dt><dd className="font-mono text-xl font-bold">{deaths}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-muted-foreground">Custo por leitão desmamado</dt><dd className="font-mono text-xl font-bold">{cpw == null ? "—" : brl(cpw)}</dd><p className="text-xs text-muted-foreground">{cpw == null ? "Precisa de despesas e desmames registrados no mês." : "Todas as despesas do mês ÷ leitões desmamados no mês (estimativa)."}</p></div>
        </dl>
        {byCat.length > 0 && <div className="mt-5 space-y-2"><p className="label-tech">Onde o dinheiro foi gasto</p>{byCat.map(([c, v]) => <div key={c} className="text-sm"><div className="flex justify-between"><span>{c}</span><span className="font-mono">{brl(v)}</span></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / maxCat) * 100}%` }} /></div></div>)}</div>}
      </section>
      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Lançamentos" title={`${inMonth.length} no mês`} />
        {inMonth.length === 0 ? <Empty>Nenhum lançamento neste mês. Use "Novo lançamento" para registrar vendas e gastos.</Empty> :
          <ul className="divide-y">{inMonth.map((e) => <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="w-20 shrink-0 font-mono text-xs">{fmtDate(e.entry_date)}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{e.category}</p><p className="truncate text-xs text-muted-foreground">{[e.description, e.counterpart].filter(Boolean).join(" · ") || "—"}{e.status === "pendente" ? ` · pendente${e.due_date ? ` até ${fmtDate(e.due_date)}` : ""}` : ""}</p></div>
            <span className={`font-mono font-semibold ${e.entry_type === "receita" ? "text-ok" : "text-destructive"}`}>{e.entry_type === "receita" ? "+" : "−"}{brl(Number(e.amount))}</span>
            {!e.description?.startsWith("[ESTORNO:") && <EntryDialog source={e} />}
            <ReverseEntry entry={e} />
          </li>)}</ul>}
      </section>
    </div>
  );
}

function EntryDialog({ source }: { source?: FinanceEntry } = {}) {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  const all = useQuery(financeQuery);
  const draft = source ? duplicateDraft(source, todayISO()) : null;
  const [type, setType] = useState<"receita" | "despesa">(draft?.entry_type === "receita" ? "receita" : "despesa");
  const trigger = source
    ? <button className="no-print rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Duplicar lançamento"><Copy className="h-4 w-4" /></button>
    : <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo lançamento</Button>;
  return <FormDialog title={source ? "Duplicar lançamento" : "Novo lançamento"} trigger={trigger}>{(close) =>
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const amount = Number(String(f.get("amount")).replace(",", "."));
      if (!(amount > 0)) return void toast.error("Informe um valor maior que zero.");
      const row = { entry_type: type, category: String(f.get("cat")), description: String(f.get("desc") || "") || null, counterpart: String(f.get("who") || "") || null, amount, entry_date: String(f.get("date")), status: String(f.get("status")), due_date: String(f.get("due") || "") || null, paid_at: String(f.get("status")) === "pago" ? String(f.get("date")) : null, cost_center: String(f.get("center") || "") || null, supplier_id: String(f.get("supplier") || "") || null, document_number: String(f.get("doc") || "") || null, batch_id: String(f.get("batch") || "") || null };
      const same = possibleDuplicates(all.data ?? [], row);
      if (same.length && !window.confirm(`Já existe ${same.length} lançamento igual (mesma data, categoria, valor e contraparte). Gravar mesmo assim?`)) return;
      setBusy(true);
      const { error } = await supabase.from("finance_entries").insert(row);
      setBusy(false); if (error) return void toast.error(friendlyError(error)); toast.success(source ? "Cópia salva como novo lançamento." : "Lançamento salvo."); qc.invalidateQueries({ queryKey: ["finance_entries"] }); close(); }}>
      {source && <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">Cópia de {fmtDate(source.entry_date)}. Confira a data, o valor e a situação; documento e vencimento não são copiados. O original não muda.</p>}
      <div className="grid grid-cols-2 gap-2">{(["despesa", "receita"] as const).map((t) => <Button key={t} type="button" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>{t === "despesa" ? "Despesa" : "Receita"}</Button>)}</div>
      <div className="grid grid-cols-2 gap-3"><Field label="Categoria"><select name="cat" className={selectCls} defaultValue={draft?.category}>{[...new Set([...(draft && draft.entry_type === type ? [draft.category] : []), ...FINANCE_CATEGORIES[type]])].map((c) => <option key={c}>{c}</option>)}</select></Field><Field label="Centro de custo"><select name="center" className={selectCls} defaultValue={draft?.cost_center ?? ""}><option value="">Não classificado</option>{Object.entries(COST_CENTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
      <EntryLinks supplierId={draft?.supplier_id} batchId={draft?.batch_id} />
      <div className="grid grid-cols-2 gap-3"><Field label="Valor (R$)"><Input name="amount" inputMode="decimal" required className="h-11" placeholder="0,00" defaultValue={draft ? String(draft.amount).replace(".", ",") : undefined} /></Field><Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} required className="h-11" /></Field></div>
      <div className="grid grid-cols-2 gap-3"><Field label="Situação"><select name="status" className={selectCls} defaultValue={draft ? "pendente" : "pago"}><option value="pago">{type === "receita" ? "Recebido" : "Pago"}</option><option value="pendente">Pendente</option></select></Field><Field label="Vencimento"><Input name="due" type="date" className="h-11" /></Field></div>
      <div className="grid grid-cols-2 gap-3"><Field label={type === "receita" ? "Cliente" : "Fornecedor (texto livre)"}><Input name="who" className="h-11" defaultValue={draft?.counterpart ?? undefined} /></Field><Field label="Documento / NF"><Input name="doc" className="h-11" /></Field></div>
      <Field label="Descrição"><Input name="desc" className="h-11" defaultValue={draft?.description ?? undefined} /></Field>
      <SubmitRow busy={busy} label={source ? "Salvar cópia" : "Salvar lançamento"} />
    </form>}</FormDialog>;
}

function ReverseEntry({ entry }: { entry: FinanceEntry }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const marker = `[ESTORNO:${entry.id}]`;
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger asChild>
      <button className="no-print rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Estornar lançamento"><RotateCcw className="h-4 w-4" /></button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Estornar lançamento?</AlertDialogTitle>
        <AlertDialogDescription>O registro original não será apagado. Será criado um lançamento compensatório de mesmo valor, categoria e situação, com referência ao original.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
        <AlertDialogAction disabled={busy} onClick={async (event) => {
          event.preventDefault();
          setBusy(true);
          const { data: existing, error: lookupError } = await supabase.from("finance_entries").select("id").eq("description", marker).maybeSingle();
          if (lookupError) { setBusy(false); toast.error(friendlyError(lookupError)); return; }
          if (existing) { setBusy(false); setOpen(false); toast.error("Este lançamento já possui um estorno registrado."); return; }
          const { error } = await supabase.from("finance_entries").insert({
            entry_type: entry.entry_type === "receita" ? "despesa" : "receita",
            category: entry.category,
            description: marker,
            counterpart: entry.counterpart,
            amount: entry.amount,
            entry_date: todayISO(),
            due_date: entry.due_date,
            status: entry.status,
            batch_id: entry.batch_id,
          });
          setBusy(false);
          if (error) { toast.error(friendlyError(error)); return; }
          toast.success("Estorno registrado. O lançamento original foi preservado.");
          setOpen(false);
          qc.invalidateQueries({ queryKey: ["finance_entries"] });
        }}> {busy ? "Registrando…" : "Confirmar estorno"} </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string | undefined; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold ${tone ?? ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Financeiro() {
  return (
    <Tabs defaultValue="mes" className="space-y-4">
      <TabsList className="no-print flex h-auto flex-wrap">
        <TabsTrigger value="mes">Mês e relatório</TabsTrigger>
        <TabsTrigger value="contas">Contas a pagar e receber</TabsTrigger>
        <TabsTrigger value="caixa">Fluxo de caixa</TabsTrigger>
        <TabsTrigger value="custos">Custos</TabsTrigger>
      </TabsList>
      <TabsContent value="mes"><MonthReport /></TabsContent>
      <TabsContent value="contas"><OpenAccountsTab /></TabsContent>
      <TabsContent value="caixa"><CashFlowTab /></TabsContent>
      <TabsContent value="custos"><CostsTab /></TabsContent>
    </Tabs>
  );
}
