import { describe, expect, it } from "vitest";
import {
  breedingErrors,
  breedingPreview,
  farrowingErrors,
  farrowingMinutes,
  weaningAverage,
  weaningErrors,
} from "./flows";

const T = "2026-11-26";

describe("fluxo de cobertura", () => {
  const ok = {
    sowId: "s",
    sowStatus: "vazia",
    date: "2026-11-20",
    type: "inseminacao",
    semenBatchId: "",
    doses: null,
    heatStartedAt: "",
  };
  it("valida matriz, data, tipo, doses e cio", () => {
    expect(breedingErrors(ok, T)).toBeNull();
    expect(breedingErrors({ ...ok, sowStatus: "gestante" }, T)).toMatch(/só vazias/);
    expect(breedingErrors({ ...ok, date: "2026-11-27" }, T)).toMatch(/futura/);
    expect(breedingErrors({ ...ok, semenBatchId: "b" }, T)).toMatch(/doses/);
    expect(breedingErrors({ ...ok, heatStartedAt: "2026-11-21T08:00" }, T)).toMatch(/cio/);
  });
  it("prevê datas pelos parâmetros e não inventa diagnóstico", () => {
    expect(
      breedingPreview("2026-11-20", { heatStart: 19, gestationDays: 114, diagnosisDay: null }),
    ).toEqual({ heatCheck: "2026-12-09", diagnosis: null, farrowing: "2027-03-14" });
  });
});

describe("fluxo de parto", () => {
  const ok = {
    breedingId: "b",
    breedingDate: "2026-08-01",
    date: "2026-11-20",
    alive: 12,
    stillborn: 1,
    mummified: 0,
    runts: 1,
    deathsAfter: 0,
    piglets: 12,
    start: "",
    end: "",
  };
  it("valida números e datas", () => {
    expect(farrowingErrors(ok, T)).toBeNull();
    expect(farrowingErrors({ ...ok, date: "2026-07-01" }, T)).toMatch(/Data/);
    expect(
      farrowingErrors({ ...ok, alive: 0, stillborn: 0, mummified: 0, runts: 0, piglets: 0 }, T),
    ).toMatch(/nascidos/);
    expect(farrowingErrors({ ...ok, runts: 13 }, T)).toMatch(/Refugos/);
    expect(farrowingErrors({ ...ok, piglets: 13 }, T)).toMatch(/identificados/);
    expect(farrowingErrors({ ...ok, stillborn: -1 }, T)).toMatch(/negativos/);
  });
  it("duração atravessando a meia-noite", () => {
    expect(farrowingMinutes("23:30", "02:00")).toBe(150);
    expect(farrowingMinutes("", "02:00")).toBeNull();
  });
});

describe("fluxo de desmame", () => {
  const ok = {
    litterId: "l",
    farrowingDate: "2026-11-01",
    live: 10,
    date: "2026-11-22",
    males: 5,
    females: 5,
    avgWeight: null,
    weights: [6, 6.5],
  };
  it("valida sexo, datas e pesos", () => {
    expect(weaningErrors(ok, T)).toBeNull();
    expect(weaningErrors({ ...ok, males: 6 }, T)).toMatch(/passam/);
    expect(weaningErrors({ ...ok, live: 0 }, T)).toMatch(/vivos/);
    expect(weaningErrors({ ...ok, weights: [0] }, T)).toMatch(/individual/);
  });
  it("peso médio: informado ou dos pesos individuais", () => {
    expect(weaningAverage(7, [1])).toBe(7);
    expect(weaningAverage(null, [6, 6.5])).toBe(6.25);
    expect(weaningAverage(null, [])).toBeNull();
  });
});
