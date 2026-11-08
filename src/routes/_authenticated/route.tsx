import { createFileRoute, redirect, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LayoutDashboard, PiggyBank, Baby, ListChecks, LogOut, Activity, ChevronRight, Menu, X, Layers3, HeartPulse, Wheat, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark, LogoMark } from "@/components/farm/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

const NAV = [
  { to: "/painel", label: "Visão geral", icon: LayoutDashboard, group: "Operação" },
  { to: "/matrizes", label: "Matrizes e reprodução", icon: PiggyBank, group: "Rebanho" },
  { to: "/maternidade", label: "Maternidade", icon: Baby, group: "Rebanho" },
  { to: "/tarefas", label: "Rotinas e manejo", icon: ListChecks, group: "Operação" },
  { to: "/lotes", label: "Lotes por fase", icon: Layers3, group: "Operação" },
  { to: "/sanidade", label: "Sanidade", icon: HeartPulse, group: "Operação" },
  { to: "/estoque", label: "Estoque de ração", icon: Wheat, group: "Operação" },
  { to: "/desempenho" as any, label: "Desempenho", icon: TrendingUp, group: "Operação" },
] as const;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Shell() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const now = useClock();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const access = useQuery({
    queryKey: ["access", user.id],
    queryFn: async () => {
      const [roles, profile] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      ]);
      if (roles.error) throw roles.error;
      return { member: (roles.data ?? []).some((r) => r.role === "member"), name: profile.data?.display_name ?? user.email };
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const online = !access.isError;
  const activeLabel = NAV.find((n) => path.startsWith(n.to))?.label ?? "Centro de manejo";

  const sidebar = (
    <>
      <div className="flex items-center justify-between px-2">
        <Wordmark />
        <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 md:hidden" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-9 px-2">
        <p className="label-tech mb-3">Fazenda Santo Antônio</p>
        {(["Operação", "Rebanho"] as const).map((group) => (
          <div key={group} className="mb-6">
            <p className="mb-2 px-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/45">{group}</p>
            <nav className="space-y-1">
              {NAV.filter((n) => n.group === group).map((n) => {
                const active = path.startsWith(n.to);
                return <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${active ? "bg-white font-semibold text-[#205638] shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
                  <n.icon className="h-[18px] w-[18px]" />
                  <span className="min-w-0 flex-1">{n.label}</span>
                  {active && <ChevronRight className="h-4 w-4" />}
                </Link>;
              })}
            </nav>
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300" /><span className="text-xs font-medium text-white">Fazenda conectada</span></div>
        <p className="mt-2 truncate text-xs text-white/60">{access.data?.name}</p>
        <Button variant="ghost" size="sm" onClick={signOut} className="mt-2 w-full justify-start px-2 text-white/70 hover:bg-white/10 hover:text-white"><LogOut className="mr-2 h-4 w-4" />Sair da conta</Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background md:pl-[270px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[270px] flex-col border-r bg-panel px-4 py-5 shadow-xl md:flex">{sidebar}</aside>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,300px)] flex-col border-r bg-panel px-4 py-5 shadow-2xl transition-transform md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>{sidebar}</aside>

      <header className="sticky top-0 z-20 border-b border-border/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg border p-2 text-muted-foreground md:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
            <div className="flex items-center gap-2 md:hidden"><LogoMark className="h-8 w-8" /><span className="font-semibold tracking-tight">Santo Antônio</span></div>
            <div className="hidden md:block"><p className="text-xs font-medium text-muted-foreground">FAZENDA SANTO ANTÔNIO</p><p className="mt-0.5 text-sm font-semibold">{activeLabel}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 sm:flex"><Activity className="h-3.5 w-3.5 text-primary" /><span className={online ? "text-emerald-800" : "text-destructive"}>{online ? "Conectado" : "Verificar conexão"}</span></div>
            <div className="text-right"><p className="font-mono text-sm font-semibold tabular-nums">{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p><p className="text-[0.65rem] text-muted-foreground">{now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</p></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 pb-28 md:px-8 md:py-8">
        {access.isLoading ? <div className="panel p-8 text-center text-sm text-muted-foreground">Preparando o ambiente da fazenda…</div> : access.data && !access.data.member ? (
          <div className="panel mx-auto mt-10 max-w-md p-6 text-center"><p className="label-tech">Acesso restrito</p><p className="mt-3 text-sm text-muted-foreground">Sua conta foi criada, mas apenas os responsáveis autorizados podem acessar os dados da fazenda.</p></div>
        ) : <Outlet />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_25px_-20px_rgba(0,0,0,.3)] backdrop-blur-xl md:hidden">
        {NAV.filter((n) => ["/painel", "/matrizes", "/maternidade", "/tarefas"].includes(n.to)).map((n) => <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1.5 px-1 py-3 text-center text-[0.62rem] ${path.startsWith(n.to) ? "font-semibold text-primary" : "text-muted-foreground"}`}><n.icon className="h-5 w-5" />{n.label === "Matrizes e reprodução" ? "Matrizes" : n.label === "Rotinas e manejo" ? "Manejo" : n.label}</Link>)}
      </nav>
    </div>
  );
}
