import { describe, expect, it } from "vitest";
import { activePlanFor, heatDurationHours, semenState, validateCondition } from "./repro-extras";

describe("fase 7", () => {
  it("duração do cio só com término", () => {
    expect(heatDurationHours("2026-11-20T06:00:00Z", "2026-11-21T18:00:00Z")).toBe(36);
    expect(heatDurationHours("2026-11-20T06:00:00Z", null)).toBeNull();
  });
  it("situação do lote de sêmen", () => {
    const t = "2026-11-26";
    expect(
      semenState({ doses_available: 5, doses_received: 10, expiry_date: "2026-12-10" }, t),
    ).toBe("ok");
    expect(semenState({ doses_available: 2, doses_received: 10, expiry_date: null }, t)).toBe(
      "acabando",
    );
    expect(semenState({ doses_available: 0, doses_received: 10, expiry_date: null }, t)).toBe(
      "sem_doses",
    );
    expect(
      semenState({ doses_available: 5, doses_received: 10, expiry_date: "2026-11-25" }, t),
    ).toBe("vencido");
    expect(
      semenState({ doses_available: 5, doses_received: 10, expiry_date: "2026-11-27" }, t),
    ).toBe("vence_logo");
  });
  it("valida condição corporal como o banco", () => {
    const base = { body_condition_score: null, backfat_mm: null, feed_kg_day: null, notes: null };
    expect(validateCondition({ ...base, body_condition_score: 3.5 })).toBeNull();
    expect(validateCondition({ ...base, body_condition_score: 3.3 })).toMatch(/meio em meio/);
    expect(validateCondition(base)).toMatch(/pelo menos/);
    expect(validateCondition({ ...base, feed_kg_day: 25 })).toMatch(/Ração/);
  });
  it("plano vigente exige validação e faixa de dias", () => {
    const plans = [
      { id: "a", category: "gestacao", day_from: 0, day_to: 84, validated_at: null, active: true },
      {
        id: "b",
        category: "gestacao",
        day_from: 0,
        day_to: 84,
        validated_at: "2026-11-01",
        active: true,
      },
      {
        id: "c",
        category: "gestacao",
        day_from: 85,
        day_to: null,
        validated_at: "2026-11-01",
        active: true,
      },
    ];
    expect(activePlanFor(plans, "gestacao", 40)?.id).toBe("b");
    expect(activePlanFor(plans, "gestacao", 100)?.id).toBe("c");
    expect(activePlanFor(plans, "lactacao", 5)).toBeUndefined();
  });
});
