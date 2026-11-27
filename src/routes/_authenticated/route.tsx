import { createFileRoute, redirect, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileText, ClipboardList, Settings, LifeBuoy, QrCode, LayoutDashboard, PiggyBank, Baby, ListChecks, LogOut, Menu, X, Layers3, HeartPulse, Wheat, TrendingUp, Fence, Ear, BrainCircuit, BookOpen, ClipboardCheck, Radar, Wallet, Calculator, Search, Moon, Sun, PanelLeftClose, PanelLeftOpen, ChevronRight, LayoutGrid, HeartHandshake, Users, History, Eye, Skull, Package, CalendarDays, FileBarChart, Sparkles, Route as RouteIcon } from "lucide-react";
import { accessQuery, ROLE_INFO } from "@/lib/access";
import { InstallAppButton } from "@/components/farm/InstallAppButton";
import { GlobalSearchResults } from "@/components/farm/GlobalSearchResults";
import { RemindersBell } from "@/components/farm/RemindersBell";
import { FavoriteButton } from "@/components/farm/Favorites";
import { SyncStatus, useOnline } from "@/components/farm/OfflineSync";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark, LogoMark } from "@/components/farm/Logo";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/_authenticated")({
 ssr:false,
 beforeLoad:async()=>{
  // Sem internet, usa a sessão guardada no aparelho para abrir o app; o servidor
  // continua validando cada leitura e gravação quando a conexão voltar.
  if(typeof navigator!=="undefined"&&!navigator.onLine){const {data:s}=await supabase.auth.getSession();if(s.session?.user)return {user:s.session.user};throw redirect({to:"/auth"});}
  const {data,error}=await supabase.auth.getUser();
  if(!data.user&&error&&/fetch|network/i.test(error.message)){const {data:s}=await supabase.auth.getSession();if(s.session?.user)return {user:s.session.user};}
  if(!data.user)throw redirect({to:"/auth"});return {user:data.user};
 },
 component:Shell,
});
const GROUPS=["Gestão","Ferramentas","Gestação e reprodução","Rebanho","Manejo e saúde"] as const;
const NAV=[
 {to:"/painel",label:"Visão geral",short:"Início",icon:LayoutDashboard,group:"Gestão"},
 {to:"/agenda",label:"Agenda da granja",short:"Agenda",icon:CalendarDays,group:"Gestão"},
 {to:"/resumo-do-dia",label:"Resumo do dia",short:"Resumo",icon:FileText,group:"Gestão"},
 {to:"/rotina",label:"Rotina da equipe",short:"Rotina",icon:ClipboardList,group:"Gestão"},
 {to:"/assistente",label:"Santo Antônio AI · Perguntas",short:"Perguntas",icon:Sparkles,group:"Gestão"},
 {to:"/inteligencia",label:"Pendências e previsões",short:"Pendências",icon:Radar,group:"Gestão"},
 {to:"/auditoria",label:"Auditoria e qualidade",short:"Auditoria",icon:ClipboardCheck,group:"Gestão"},
 {to:"/financeiro",label:"Financeiro e relatório",short:"Financeiro",icon:Wallet,group:"Gestão"},
 {to:"/relatorios",label:"Central de relatórios",short:"Relatórios",icon:FileBarChart,group:"Gestão"},
 {to:"/desempenho",label:"Desempenho",short:"Desempenho",icon:TrendingUp,group:"Gestão"},
 {to:"/etiquetas",label:"Etiquetas QR Code",short:"Etiquetas",icon:QrCode,group:"Gestão"},
 {to:"/ajuda",label:"Central de ajuda",short:"Ajuda",icon:LifeBuoy,group:"Gestão"},
 {to:"/configuracoes",label:"Configurações da granja",short:"Ajustes",icon:Settings,group:"Gestão"},
 {to:"/usuarios",label:"Equipe e permissões",short:"Equipe",icon:Users,group:"Gestão",restricted:true},
 {to:"/historico",label:"Histórico de alterações",short:"Histórico",icon:History,group:"Gestão",restricted:true},
 {to:"/calculadoras",label:"Calculadoras e ferramentas",short:"Calculadoras",icon:Calculator,group:"Ferramentas"},
 {to:"/gestacao",label:"Gestação e reprodução",short:"Gestação",icon:HeartHandshake,group:"Gestação e reprodução"},
 {to:"/manejo-guiado",label:"Manejo guiado",short:"Guiado",icon:RouteIcon,group:"Rebanho"},
 {to:"/matrizes",label:"Matrizes e reprodução",short:"Matrizes",icon:PiggyBank,group:"Rebanho"},
 {to:"/maternidade",label:"Maternidade",short:"Maternidade",icon:Baby,group:"Rebanho"},
 {to:"/desmame",label:"Marcação e desmame",short:"Desmame",icon:Ear,group:"Rebanho"},
 {to:"/leitoes",label:"Leitões",short:"Leitões",icon:PiggyBank,group:"Rebanho"},
 {to:"/mortalidade",label:"Mortalidade e descarte",short:"Mortalidade",icon:Skull,group:"Rebanho"},
 {to:"/lotes",label:"Lotes por fase",short:"Lotes",icon:Layers3,group:"Rebanho"},
 {to:"/mutirao",label:"Mutirão de Organização",short:"Mutirão",icon:ClipboardCheck,group:"Rebanho"},
 {to:"/tarefas",label:"Rotinas e manejo",short:"Manejo",icon:ListChecks,group:"Manejo e saúde"},
 {to:"/baias",label:"Baias e caderno",short:"Baias",icon:Fence,group:"Manejo e saúde"},
 {to:"/sanidade",label:"Saúde e prevenção",short:"Saúde",icon:HeartPulse,group:"Manejo e saúde"},
 {to:"/farmacia-ai",label:"Santo Antônio AI e Farmácia",short:"IA",icon:BrainCircuit,group:"Manejo e saúde"},
 {to:"/estoque",label:"Estoque de ração",short:"Estoque",icon:Wheat,group:"Manejo e saúde"},
 {to:"/almoxarifado",label:"Estoque geral e fornecedores",short:"Almoxarifado",icon:Package,group:"Manejo e saúde"},
 {to:"/biblioteca-suinos",label:"Biblioteca técnica",short:"Biblioteca",icon:BookOpen,group:"Manejo e saúde"},
] as const;
const BOTTOM=["/painel","/matrizes","/maternidade","/tarefas"] as const;
function useClock(){const [now,setNow]=useState(()=>new Date());useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(t);},[]);return now;}

