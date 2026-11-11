import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Activity, Plus, Scale, TrendingUp, Wheat, Table2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayISO, fmtDate } from "@/lib/farm";

const db = supabase as any;
const batchesQuery = { queryKey: ["production_batches"], queryFn: async () => { const {data,error}=await db.from("production_batches").select("*").order("entry_date",{ascending:false}); if(error)throw error; return data??[]; } };
const weightsQuery = { queryKey: ["batch_weights"], queryFn: async () => { const {data,error}=await db.from("batch_weights").select("*").order("weigh_date",{ascending:false}); if(error)throw error; return data??[]; } };
const feedQuery = { queryKey: ["batch_feed_consumption"], queryFn: async () => { const {data,error}=await db.from("feed_movements").select("batch_id,quantity,movement_date,feed_products(unit)").eq("movement_type","saida").not("batch_id","is",null); if(error)throw error; return data??[]; } };
const PHASES:Record<string,string>={creche:"Creche",crescimento:"Crescimento",terminacao:"Terminação",reprodutores:"Reprodutores",quarentena:"Quarentena"};

export const Route=createFileRoute("/_authenticated/desempenho")({head:()=>({meta:[{title:"Desempenho | Fazenda Santo Antônio"},{name:"description",content:"Pesagem, ganho de peso e consumo de ração por lote."}]}),component:Desempenho});

