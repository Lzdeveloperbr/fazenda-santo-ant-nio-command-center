import { createFileRoute, redirect, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LayoutDashboard, PiggyBank, Baby, ListChecks, LogOut } from "lucide-react";
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
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/matrizes", label: "Matrizes", icon: PiggyBank },
  { to: "/maternidade", label: "Maternidade", icon: Baby },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
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

  return (
    <div className="tech-grid min-h-screen pb-24 md:pb-0 md:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-panel/90 p-4 backdrop-blur md:flex">
        <Wordmark />
        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" activeProps={{ className: "!bg-accent !text-foreground" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <p className="label-tech">Operador</p>
          <p className="truncate text-sm">{access.data?.name}</p>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start px-2 text-muted-foreground"><LogOut className="mr-2 h-4 w-4" />Sair</Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-2 md:hidden"><LogoMark className="h-7 w-7" /><span className="text-sm font-semibold">Santo Antônio</span></div>
        <div className="hidden md:block">
          <p className="label-tech">{NAV.find((n) => path.startsWith(n.to))?.label ?? "Centro de comando"}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-[0.7rem] text-muted-foreground">
            <span className={online ? "status-dot" : "status-dot !bg-destructive !shadow-none"} />
            <span className="hidden sm:inline">{online ? "BANCO CONECTADO" : "SEM CONEXÃO"}</span>
          </div>
          <div className="text-right font-mono text-xs">
            <div>{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="text-[0.65rem] text-muted-foreground">{now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
          </div>
          <button onClick={signOut} className="text-muted-foreground md:hidden" aria-label="Sair"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        {access.isLoading ? (
          <p className="label-tech animate-pulse-soft">Inicializando…</p>
        ) : access.data && !access.data.member ? (
          <div className="panel mx-auto mt-10 max-w-md p-6 text-center">
            <p className="label-tech">Acesso restrito</p>
            <p className="mt-3 text-sm text-muted-foreground">Sua conta foi criada, mas apenas os dois responsáveis pela fazenda podem ver os dados.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-3 text-[0.7rem] text-muted-foreground" activeProps={{ className: "!text-ok-glow" }}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
