import { describe, expect, it } from "vitest";
import {
  batchPerformance,
  comparisonPeriods,
  delta,
  reproductiveIndicators,
  sowVsHerd,
} from "./zootech";

const L = (
  id: string,
  sow: string,
  farrow: string,
  wean: string | null,
  alive = 12,
  weaned: number | null = 10,
) => ({
  id,
  sow_id: sow,
  farrowing_date: farrow,
  status: wean ? "desmamada" : "maternidade",
  weaning_date: wean,
  born_alive: alive,
  weaned: wean ? weaned : null,
});

describe("indicadores reprodutivos", () => {
  const data = {
    breedings: [
      {
        id: "b1",
        sow_id: "s1",
        breeding_date: "2026-03-01",
        cycle_status: "parido",
        services_count: 2,
      },
      { id: "b2", sow_id: "s2", breeding_date: "2026-03-05", cycle_status: "retorno" },
      { id: "b3", sow_id: "s3", breeding_date: "2026-03-10", cycle_status: "ativo" },
      { id: "b4", sow_id: "s1", breeding_date: "2026-07-20", cycle_status: "ativo" },
    ],
    diagnoses: [
      { diagnosis_date: "2026-03-30", result: "positivo" },
      { diagnosis_date: "2026-04-01", result: "negativo" },
      { diagnosis_date: "2026-04-02", result: "inconclusivo" },
    ],
    litters: [L("l0", "s1", "2025-11-01", "2025-11-22"), L("l1", "s1", "2026-06-23", "2026-07-14")],
    sowEvents: [{ event_type: "descarte", event_date: "2026-05-01" }],
  };
  it("taxas com denominadores corretos e ciclos ativos excluídos", () => {
    const r = reproductiveIndicators(data, "2026-01-01", "2026-12-31");
    expect(r.conceptionRate).toEqual({ value: 50, n: 2 });
    expect(r.farrowingRate).toEqual({ value: 50, n: 2 });
    expect(r.servicesPerFarrowing.value).toBe(2);
    expect(r.returns).toBe(1);
    expect(r.weaningToEstrus).toEqual({ value: 6, n: 1 });
    expect(r.farrowingInterval).toEqual({ value: 234, n: 1 });
    expect(r.littersPerSowYear.value).toBeCloseTo(365 / 234);
    expect(r.discards).toBe(1);
  });
  it("sem dados não inventa", () => {
    const r = reproductiveIndicators(
      { breedings: [], diagnoses: [], litters: [], sowEvents: [] },
      "2026-01-01",
      "2026-01-31",
    );
    expect(r.conceptionRate.value).toBeNull();
    expect(r.littersPerSowYear.value).toBeNull();
  });
});

describe("desempenho de lote", () => {
  it("GMD exige duas pesagens; conversão exige consumo", () => {
    const b = [
      { id: "a", name: "Lote A", initial_headcount: 100, current_headcount: 100 },
      { id: "c", name: "Lote C", initial_headcount: 50, current_headcount: 50 },
    ];
    const w = [
      { batch_id: "a", weigh_date: "2026-01-01", average_weight_kg: 20 },
      { batch_id: "a", weigh_date: "2026-01-31", average_weight_kg: 41 },
      { batch_id: "c", weigh_date: "2026-01-10", average_weight_kg: 30 },
    ];
    const f = [
      { batch_id: "a", movement_type: "saida", quantity: 4200, movement_date: "2026-01-15" },
    ];
    const [a, c] = batchPerformance(b, w, f, "2026-01-01", "2026-12-31");
    expect(a?.adg).toBeCloseTo(0.7);
    expect(a?.fcr).toBeCloseTo(2);
    expect(c?.adg).toBeNull();
  });
});

describe("comparativos", () => {
  it("período anterior do mesmo tamanho e ano anterior", () => {
    expect(comparisonPeriods("2026-11-01", "2026-11-30")).toEqual({
      previous: { from: "2026-10-02", to: "2026-10-31" },
      lastYear: { from: "2025-11-01", to: "2025-11-30" },
    });
    expect(delta(10, 8)).toBe(2);
    expect(delta(null, 8)).toBeNull();
  });
  it("matriz contra a média do plantel", () => {
    const r = sowVsHerd([
      L("1", "s1", "2026-01-01", "2026-01-22", 14, 12),
      L("2", "s2", "2026-02-01", "2026-02-22", 10, 8),
    ]);
    expect(r.herdNV.value).toBe(12);
    expect(r.rows[0]).toMatchObject({ sowId: "s1", nvDiff: 2, wDiff: 2 });
  });
});
