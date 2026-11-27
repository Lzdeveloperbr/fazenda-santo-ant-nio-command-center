import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  Check,
  Baby,
  BellRing,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileBarChart,
  HeartPulse,
  Package,
  PiggyBank,
  ShieldCheck,
  Smartphone,
  Wallet,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLockup, LogoMark } from "@/components/farm/Logo";
import { Reveal } from "@/components/farm/motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fazenda Santo Antônio | Gestão da Suinocultura" },
      {
        name: "description",
        content:
          "Sistema de gestão da Fazenda Santo Antônio: matrizes, reprodução, maternidade, leitões, sanidade, estoque, financeiro, relatórios e assistente inteligente.",
      },
      { property: "og:title", content: "Fazenda Santo Antônio | Gestão da Suinocultura" },
      {
        property: "og:description",
        content: "Cada matriz, cada leitão, cada decisão — em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MODULES = [
  {
    icon: PiggyBank,
    title: "Matrizes e reprodução",
    text: "Prontuário com foto e QR Code, coberturas, cio, sêmen, diagnósticos e situação em 15 estados.",
  },
  {
    icon: Baby,
    title: "Maternidade e leitões",
    text: "Partos, adoções, mortalidade com motivo e idade, manejo individual e desmame com destino.",
  },
  {
    icon: HeartPulse,
    title: "Sanidade",
    text: "Vacinas, tratamentos e protocolos validados pelo veterinário, com carência e lembretes.",
  },
  {
    icon: Package,
    title: "Estoque e farmácia",
    text: "Materiais, ração e medicamentos com lote, validade, fornecedor e bloqueio de saldo.",
  },
  {
    icon: Wallet,
    title: "Financeiro",
    text: "Contas a pagar e receber, fluxo de caixa realizado × previsto e custo por lote.",
  },
  {
    icon: FileBarChart,
    title: "Relatórios",
    text: "18 relatórios com a identidade da fazenda em PDF, Excel e CSV.",
  },
  {
    icon: CalendarDays,
    title: "Agenda da granja",
    text: "Partos, diagnósticos, desmames, vacinas, contas e tarefas por dia, semana e mês.",
  },
  {
    icon: BrainCircuit,
    title: "Santo Antônio AI",
    text: "Pergunte sobre a granja e receba respostas calculadas com os seus registros.",
  },
] as const;

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F2E9] text-[#17301F]">
      {/* Abertura */}
      <section className="brand-aurora relative text-white">
        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-28 pt-6 sm:px-8 lg:pb-36">
          <header className="flex items-center justify-between gap-4">
            <BrandLockup animated={false} />
            <Button asChild variant="outline" className="h-10 rounded-full border-white/25 bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white"><Link to="/auth">Entrar</Link></Button>
          </header>
          <div className="grid items-center gap-12 pt-14 lg:grid-cols-[1.15fr_.85fr] lg:pt-24">
            <div className="max-w-2xl">
              <Reveal><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#EEDBA6]">Gestão completa da suinocultura</span></Reveal>
              <Reveal delay={80}><h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-[-.035em] sm:text-6xl">Cada matriz, cada leitão, <span className="text-[#E3C77F]">cada decisão.</span></h1></Reveal>
              <Reveal delay={160}><p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg">Reprodução, maternidade, sanidade, estoque, financeiro e relatórios da Fazenda Santo Antônio em um só lugar — no computador e no celular.</p></Reveal>
              <Reveal delay={240}>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Button asChild size="lg" className="h-12 rounded-xl bg-[#E3C77F] px-7 text-base font-extrabold text-[#123B28] hover:bg-[#F0D891]"><Link to="/auth">Entrar no sistema <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
                  <span className="text-xs text-white/60">Acesso exclusivo à equipe autorizada</span>
                </div>
              </Reveal>
            </div>
            <Reveal delay={200} className="hidden lg:block">
              <div className="rounded-3xl bg-white/[.06] p-8 ring-1 ring-white/12">
                <LogoMark className="mx-auto h-40 w-40 drop-shadow-[0_18px_40px_rgba(0,0,0,.35)]" />
                <ul className="mt-8 space-y-3 text-sm text-white/85">
                  {["Prontuário completo de cada matriz", "Partos, leitegadas e desmames sem perder histórico", "Alertas de parto, vacina, estoque e contas", "Relatórios em PDF, Excel e CSV"].map((t) => (
                    <li key={t} className="flex items-center gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#E3C77F] text-[#123B28]"><Check className="h-3.5 w-3.5" /></span>{t}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Números do produto */}
      <section className="relative z-10 mx-auto -mt-16 max-w-6xl px-5 sm:px-8">
        <Reveal className="grid grid-cols-2 gap-3 rounded-3xl border border-[#E5E0D2] bg-white/90 p-4 shadow-[0_30px_80px_-40px_rgba(18,59,40,.45)] backdrop-blur sm:grid-cols-4 sm:p-6">
          {[
            ["15", "situações de matriz"],
            ["18", "relatórios prontos"],
            ["5", "perfis de acesso"],
            ["100%", "dados reais, sem inventar"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-2xl bg-[#F6F3EA] p-4 text-center">
              <p className="text-3xl font-extrabold tracking-tight text-[#1E5A3C] sm:text-4xl">
                {n}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6B776C]">{l}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Módulos */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#4F7A5B]">
            Uma operação conectada
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Do manejo diário aos números da produção.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m, i) => (
            <Reveal key={m.title} delay={(i % 4) * 90}>
                <div className="group h-full rounded-3xl border border-[#E3DFD2] bg-white p-6 shadow-[0_14px_40px_-34px_rgba(18,59,40,.6)] transition hover:border-[#1E5A3C]/30 hover:shadow-[0_24px_60px_-36px_rgba(18,59,40,.6)]">
                  <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#1E5A3C] to-[#0E3322] text-[#E3C77F] shadow-lg shadow-[#1E5A3C]/20 transition ">
                    <m.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{m.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#66736A]">{m.text}</p>
                </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="brand-aurora relative text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#E3C77F]">
              Na rotina da granja
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Registre no celular. Decida com números.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Smartphone,
                n: "01",
                title: "Registre na baia",
                text: "Morte, pesagem, parto ou trato em poucos toques. Sem internet, fica guardado e é enviado depois — sem duplicar.",
              },
              {
                icon: BellRing,
                n: "02",
                title: "Receba os alertas",
                text: "Partos previstos, diagnósticos, vacinas, estoque baixo e contas vencendo aparecem na agenda e no sino.",
              },
              {
                icon: ChartNoAxesCombined,
                n: "03",
                title: "Acompanhe os resultados",
                text: "Taxa de parto, mortalidade, desmamados, custo por lote e comparativos com o período anterior.",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="h-full rounded-3xl border border-white/12 bg-white/[.06] p-7 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E3C77F] text-[#123B28]">
                      <s.icon className="h-6 w-6" />
                    </span>
                    <span className="font-mono text-4xl font-bold text-white/15">{s.n}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Confiança */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Segurança no banco de dados",
              text: "Cada perfil só faz o que pode, e quem é desativado perde o acesso na hora.",
            },
            {
              icon: ClipboardCheck,
              title: "Histórico que não se apaga",
              text: "Toda inclusão, alteração e exclusão fica registrada com quem fez, quando e o valor anterior.",
            },
            {
              icon: WifiOff,
              title: "Feito para o campo",
              text: "Instale como aplicativo no Android ou no computador e continue registrando quando a conexão cair.",
            },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 100}>
              <div className="flex h-full gap-4 rounded-3xl border border-[#E3DFD2] bg-white p-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EAF1E8] text-[#1E5A3C]">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#66736A]">{c.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-14 overflow-hidden rounded-[2rem]">
          <div className="brand-aurora relative flex flex-col items-center gap-6 px-6 py-14 text-center text-white">
            <LogoMark className="h-20 w-20" />
            <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Pronto para começar o dia na granja?
            </h2>
            <Button
              asChild
              size="lg"
              className="h-12 rounded-2xl bg-[#E3C77F] px-7 font-extrabold text-[#123B28] hover:bg-[#F0D891]"
            >
              <Link to="/auth">
                Entrar no sistema <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[#E2DDCF] bg-[#EFEBE0]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-[#6B776C] sm:px-8">
          <BrandLockup tone="dark" animated={false} />
          <span>Manejo bem feito. Produção acompanhada.</span>
        </div>
      </footer>
    </main>
  );
}
