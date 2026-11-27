import { describe, expect, it } from "vitest";
import { isEmptyDay, summarizeDay } from "./daily-summary";

const D = "2026-11-27";
const data = {
  breedings: [
    { sow_id: "a", breeding_date: D },
    { sow_id: "b", breeding_date: "2026-11-26" },
  ],
  litters: [
    {
      sow_id: "b",
      farrowing_date: D,
      born_alive: 12,
      stillborn: 1,
      mummified: 1,
      weaning_date: null,
      weaned: null,
    },
    {
      sow_id: "c",
      farrowing_date: "2026-11-01",
      born_alive: 10,
      stillborn: 0,
      mummified: 0,
      weaning_date: D,
      weaned: 9,
    },
  ],
  litterEvents: [
    { event_type: "morte", event_date: D, quantity: 2 },
    { event_type: "entrada", event_date: D, quantity: 1 },
  ],
  sowEvents: [{ sow_id: "a", event_type: "observacao", event_date: D }],
  diagnoses: [
    { diagnosis_date: D, result: "positivo" },
    { diagnosis_date: D, result: "negativo" },
  ],
  tasks: [
    { title: "Vacinar", status: "concluida", due_date: D, completed_at: `${D}T15:00:00` },
    { title: "Limpar", status: "pendente", due_date: "2026-11-20", completed_at: null },
    { title: "Futuro", status: "pendente", due_date: "2026-12-20", completed_at: null },
  ],
};

describe("resumo do dia", () => {
  it("conta só o que foi registrado no dia", () => {
    const s = summarizeDay(D, data, (id) => id.toUpperCase());
    expect(s.breedings).toEqual(["A"]);
    expect(s.farrowings).toEqual([{ sow: "B", alive: 12, dead: 2 }]);
    expect(s.weanings).toEqual([{ sow: "C", weaned: 9 }]);
    expect(s.pigletDeaths).toBe(2);
    expect(s.diagnoses).toEqual({ positive: 1, negative: 1 });
    expect(s.tasksDone).toEqual(["Vacinar"]);
    expect(s.tasksOpen).toEqual(["Limpar"]);
    expect(isEmptyDay(s)).toBe(false);
  });
  it("dia sem registros", () => {
    expect(isEmptyDay(summarizeDay("2020-01-01", data, (x) => x))).toBe(true);
  });
});