function Shell(){
 const {user}=Route.useRouteContext();const qc=useQueryClient();const navigate=useNavigate();const now=useClock();
 const path=useRouterState({select:s=>s.location.pathname});
 const [mobileOpen,setMobileOpen]=useState(false);const [searchOpen,setSearchOpen]=useState(false);const [searchQ,setSearchQ]=useState("");
 const [collapsed,setCollapsed]=useState(false);
 const {theme,toggle}=useTheme(user.id);
 useEffect(()=>{setCollapsed(localStorage.getItem("fsa-sidebar")==="1");},[]);
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setSearchOpen(o=>!o);}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[]);
 useEffect(()=>{setMobileOpen(false);},[path]);
 function toggleCollapse(){setCollapsed(c=>{localStorage.setItem("fsa-sidebar",c?"0":"1");return !c;});}
 const perms=useQuery(accessQuery(user.id));const online=useOnline();
 const profile=useQuery({queryKey:["profile-name",user.id],queryFn:async()=>{const {data}=await supabase.from("profiles").select("display_name").eq("id",user.id).maybeSingle();return data?.display_name??user.email??"Usuário";}});
 const access={isLoading:perms.isLoading,isError:perms.isError,refetch:perms.refetch,data:perms.data?{member:perms.data.role!==null,name:profile.data??user.email??"Usuário"}:undefined};
 const role=perms.data?.role??null;
 const nav=NAV.filter(n=>!("restricted" in n)||perms.data?.canViewAudit);
 // Último acesso: uma vez por sessão do aplicativo; falha aqui não bloqueia o uso.
 useEffect(()=>{if(role)void supabase.rpc("touch_last_seen").then(()=>undefined,()=>undefined);},[role]);
 async function signOut(){await qc.cancelQueries();qc.clear();await supabase.auth.signOut();navigate({to:"/auth",replace:true});}
 const active=NAV.find(n=>path.startsWith(n.to));const name=access.data?.name??user.email??"";const initials=name.split(/[\s@.]/).filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()).join("");
 const isDetail=active&&path!==active.to;

 const navList=(mini:boolean)=>GROUPS.map(group=><div key={group} className="mb-5">
  {mini?<div className="mx-auto mb-2 h-px w-6 bg-sidebar-border"/>:<p className="mb-1.5 px-3 text-[.62rem] font-bold uppercase tracking-[.16em] text-sidebar-foreground/45">{group}</p>}
  <nav className="space-y-0.5">{nav.filter(n=>n.group===group).map(n=>{const on=path.startsWith(n.to);const link=<Link key={n.to} to={n.to} aria-current={on?"page":undefined} className={`group relative flex items-center gap-3 rounded-lg py-2.5 text-[.84rem] transition-colors ${mini?"justify-center px-0":"px-3"} ${on?"nav-on font-semibold text-sidebar-foreground":"text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:translate-x-0.5"}`}>{on&&<span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-sidebar-primary"/>}<n.icon className={`h-[18px] w-[18px] shrink-0 ${on?"text-sidebar-primary":""}`}/>{!mini&&<span className="min-w-0 flex-1 truncate">{n.label}</span>}</Link>;
   return mini?<Tooltip key={n.to}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{n.label}</TooltipContent></Tooltip>:link;})}</nav>
 </div>);

 const userBox=(mini:boolean)=><div className={`mt-auto border-t border-sidebar-border pt-4 ${mini?"flex flex-col items-center gap-2":""}`}>
  <div className={`flex items-center gap-3 ${mini?"":"px-2"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">{initials||"FS"}</span>{!mini&&<div className="min-w-0"><p className="truncate text-sm font-semibold text-sidebar-foreground">{name}</p><p className="text-[.68rem] text-sidebar-foreground/55">{role?ROLE_INFO[role].label:"Acesso pendente"}</p></div>}</div>
  <button onClick={signOut} className={`mt-3 flex items-center gap-2 rounded-lg py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground ${mini?"justify-center px-2":"w-full px-3"}`} aria-label="Sair da conta"><LogOut className="h-4 w-4"/>{!mini&&"Sair da conta"}</button>
 </div>;

 const iconBtn="items-center h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
 return <TooltipProvider delayDuration={200}><div className={`min-h-screen bg-background transition-[padding] duration-300 ${collapsed?"md:pl-[76px]":"md:pl-[264px]"}`}>
  <aside className={`sidebar-surface fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto bg-sidebar py-5 transition-[width] duration-300 md:flex ${collapsed?"w-[76px] px-3":"w-[264px] px-3"}`}>
   <div className={`mb-7 flex items-center ${collapsed?"justify-center":"justify-between px-2"}`}>{collapsed?<LogoMark className="h-10 w-10"/>:<Wordmark/>}</div>
   {navList(collapsed)}
   {userBox(collapsed)}
  </aside>
  {mobileOpen&&<button aria-label="Fechar menu" className="fixed inset-0 z-40 cursor-default bg-foreground/40 backdrop-blur-[2px] md:hidden" onClick={()=>setMobileOpen(false)}/>}
  <aside className={`sidebar-surface fixed inset-y-0 left-0 z-50 flex w-[min(86vw,300px)] flex-col overflow-y-auto bg-sidebar px-3 py-5 shadow-2xl transition-transform duration-300 md:hidden ${mobileOpen?"translate-x-0":"-translate-x-full"}`} aria-hidden={!mobileOpen}>
   <div className="mb-6 flex items-center justify-between px-2"><Wordmark/><button onClick={()=>setMobileOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent" aria-label="Fechar menu"><X className="h-5 w-5"/></button></div>
   {navList(false)}
   {userBox(false)}
  </aside>

  <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 shadow-[0_8px_30px_-28px_rgba(0,0,0,.5)] backdrop-blur-xl backdrop-saturate-150">
   <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 md:px-8">
    <button onClick={toggleCollapse} className={`${iconBtn} hidden md:inline-flex`} aria-label={collapsed?"Expandir menu":"Recolher menu"}>{collapsed?<PanelLeftOpen className="h-[18px] w-[18px]"/>:<PanelLeftClose className="h-[18px] w-[18px]"/>}</button>
    <div className="flex min-w-0 items-center gap-2 md:hidden"><LogoMark className="h-8 w-8 shrink-0"/><span className="truncate text-sm font-bold">{active?.short??"Santo Antônio"}</span></div>
    <nav aria-label="Trilha" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
     <Link to="/painel" className="text-muted-foreground hover:text-foreground">Fazenda Santo Antônio</Link>
     {active&&<><ChevronRight className="h-3.5 w-3.5 text-muted-foreground"/><span className="text-muted-foreground">{active.group}</span><ChevronRight className="h-3.5 w-3.5 text-muted-foreground"/>{isDetail?<Link to={active.to} className="text-muted-foreground hover:text-foreground">{active.label}</Link>:<span className="truncate font-semibold">{active.label}</span>}</>}
     {isDetail&&<><ChevronRight className="h-3.5 w-3.5 text-muted-foreground"/><span className="font-semibold">Ficha</span></>}
    </nav>
    <div className="ml-auto flex shrink-0 items-center gap-2">
     <button onClick={()=>setSearchOpen(true)} className="hidden h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground hover:bg-muted lg:flex lg:w-64"><Search className="h-4 w-4"/><span className="flex-1 text-left">Buscar na granja…</span><kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[.65rem]">Ctrl K</kbd></button>
     <button onClick={()=>setSearchOpen(true)} className={`${iconBtn} inline-flex lg:hidden`} aria-label="Buscar"><Search className="h-[18px] w-[18px]"/></button>
     <SyncStatus/>
     {role&&active&&active.to!=="/painel"&&<FavoriteButton path={active.to} label={active.label} className={iconBtn}/>}
     {role&&<RemindersBell className={iconBtn}/>}
     <InstallAppButton />
     <button onClick={toggle} className={`${iconBtn} inline-flex`} aria-label={theme==="dark"?"Usar tema claro":"Usar tema escuro"}>{theme==="dark"?<Sun className="h-[18px] w-[18px]"/>:<Moon className="h-[18px] w-[18px]"/>}</button>
     <div className="hidden pl-2 text-right sm:block"><p className="font-mono text-sm font-semibold tabular-nums">{now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p><p className="text-[.65rem] capitalize text-muted-foreground">{now.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"})}</p></div>
    </div>
   </div>
  </header>

  <main key={active?.to} className="animate-rise mx-auto min-h-[calc(100vh-64px)] max-w-[1600px] px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10">
   {access.isLoading?(online?<div className="panel p-8 text-center text-sm text-muted-foreground">Preparando o ambiente da fazenda…</div>:<div className="panel mx-auto mt-10 max-w-md p-6 text-center"><p className="label-tech">Sem conexão</p><p className="mt-3 text-sm text-muted-foreground">O aplicativo abriu, mas os dados da granja só são carregados com internet: este aparelho não guarda uma cópia do banco. Assim que a conexão voltar, tudo aparece. Registros feitos durante uma queda de conexão, com o app já aberto, ficam guardados e são enviados depois.</p></div>):access.isError?<div className="panel mx-auto mt-10 max-w-md p-6 text-center"><p className="label-tech">Sem conexão com os dados</p><p className="mt-3 text-sm text-muted-foreground">Não foi possível verificar seu acesso. Confira a internet e tente de novo.</p><button onClick={()=>access.refetch()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Tentar de novo</button></div>:access.data&&!access.data.member?<div className="panel mx-auto mt-10 max-w-md p-6 text-center"><p className="label-tech">Acesso restrito</p><p className="mt-3 text-sm text-muted-foreground">Sua conta existe, mas está sem acesso aos dados da fazenda: ainda não foi autorizada ou foi desativada. Fale com o administrador da granja.</p></div>:<>{role==="consulta"&&<div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground"><Eye className="h-4 w-4 shrink-0"/>Perfil Consulta: você pode ver tudo, mas o banco recusa inclusões, alterações e exclusões.</div>}<Outlet/></>}
  </main>

  <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
   {BOTTOM.map(to=>{const n=NAV.find(x=>x.to===to)!;const on=path.startsWith(to);return <Link key={to} to={to} className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[.68rem] ${on?"font-bold text-primary":"text-muted-foreground"}`}>{on&&<span className="absolute top-0 h-[3px] w-8 rounded-b bg-primary"/>}<n.icon className="h-5 w-5"/>{n.short}</Link>;})}
   <button onClick={()=>setMobileOpen(true)} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[.68rem] ${active&&!BOTTOM.includes(active.to as never)?"font-bold text-primary":"text-muted-foreground"}`} aria-label="Abrir todos os módulos"><LayoutGrid className="h-5 w-5"/>Mais</button>
  </nav>

  <CommandDialog open={searchOpen} onOpenChange={o=>{setSearchOpen(o);if(!o)setSearchQ("");}}>
   <CommandInput value={searchQ} onValueChange={setSearchQ} placeholder="Buscar matriz, reprodutor, baia, lote, medicamento, tarefa ou módulo…"/>
   <CommandList><CommandEmpty>Nada encontrado nos registros nem nos módulos.</CommandEmpty>
    <GlobalSearchResults query={searchQ} enabled={searchOpen} onPick={()=>{setSearchOpen(false);setSearchQ("");}}/>
    {GROUPS.map(g=><CommandGroup key={g} heading={g}>{nav.filter(n=>n.group===g).map(n=><CommandItem key={n.to} value={`${n.label} ${n.short}`} onSelect={()=>{setSearchOpen(false);navigate({to:n.to});}}><n.icon className="mr-2 h-4 w-4"/>{n.label}</CommandItem>)}</CommandGroup>)}
    <CommandGroup heading="Preferências"><CommandItem onSelect={()=>{toggle();setSearchOpen(false);}}>{theme==="dark"?<Sun className="mr-2 h-4 w-4"/>:<Moon className="mr-2 h-4 w-4"/>}Alternar tema claro/escuro</CommandItem></CommandGroup>
   </CommandList>
  </CommandDialog>
 </div></TooltipProvider>;
}
