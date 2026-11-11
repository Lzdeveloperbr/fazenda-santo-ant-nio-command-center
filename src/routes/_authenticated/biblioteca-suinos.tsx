import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Search, ShieldCheck, AlertTriangle, Calculator, ClipboardCheck, ExternalLink, Filter, ChevronDown } from "lucide-react";
import { SectionTitle } from "@/components/farm/Kpi";
import { Input } from "@/components/ui/input";
import {
  BATCH_CHECKLIST,
  DAILY_CHECKLIST,
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_SOURCES,
  SWINE_KNOWLEDGE,
  WEEKLY_CHECKLIST,
} from "@/lib/farm/base-conhecimento-suinos";

export const Route = createFileRoute("/_authenticated/biblioteca-suinos")({
  head: () => ({
    meta: [
      { title: "Biblioteca técnica de suínos | Fazenda Santo Antônio" },
      { name: "description", content: "Base técnica de manejo, reprodução, maternidade, nutrição, sanidade, bem-estar e gestão da suinocultura." },
    ],
  }),
  component: BibliotecaSuinos,
});

function BibliotecaSuinos() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [phase, setPhase] = useState("Todas");
  const [showTools, setShowTools] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return SWINE_KNOWLEDGE.filter((topic) => {
      const categoryMatch = category === "Todas" || topic.category === category;
      const phaseMatch = phase === "Todas" || topic.phase === phase;
      const text = [topic.title, topic.summary, topic.category, topic.phase, ...topic.practices, ...topic.watch, ...topic.records].join(" ").toLocaleLowerCase("pt-BR");
      return categoryMatch && phaseMatch && (!q || text.includes(q));
    });
  }, [query, category, phase]);

  const phases = useMemo(() => ["Todas", ...Array.from(new Set(SWINE_KNOWLEDGE.map((topic) => topic.phase))).sort()], []);

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[1.6rem] bg-[#173F2B] px-5 py-6 text-white shadow-lg sm:px-7 sm:py-8">
        <div className="absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -right-1 -top-12 -z-10 h-44 w-44 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-[#D7B66C]">Centro de conhecimento · Fazenda Santo Antônio</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Biblioteca técnica de suinocultura</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Conteúdo organizado para apoiar o manejo real da granja: da reprodução à terminação, com rotinas, sinais de atenção, indicadores e fontes técnicas para aprofundar.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[.08] p-4">
            <BookOpen className="h-6 w-6 text-[#D7B66C]" />
            <p className="mt-2 text-2xl font-bold tabular-nums">{SWINE_KNOWLEDGE.length}</p>
            <p className="text-xs text-white/65">guias práticos</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Reprodução", "Cio, cobertura e gestação"],
            ["Maternidade", "Parto e primeiros cuidados"],
            ["Produção", "Creche até terminação"],
            ["Gestão", "Indicadores e rotina"],
          ].map(([label, sub]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[.06] p-3">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-[.7rem] leading-4 text-white/60">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Base de apoio técnico, não substitui o responsável técnico</p>
            <p className="mt-1 text-xs leading-5 text-amber-900/85">Use os guias para melhorar observação, prevenção e registros. Diagnóstico, prescrição, vacina, medicamento, dose, duração, carência, formulação de ração e decisão de intervenção devem seguir o médico-veterinário, nutricionista, legislação e protocolo da granja.</p>
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-4 sm:p-5">
        <SectionTitle kicker="Pesquisa no conteúdo" title="Encontre uma orientação" />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar: colostro, diarreia, cio, água, ração..." className="h-12 pl-10" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Filter className="h-4 w-4" />Filtrar por assunto</div>
        <div className="flex flex-wrap gap-2">
          {KNOWLEDGE_CATEGORIES.map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={"rounded-full border px-3 py-2 text-xs font-semibold transition " + (category === item ? "border-[#24543A] bg-[#24543A] text-white" : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{item}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold text-muted-foreground">Filtrar por fase
            <select value={phase} onChange={(event) => setPhase(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground">
              {phases.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="flex items-end justify-between gap-2">
            <p className="pb-2 text-xs text-muted-foreground">{filtered.length} de {SWINE_KNOWLEDGE.length} guias encontrados</p>
            <button onClick={() => { setQuery(""); setCategory("Todas"); setPhase("Todas"); }} className="pb-2 text-xs font-semibold text-primary hover:underline">Limpar filtros</button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle kicker="Manual por assunto" title="Guias de manejo" />
        {filtered.length === 0 ? (
          <div className="panel p-8 text-center">
            <Search className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">Nenhum guia encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">Tente outro termo ou remova um dos filtros.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((topic) => (
              <details key={topic.id} className="panel group overflow-hidden" open={topic.id === filtered[0]?.id}>
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4 sm:p-5">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF0E8] text-[#24543A]"><BookOpen className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[.62rem] font-bold uppercase tracking-[.12em] text-primary">{topic.category}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[.62rem] font-medium text-muted-foreground">{topic.phase}</span>
                    </span>
                    <span className="mt-1 block text-sm font-bold leading-5 text-foreground">{topic.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{topic.summary}</span>
                  </span>
                  <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t border-border/70 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">O que fazer na prática</p>
                    <ul className="mt-2 space-y-2">
                      {topic.practices.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-muted-foreground"><span className="mt-[.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-amber-950"><AlertTriangle className="h-4 w-4" />Sinais para observar</p>
                    <ul className="mt-2 space-y-1.5">
                      {topic.watch.map((item, index) => <li key={index} className="text-xs leading-5 text-amber-950/80">• {item}</li>)}
                    </ul>
                  </div>
                  {topic.urgency && <div className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-xs font-bold text-red-900">Quando agir imediatamente</p><p className="mt-1 text-xs leading-5 text-red-900/85">{topic.urgency}</p></div>}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">O que registrar no aplicativo</p>
                    <ul className="mt-2 space-y-1.5">
                      {topic.records.map((item, index) => <li key={index} className="text-xs leading-5 text-muted-foreground">• {item}</li>)}
                    </ul>
                  </div>
                  <div className="border-t border-border/70 pt-3">
                    <p className="mb-2 text-[.65rem] font-bold uppercase tracking-wider text-muted-foreground">Fontes deste guia</p>
                    <div className="flex flex-wrap gap-2">
                      {topic.sourceIds.map((id) => {
                        const source = KNOWLEDGE_SOURCES[id];
                        return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-2 text-[.68rem] font-semibold text-primary hover:bg-muted">{source.institution}<ExternalLink className="h-3 w-3" /></a> : null;
                      })}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="panel p-4 sm:p-5">
        <button onClick={() => setShowTools((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
          <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0E8] text-[#24543A]"><Calculator className="h-5 w-5" /></span><span><span className="block text-[.65rem] font-bold uppercase tracking-wider text-primary">Ferramentas rápidas</span><span className="mt-1 block text-base font-bold">Calculadoras e indicadores</span></span></span>
          <ChevronDown className={"h-5 w-5 text-muted-foreground transition-transform " + (showTools ? "rotate-180" : "")} />
        </button>
        {showTools && <div className="mt-5 space-y-5 border-t border-border/70 pt-5">
          <GestationCalculator />
          <PerformanceCalculator />
          <div className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">Os resultados são cálculos matemáticos com os dados que você informa. Não são metas zootécnicas nem recomendação de quantidade de ração, tratamento ou intervenção.</div>
        </div>}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Checklist title="Conferência diária" description="Pontos essenciais para a ronda de todos os setores." items={DAILY_CHECKLIST} />
        <Checklist title="Revisão semanal" description="Verificações de tendência, manutenção e prevenção." items={WEEKLY_CHECKLIST} />
        <Checklist title="Troca de lote" description="Preparação antes de receber um novo grupo." items={BATCH_CHECKLIST} />
      </section>

      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Leitura e consulta" title="Biblioteca de fontes técnicas" />
        <p className="mb-4 text-xs leading-5 text-muted-foreground">O conteúdo interno é um resumo operacional, com links para consultar o material original. A base inclui portais atuais e um acervo antigo da Embrapa; quando a referência é histórica, isso está indicado para evitar que valores antigos sejam tratados como protocolo vigente.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(KNOWLEDGE_SOURCES).map(([id, source]) => (
            <a key={id} href={source.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-muted/30">
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0"><span className="block text-xs font-bold text-foreground">{source.title}</span><span className="mt-1 block text-[.65rem] font-semibold text-primary">{source.institution}</span><span className="mt-1 block text-[.68rem] leading-4 text-muted-foreground">{source.note}</span></span>
            </a>
          ))}
        </div>
      </section>
      <p className="text-center text-[.65rem] leading-5 text-muted-foreground">Base preparada em 11/11/2026 · revise os links e protocolos oficiais periodicamente. Normas, programas sanitários e recomendações técnicas podem ser atualizados.</p>
    </div>
  );
}

function Checklist({ title, description, items }: { title: string; description: string; items: string[] }) {
  return <section className="panel p-4">
    <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">{title}</h3></div>
    <p className="mt-1 text-[.68rem] leading-4 text-muted-foreground">{description}</p>
    <ul className="mt-3 space-y-2">{items.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-muted-foreground"><span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border text-[.58rem]">{index + 1}</span>{item}</li>)}</ul>
  </section>;
}

function GestationCalculator() {
  const [coverageDate, setCoverageDate] = useState("");
  const dueDate = useMemo(() => {
    if (!coverageDate) return "";
    const date = new Date(coverageDate + "T12:00:00");
    date.setDate(date.getDate() + 114);
    return date.toLocaleDateString("pt-BR");
  }, [coverageDate]);
  return <div className="rounded-xl border p-4">
    <h3 className="text-sm font-bold">Previsão de parto</h3>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">A Embrapa cita 114 dias como média de gestação no acervo histórico. A data é estimativa, não confirmação de parto.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs font-semibold">Data da cobertura ou inseminação<Input type="date" value={coverageDate} onChange={(event) => setCoverageDate(event.target.value)} /></label>
      <div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Previsão estimada (+114 dias)</p><p className="mt-1 text-lg font-bold tabular-nums">{dueDate || "Informe a data"}</p></div>
    </div>
  </div>;
}

function PerformanceCalculator() {
  const [born, setBorn] = useState("12");
  const [weaned, setWeaned] = useState("10");
  const [deaths, setDeaths] = useState("1");
  const [initialWeight, setInitialWeight] = useState("8");
  const [finalWeight, setFinalWeight] = useState("25");
  const [days, setDays] = useState("35");
  const [animals, setAnimals] = useState("10");
  const [feed, setFeed] = useState("420");
  const n = (value: string) => Number(value);
  const valid = n(born) > 0 && n(weaned) >= 0 && n(deaths) >= 0;
  const mortality = valid ? (n(deaths) / n(born)) * 100 : null;
  const weaningRate = valid ? (n(weaned) / n(born)) * 100 : null;
  const gain = n(days) > 0 ? ((n(finalWeight) - n(initialWeight)) * 1000) / n(days) : null;
  const totalGain = n(animals) > 0 ? (n(finalWeight) - n(initialWeight)) * n(animals) : 0;
  const feedConversion = totalGain > 0 ? n(feed) / totalGain : null;
  const metric = (value: number | null, suffix: string) => value === null || !Number.isFinite(value) ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + suffix;
  return <div className="rounded-xl border p-4">
    <h3 className="text-sm font-bold">Indicadores básicos do lote</h3>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">Preencha os dados do mesmo lote e período. Em leitegadas com transferências de leitões, ajuste os denominadores para interpretar corretamente.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <label className="space-y-1 text-xs font-semibold">Nascidos vivos<Input type="number" min="0" value={born} onChange={(event) => setBorn(event.target.value)} /></label>
      <label className="space-y-1 text-xs font-semibold">Desmamados<Input type="number" min="0" value={weaned} onChange={(event) => setWeaned(event.target.value)} /></label>
      <label className="space-y-1 text-xs font-semibold">Mortes no período<Input type="number" min="0" value={deaths} onChange={(event) => setDeaths(event.target.value)} /></label>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-4">
      <label className="space-y-1 text-xs font-semibold">Peso médio inicial (kg)<Input type="number" step="0.01" value={initialWeight} onChange={(event) => setInitialWeight(event.target.value)} /></label>
      <label className="space-y-1 text-xs font-semibold">Peso médio final (kg)<Input type="number" step="0.01" value={finalWeight} onChange={(event) => setFinalWeight(event.target.value)} /></label>
      <label className="space-y-1 text-xs font-semibold">Dias entre pesagens<Input type="number" min="1" value={days} onChange={(event) => setDays(event.target.value)} /></label>
      <label className="space-y-1 text-xs font-semibold">Animais considerados<Input type="number" min="1" value={animals} onChange={(event) => setAnimals(event.target.value)} /></label>
    </div>
    <div className="mt-3 max-w-xs"><label className="space-y-1 text-xs font-semibold">Ração consumida no período (kg)<Input type="number" min="0" step="0.01" value={feed} onChange={(event) => setFeed(event.target.value)} /></label></div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric label="Mortalidade calculada" value={metric(mortality, "%")} />
      <Metric label="Desmame / nascidos vivos" value={metric(weaningRate, "%")} />
      <Metric label="Ganho médio diário" value={gain !== null && gain >= 0 ? metric(gain, " g/dia") : "—"} />
      <Metric label="Conversão alimentar estimada" value={metric(feedConversion, " kg/kg")} />
    </div>
    <p className="mt-3 text-[.65rem] leading-4 text-muted-foreground">Fórmulas: mortalidade = mortes ÷ nascidos vivos; desmame = desmamados ÷ nascidos vivos; ganho médio diário = diferença de peso ÷ dias; conversão = ração consumida ÷ ganho total estimado. São indicadores matemáticos, não limites de desempenho.</p>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/60 p-3"><p className="text-[.65rem] leading-4 text-muted-foreground">{label}</p><p className="mt-1 text-base font-bold tabular-nums">{value}</p></div>;
}
