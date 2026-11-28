import { describe, expect, it } from "vitest";
import { batchWeighErrors, filledWeights, missingFields, parseKg } from "./sow-care";

describe("pesagem em lote", () => {
  it("aceita vírgula e ignora campos vazios", () => {
    expect(parseKg("210,5")).toBe(210.5);
    expect(parseKg(" ")).toBeNull();
    expect(Number.isNaN(parseKg("abc") as number)).toBe(true);
    const e = [
      { sowId: "a", tag: "M-1", raw: "200" },
      { sowId: "b", tag: "M-2", raw: "" },
      { sowId: "c", tag: "M-3", raw: "1800" },
    ];
    expect(filledWeights(e)).toEqual([
      { sowId: "a", kg: 200 },
      { sowId: "c", kg: 1800 },
    ]);
    expect(batchWeighErrors(e, "2026-11-27", "2026-11-27")).toEqual([
      'M-3: peso "1800" fora de 20–500 kg.',
    ]);
    expect(batchWeighErrors([], "2026-11-28", "2026-11-27")).toHaveLength(1);
  });
  it("lista o que falta no cadastro", () => {
    expect(
      missingFields({ birth_date: null, breed: " ", weight_kg: 200, entry_date: "2025-01-01" }),
    ).toEqual(["nascimento", "raça"]);
  });
});
