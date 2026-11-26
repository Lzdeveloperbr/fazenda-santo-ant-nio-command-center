import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Calculator,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  allSowsQuery,
  breedingsQuery,
  feedProductsQuery,
  litterEventsQuery,
  littersQuery,
  medicationLotsQuery,
  medicationsQuery,
  pigletsQuery,
  stockItemsQuery,
  stockMovementsQuery,
  tasksQuery,
  todayISO,
} from "@/lib/farm";
import { farmSettingsQuery, DEFAULT_FARM_SETTINGS } from "@/lib/farm/farm-settings";
import { stockAlerts } from "@/lib/farm/stock";
import {
  answerLocal,
  dailySummary,
  dataIssues,
  snapshotForAI,
  trends,
  type AssistantData,
} from "@/lib/farm/assistant";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({
    meta: [
      { title: "Santo Antônio AI | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Perguntas sobre os dados da granja, resumo diário, tendências e conferência de registros.",
      },
    ],
  }),
  component: Assistente,
});

const SUGGESTIONS = [
  "Quantas matrizes estão gestantes?",
  "Quais porcas vão parir nesta semana?",
  "Quais matrizes estão atrasadas?",
  "Quantos leitões nasceram neste mês?",
  "Qual foi a mortalidade da maternidade?",
  "Qual matriz teve melhor desempenho?",
  "Quais medicamentos estão acabando?",
  "Quantos leitões foram desmamados?",
  "Qual foi o consumo de ração?",
  "Quais tarefas estão pendentes?",
];
const feedQuery = {
  queryKey: ["assistant", "feed"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("feed_movements")
      .select("movement_type,quantity_kg,movement_date");
    if (error) throw error;
    return data ?? [];
  },
};

type Msg = {
  role: "user" | "assistant";
  text: string;
  items?: string[] | undefined;
  source?: string;
  kind?: "local" | "ia" | "erro";
};

