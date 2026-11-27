import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTER,
  activeFilterCount,
  matchesFilter,
  parseSaved,
  saveFilter,
} from "./sow-filters";

const T = "2026-11-26";
const row = (
  o: Partial<{ status: string; parity: number; expected: string | null; breed: string }> = {},
) => ({
  s: { ear_tag: "M-1", name: "Rosa", status: o.status ?? "gestante", breed: o.breed ?? "Landrace" },
  parity: o.parity ?? 3,
  expected: o.expected ?? "2026-12-03",
});

describe("filtros avançados de matrizes", () => {
  it("ordem de parto, raça e parto próximo", () => {
    expect(matchesFilter(row(), EMPTY_FILTER, T)).toBe(true);
    expect(matchesFilter(row(), { ...EMPTY_FILTER, parityMin: 4 }, T)).toBe(false);
    expect(matchesFilter(row(), { ...EMPTY_FILTER, parityMax: 3, breed: "landrace" }, T)).toBe(
      true,
    );
    expect(matchesFilter(row(), { ...EMPTY_FILTER, farrowWithin: 7 }, T)).toBe(true);
    expect(matchesFilter(row(), { ...EMPTY_FILTER, farrowWithin: 6 }, T)).toBe(false);
    expect(matchesFilter(row({ status: "vazia" }), { ...EMPTY_FILTER, farrowWithin: 30 }, T)).toBe(
      false,
    );
    expect(activeFilterCount({ ...EMPTY_FILTER, q: "x", parityMin: 0 })).toBe(2);
  });
  it("filtros salvos: substitui pelo nome e ignora lixo", () => {
    const l = saveFilter(
      saveFilter([], "Prenhas", { ...EMPTY_FILTER, status: "gestante" }),
      "prenhas",
      EMPTY_FILTER,
    );
    expect(l).toHaveLength(1);
    expect(parseSaved(JSON.stringify(l))).toEqual(l);
    expect(parseSaved("{quebrado")).toEqual([]);
    expect(
      parseSaved(JSON.stringify([{ name: "x", filter: { parityMin: -3, q: 5 } }]))[0]!.filter,
    ).toMatchObject({ parityMin: null, q: "" });
  });
});
