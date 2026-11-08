import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Leaf, ShieldCheck, ClipboardList, Sprout, PiggyBank, Baby, Wheat, Activity, ChartNoAxesCombined } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/farm/Logo";
import { Button } from "@/components/ui/button";

export const Route=createFileRoute("/")({head:()=>({meta:[{title:"Fazenda Santo Antônio | Gestão da Suinocultura"},{name:"description",content:"Uma plataforma completa para acompanhar matrizes, maternidade, lotes, sanidade, alimentação e desempenho da suinocultura."},{property:"og:title",content:"Fazenda Santo Antônio | Gestão da Suinocultura"},{property:"og:description",content:"Manejo organizado. Produção acompanhada. Decisões melhores."}]}),component:Index});
function Index(){
 const navigate=useNavigate();useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session)navigate({to:"/painel",replace:true});});},[navigate]);
 return <main className="min-h-screen overflow-hidden bg-[#F5F3EB] text-[#20372A]">
  <section className="relative isolate overflow-hidden bg-[#173F2B] text-white">
   <div className="absolute inset-0 -z-10 opacity-40" style={{backgroundImage:"radial-gradient(circle at 80% 20%, rgba(174,207,155,.28), transparent 28%), radial-gradient(circle at 12% 85%, rgba(215,182,108,.16), transparent 30%)"}}/>
   <div className="absolute -right-32 top-16 -z-10 h-[28rem] w-[28rem] rounded-full border border-white/10"/><div className="absolute -right-12 top-36 -z-10 h-80 w-80 rounded-full border border-white/10"/>
   <div className="mx-auto max-w-7xl px-5 pb-20 pt-7 sm:px-8 lg:pb-28">
    <header className="flex items-center gap-3"><LogoMark className="h-14 w-14"/><div><p className="text-[.65rem] font-bold uppercase tracking-[.2em] text-[#D7B66C]">Gestão da suinocultura</p><p className="mt-1 text-lg font-bold tracking-tight">Fazenda Santo Antônio</p></div><span className="ml-auto hidden rounded-full border border-white/15 bg-white/[.06] px-4 py-2 text-xs font-medium text-white/75 sm:inline-flex">Tecnologia a serviço do campo</span></header>
    <div className="grid items-center gap-12 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:pt-24">
     <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-[#D7B66C]/35 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-[#E7D5A8]"><Leaf className="h-3.5 w-3.5"/> Gestão rural, com visão de produção</span>
      <h1 className="mt-7 text-[2.65rem] font-bold leading-[1.04] tracking-[-.045em] sm:text-6xl lg:text-[4.35rem]">O cuidado com cada animal. A visão de toda a granja.</h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">Organize matrizes, coberturas, partos, leitões, lotes, sanidade, alimentação e resultados em um único centro de gestão.</p>
      <div className="mt-9 flex flex-wrap items-center gap-4"><Button asChild size="lg" className="h-12 rounded-xl bg-[#D7B66C] px-6 font-bold text-[#173F2B] shadow-lg shadow-black/10 hover:bg-[#E4C982]"><Link to="/auth">Entrar no sistema <ArrowRight className="ml-2 h-4 w-4"/></Link></Button><span className="text-xs text-white/50">Acesso exclusivo à equipe autorizada</span></div>
      <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-6 text-xs font-medium text-white/65"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#D7B66C]"/> Dados organizados</span><span className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#D7B66C]"/> Indicadores de produção</span><span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#D7B66C]"/> Rotina de manejo</span></div>
     </div>
     <div className="relative mx-auto w-full max-w-[480px]"><div className="absolute -inset-5 rounded-[2rem] bg-[#D7B66C]/10 blur-2xl"/><div className="relative rounded-[1.8rem] border border-white/15 bg-white/[.08] p-3 shadow-2xl backdrop-blur-xl sm:p-5">
      <div className="rounded-[1.3rem] bg-[#FBFAF6] p-5 text-[#20372A] sm:p-6"><div className="flex items-center justify-between border-b border-[#E8E5DA] pb-4"><div><p className="text-[.62rem] font-bold uppercase tracking-[.17em] text-[#718074]">Centro de gestão</p><p className="mt-1 text-xl font-bold">Sua granja em foco</p></div><LogoMark className="h-11 w-11"/></div>
       <div className="mt-5 grid grid-cols-2 gap-3"><Feature icon={PiggyBank} title="Rebanho" detail="Matrizes e reprodução"/><Feature icon={Baby} title="Maternidade" detail="Partos e leitegadas"/><Feature icon={ShieldCheck} title="Sanidade" detail="Registros e cuidados"/><Feature icon={Wheat} title="Alimentação" detail="Estoque e consumo"/></div>
       <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#EAF0E8] p-3"><span className="rounded-lg bg-white p-2 text-[#315E40]"><ChartNoAxesCombined className="h-5 w-5"/></span><div><p className="text-sm font-bold">Desempenho por lote</p><p className="mt-0.5 text-xs text-[#718074]">Pesagens, evolução e indicadores</p></div></div>
      </div>
     </div></div>
    </div>
   </div>
  </section>
  <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#66806B]">Uma operação conectada</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Do manejo diário aos números da produção.</h2><p className="mt-4 leading-7 text-[#6B776C]">Cada módulo ajuda a manter o histórico da granja organizado e facilita o acompanhamento do trabalho da equipe.</p></div>
   <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Pillar icon={PiggyBank} title="Rebanho" text="Histórico das matrizes e reprodução."/><Pillar icon={Baby} title="Maternidade" text="Acompanhamento das leitegadas."/><Pillar icon={Wheat} title="Operação" text="Lotes, estoque e sanidade."/><Pillar icon={ChartNoAxesCombined} title="Desempenho" text="Pesagens e indicadores por lote."/></div>
  </section>
  <footer className="border-t border-[#E2E0D5] bg-[#F0EEE5]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-[#718074] sm:px-8"><div className="flex items-center gap-2"><LogoMark className="h-8 w-8"/><span className="font-semibold text-[#31513A]">Fazenda Santo Antônio</span></div><span>Gestão simples. Manejo bem feito.</span></div></footer>
 </main>;
}
function Feature({icon:Icon,title,detail}:{icon:typeof PiggyBank;title:string;detail:string}){return <div className="rounded-xl border border-[#E7E5DB] bg-white p-3"><span className="inline-flex rounded-lg bg-[#EAF0E8] p-2 text-[#315E40]"><Icon className="h-4 w-4"/></span><p className="mt-3 text-sm font-bold">{title}</p><p className="mt-1 text-xs text-[#778276]">{detail}</p></div>;}
function Pillar({icon:Icon,title,text}:{icon:typeof PiggyBank;title:string;text:string}){return <div className="rounded-2xl border border-[#E3E1D7] bg-white p-5 shadow-[0_10px_30px_-28px_rgba(32,55,42,.4)]"><span className="inline-flex rounded-xl bg-[#EAF0E8] p-3 text-[#315E40]"><Icon className="h-5 w-5"/></span><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#718074]">{text}</p></div>;}
