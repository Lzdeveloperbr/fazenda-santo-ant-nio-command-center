import { describe, expect, it } from "vitest";
import { previousRange } from "./period";

describe("período anterior", () => {
  it("mesmo tamanho, imediatamente antes", () => {
    expect(previousRange("2026-10-29", "2026-11-27")).toEqual({
      from: "2026-09-29",
      to: "2026-10-28",
    });
    expect(previousRange("2026-11-27", "2026-11-27")).toEqual({
      from: "2026-11-26",
      to: "2026-11-26",
    });
    expect(previousRange("2026-03-01", "2026-03-07")).toEqual({
      from: "2026-02-22",
      to: "2026-02-28",
    });
  });
});
