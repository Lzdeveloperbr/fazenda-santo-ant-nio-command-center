import { describe, it, expect } from "vitest";
import { costPerWeaned, financeSummary, litterMortality, weaningForecast, deathsByMonth, sowProductivity } from "./insights";
const L = (o: object) => ({ id: "l", sow_id: "s", farrowing_date: "2026-11-01", born_total: 12, born_alive: 10, stillborn: 2, deaths: 1, transfers_in: 0, transfers_out: 0, weaned: null, status: "maternidade", weaning_date: null, ...o });
const add = (iso: string, d: number) => { const x = new Date(iso + "T12:00:00"); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
describe("insights", () => {
  it("mortality uses born alive plus adopted", () => expect(litterMortality(L({ transfers_in: 2, deaths: 3 }))).toBe(25));
  it("mortality is null with no piglets", () => expect(litterMortality(L({ born_alive: 0 }))).toBeNull());
  it("weaning expected 21 days after farrowing", () => expect(weaningForecast([L({})], add)[0]).toMatchObject({ expected: "2026-11-22", piglets: 9 }));
  it("weaned litters are not forecast", () => expect(weaningForecast([L({ status: "desmamada" })], add)).toHaveLength(0));
  it("balance counts only paid; estimate includes pending", () => {
    const s = financeSummary([{ entry_type: "receita", amount: 1000, entry_date: "", status: "pago" }, { entry_type: "despesa", amount: 300, entry_date: "", status: "pago" }, { entry_type: "despesa", amount: 200, entry_date: "", status: "pendente" }]);
    expect(s.saldo).toBe(700); expect(s.resultadoEstimado).toBe(500);
  });
  it("cost per weaned piglet needs weaned piglets", () => { expect(costPerWeaned(1000, 0)).toBeNull(); expect(costPerWeaned(1000, 8)).toBe(125); });
  it("deaths grouped by month", () => expect(deathsByMonth([{ event_type: "morte", event_date: "2026-10-03", quantity: 2 }, { event_type: "pesagem", event_date: "2026-10-04", quantity: 0 }])).toEqual({ "2026-10": 2 }));
  it("sow without litters has no productivity", () => expect(sowProductivity("x", [L({})])).toBeNull());
});
