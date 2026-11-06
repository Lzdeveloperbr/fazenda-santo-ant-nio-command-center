import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Package, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const db=supabase as any;
const stockQuery={queryKey:["feed_products"],queryFn:async()=>{const {data,error}=await db.from("feed_products").select("*").order("name");if(error)throw error;return data??[];}};
const movementsQuery={queryKey:["feed_movements"],queryFn:async()=>{const {data,error}=await db.from("feed_movements").select("*, feed_products(name,unit)").order("movement_date",{ascending:false}).limit(30);if(error)throw error;return data??[];}};
const STAGES:Record<string,string>={pre_inicial:"Pré-inicial",inicial:"Inicial",crescimento:"Crescimento",terminacao:"Terminação",gestacao:"Gestação",lactacao:"Lactação",reprodutor:"Reprodutor",outro:"Outro"};

export const Route=createFileRoute("/_authenticated/estoque")({head:()=>({meta:[{title:"Estoque de ração | Fazenda Santo Antônio"}]}),component:Estoque});

function Estoque(){
 const qc=useQueryClient();const products=useQuery(stockQuery);const moves=useQuery(movementsQuery);
 const refresh=()=>{qc.invalidateQueries({queryKey:["feed_products"]});qc.invalidateQueries({queryKey:["feed_movements"]});};
 const rows=products.data??[];const low=rows.filter((p:any)=>p.current_stock<=p.minimum_stock);
 const value=rows.reduce((n:number,p:any)=>n+Number(p.current_stock)*Number(p.cost_per_unit),0);
 return <div className="space-y-6">
  <SectionTitle kicker="Almoxarifado e nutrição" title="Estoque de ração" action={<NewProduct onDone={refresh}/>}/>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3"><div className="farm-surface p-4"><p className="label-tech">Produtos cadastrados</p><p className="mt-2 font-mono text-3xl">{rows.length}</p></div><div className="farm-surface p-4"><p className="label-tech">Abaixo do mínimo</p><p className="mt-2 font-mono text-3xl">{low.length}</p></div><div className="farm-surface col-span-2 p-4 md:col-span-1"><p className="label-tech">Valor estimado em estoque</p><p className="mt-2 font-mono text-2xl">{value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div></div>
  {low.length>0&&<div className="rounded-xl border border-warn/35 bg-warn/5 p-3 text-sm text-warn"><AlertTriangle className="mr-2 inline h-4 w-4"/>Atenção: {low.length} produto(s) no limite ou abaixo do estoque mínimo.</div>}
  {products.isLoading?<p className="label-tech">Carregando estoque…</p>:rows.length===0?<Empty>Nenhuma ração cadastrada. Cadastre os produtos para começar a controlar entradas, consumo e saldo.</Empty>:
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((p:any)=><article key={p.id} className="farm-surface p-4">
    <div className="flex items-start justify-between gap-2"><div><p className="label-tech">{STAGES[p.feed_stage]??p.feed_stage}</p><h3 className="mt-1 font-semibold">{p.name}</h3></div><Package className="h-5 w-5 text-primary"/></div>
    <p className="mt-4 font-mono text-3xl">{Number(p.current_stock).toLocaleString("pt-BR")} <span className="text-sm text-muted-foreground">{p.unit}</span></p>
    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Mínimo: {Number(p.minimum_stock).toLocaleString("pt-BR")} {p.unit}</span><span className={p.current_stock<=p.minimum_stock?"font-semibold text-warn":"text-primary"}>{p.current_stock<=p.minimum_stock?"Repor estoque":"Estoque normal"}</span></div>
    {p.supplier&&<p className="mt-2 text-xs text-muted-foreground">Fornecedor: {p.supplier}</p>}
    <div className="mt-4 flex gap-2"><Movement product={p} type="entrada" onDone={refresh}/><Movement product={p} type="saida" onDone={refresh}/></div>
   </article>)}</div>}
  <section className="space-y-3"><div><p className="label-tech">Rastreabilidade</p><h2 className="mt-1 text-lg font-semibold">Últimas movimentações</h2></div>
   {moves.isLoading?<p className="label-tech">Carregando movimentações…</p>:!moves.data?.length?<Empty>As entradas e saídas aparecerão aqui.</Empty>:
    <div className="farm-surface divide-y divide-border/70">{moves.data.map((m:any)=><div key={m.id} className="flex items-center gap-3 p-3"><span className={`rounded-xl p-2 ${m.movement_type==="entrada"?"bg-primary/10 text-primary":"bg-warn/10 text-warn"}`}>{m.movement_type==="entrada"?<ArrowDownToLine className="h-4 w-4"/>:<ArrowUpFromLine className="h-4 w-4"/>}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.feed_products?.name??"Produto"}</p><p className="text-xs text-muted-foreground">{m.movement_type==="entrada"?"Entrada":"Saída"} · {new Date(m.movement_date+"T12:00:00").toLocaleDateString("pt-BR")}{m.notes?" · "+m.notes:""}</p></div><p className="font-mono text-sm">{m.movement_type==="entrada"?"+":"−"}{Number(m.quantity).toLocaleString("pt-BR")} {m.feed_products?.unit??""}</p></div>)}</div>}
  </section>
 </div>;
}

