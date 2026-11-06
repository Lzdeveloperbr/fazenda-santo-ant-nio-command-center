import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ShieldAlert, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sowsQuery, littersQuery } from "@/lib/farm";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const db = supabase as any;
const batchesQuery = { queryKey: ["production_batches"], queryFn: async () => { const { data, error } = await db.from("production_batches").select("id,name,phase").order("name"); if (error) throw error; return data ?? []; } };
const healthQuery = { queryKey: ["health_records"], queryFn: async () => {
 const {data,error}=await db.from("health_records").select("*").order("record_date",{ascending:false});
 if(error)throw error;return data??[];
}};
const CATEGORIES:Record<string,string>={vacina:"Vacina",medicacao:"Medicação",vermifugo:"Vermifugação",sintoma:"Sintomas",ocorrencia:"Ocorrência",visita:"Visita técnica"};
const GROUPS:Record<string,string>={matriz:"Matriz",leitegada:"Leitegada",lote:"Lote",reprodutor:"Reprodutor"};

export const Route=createFileRoute("/_authenticated/sanidade")({head:()=>({meta:[{title:"Sanidade | Fazenda Santo Antônio"}]}),component:Sanidade});

function Sanidade(){
 const qc=useQueryClient();const q=useQuery(healthQuery);const sows=useQuery(sowsQuery);const litters=useQuery(littersQuery);const batches=useQuery(batchesQuery);
 const [search,setSearch]=useState("");const refresh=()=>qc.invalidateQueries({queryKey:["health_records"]});
 const sowName=(id:string|null)=>sows.data?.find(s=>s.id===id)?.ear_tag??"Matriz";
 const litterName=(id:string|null)=>{const l=litters.data?.find(x=>x.id===id);return l?"Leitegada · "+sowName(l.sow_id):"Leitegada";};\n const batchName=(id:string|null)=>batches.data?.find((b:any)=>b.id===id)?.name??"Lote de produção";
 const rows=(q.data??[]).filter((r:any)=>[r.product,r.notes,r.responsible,CATEGORIES[r.category],GROUPS[r.animal_group]].join(" ").toLowerCase().includes(search.toLowerCase()));
 const today=new Date();const withdrawal=rows.filter((r:any)=>r.withdrawal_days>0&&new Date(r.record_date+"T12:00:00").getTime()+r.withdrawal_days*86400000>=new Date(today.toDateString()).getTime()).length;
 return <div className="space-y-6">
  <SectionTitle kicker="Biosseguridade e saúde" title="Sanidade do rebanho" action={<NewHealth onDone={refresh}/>}/>
  <div className="grid grid-cols-2 gap-3"><div className="farm-surface p-4"><p className="label-tech">Registros realizados</p><p className="mt-2 font-mono text-3xl">{q.data?.length??0}</p></div><div className="farm-surface p-4"><p className="label-tech">Carências em acompanhamento</p><p className="mt-2 font-mono text-3xl">{withdrawal}</p></div></div>
  <div className="rounded-xl border border-warn/30 bg-warn/5 p-3 text-xs leading-5 text-muted-foreground"><ShieldAlert className="mr-2 inline h-4 w-4 text-warn"/>Registre produto, dose, responsável e período de carência conforme a bula e orientação do médico-veterinário. Este módulo é um histórico operacional, não substitui prescrição veterinária.</div>
  <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar produto, categoria ou anotação" className="h-11 pl-9"/></div>
  {q.isLoading?<p className="label-tech">Carregando histórico…</p>:rows.length===0?<Empty>Nenhum registro sanitário encontrado. Adicione a primeira vacinação, medicação ou ocorrência.</Empty>:
   <div className="space-y-3">{rows.map((r:any)=><article key={r.id} className="farm-surface p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="label-tech">{CATEGORIES[r.category]??r.category} · {GROUPS[r.animal_group]??r.animal_group}</p><h3 className="mt-1 font-semibold">{r.product||"Registro sanitário"}</h3></div><span className="font-mono text-xs text-muted-foreground">{new Date(r.record_date+"T12:00:00").toLocaleDateString("pt-BR")}</span></div>
    <p className="mt-2 text-sm text-muted-foreground">{r.animal_group==="matriz"?sowName(r.sow_id):r.animal_group==="leitegada"?litterName(r.litter_id):r.animal_group==="lote"?batchName(r.batch_id):"Reprodutor"}</p>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{r.dosage&&<span>Dose: {r.dosage}</span>}{r.responsible&&<span>Responsável: {r.responsible}</span>}{r.withdrawal_days>0&&<span className="text-warn">Carência: {r.withdrawal_days} dias</span>}</div>
    {r.notes&&<p className="mt-2 whitespace-pre-wrap text-sm">{r.notes}</p>}
   </article>)}</div>}
 </div>;
}

