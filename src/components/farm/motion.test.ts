import { describe, expect, it } from "vitest";
import { easeOutCubic } from "./motion";

describe("animações", () => {
  it("curva do contador começa em 0, termina em 1 e não passa dos limites", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});