function NewProduct({onDone}:{onDone:()=>void}){
 const [busy,setBusy]=useState(false);
 return <FormDialog title="Cadastrar ração" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4"/>Novo produto</Button>}>{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const {error}=await db.from("feed_products").insert({name:String(f.get("name")),feed_stage:String(f.get("stage")),unit:String(f.get("unit")),minimum_stock:Number(f.get("minimum")||0),cost_per_unit:Number(f.get("cost")||0),supplier:String(f.get("supplier")||"")||null});setBusy(false);if(error)return toast.error(error.message);toast.success("Produto cadastrado");onDone();close();}}>
 <Field label="Nome da ração"><Input name="name" required className="h-11" placeholder="Ex.: Crescimento 1"/></Field>
 <div className="grid grid-cols-2 gap-3"><Field label="Fase"><select name="stage" className={selectCls}>{Object.entries(STAGES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field><Field label="Unidade"><select name="unit" className={selectCls}><option value="kg">Quilogramas</option><option value="saco">Sacos</option><option value="unidade">Unidades</option></select></Field></div>
 <div className="grid grid-cols-2 gap-3"><Field label="Estoque mínimo"><Input name="minimum" type="number" min="0" step="0.01" defaultValue="0" className="h-11"/></Field><Field label="Custo por unidade (R$)"><Input name="cost" type="number" min="0" step="0.01" defaultValue="0" className="h-11"/></Field></div>
 <Field label="Fornecedor"><Input name="supplier" className="h-11"/></Field><p className="text-xs text-muted-foreground">O saldo inicial será registrado como uma entrada depois do cadastro, para manter o histórico de movimentações.</p><SubmitRow busy={busy} label="Cadastrar produto"/>
 </form>}</FormDialog>;
}

function Movement({product,type,onDone}:{product:any;type:"entrada"|"saida";onDone:()=>void}){
 const [busy,setBusy]=useState(false);
 return <FormDialog title={(type==="entrada"?"Entrada de estoque · ":"Saída de estoque · ")+product.name} trigger={<Button size="sm" variant={type==="entrada"?"default":"outline"} className="flex-1">{type==="entrada"?<ArrowDownToLine className="mr-1 h-3.5 w-3.5"/>:<ArrowUpFromLine className="mr-1 h-3.5 w-3.5"/>}{type==="entrada"?"Entrada":"Saída"}</Button>}>{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const quantity=Number(f.get("quantity"));if(type==="saida"&&quantity>Number(product.current_stock)){setBusy(false);return toast.error("Quantidade maior que o estoque disponível.");}const {error}=await db.from("feed_movements").insert({product_id:product.id,movement_type:type,quantity,movement_date:String(f.get("date")),unit_cost:type==="entrada"&&f.get("cost")?Number(f.get("cost")):null,notes:String(f.get("notes")||"")||null});setBusy(false);if(error)return toast.error(error.message);toast.success(type==="entrada"?"Entrada registrada":"Saída registrada");onDone();close();}}>
 <p className="text-sm text-muted-foreground">Saldo atual: <strong className="text-foreground">{Number(product.current_stock).toLocaleString("pt-BR")} {product.unit}</strong></p>
 <Field label={"Quantidade ("+product.unit+")"}><Input name="quantity" type="number" min="0.01" step="0.01" required className="h-11"/></Field>
 <Field label="Data"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required className="h-11"/></Field>
 {type==="entrada"&&<Field label="Custo unitário (R$)"><Input name="cost" type="number" min="0" step="0.01" className="h-11"/></Field>}
 <Field label="Observação"><Input name="notes" className="h-11"/></Field><SubmitRow busy={busy} label="Confirmar movimentação"/>
 </form>}</FormDialog>;
}