function NewHealth({onDone}:{onDone:()=>void}){
 const [busy,setBusy]=useState(false);const [group,setGroup]=useState("matriz");
 const sows=useQuery(sowsQuery);const litters=useQuery(littersQuery);const batches=useQuery(batchesQuery);
 return <FormDialog title="Novo registro sanitário" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4"/>Registrar</Button>}>{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const animal=String(f.get("animal")||"");const payload:any={record_date:String(f.get("date")),category:String(f.get("category")),animal_group:group,product:String(f.get("product")||"")||null,dosage:String(f.get("dosage")||"")||null,responsible:String(f.get("responsible")||"")||null,withdrawal_days:Number(f.get("withdrawal")||0),notes:String(f.get("notes"))};if(group==="matriz")payload.sow_id=animal||null;if(group==="leitegada")payload.litter_id=animal||null;if(group==="lote")payload.batch_id=animal||null;const {error}=await db.from("health_records").insert(payload);setBusy(false);if(error)return toast.error(error.message);toast.success("Registro sanitário salvo");onDone();close();}}>
 <Field label="Data"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required className="h-11"/></Field>
 <div className="grid grid-cols-2 gap-3"><Field label="Tipo de registro"><select name="category" className={selectCls}>{Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field><Field label="Categoria animal"><select value={group} onChange={e=>setGroup(e.target.value)} className={selectCls}><option value="matriz">Matriz</option><option value="leitegada">Leitegada</option><option value="lote">Lote</option><option value="reprodutor">Reprodutor</option></select></Field></div>
 {group==="matriz"&&<Field label="Matriz"><select name="animal" required className={selectCls}><option value="">Selecione</option>{(sows.data??[]).map(s=><option key={s.id} value={s.id}>{s.ear_tag} {s.name??""}</option>)}</select></Field>}
 {group==="leitegada"&&<Field label="Leitegada"><select name="animal" required className={selectCls}><option value="">Selecione</option>{(litters.data??[]).map(l=><option key={l.id} value={l.id}>{l.farrowing_date} · {sows.data?.find(s=>s.id===l.sow_id)?.ear_tag??"Matriz"}</option>)}</select></Field>}
 {group==="lote"&&<Field label="Lote"><select name="animal" required className={selectCls}><option value="">Selecione</option>{(batches.data??[]).map((b:any)=><option key={b.id} value={b.id}>{b.name} · {b.phase}</option>)}</select></Field>}
 <Field label="Produto / vacina / medicamento"><Input name="product" className="h-11"/></Field>
 <div className="grid grid-cols-2 gap-3"><Field label="Dose / via"><Input name="dosage" className="h-11" placeholder="Conforme bula"/></Field><Field label="Carência (dias)"><Input name="withdrawal" type="number" min="0" defaultValue="0" className="h-11"/></Field></div>
 <Field label="Responsável"><Input name="responsible" className="h-11"/></Field>
 <Field label="Descrição / observações"><textarea name="notes" required rows={3} className={selectCls+" h-auto py-3"} placeholder="Descreva o motivo, sinais observados, conduta e acompanhamento."/></Field>
 <SubmitRow busy={busy} label="Salvar registro"/>
 </form>}</FormDialog>;
}
