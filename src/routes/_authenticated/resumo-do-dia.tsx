import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Printer } from "lucide-react";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Field } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  allSowsQuery,
  breedingsQuery,
  diagnosesQuery,
  farmQuery,
  fmtDate,
  litterEventsQuery,
  littersQuery,
  SOW_EVENT_LABEL,
  sowEventsQuery,
  tasksQuery,
  todayISO,
} from "@/lib/farm";
import { isEmptyDay, summarizeDay } from "@/lib/farm/daily-summary";

export const Route = createFileRoute("/_authenticated/resumo-do-dia")({
  head: () => ({
    meta: [
      { title: "Resumo do dia | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Coberturas, partos, desmames, mortes, diagnósticos e tarefas de um dia, prontos para imprimir.",
      },
    ],
  }),
  component: ResumoDoDia,
});

function Block({
  title,
  count,
  children,
}: {
  title: string;
  count: number | string;
  children?: ReactNode;
}) {
  return (
    <section className="label-card rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="text-2xl font-bold tabular-nums">{count}</span>
      </div>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </section>
  );
}

function ResumoDoDia() {
  const [day, setDay] = useState(todayISO());
  const sows = useQuery(allSowsQuery),
    breedings = useQuery(breedingsQuery),
    litters = useQuery(littersQuery),
    events = useQuery(litterEventsQuery);
  const sowEvents = useQuery(sowEventsQuery),
    diagnoses = useQuery(diagnosesQuery),
    tasks = useQuery(tasksQuery),
    farm = useQuery(farmQuery);
  const loading = [sows, breedings, litters, events, sowEvents, diagnoses, tasks].some(
    (q) => q.isLoading,
  );
  const s = useMemo(() => {
    const tags = new Map((sows.data ?? []).map((x) => [x.id, x.ear_tag]));
    return summarizeDay(
      day,
      {
        breedings: breedings.data ?? [],
        litters: litters.data ?? [],
        litterEvents: events.data ?? [],
        sowEvents: sowEvents.data ?? [],
        diagnoses: diagnoses.data ?? [],
        tasks: tasks.data ?? [],
      },
      (id) => tags.get(id) ?? "?",
    );
  }, [
    day,
    sows.data,
    breedings.data,
    litters.data,
    events.data,
    sowEvents.data,
    diagnoses.data,
    tasks.data,
  ]);
  const alive = s.farrowings.reduce((a, f) => a + f.alive, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print space-y-4">
        <SectionTitle kicker="Rotina" title="Resumo do dia" />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Dia">
            <Input
              type="date"
              value={day}
              max={todayISO()}
              onChange={(e) => setDay(e.target.value || todayISO())}
              className="h-11 w-auto"
            />
          </Field>
          <Button className="h-11" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="print-area space-y-4">
          <header>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {farm.data?.name ?? "Fazenda Santo Antônio"}
            </p>
            <h1 className="text-2xl font-bold">Resumo de {fmtDate(day)}</h1>
          </header>
          {isEmptyDay(s) && <Empty>Nenhum manejo registrado neste dia.</Empty>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Block title="Partos" count={s.farrowings.length}>
              {s.farrowings.length > 0 && (
                <>
                  {alive} nascidos vivos ·{" "}
                  {s.farrowings
                    .map((f) => `${f.sow} (${f.alive} vivos${f.dead ? `, ${f.dead} mortos` : ""})`)
                    .join(", ")}
                </>
              )}
            </Block>
            <Block title="Coberturas / inseminações" count={s.breedings.length}>
              {s.breedings.join(", ") || null}
            </Block>
            <Block title="Desmames" count={s.weanings.length}>
              {s.weanings.length > 0 &&
                s.weanings.map((w) => `${w.sow} (${w.weaned} leitões)`).join(", ")}
            </Block>
            <Block title="Mortes de leitões" count={s.pigletDeaths} />
            <Block
              title="Diagnósticos de gestação"
              count={s.diagnoses.positive + s.diagnoses.negative}
            >
              {s.diagnoses.positive + s.diagnoses.negative > 0 &&
                `${s.diagnoses.positive} positivo(s) · ${s.diagnoses.negative} negativo(s)`}
            </Block>
            <Block title="Ocorrências com matrizes" count={s.sowEvents.length}>
              {s.sowEvents.length > 0 &&
                s.sowEvents
                  .map((e) => `${e.sow}: ${SOW_EVENT_LABEL[e.type] ?? e.type}`)
                  .join(" · ")}
            </Block>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Block title="Tarefas concluídas" count={s.tasksDone.length}>
              {s.tasksDone.length > 0 && (
                <ul className="list-disc pl-5">
                  {s.tasksDone.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title="Tarefas em aberto até o dia" count={s.tasksOpen.length}>
              {s.tasksOpen.length > 0 && (
                <ul className="list-disc pl-5">
                  {s.tasksOpen.slice(0, 15).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </Block>
          </div>
        </div>
      )}
    </div>
  );
}
