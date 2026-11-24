import { describe, it, expect } from "vitest";
import { cycleDates, cycleAlert, cycleStage, daysBetween, reproductiveIndicators, farrowingWarning, validateGestationConfig } from "./gestation";

const base = { id: "b1", sow_id: "s1", breeding_date: "2026-08-01", heat_check: "pendente", pregnancy_check: "pendente", cycle_status: "ativo" };

describe("gestation calendar", () => {
  it("matches the user's example for a breeding on 01/08/2026", () => {
    const d = cycleDates("2026-08-01");
    expect([d.heatStart, d.heatEnd, d.attention, d.approach, d.intensive, d.farrowing]).toEqual(["2026-08-20", "2026-08-22", "2026-11-14", "2026-11-19", "2026-11-21", "2026-11-23"]);
  });
  it("handles leap years and year turns", () => {
    expect(cycleDates("2027-12-01").farrowing).toBe("2028-03-24");
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("heat return and alerts", () => {
  it("no heat observed means possible pregnancy, never confirmed", () => {
    expect(cycleStage({ ...base, heat_check: "nao_apresentou" }, "2026-08-25").key).toBe("possivel");
  });
  it("unverified heat after day 21 is an urgent pending item", () => {
    expect(cycleAlert(base, "2026-08-24")?.priority).toBe("urgente");
  });
  it("keeps one alert key for the same stage on different days", () => {
    expect(cycleAlert(base, "2026-08-24")?.key).toBe(cycleAlert(base, "2026-08-30")?.key);
  });
  it("closed cycles generate no alerts", () => {
    expect(cycleAlert({ ...base, cycle_status: "parido" }, "2026-11-23")).toBeNull();
  });
  it("day 105 opens the attention window, day 114 is the reference", () => {
    expect(cycleAlert({ ...base, pregnancy_check: "positivo", heat_check: "nao_apresentou" }, "2026-11-14")?.priority).toBe("atencao");
    expect(cycleAlert({ ...base, pregnancy_check: "positivo", heat_check: "nao_apresentou" }, "2026-11-23")?.priority).toBe("urgente");
  });
});

describe("indicators", () => {
  it("excludes open cycles from return rate denominators", () => {
    const r = reproductiveIndicators([
      { id: "a", breeding_date: "2026-01-01", cycle_status: "retorno", heat_check_date: "2026-01-21" },
      { id: "b", breeding_date: "2026-01-01", cycle_status: "parido", heat_check_date: null },
      { id: "c", breeding_date: "2026-01-01", cycle_status: "ativo", heat_check_date: null },
    ], [], []);
    expect(r.returnRate).toBe(0.5);
    expect(r.avgReturnInterval).toBe(20);
  });
  it("warns when piglet categories do not add up", () => {
    expect(farrowingWarning(12, 10, 1, 0)).not.toBeNull();
    expect(farrowingWarning(12, 10, 1, 1)).toBeNull();
  });
});

describe("gestation configuration validation", () => {
  it("accepts the default reproductive calendar", async () => {
    expect(validateGestationConfig({ heatPrep: 18, heatStart: 19, heatEnd: 21, attentionStart: 105, approachDay: 110, intensiveDay: 112, gestationDays: 114 })).toBeNull();
  });
  it("rejects fractional, out-of-range and unordered day values", async () => {
    const { validateGestationConfig } = await import("./gestation");
    expect(validateGestationConfig({ heatPrep: 18.5, heatStart: 19, heatEnd: 21, attentionStart: 105, approachDay: 110, intensiveDay: 112, gestationDays: 114 })).toContain("inteiros");
    expect(validateGestationConfig({ heatPrep: 18, heatStart: 19, heatEnd: 21, attentionStart: 105, approachDay: 110, intensiveDay: 112, gestationDays: 131 })).toContain("entre 1 e 130");
    expect(validateGestationConfig({ heatPrep: 20, heatStart: 19, heatEnd: 21, attentionStart: 105, approachDay: 110, intensiveDay: 112, gestationDays: 114 })).toContain("ordem crescente");
  });
});
