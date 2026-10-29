import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, ArrowUpDown, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sowsQuery, breedingsQuery, littersQuery, SOW_STATUS, fmtDate, todayISO, type Sow } from "@/lib/farm";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/matrizes")({
  head: () => ({ meta: [{ title: "Matrizes | AgroTech Command Center" }, { name: "description", content: "Cadastro e reprodução das matrizes." }] }),
  component: Matrizes,
});

type SortKey = "ear_tag" | "status" | "parity" | "expected";

function Matrizes() {
  const qc = useQueryClient();
  const sows = useQuery(sowsQuery);
  const breedings = useQuery(breedingsQuery);
  const litters = useQuery(littersQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todas");
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>({ k: "ear_tag", asc: true });
  const refresh = () => qc.invalidateQueries();

  const rows = useMemo(() => {
    const B = breedings.data ?? [], L = litters.data ?? [];
    return (sows.data ?? []).map((s) => {
      const lastB = B.find((b) => b.sow_id === s.id);
      const sowL = L.filter((l) => l.sow_id === s.id);
      return { s, lastB, lastL: sowL[0], parity: sowL.length };
    })
      .filter((r) => status === "todas" || r.s.status === status)
      .filter((r) => !q || `${r.s.ear_tag} ${r.s.name ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const v = (r: typeof a) => sort.k === "ear_tag" ? r.s.ear_tag : sort.k === "status" ? r.s.status : sort.k === "parity" ? r.parity : r.lastB?.expected_farrowing ?? "9";
        const x = v(a), y = v(b);
        return (x < y ? -1 : x > y ? 1 : 0) * (sort.asc ? 1 : -1);
      });
  }, [sows.data, breedings.data, litters.data, q, status, sort]);

  function exportCsv() {
    const head = ["Brinco", "Nome", "Situação", "Última cobertura", "Diagnóstico", "Parto estimado", "Último parto", "Partos"];
    const lines = rows.map((r) => [r.s.ear_tag, r.s.name ?? "", SOW_STATUS[r.s.status]?.label ?? r.s.status, r.lastB?.breeding_date ?? "", r.lastB?.pregnancy_check ?? "", r.lastB?.expected_farrowing ?? "", r.lastL?.farrowing_date ?? "", r.parity]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = "matrizes.csv";
    a.click();
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
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} w-auto`}>
          <option value="todas">Todas</option>
          {Object.entries(SOW_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button variant="outline" className="h-11" onClick={exportCsv} disabled={!rows.length}><Download className="mr-2 h-4 w-4" />CSV</Button>
      </div>

      {sows.isLoading ? <p className="label-tech animate-pulse-soft">Carregando…</p> : rows.length === 0 ? (
        <Empty>{sows.data?.length ? "Nenhuma matriz com esses filtros." : "Nenhuma matriz cadastrada. Toque em “Nova matriz” para começar."}</Empty>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => <SowCard key={r.s.id} r={r} onDone={refresh} />)}
          </div>
          {/* Desktop table */}
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

type Row = { s: Sow; lastB?: { id: string; breeding_date: string; pregnancy_check: string; expected_farrowing: string | null }; lastL?: { farrowing_date: string }; parity: number };

function SowCard({ r, onDone }: { r: Row; onDone: () => void }) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-lg">{r.s.ear_tag}</p>
          <p className="text-sm text-muted-foreground">{r.s.name ?? "Sem nome"} · {r.parity} parto(s)</p>
        </div>
        <span className={`text-sm ${SOW_STATUS[r.s.status]?.tone}`}>{SOW_STATUS[r.s.status]?.label}</span>
      </div>
      {r.lastB && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Cobertura {fmtDate(r.lastB.breeding_date)} · {r.lastB.pregnancy_check} · parto est. {fmtDate(r.lastB.expected_farrowing)}
        </p>
      )}
      <div className="mt-3"><SowActions s={r.s} lastB={r.lastB} onDone={onDone} /></div>
    </div>
  );
}

function SowActions({ s, lastB, onDone }: { s: Sow; lastB?: Row["lastB"]; onDone: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <NewBreeding sow={s} onDone={onDone} />
      {lastB && lastB.pregnancy_check === "pendente" && <PregCheck sow={s} breedingId={lastB.id} onDone={onDone} />}
      <NewLitter sow={s} onDone={onDone} />
    </div>
  );
}

function NewSow({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title="Nova matriz" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4" />Nova matriz</Button>}>
      {(close) => (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          const f = new FormData(e.currentTarget);
          const { error } = await supabase.from("sows").insert({
            ear_tag: String(f.get("ear_tag")), name: String(f.get("name") || "") || null, breed: String(f.get("breed") || "") || null,
            birth_date: String(f.get("birth_date") || "") || null, status: String(f.get("status")),
          });
          setBusy(false);
          if (error) return toast.error(error.message);
          toast.success("Matriz cadastrada"); onDone(); close();
        }}>
          <Field label="Brinco *"><Input name="ear_tag" required className="h-11" /></Field>
          <Field label="Nome"><Input name="name" className="h-11" /></Field>
          <Field label="Raça / genética"><Input name="breed" className="h-11" /></Field>
          <Field label="Nascimento"><Input name="birth_date" type="date" className="h-11" /></Field>
          <Field label="Situação"><select name="status" className={selectCls} defaultValue="vazia">{Object.entries(SOW_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}

function NewBreeding({ sow, onDone }: { sow: Sow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title={`Cobertura · ${sow.ear_tag}`} trigger={<Button size="sm" variant="outline">Cobertura</Button>}>
      {(close) => (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          const f = new FormData(e.currentTarget);
          const { error } = await supabase.from("breedings").insert({ sow_id: sow.id, breeding_date: String(f.get("date")), boar: String(f.get("boar") || "") || null });
          if (!error) await supabase.from("sows").update({ status: "coberta" }).eq("id", sow.id);
          setBusy(false);
          if (error) return toast.error(error.message);
          toast.success("Cobertura registrada · parto estimado em 114 dias"); onDone(); close();
        }}>
          <Field label="Data da cobertura"><Input name="date" type="date" required defaultValue={todayISO()} className="h-11" /></Field>
          <Field label="Reprodutor / sêmen"><Input name="boar" className="h-11" /></Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}

function PregCheck({ sow, breedingId, onDone }: { sow: Sow; breedingId: string; onDone: () => void }) {
  async function set(result: "positivo" | "negativo") {
    const { error } = await supabase.from("breedings").update({ pregnancy_check: result }).eq("id", breedingId);
    if (!error) await supabase.from("sows").update({ status: result === "positivo" ? "gestante" : "vazia" }).eq("id", sow.id);
    if (error) return toast.error(error.message);
    toast.success(`Diagnóstico ${result}`); onDone();
  }
  return (
    <FormDialog title={`Diagnóstico · ${sow.ear_tag}`} trigger={<Button size="sm" variant="outline">Diagnóstico</Button>}>
      {(close) => (
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-12" onClick={async () => { await set("positivo"); close(); }}>Positivo</Button>
          <Button className="h-12" variant="outline" onClick={async () => { await set("negativo"); close(); }}>Negativo</Button>
        </div>
      )}
    </FormDialog>
  );
}

function NewLitter({ sow, onDone }: { sow: Sow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title={`Registrar parto · ${sow.ear_tag}`} trigger={<Button size="sm">Parto</Button>}>
      {(close) => (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const alive = Number(f.get("alive")), still = Number(f.get("still"));
          if (!confirm(`Confirmar parto: ${alive} vivos e ${still} natimortos?`)) return;
          setBusy(true);
          const { error } = await supabase.from("litters").insert({
            sow_id: sow.id, farrowing_date: String(f.get("date")), born_alive: alive, stillborn: still, born_total: alive + still,
          });
          if (!error) await supabase.from("sows").update({ status: "lactante" }).eq("id", sow.id);
          setBusy(false);
          if (error) return toast.error(error.message);
          toast.success("Parto registrado"); onDone(); close();
        }}>
          <Field label="Data do parto"><Input name="date" type="date" required defaultValue={todayISO()} className="h-11" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nascidos vivos"><Input name="alive" type="number" min={0} required inputMode="numeric" className="h-11" /></Field>
            <Field label="Natimortos"><Input name="still" type="number" min={0} defaultValue={0} inputMode="numeric" className="h-11" /></Field>
          </div>
          <SubmitRow busy={busy} label="Registrar parto" />
        </form>
      )}
    </FormDialog>
  );
}
