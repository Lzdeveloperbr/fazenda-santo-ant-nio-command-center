import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/farm/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fazenda Santo Antônio | AgroTech Command Center" },
      { name: "description", content: "Central de comando da suinocultura da Fazenda Santo Antônio: matrizes, maternidade, tarefas e indicadores." },
      { property: "og:title", content: "Fazenda Santo Antônio | AgroTech Command Center" },
      { property: "og:description", content: "Precisão, inteligência e controle total da produção." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  return (
    <main className="tech-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <svg className="pointer-events-none absolute h-[640px] w-[640px] opacity-60" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border)" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="var(--cyan)" strokeOpacity=".25" strokeDasharray="1 3" />
        <circle cx="100" cy="100" r="48" fill="none" stroke="var(--ok)" strokeOpacity=".35" className="animate-scan" />
      </svg>
      <div className="relative animate-rise">
        <LogoMark className="mx-auto h-16 w-16" />
        <p className="label-tech mt-6">Fazenda Santo Antônio</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">AgroTech Command Center</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">Precisão, inteligência e controle total da produção.</p>
        <Button asChild size="lg" className="mt-8 h-12 px-8">
          <Link to="/auth">Entrar no centro de comando</Link>
        </Button>
      </div>
    </main>
  );
}