function Assistente() {
  const today = todayISO();
  const sows = useQuery(allSowsQuery),
    breedings = useQuery(breedingsQuery),
    litters = useQuery(littersQuery),
    events = useQuery(litterEventsQuery);
  const tasks = useQuery(tasksQuery),
    piglets = useQuery(pigletsQuery),
    settings = useQuery(farmSettingsQuery),
    feed = useQuery(feedQuery);
  const items = useQuery(stockItemsQuery),
    moves = useQuery(stockMovementsQuery),
    feeds = useQuery(feedProductsQuery),
    lots = useQuery(medicationLotsQuery),
    meds = useQuery(medicationsQuery);
  const loading = [sows, breedings, litters, events, tasks].some((q) => q.isLoading);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const data = useMemo<AssistantData | null>(() => {
    if (loading) return null;
    const cfg = settings.data ?? DEFAULT_FARM_SETTINGS;
    const medName = new Map((meds.data ?? []).map((m) => [m.id, m.name]));
    const alerts = stockAlerts(
      {
        items: items.data ?? [],
        movements: moves.data ?? [],
        feeds: (feeds.data ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          stock_kg: Number(f.stock_kg),
          minimum_stock_kg: Number(f.minimum_stock_kg),
        })),
        medLots: (lots.data ?? []).map((l) => ({ ...l, quantity: Number(l.quantity) })),
        medName: (id) => medName.get(id) ?? "Medicamento",
      },
      today,
    );
    return {
      sows: sows.data ?? [],
      breedings: breedings.data ?? [],
      litters: litters.data ?? [],
      events: events.data ?? [],
      tasks: tasks.data ?? [],
      stockAlerts: alerts,
      feed: feed.data ?? [],
      piglets: piglets.data ?? [],
      gestation: cfg.gestation,
      maternityTransferDay: cfg.maternityTransferDay,
      today,
    };
  }, [
    loading,
    sows.data,
    breedings.data,
    litters.data,
    events.data,
    tasks.data,
    piglets.data,
    settings.data,
    feed.data,
    items.data,
    moves.data,
    feeds.data,
    lots.data,
    meds.data,
    today,
  ]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || !data || busy) return;
    setText("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    const local = answerLocal(q, data);
    if (local) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          text: local.text,
          items: local.items,
          source: local.source,
          kind: "local",
        },
      ]);
      void supabase
        .from("ai_questions")
        .insert({
          question: q,
          answer: [local.text, ...(local.items ?? [])].join("\n").slice(0, 4000),
          mode: "local",
        })
        .then(
          () => undefined,
          () => undefined,
        );
    } else {
      setBusy(true);
      const { data: res, error } = await supabase.functions.invoke("farm-assistant", {
        body: { question: q, snapshot: snapshotForAI(data) },
      });
      setBusy(false);
      if (error || !res?.answer) {
        let msg = "Não consegui responder com a IA agora.";
        try {
          const body = await (error as { context?: Response })?.context?.json();
          if (body?.error) msg = body.error;
        } catch {
          /* sem detalhe */
        }
        setMsgs((m) => [
          ...m,
          {
            role: "assistant",
            text: `${msg} Tente uma das perguntas sugeridas, que são calculadas direto dos registros.`,
            kind: "erro",
          },
        ]);
      } else {
        setMsgs((m) => [
          ...m,
          {
            role: "assistant",
            text: String(res.answer),
            source:
              "Resposta da IA usando só o resumo dos seus dados. Confira os números nos relatórios antes de decidir.",
            kind: "ia",
          },
        ]);
      }
    }
    setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const summary = data ? dailySummary(data) : [];
  const issues = data ? dataIssues(data) : [];
  const trend = data ? trends(data) : [];

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Gestão" title="Santo Antônio AI" />
      <p className="max-w-3xl text-sm text-muted-foreground">
        Pergunte sobre os dados da granja. As perguntas comuns são{" "}
        <b>calculadas direto dos registros</b>; as demais vão para a IA junto com um resumo dos
        dados que você tem permissão de ver. O assistente não diagnostica, não prescreve e não
        substitui o médico-veterinário. A análise de sintomas fica em{" "}
        <Link to="/farmacia-ai" className="font-semibold text-primary underline">
          Santo Antônio AI e Farmácia
        </Link>
        .
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando os dados da granja…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <section className="panel flex min-h-[520px] flex-col p-0">
            <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {msgs.length === 0 && (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                    Sugestões
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void ask(s)}
                        className="rounded-full border border-border px-3 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <div
                    key={i}
                    className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
                  >
                    {m.text}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`max-w-[92%] rounded-2xl rounded-bl-sm border px-4 py-3 text-sm ${m.kind === "erro" ? "border-warn/40 bg-warn/5" : "border-border bg-card"}`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.items && m.items.length > 0 && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                        {m.items.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    )}
                    {m.source && (
                      <p className="mt-2 flex items-center gap-1.5 text-[.68rem] text-muted-foreground">
                        {m.kind === "ia" ? (
                          <Sparkles className="h-3 w-3" />
                        ) : (
                          <Calculator className="h-3 w-3" />
                        )}
                        {m.source}
                      </p>
                    )}
                  </div>
                ),
              )}
              {busy && <p className="text-xs text-muted-foreground">Consultando a IA…</p>}
              <div ref={end} />
            </div>
            <form
              className="flex gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(text);
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex.: quantas matrizes estão gestantes?"
                maxLength={1000}
                className="h-11"
                aria-label="Pergunta"
              />
              <Button
                type="submit"
                className="h-11"
                disabled={busy || text.trim().length < 2}
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </section>

          <aside className="space-y-4">
            <section className="panel p-4">
              <p className="mb-2 font-semibold">Resumo do dia</p>
              <ul className="space-y-1.5 text-sm">
                {summary.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
            <section className="panel p-4">
              <p className="mb-2 font-semibold">Tendências</p>
              <ul className="space-y-2 text-sm">
                {trend.map((t) => (
                  <li key={t.label} className="flex items-center justify-between gap-2">
                    <span>{t.label}</span>
                    <span className="flex items-center gap-1 font-mono">
                      {t.current > t.previous ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : t.current < t.previous ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : null}
                      {t.current}{" "}
                      <span className="text-xs text-muted-foreground">vs {t.previous}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[.68rem] text-muted-foreground">
                {trend[0]?.note}. Comparação simples, sem afirmar causa.
              </p>
            </section>
            <section className="panel p-4">
              <p className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-warn" />
                Possíveis falhas de registro ({issues.length})
              </p>
              {issues.length === 0 ? (
                <Empty>Nenhuma inconsistência encontrada.</Empty>
              ) : (
                <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs">
                  {issues.map((i) => (
                    <li
                      key={i.text}
                      className={`rounded-lg p-2 ${i.level === "alta" ? "bg-destructive/5" : "bg-warn/5"}`}
                    >
                      {i.text}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[.68rem] text-muted-foreground">
                O sistema só aponta; nada é corrigido automaticamente.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
