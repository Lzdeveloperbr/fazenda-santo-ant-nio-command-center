/** Resumo de um dia a partir dos registros gravados (nada estimado). */
type B = { sow_id: string; breeding_date: string };
type L = {
  sow_id: string;
  farrowing_date: string;
  born_alive: number;
  stillborn: number;
  mummified: number;
  weaning_date: string | null;
  weaned: number | null;
};
type LE = { event_type: string; event_date: string; quantity: number };
type SE = { sow_id: string; event_type: string; event_date: string };
type D = { diagnosis_date: string; result: string };
type T = { title: string; status: string; due_date: string | null; completed_at: string | null };

export type DaySummary = {
  breedings: string[];
  farrowings: { sow: string; alive: number; dead: number }[];
  weanings: { sow: string; weaned: number }[];
  pigletDeaths: number;
  sowEvents: { sow: string; type: string }[];
  diagnoses: { positive: number; negative: number };
  tasksDone: string[];
  tasksOpen: string[];
};

export function summarizeDay(
  day: string,
  d: {
    breedings: B[];
    litters: L[];
    litterEvents: LE[];
    sowEvents: SE[];
    diagnoses: D[];
    tasks: T[];
  },
  tag: (sowId: string) => string,
): DaySummary {
  const localDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("sv-SE") : null);
  return {
    breedings: d.breedings.filter((b) => b.breeding_date === day).map((b) => tag(b.sow_id)),
    farrowings: d.litters
      .filter((l) => l.farrowing_date === day)
      .map((l) => ({ sow: tag(l.sow_id), alive: l.born_alive, dead: l.stillborn + l.mummified })),
    weanings: d.litters
      .filter((l) => l.weaning_date === day)
      .map((l) => ({ sow: tag(l.sow_id), weaned: l.weaned ?? 0 })),
    pigletDeaths: d.litterEvents
      .filter((e) => e.event_type === "morte" && e.event_date === day)
      .reduce((a, e) => a + e.quantity, 0),
    sowEvents: d.sowEvents
      .filter((e) => e.event_date === day)
      .map((e) => ({ sow: tag(e.sow_id), type: e.event_type })),
    diagnoses: {
      positive: d.diagnoses.filter((x) => x.diagnosis_date === day && x.result === "positivo")
        .length,
      negative: d.diagnoses.filter((x) => x.diagnosis_date === day && x.result !== "positivo")
        .length,
    },
    tasksDone: d.tasks
      .filter((t) => t.status === "concluida" && localDay(t.completed_at) === day)
      .map((t) => t.title),
    tasksOpen: d.tasks
      .filter(
        (t) =>
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          t.due_date !== null &&
          t.due_date <= day,
      )
      .map((t) => t.title),
  };
}

export function isEmptyDay(s: DaySummary) {
  return (
    !s.breedings.length &&
    !s.farrowings.length &&
    !s.weanings.length &&
    !s.pigletDeaths &&
    !s.sowEvents.length &&
    !s.diagnoses.positive &&
    !s.diagnoses.negative &&
    !s.tasksDone.length
  );
}
