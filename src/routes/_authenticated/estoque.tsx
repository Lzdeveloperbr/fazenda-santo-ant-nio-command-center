import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Wheat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";

const db = supabase as any;
const productsQuery = { queryKey: ["feed_products"], queryFn: async () => { const { data, error } = await db.from("feed_products").select("*").order("name"); if (error) throw error; return data ?? []; } };
const movementsQuery = { queryKey: ["feed_movements"], queryFn: async () => { const { data, error } = await db.from("feed_movements").select("*,feed_products(name)").order("movement_date", { ascending: false }).limit(30); if (error) throw error; return data ?? []; } };
const PHASES: Record<string,string> = { "Pré-inicial":"Pré-inicial", "Inicial":"Inicial", "Crescimento":"Crescimento", "Terminação":"Terminação", "Gestação":"Gestação", "Lactação":"Lactação", "Reprodutor":"Reprodutor", "Outra":"Outra", pre_inicial:"Pré-inicial", inicial:"Inicial", crescimento:"Crescimento", terminacao:"Terminação", gestacao:"Gestação", lactacao:"Lactação", reprodutor:"Reprodutor", outro:"Outra" };

export const Route = createFileRoute("/_authenticated/estoque")({ head: () => ({ meta: [{ title: "Estoque de ração | Fazenda Santo Antônio" }] }), component: Estoque });

function Estoque() {
 const products = useQuery(productsQuery), movements = useQuery(movementsQuery);
 const rows = products.data ?? [];
 const low = rows.filter((p:any) => Number(p.stock_kg) <= Number(p.minimum_stock_kg) && Number(p.minimum_stock_kg) > 0);
 const total = rows.reduce((n:number,p:any) => n + Number(p.stock_kg || 0), 0);
 return <div className="space-y-5">
  <SectionTitle kicker="Almoxarifado e nutrição" title="Estoque de ração" action={<Button asChild><Link to="/baias">Gerenciar ração e baias</Link></Button>} />
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
   <div className="panel p-4"><p className="text-xs text-muted-foreground">Produtos cadastrados</p><p className="mt-2 text-3xl font-bold tabular-nums">{rows.length}</p></div>
   <div className="panel p-4"><p className="text-xs text-muted-foreground">Estoque total</p><p className="mt-2 text-3xl font-bold tabular-nums">{total.toLocaleString("pt-BR",{maximumFractionDigits:1})} kg</p></div>
   <div className="panel col-span-2 p-4 sm:col-span-1"><p className="text-xs text-muted-foreground">Abaixo do mínimo</p><p className="mt-2 text-3xl font-bold tabular-nums">{low.length}</p></div>
  </div>
  {low.length>0&&<div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="h-5 w-5 shrink-0"/><div><b>Reposição necessária</b><p className="mt-1 text-xs">{low.map((p:any)=>p.name).join(" · ")}</p></div></div>}
  <section className="space-y-3"><h3 className="font-bold">Saldo por ração</h3>{products.isLoading?<p className="text-sm text-muted-foreground">Carregando estoque…</p>:rows.length===0?<Empty>Nenhuma ração cadastrada. Use o módulo Baias para cadastrar os produtos e lançar os saldos.</Empty>:<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((p:any)=><article key={p.id} className="panel p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{PHASES[p.phase]??p.phase}</p><b>{p.name}</b></div><Wheat className="h-5 w-5 text-primary"/></div><p className="mt-4 text-3xl font-bold tabular-nums">{Number(p.stock_kg).toLocaleString("pt-BR")} <span className="text-sm text-muted-foreground">kg</span></p><p className="mt-1 text-xs text-muted-foreground">Mínimo: {Number(p.minimum_stock_kg).toLocaleString("pt-BR")} kg</p>{p.supplier&&<p className="mt-2 text-xs text-muted-foreground">Fornecedor: {p.supplier}</p>}</article>)}</div>}</section>
  <section className="space-y-3"><h3 className="font-bold">Movimentações recentes</h3>{movements.data?.length?<div className="panel divide-y">{movements.data.map((m:any)=><div key={m.id} className="flex items-center gap-3 p-3"><span className={m.movement_type==="entrada"?"text-primary":"text-amber-700"}>{m.movement_type==="entrada"?<ArrowDownToLine className="h-4 w-4"/>:<ArrowUpFromLine className="h-4 w-4"/>}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.feed_products?.name??"Ração"}</p><p className="text-xs text-muted-foreground">{new Date(m.movement_date+"T12:00:00").toLocaleDateString("pt-BR")} · {m.notes??"Sem observação"}</p></div><b className="text-sm tabular-nums">{m.movement_type==="entrada"?"+":"−"}{Number(m.quantity_kg).toLocaleString("pt-BR")} kg</b></div>)}</div>:<Empty>As entradas e consumos aparecerão aqui.</Empty>}</section>
 </div>;
}
