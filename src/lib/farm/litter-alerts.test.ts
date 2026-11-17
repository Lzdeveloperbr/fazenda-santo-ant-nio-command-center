import { describe, expect, it } from "vitest";
import { litterAlerts } from "./litter-alerts";
const today = new Date("2026-11-17T12:00:00");
const base = { farrowing_date: "2026-11-10", born_total: 12, born_alive: 12, stillborn: 0, deaths: 0, transfers_in: 0, transfers_out: 0, avg_weight: 1.5 };
const ids = (a: ReturnType<typeof litterAlerts>) => a.map((x) => `${x.id}:${x.level}`);
describe("litterAlerts", () => {
  it("clean litter shows ok", () => expect(ids(litterAlerts(base, 12, today))).toEqual(["ok:ok"]));
  it("mortality 15% or more is an alert", () => expect(ids(litterAlerts({ ...base, born_alive: 10, deaths: 2 }, 8, today))).toContain("mortalidade:alerta"));
  it("mortality 8% is attention", () => expect(ids(litterAlerts({ ...base, born_alive: 12, deaths: 1 }, 11, today))).toContain("mortalidade:atencao"));
  it("21 days opens weaning window, over 28 is alert", () => {
    expect(ids(litterAlerts({ ...base, farrowing_date: "2026-10-27" }, 12, today))).toContain("desmame:atencao");
    expect(ids(litterAlerts({ ...base, farrowing_date: "2026-10-18" }, 12, today))).toContain("desmame:alerta");
  });
  it("more than 14 live piglets warns about teats", () => expect(ids(litterAlerts({ ...base, born_alive: 15 }, 15, today))).toContain("tetos:atencao"));
  it("no weight after 3 days is info", () => expect(ids(litterAlerts({ ...base, avg_weight: null }, 12, today))).toContain("pesagem:info"));
});