function Desempenho(){
 const qc=useQueryClient(); const batches=useQuery(batchesQuery); const weights=useQuery(weightsQuery); const feed=useQuery(feedQuery);
 const refresh=()=>{qc.invalidateQueries({queryKey:["batch_weights"]});qc.invalidateQueries({queryKey:["production_batches"]});};
 const active=(batches.data??[]).filter((b:any)=>b.status==="ativo"); const rows=weights.data??[];
 const weighed=new Set(rows.map((w:any)=>w.batch_id)).size;
 const summary=useMemo(()=>active.map((b:any)=>{const history=rows.filter((w:any)=>w.batch_id===b.id).sort((a:any,c:any)=>a.weigh_date.localeCompare(c.weigh_date));const last=history.at(-1),prev=history.at(-2);const days=last&&prev?Math.round((new Date(last.weigh_date+"T12:00:00").getTime()-new Date(prev.weigh_date+"T12:00:00").getTime())/86400000):0;const gmd=last&&prev&&days>0?(Number(last.average_weight_kg)-Number(prev.average_weight_kg))/days*1000:null;return {id:b.id,name:b.name,phase:PHASES[b.phase]??b.phase,headcount:b.current_headcount,last:last?Number(last.average_weight_kg):null,date:last?.weigh_date??null,sample:last?.sample_size??null,gmd};}),[active,rows]);
 return <div className="space-y-6">
  <SectionTitle kicker="Indicadores zootécnicos" title="Desempenho e pesagens"/>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
   <Stat label="Lotes ativos" value={active.length} icon={<Activity className="h-4 w-4"/>}/>
   <Stat label="Lotes com pesagem" value={weighed} icon={<Scale className="h-4 w-4"/>}/>
   <Stat label="Pesagens registradas" value={rows.length} icon={<TrendingUp className="h-4 w-4"/>}/>
  </div>
  {summary.length>0&&<section className="farm-surface overflow-hidden">
   <div className="flex items-center gap-2 border-b border-border px-4 py-3"><Table2 className="h-4 w-4 text-muted-foreground"/><div><h2 className="text-sm font-semibold">Comparativo dos lotes ativos</h2><p className="text-xs text-muted-foreground">Última pesagem disponível por lote</p></div></div>
   <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Lote / fase</th><th className="px-3 py-3 font-medium">Animais</th><th className="px-3 py-3 font-medium">Peso médio</th><th className="px-3 py-3 font-medium">GMD</th><th className="px-3 py-3 font-medium">Data</th><th className="px-3 py-3 font-medium">Amostra</th></tr></thead><tbody className="divide-y divide-border">{summary.map((r:any)=><tr key={r.id}><td className="px-4 py-3"><strong>{r.name}</strong><p className="text-xs text-muted-foreground">{r.phase}</p></td><td className="px-3 py-3 font-mono">{r.headcount}</td><td className="px-3 py-3 font-mono">{r.last===null?"—":r.last.toFixed(2)+" kg"}</td><td className="px-3 py-3 font-mono">{r.gmd===null?"—":Math.round(r.gmd)+" g/dia"}</td><td className="px-3 py-3 font-mono text-xs">{fmtDate(r.date)}</td><td className="px-3 py-3 font-mono">{r.sample??"—"}</td></tr>)}</tbody></table></div>
  </section>}
  {(batches.isError||weights.isError||feed.isError)&&<p className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">Falha ao carregar dados. Verifique a conexão e a migração de pesagens.</p>}
  {(batches.isLoading||weights.isLoading||feed.isLoading)?<p className="label-tech">Carregando desempenho…</p>:active.length===0?<Empty>Cadastre um lote ativo em “Lotes por fase” para iniciar o acompanhamento.</Empty>:
   <div className="grid gap-4 xl:grid-cols-2">{active.map((b:any)=>{
    const history=rows.filter((w:any)=>w.batch_id===b.id).sort((a:any,c:any)=>a.weigh_date.localeCompare(c.weigh_date));
    const last=history.at(-1); const prev=history.length>1?history.at(-2):null;
    const days=prev?Math.round((new Date(last.weigh_date+"T12:00:00").getTime()-new Date(prev.weigh_date+"T12:00:00").getTime())/86400000):0;
    const gmd=prev&&days>0?(Number(last.average_weight_kg)-Number(prev.average_weight_kg))/days*1000:null;
    const first=history[0]?.weigh_date;
    const feedKg=first&&last?(feed.data??[]).filter((m:any)=>m.batch_id===b.id&&m.movement_date>=first&&m.movement_date<=last.weigh_date&&m.feed_products?.unit==="kg").reduce((n:number,m:any)=>n+Number(m.quantity),0):null;
    return <article key={b.id} className="farm-surface space-y-4 p-4 md:p-5">
     <div className="flex items-start justify-between gap-3"><div><p className="label-tech">{PHASES[b.phase]??b.phase} · {b.pen||"Baia não informada"}</p><h2 className="mt-1 text-lg font-semibold">{b.name}</h2><p className="text-xs text-muted-foreground">{b.current_headcount} animais alojados</p></div><WeighForm batch={b} onDone={refresh}/></div>
     <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-background/70 p-3"><p className="text-xs text-muted-foreground">Último peso médio</p><p className="mt-1 font-mono text-2xl">{last?Number(last.average_weight_kg).toFixed(2)+" kg":"—"}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">{last?fmtDate(last.weigh_date)+" · amostra "+last.sample_size:"Sem pesagem"}</p></div>
      <div className="rounded-xl bg-background/70 p-3"><p className="text-xs text-muted-foreground">Ganho médio diário</p><p className="mt-1 font-mono text-2xl">{gmd!==null&&Number.isFinite(gmd)?Math.round(gmd)+" g/dia":"—"}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">{prev?"Entre as duas últimas pesagens":"Registre duas pesagens"}</p></div>
     </div>
     <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><Wheat className="h-4 w-4"/>Saída de ração (kg)</span><strong className="font-mono">{feedKg===null?"—":feedKg.toLocaleString("pt-BR",{maximumFractionDigits:1})+" kg"}</strong></div>
     {history.length>0?<div className="space-y-3"><p className="label-tech">Evolução do peso médio</p><div className="h-52"><ResponsiveContainer width="100%" height="100%"><LineChart data={history.map((w:any)=>({date:fmtDate(w.weigh_date),weight:Number(w.average_weight_kg)}))} margin={{top:8,right:12,left:-16,bottom:0}}><CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="date" tick={{fontSize:10}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:10}} tickLine={false} axisLine={false} domain={["auto","auto"]}/><Tooltip formatter={(v:any)=>[Number(v).toFixed(2)+" kg","Peso médio"]} contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12}}/><Line type="monotone" dataKey="weight" name="Peso médio" stroke="var(--ok)" strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}}/></LineChart></ResponsiveContainer></div><p className="label-tech">Pesagens recentes</p>{history.slice(-4).reverse().map((w:any)=><div key={w.id} className="flex justify-between border-b border-border/60 pb-2 text-sm last:border-0"><span className="text-muted-foreground">{fmtDate(w.weigh_date)} · {w.sample_size} animais</span><strong className="font-mono">{Number(w.average_weight_kg).toFixed(2)} kg</strong></div>)}</div>:<Empty>Registre a primeira pesagem para iniciar o histórico.</Empty>}
     <p className="text-[0.68rem] text-muted-foreground">GMD estimado pela variação do peso médio entre pesagens. A ração considera somente saídas em kg vinculadas ao lote; não é conversão alimentar.</p>
    </article>;
   })}</div>}
 </div>;
}
function Stat({label,value,icon}:{label:string;value:number;icon:ReactNode}){return <div className="farm-surface p-4"><div className="flex items-center justify-between text-muted-foreground"><p className="label-tech">{label}</p>{icon}</div><p className="mt-2 font-mono text-3xl">{value}</p></div>;}
function WeighForm({batch,onDone}:{batch:any;onDone:()=>void}){
 const [busy,setBusy]=useState(false);
 return <FormDialog title={"Registrar pesagem · "+batch.name} trigger={<Button size="sm" className="h-9"><Plus className="mr-1 h-4 w-4"/>Pesagem</Button>}>{close=><form className="space-y-4" onSubmit={async (e):Promise<any>=>{
  e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const weight=Number(f.get("weight"));const sample=Number(f.get("sample"));
  if(!Number.isFinite(weight)||weight<=0||!Number.isInteger(sample)||sample<1||sample>Number(batch.current_headcount)){setBusy(false);return toast.error("Confira o peso e o tamanho da amostra.");}
  const {error}=await db.from("batch_weights").insert({batch_id:batch.id,weigh_date:String(f.get("date")),average_weight_kg:weight,sample_size:sample,notes:String(f.get("notes")||"")||null});
  setBusy(false);if(error)return toast.error(error.message);toast.success("Pesagem registrada");onDone();close();
 }}>
  <p className="text-sm text-muted-foreground">Lote com {batch.current_headcount} animais. Informe o peso médio da amostra, não o peso total.</p>
  <Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} required className="h-11"/></Field>
  <div className="grid grid-cols-2 gap-3"><Field label="Peso médio (kg)"><Input name="weight" type="number" min="0.01" step="0.01" required className="h-11" placeholder="32.50"/></Field><Field label="Animais pesados"><Input name="sample" type="number" min="1" max={batch.current_headcount} required className="h-11"/></Field></div>
  <Field label="Observações"><Input name="notes" className="h-11" placeholder="Balança, baia ou condição dos animais"/></Field><SubmitRow busy={busy} label="Salvar pesagem"/>
 </form>}</FormDialog>;
}
