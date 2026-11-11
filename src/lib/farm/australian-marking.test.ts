import { describe, expect, it } from "vitest";
import { australianEarTotals, buildAutomaticRationTimeline, decodeAustralianMark } from "./australian-marking";

describe("identificação australiana", () => {
  it("rejeita números fora da faixa e valores fracionários", () => {
    expect(decodeAustralianMark(0)).toBeNull();
    expect(decodeAustralianMark(1600)).toBeNull();
    expect(decodeAustralianMark(12.5)).toBeNull();
  });

  it("decompõe o número máximo válido e preserva o total", () => {
    const mark = decodeAustralianMark(1599);
    expect(mark).not.toBeNull();
    expect(australianEarTotals(mark!)).toEqual({ right: 109, left: 1490 });
    expect(australianEarTotals(mark!).right + australianEarTotals(mark!).left).toBe(1599);
  });

  it("representa corretamente números pequenos combinando os valores das marcações", () => {
    expect(decodeAustralianMark(4)).toEqual({ ones: 1, threes: 1, tip100: 0, hole400: 0, tens: 0, thirties: 0, tip200: 0, hole800: 0 });
  });
});

describe("calendário automático de ração após o desmame", () => {
  it("calcula as seis datas a partir da data informada e deixa a etapa final sem data fixa", () => {
    const rows = buildAutomaticRationTimeline("2026-10-29");
    expect(rows.map((row) => row.date)).toEqual([
      "2026-10-29",
      "2026-11-13",
      "2026-12-14",
      "2026-12-29",
      "2027-01-13",
      "2027-01-29",
      null,
    ]);
    expect(rows[6].name).toBe("Ração 7 — FINAL");
  });

  it("mantém os intervalos definidos mesmo ao atravessar o ano", () => {
    const rows = buildAutomaticRationTimeline("2026-12-20");
    expect(rows[1].date).toBe("2027-01-04");
    expect(rows[5].date).toBe("2027-03-22");
  });
});
