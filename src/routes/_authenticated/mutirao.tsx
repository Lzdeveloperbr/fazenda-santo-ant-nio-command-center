import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, ShieldCheck, HelpCircle } from "lucide-react";
import { inventoryQuery, sowsQuery, fmtDate, todayISO, type Sow } from "@/lib/farm";
import { isActiveSowStatus } from "@/lib/farm/reproduction";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/mutirao")({
  head: () => ({ meta: [
    { title: "Mutirão de Organização | Fazenda Santo Antônio" },
    { name: "description", content: "Conferência física do plantel: o que é comprovado e o que ainda é \"não sei\"." },
    { property: "og:title", content: "Mutirão de Organização | Fazenda Santo Antônio" },
    { property: "og:description", content: "Conferência física de matrizes, baias e leitões." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Mutirao,
});

const OBS: Record<string, string> = { gestante: "Gestante", lactante: "Lactante", vazia: "Vazia", coberta: "Coberta", desconhecida: "Não sei" };

function Mutirao() {
  const sows = useQuery(sowsQuery);
  const checks = useQuery(inventoryQuery);
  const [only, setOnly] = useState<"todas" | "faltam" | "naosei">("todas");
  const active = (sows.data ?? []).filter((s) => isActiveSowStatus(s.status));
  const latest = useMemo(() => { const m = new Map<string, NonNullable<typeof checks.data>[number]>(); for (const c of checks.data ?? []) if (c.sow_id && !m.has(c.sow_id)) m.set(c.sow_id, c); return m; }, [checks.data]);
  const done = active.filter((s) => latest.has(s.id)).length;
  const proven = active.filter((s) => latest.get(s.id)?.confidence === "comprovada").length;
  const unknown = active.filter((s) => { const c = latest.get(s.id); return c && (c.observed_status === "desconhecida" || c.confidence === "nao_confirmada"); }).length;
  const list = active.filter((s) => only === "todas" ? true : only === "faltam" ? !latest.has(s.id) : (() => { const c = latest.get(s.id); return !!c && (c.observed_status === "desconhecida" || c.confidence === "nao_confirmada"); })());

  if (sows.isLoading || checks.isLoading) return <div className="panel p-8 text-center text-sm text-muted-foreground">Carregando o mutirão…</div>;
  return (
    <div className="space-y-5">
      <SectionTitle kicker="Organização" title="Mutirão de Organização" />
      <p className="-mt-3 text-sm text-muted-foreground">Passe baia por baia, confira cada matriz e registre o que você viu. Se não tiver certeza, marque "não sei" — é melhor do que um dado errado.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Matrizes ativas" value={active.length} />
        <Stat label="Conferidas" value={`${done}/${active.length}`} />
        <Stat label="Comprovadas" value={proven} />
        <Stat label={"Ainda \"não sei\""} value={unknown} />
      </div>
      {active.length > 0 && <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(done / active.length) * 100}%` }} /></div>}
      <div className="flex flex-wrap gap-2">
        {([["todas", "Todas"], ["faltam", "Faltam conferir"], ["naosei", "Não confirmadas"]] as const).map(([k, l]) => <button key={k} onClick={() => setOnly(k)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${only === k ? "bg-primary text-primary-foreground" : "bg-card"}`}>{l}</button>)}
        <Link to="/matrizes" className="ml-auto text-xs font-semibold text-info underline">Achou matriz sem cadastro? Cadastrar</Link>
      </div>
      {active.length === 0 ? <Empty>Nenhuma matriz ativa cadastrada. Comece cadastrando as matrizes encontradas na <Link to="/matrizes" className="text-info underline">tela de matrizes</Link>.</Empty> :
        list.length === 0 ? <Empty>Nada nesta seleção.</Empty> :
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((s) => { const c = latest.get(s.id); return (
          <article key={s.id} className="panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-mono text-lg font-bold">{s.ear_tag}</p><p className="text-xs text-muted-foreground">{s.name || "Sem nome"}</p></div>
              {!c ? <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">Não conferida</span> :
                c.confidence === "comprovada" ? <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-ok"><ShieldCheck className="h-3.5 w-3.5" />Comprovada</span> :
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-warn"><HelpCircle className="h-3.5 w-3.5" />Não confirmada</span>}
            </div>
            {c && <p className="mt-2 text-sm">Viu: <strong>{OBS[c.observed_status]}</strong>{c.pen_code ? ` · baia ${c.pen_code}` : ""}{c.piglets_counted != null ? ` · ${c.piglets_counted} leitões` : ""} <span className="text-xs text-muted-foreground">({fmtDate(c.check_date)})</span></p>}
            <div className="mt-3"><CheckDialog sow={s} /></div>
          </article>); })}</div>}
    </div>
  );
}

function CheckDialog({ sow }: { sow: Sow }) {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  return <FormDialog title={`Conferir ${sow.ear_tag}`} trigger={<Button size="sm" variant="outline" className="w-full"><ClipboardCheck className="mr-2 h-4 w-4" />Registrar conferência</Button>}>{(close) =>
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const f = new FormData(e.currentTarget); const pig = String(f.get("piglets") ?? "");
      const { error } = await supabase.from("inventory_checks").insert({ sow_id: sow.id, pen_code: String(f.get("pen") || "") || null, observed_status: String(f.get("obs")), confidence: String(f.get("conf")), piglets_counted: pig === "" ? null : Number(pig), check_date: String(f.get("date")), notes: String(f.get("notes") || "") || null });
      setBusy(false); if (error) return void toast.error(friendlyError(error)); toast.success("Conferência salva."); qc.invalidateQueries({ queryKey: ["inventory_checks"] }); close(); }}>
      <div className="grid grid-cols-2 gap-3"><Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} className="h-11" required /></Field><Field label="Baia onde está"><Input name="pen" className="h-11" placeholder="Ex.: M-03" /></Field></div>
      <Field label="O que você viu"><select name="obs" className={selectCls} defaultValue="desconhecida">{Object.entries(OBS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="Essa informação é"><select name="conf" className={selectCls} defaultValue="nao_confirmada"><option value="comprovada">Comprovada (vi, tem registro ou exame)</option><option value="nao_confirmada">Não confirmada (achismo, alguém falou)</option></select></Field>
      <Field label="Leitões contados com ela (se houver)"><Input name="piglets" type="number" min="0" step="1" className="h-11" /></Field>
      <Field label="Observações"><textarea name="notes" rows={2} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" /></Field>
      <p className="text-xs text-muted-foreground">A conferência não altera a situação oficial da matriz. Para mudar, use a tela de matrizes depois de comprovar.</p>
      <SubmitRow busy={busy} label="Salvar conferência" />
    </form>}</FormDialog>;
}

function Stat({ label, value }: { label: string; value: number | string }) { return <div className="panel p-4"><p className="label-tech">{label}</p><p className="mt-2 font-mono text-2xl font-bold">{value}</p></div>; }
