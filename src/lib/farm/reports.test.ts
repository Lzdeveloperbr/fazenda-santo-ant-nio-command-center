import { describe, expect, it } from "vitest";
import { REPORTS, type ReportData, type Filters } from "./reports";
import { DEFAULT_CONFIG } from "./gestation";

const empty: ReportData = {
  sows: [],
  breedings: [],
  diagnoses: [],
  litters: [],
  litterEvents: [],
  sowEvents: [],
  piglets: [],
  pens: [],
  penRecords: [],
  batches: [],
  batchEvents: [],
  batchWeights: [],
  batchFeed: [],
  vaccinations: [],
  medications: [],
  stockItems: [],
  feeds: [],
  feedMovements: [],
  medLots: [],
  meds: [],
  finance: [],
  audit: [],
  profiles: [],
  gestation: DEFAULT_CONFIG,
  today: "2026-11-26",
};
const F: Filters = { from: "2026-11-01", to: "2026-11-30", sowId: "", batchId: "", userId: "" };
const get = (id: string) => REPORTS.find((r) => r.id === id)!;

describe("central de relatórios", () => {
  it("tem os 18 relatórios pedidos e todos rodam sem dados", () => {
    expect(REPORTS).toHaveLength(18);
    for (const r of REPORTS) {
      const t = r.build(empty, F);
      expect(t.header.length).toBeGreaterThan(0);
      expect(Array.isArray(t.rows)).toBe(true);
    }
    expect(get("auditoria").restricted).toBe(true);
  });
  it("maternidade calcula duração do parto e respeita período e matriz", () => {
    const d = {
      ...empty,
      sows: [
        { id: "s1", ear_tag: "M-1" },
        { id: "s2", ear_tag: "M-2" },
      ],
      litters: [
        {
          id: "l1",
          sow_id: "s1",
          farrowing_date: "2026-11-10",
          start_time: "23:30:00",
          end_time: "02:00:00",
          born_total: 12,
          born_alive: 11,
          stillborn: 1,
          status: "maternidade",
        },
        {
          id: "l2",
          sow_id: "s2",
          farrowing_date: "2026-10-10",
          born_total: 10,
          born_alive: 10,
          stillborn: 0,
          status: "maternidade",
        },
      ],
    };
    const t = get("maternidade").build(d, F);
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0]?.[0]).toBe("M-1");
    expect(t.rows[0]?.[5]).toBe(150);
    expect(
      get("maternidade").build(d, { ...F, from: "2026-10-01", sowId: "s2" }).rows,
    ).toHaveLength(1);
  });
  it("indicadores comparam com o período anterior e o ano anterior", () => {
    const d = {
      ...empty,
      litters: [
        {
          id: "a",
          sow_id: "s1",
          farrowing_date: "2026-11-05",
          born_total: 14,
          born_alive: 12,
          stillborn: 2,
          mummified: 0,
          deaths: 0,
          transfers_in: 0,
          transfers_out: 0,
          status: "maternidade",
          weaning_date: null,
          weaned: null,
        },
        {
          id: "b",
          sow_id: "s2",
          farrowing_date: "2025-11-05",
          born_total: 10,
          born_alive: 10,
          stillborn: 0,
          mummified: 0,
          deaths: 0,
          transfers_in: 0,
          transfers_out: 0,
          status: "maternidade",
          weaning_date: null,
          weaned: null,
        },
      ],
    };
    const row = get("indicadores")
      .build(d, F)
      .rows.find((r) => r[0] === "Nascidos vivos por parto")!;
    expect(row.slice(1, 4)).toEqual([12, null, 10]);
  });
  it("financeiro usa data de pagamento ou vencimento", () => {
    const d = {
      ...empty,
      finance: [
        {
          id: "1",
          entry_type: "despesa",
          category: "Água",
          amount: 50,
          status: "pendente",
          entry_date: "2026-10-01",
          due_date: "2026-11-10",
        },
      ],
    };
    expect(get("financeiro").build(d, F).rows[0]?.[0]).toBe("10/11/2026");
  });
});
