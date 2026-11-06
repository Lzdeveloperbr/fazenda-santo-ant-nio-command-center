import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Users, Archive, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const db = supabase as any;
const batchesQuery = { queryKey: ["production_batches"], queryFn: async () => {
  const { data, error } = await db.from("production_batches").select("*").order("entry_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
} };

const PHASES: Record<string,string> = { creche:"Creche", crescimento:"Crescimento", terminacao:"Terminação", reprodutores:"Reprodutores", quarentena:"Quarentena" };

export const Route = createFileRoute("/_authenticated/lotes")({
  head: () => ({ meta: [{ title: "Lotes | Fazenda Santo Antônio" }] }),
  component: Lotes,
});

function Lotes() {
  const qc = useQueryClient();
  const q = useQuery(batchesQuery);
  const [search, setSearch] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["production_batches"] });
  const rows = (q.data ?? []).filter((b: any) => [b.name,b.pen,b.origin].join(" ").toLowerCase().includes(search.toLowerCase()));
  const active = rows.filter((b: any) => b.status === "ativo");
  const heads = active.reduce((n: number,b: any) => n + b.current_headcount,0);

  return <div className="space-y-6">
    <SectionTitle kicker="Produção por fase" title="Lotes e instalações" action={<NewBatch onDone={refresh} />} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <div className="farm-surface p-4"><p className="label-tech">Lotes ativos</p><p className="mt-2 font-mono text-3xl">{active.length}</p></div>
      <div className="farm-surface p-4"><p className="label-tech">Animais alojados</p><p className="mt-2 font-mono text-3xl">{heads}</p></div>
      <div className="farm-surface col-span-2 p-4 md:col-span-1"><p className="label-tech">Fases acompanhadas</p><p className="mt-2 text-sm font-semibold">Creche · Crescimento · Terminação</p></div>
    </div>
    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar lote, baia ou origem" className="h-11 pl-9"/></div>
    {q.isLoading ? <p className="label-tech">Carregando lotes…</p> : rows.length === 0 ? <Empty>Nenhum lote cadastrado. Crie o primeiro lote para começar o acompanhamento por fase.</Empty> :
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((b: any)=><article key={b.id} className="farm-surface p-4">
        <div className="flex items-start justify-between gap-2"><div><p className="label-tech">{PHASES[b.phase] ?? b.phase}</p><h3 className="mt-1 text-lg font-semibold">{b.name}</h3></div><span className={`rounded-full px-2.5 py-1 text-xs ${b.status === "ativo" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{b.status === "ativo" ? "Ativo" : "Encerrado"}</span></div>
        <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-background/60 p-3"><p className="text-xs text-muted-foreground">Animais atuais</p><p className="mt-1 font-mono text-2xl">{b.current_headcount}</p></div><div className="rounded-xl bg-background/60 p-3"><p className="text-xs text-muted-foreground">Entrada</p><p className="mt-2 text-sm font-semibold">{new Date(b.entry_date+"T12:00:00").toLocaleDateString("pt-BR")}</p></div></div>
        <p className="mt-3 text-xs text-muted-foreground">{b.pen ? "Baia: "+b.pen : "Baia não informada"}{b.origin ? " · Origem: "+b.origin : ""}</p>
        {b.notes && <p className="mt-2 text-xs text-muted-foreground">{b.notes}</p>}
        {b.status === "ativo" && <div className="mt-4 flex flex-wrap gap-2"><AdjustHeads batch={b} onDone={refresh}/><Button size="sm" variant="outline" onClick={async()=>{if(!confirm("Encerrar este lote?"))return;const {error}=await db.from("production_batches").update({status:"encerrado"}).eq("id",b.id);if(error)toast.error(error.message);else{toast.success("Lote encerrado");refresh();}}}><Archive className="mr-1 h-3.5 w-3.5"/>Encerrar</Button></div>}
      </article>)}</div>}
  </div>;
}

function NewBatch({onDone}:{onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog title="Cadastrar lote" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4"/>Novo lote</Button>}>{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const n=Number(f.get("heads"));const {error}=await db.from("production_batches").insert({name:String(f.get("name")),phase:String(f.get("phase")),entry_date:String(f.get("date")),initial_headcount:n,current_headcount:n,pen:String(f.get("pen")||"")||null,origin:String(f.get("origin")||"")||null,notes:String(f.get("notes")||"")||null});setBusy(false);if(error)return toast.error(error.message);toast.success("Lote cadastrado");onDone();close();}}>
 <Field label="Identificação do lote"><Input name="name" required className="h-11" placeholder="Ex.: Lote 01 - Novembro"/></Field>
 <Field label="Fase"><select name="phase" className={selectCls}><option value="creche">Creche</option><option value="crescimento">Crescimento</option><option value="terminacao">Terminação</option><option value="reprodutores">Reprodutores</option><option value="quarentena">Quarentena</option></select></Field>
 <div className="grid grid-cols-2 gap-3"><Field label="Data de entrada"><Input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="h-11"/></Field><Field label="Quantidade inicial"><Input name="heads" type="number" min="0" required className="h-11"/></Field></div>
 <div className="grid grid-cols-2 gap-3"><Field label="Baia / instalação"><Input name="pen" className="h-11"/></Field><Field label="Origem"><Input name="origin" className="h-11"/></Field></div>
 <Field label="Observações"><Input name="notes" className="h-11"/></Field><SubmitRow busy={busy} label="Salvar lote"/>
 </form>}</FormDialog>;
}

function AdjustHeads({batch,onDone}:{batch:any;onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog title={`Atualizar quantidade · ${batch.name}`} trigger={<Button size="sm" variant="outline"><Users className="mr-1 h-3.5 w-3.5"/>Ajustar animais</Button>}>{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const count=Number(f.get("count"));if(count>batch.initial_headcount){setBusy(false);return toast.error("Quantidade atual não pode superar a quantidade inicial.");}const {error}=await db.from("production_batches").update({current_headcount:count}).eq("id",batch.id);setBusy(false);if(error)return toast.error(error.message);toast.success("Quantidade atualizada");onDone();close();}}>
 <Field label="Quantidade atual de animais"><Input name="count" type="number" min="0" max={batch.initial_headcount} defaultValue={batch.current_headcount} required className="h-11"/></Field><p className="text-xs text-muted-foreground">Registre a quantidade atual após mortes, transferências ou saídas. O histórico detalhado de ocorrências será ampliado no módulo de sanidade.</p><SubmitRow busy={busy} label="Atualizar"/>
 </form>}</FormDialog>;
}
