import { describe, expect, it } from "vitest";
import { currentShift, summarizeActivity } from "./team";

describe("atividade da equipe", () => {
  it("agrupa por pessoa, ação e tabela", () => {
    const s = summarizeActivity([
      { actor_id: "a", table_name: "sows", action: "INSERT", occurred_at: "2026-11-26T10:00:00Z" },
      { actor_id: "a", table_name: "sows", action: "UPDATE", occurred_at: "2026-11-26T08:00:00Z" },
      {
        actor_id: "a",
        table_name: "litters",
        action: "INSERT",
        occurred_at: "2026-11-26T12:00:00Z",
      },
      {
        actor_id: null,
        table_name: "tasks",
        action: "DELETE",
        occurred_at: "2026-11-26T09:00:00Z",
      },
    ]);
    expect(s[0]).toMatchObject({
      actorId: "a",
      total: 3,
      inserts: 2,
      updates: 1,
      first: "2026-11-26T08:00:00Z",
      last: "2026-11-26T12:00:00Z",
    });
    expect(s[0]!.byTable[0]).toEqual(["sows", 2]);
    expect(s[1]).toMatchObject({ actorId: null, deletes: 1 });
  });
  it("sem registros, sem resumo", () => expect(summarizeActivity([])).toEqual([]));
  it("turno pelo horário", () => {
    expect(currentShift(new Date(2026, 0, 1, 7))).toBe("manha");
    expect(currentShift(new Date(2026, 0, 1, 15))).toBe("tarde");
    expect(currentShift(new Date(2026, 0, 1, 2))).toBe("noite");
  });
});
