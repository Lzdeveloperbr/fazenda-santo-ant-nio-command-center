import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
export function Kpi({label,value,unit,icon:Icon,tone="text-foreground",source,to,delay=0,hint}:{label:string;value:number|string;unit?:string;icon:LucideIcon;tone?:string;source:string;to?: "/painel"|"/matrizes"|"/maternidade"|"/tarefas";delay?:number;hint?:ReactNode}){
 const body=<div className="panel group h-full animate-rise p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg sm:p-5" style={{animationDelay:`${delay}ms`}}>
  <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold leading-snug text-muted-foreground">{label}</p><span className="rounded-xl bg-[#EAF0E8] p-2.5 text-primary transition-colors group-hover:bg-[#DCE9DC]"><Icon className="h-[18px] w-[18px]"/></span></div>
  <p className="mt-4 flex flex-wrap items-baseline gap-2"><span className={`text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${tone}`}>{value}</span>{unit&&<span className="text-xs text-muted-foreground">{unit}</span>}</p>
  {hint&&<div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
  <p className="mt-4 border-t border-border/70 pt-3 text-[.68rem] font-semibold text-muted-foreground">Ver detalhes · {source}</p>
 </div>;
 return to?<Link to={to} className="block">{body}</Link>:body;
}
export function SectionTitle({kicker,title,action}:{kicker:string;title:string;action?:ReactNode}){return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[.66rem] font-bold uppercase tracking-[.16em] text-primary">{kicker}</p><h2 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2></div>{action}</div>;}
export function Empty({children}:{children:ReactNode}){return <div className="rounded-2xl border border-dashed border-border bg-muted/45 p-8 text-center text-sm leading-6 text-muted-foreground">{children}</div>;}
