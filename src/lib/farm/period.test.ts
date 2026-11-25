import { describe, it, expect } from "vitest";
import { periodStart, periodStats } from "./period";
const add = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
describe("period", () => {
  it("7 dias inclui hoje e 6 dias antes", () => expect(periodStart("7d", "2026-11-25", add)).toBe("2026-11-19"));
  it("conta só registros do período e taxa de concepção", () => {
    const s = periodStats("2026-11-01", "2026-11-30", {
      breedings: [{ breeding_date: "2026-11-02", breeding_type: "inseminacao" }, { breeding_date: "2026-10-30", breeding_type: "monta_natural" }],
      litters: [{ farrowing_date: "2026-11-05", born_total: 12, born_alive: 10, stillborn: 1, mummified: 1, weaned: null, weaning_date: null }],
      events: [{ event_type: "morte", event_date: "2026-11-06", quantity: 2 }],
      diagnoses: [{ diagnosis_date: "2026-11-10", result: "positivo" }, { diagnosis_date: "2026-11-11", result: "negativo" }, { diagnosis_date: "2026-11-12", result: "positivo" }, { diagnosis_date: "2026-11-12", result: "positivo" }],
      finance: [{ entry_type: "despesa", amount: 100, entry_date: "2026-11-03", status: "pago" }, { entry_type: "despesa", amount: 50, entry_date: "2026-11-03", status: "pendente" }],
    });
    expect(s.coberturas).toBe(1); expect(s.inseminacoes).toBe(1); expect(s.taxaConcepcao).toBe(75);
    expect(s.mortesLeitoes).toBe(2); expect(s.despesas).toBe(100);
  });
  it("sem diagnósticos não mostra taxa", () => expect(periodStats("a", "b", { breedings: [], litters: [], events: [], diagnoses: [], finance: [] }).taxaConcepcao).toBeNull());
});
