import { describe, expect, it } from "vitest";
import { isCountedLitter, livePiglets } from "./litter-status";

describe("litter status helpers", () => {
  it("keeps archived records out of operating indicators", () => {
    expect(isCountedLitter({ status: "cancelada" })).toBe(false);
    expect(isCountedLitter({ status: "maternidade" })).toBe(true);
    expect(isCountedLitter({ status: "desmamada" })).toBe(true);
  });

  it("calculates live piglets from recorded births, deaths and transfers", () => {
    expect(livePiglets({ status: "maternidade", born_alive: 12, deaths: 2, transfers_in: 3, transfers_out: 1 })).toBe(12);
  });

  it("does not report live piglets for weaned or archived litters", () => {
    const counts = { born_alive: 12, deaths: 1, transfers_in: 0, transfers_out: 0 };
    expect(livePiglets({ ...counts, status: "desmamada" })).toBe(0);
    expect(livePiglets({ ...counts, status: "cancelada" })).toBe(0);
  });

  it("never returns a negative live count", () => {
    expect(livePiglets({ status: "maternidade", born_alive: 2, deaths: 3, transfers_in: 0, transfers_out: 0 })).toBe(0);
  });
});
