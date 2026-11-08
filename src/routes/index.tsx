import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Leaf, ShieldCheck, ClipboardList, Sprout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/farm/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
 head:()=>({meta:[{title:"Fazenda Santo Antônio | Gestão da Suinocultura"},{name:"description",content:"Gestão simples e profissional de matrizes, maternidade, lotes, sanidade e manejo da Fazenda Santo Antônio."},{property:"og:title",content:"Fazenda Santo Antônio | Gestão da Suinocultura"},{property:"og:description",content:"Toda a rotina da granja organizada em um só lugar."},{property:"og:type",content:"website"}]}),
 component:Index,
});
function Index(){
 const navigate=useNavigate();
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session)navigate({to:"/painel",replace:true});});},[navigate]);
 return <main className="relative min-h-screen overflow-hidden bg-background">
  <div className="absolute inset-x-0 top-0 h-[460px] bg-gradient-to-br from-[#194b31] via-[#286644] to-[#397b4d]"/>
  <div className="absolute -right-24 top-16 h-80 w-80 rounded-full border border-white/10"/><div className="absolute -right-8 top-32 h-48 w-48 rounded-full border border-white/10"/>
  <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-7 sm:px-8">
   <header className="flex items-center gap-3 text-white"><LogoMark className="h-11 w-11"/><div><p className="text-sm font-semibold tracking-wide">FAZENDA</p><p className="text-lg font-bold leading-tight">Santo Antônio</p></div><span className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/85">Gestão da suinocultura</span></header>
   <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_.9fr]">
    <div className="max-w-2xl text-white"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium"><Leaf className="h-3.5 w-3.5"/> Organização do campo à gestão</span>
     <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">Sua granja, organizada. Sua produção, sob controle.</h1>
     <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">Acompanhe matrizes, partos, leitões, lotes, sanidade, ração e tarefas em uma plataforma feita para a rotina da suinocultura.</p>
     <Button asChild size="lg" className="mt-8 h-12 rounded-xl bg-white px-6 font-semibold text-[#205638] hover:bg-white/90"><Link to="/auth">Acessar meu sistema <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>
    </div>
    <div className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md sm:p-6"><div className="rounded-2xl bg-white p-5 text-foreground shadow-xl sm:p-6">
     <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Painel da fazenda</p><p className="mt-1 text-xl font-bold">Tudo em um só lugar</p></div><span className="rounded-xl bg-emerald-50 p-3 text-primary"><Sprout className="h-6 w-6"/></span></div>
     <div className="mt-6 grid grid-cols-2 gap-3"><Feature icon={<Leaf/>} title="Rebanho" detail="Matrizes e reprodução"/><Feature icon={<Sprout/>} title="Maternidade" detail="Partos e leitões"/><Feature icon={<ShieldCheck/>} title="Sanidade" detail="Histórico e cuidados"/><Feature icon={<ClipboardList/>} title="Manejo" detail="Rotinas e tarefas"/></div>
     <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">Informações organizadas para decisões melhores todos os dias.</p>
    </div></div>
   </section>
   <footer className="flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/60"><span>Fazenda Santo Antônio</span><span>Gestão simples. Manejo bem feito.</span></footer>
  </div>
 </main>;
}
function Feature({icon,title,detail}:{icon:React.ReactNode;title:string;detail:string}){return <div className="rounded-xl border bg-background p-3"><span className="inline-flex rounded-lg bg-emerald-50 p-2 text-primary">{icon}</span><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;}
