import { describe, expect, it } from "vitest";
import { farrowingInterval } from "./zootech";

describe("intervalo entre partos", () => {
  it("média dos intervalos, em qualquer ordem", () => {
    expect(farrowingInterval(["2026-06-01", "2025-06-01", "2025-11-15"])).toBe(183);
    expect(farrowingInterval(["2026-06-01"])).toBeNull();
  });
});
