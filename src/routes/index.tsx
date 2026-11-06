import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Activity, Baby, ClipboardCheck, HeartPulse, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/farm/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fazenda Santo Antônio | Gestão da Suinocultura" },
      { name: "description", content: "Gestão inteligente da suinocultura: matrizes, reprodução, maternidade e rotina de manejo." },
      { property: "og:title", content: "Fazenda Santo Antônio | Gestão da Suinocultura" },
      { property: "og:description", content: "Mais controle no manejo. Mais clareza na produção." },
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

  const features = [
    { icon: HeartPulse, title: "Matrizes e reprodução", text: "Acompanhe coberturas, diagnósticos e previsão de partos." },
    { icon: Baby, title: "Maternidade", text: "Registre nascimentos, ocorrências, transferências e desmames." },
    { icon: ClipboardCheck, title: "Rotina de manejo", text: "Organize tarefas por setor, prioridade, data e responsável." },
    { icon: Activity, title: "Indicadores reais", text: "Visualize a produção a partir dos dados registrados na fazenda." },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 tech-grid opacity-60" />
      <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[120px]" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <div className="flex items-center gap-3"><LogoMark className="h-11 w-11" /><div><p className="text-sm font-bold tracking-tight">Fazenda Santo Antônio</p><p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Gestão da suinocultura</p></div></div>
        <Button asChild variant="outline" className="rounded-full px-5"><Link to="/auth">Acessar sistema <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 md:grid-cols-2 md:px-8 md:pb-28 md:pt-24">
        <div className="animate-rise">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><ShieldCheck className="h-4 w-4" /> Plataforma de gestão rural</div>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">O controle da sua produção começa <span className="text-primary">no manejo.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">Uma central para organizar matrizes, reprodução, maternidade e tarefas da Fazenda Santo Antônio. Informação clara para decisões melhores todos os dias.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7"><Link to="/auth">Entrar no sistema <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground"><span className="status-dot" /> Dados protegidos por acesso autenticado</div>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg animate-rise">
          <div className="absolute inset-8 rounded-full bg-primary/15 blur-3xl" />
          <div className="farm-surface relative overflow-hidden p-5 md:p-7">
            <div className="flex items-center justify-between border-b pb-4"><div><p className="label-tech">Fazenda Santo Antônio</p><p className="mt-1 font-semibold">Central de manejo</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold text-primary">Suinocultura</span></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {features.map((item) => <div key={item.title} className="rounded-2xl border bg-background/55 p-4"><item.icon className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p></div>)}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"><Activity className="h-5 w-5 text-primary" /><p className="text-xs leading-5 text-muted-foreground">Painel atualizado com registros reais. Sem indicadores inventados.</p></div>
          </div>
        </div>
      </section>
      <footer className="relative border-t py-6 text-center text-xs text-muted-foreground">Fazenda Santo Antônio · Gestão e manejo da suinocultura</footer>
    </main>
  );
}
