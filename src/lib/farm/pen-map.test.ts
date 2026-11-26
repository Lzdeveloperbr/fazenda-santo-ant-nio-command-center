import { describe, expect, it } from "vitest";
import { groupPens, penCells } from "./pen-map";

const pen = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  code: id,
  sector: "Gestação",
  building: "G1",
  room: null,
  capacity: 2,
  status: "ativa",
  ...over,
});

describe("mapa de baias", () => {
  it("estado pela ocupação e pela atualização do registro", () => {
    const cells = penCells(
      [pen("A"), pen("B"), pen("C"), pen("D"), pen("E", { status: "manutencao" }), pen("F")],
      new Map([
        ["A", ["M1"]],
        ["B", ["M2", "M3"]],
        ["C", ["M4", "M5", "M6"]],
      ]),
      new Map([["A", 10]]),
      [
        { pen_id: "D", event_date: "2026-11-25", animal_count: 0 },
        { pen_id: "F", event_date: "2026-10-01", animal_count: 1 },
      ],
      "2026-11-26",
    );
    const st = Object.fromEntries(cells.map((c) => [c.id, c.state]));
    expect(st).toEqual({
      A: "ocupada",
      B: "lotada",
      C: "acima",
      D: "livre",
      E: "inativa",
      F: "sem_registro",
    });
    expect(cells[0]).toMatchObject({ occupancy: 1, piglets: 10, source: "matrizes vinculadas" });
  });
  it("censo maior que as matrizes vinculadas prevalece", () => {
    const [c] = penCells(
      [pen("A", { capacity: 10 })],
      new Map([["A", ["M1"]]]),
      new Map(),
      [{ pen_id: "A", event_date: "2026-11-26", animal_count: 6 }],
      "2026-11-26",
    );
    expect(c).toMatchObject({ occupancy: 6, state: "ocupada", source: "censo de 26/11/2026" });
  });
  it("agrupa por setor e galpão/sala com ordem numérica", () => {
    const g = groupPens(
      penCells(
        [pen("G-10"), pen("G-2"), pen("M-1", { sector: "Maternidade", building: null })],
        new Map(),
        new Map(),
        [],
        "2026-11-26",
      ),
    );
    expect([
      ...g
        .get("Gestação")!
        .get("G1")!
        .map((c) => c.code),
    ]).toEqual(["G-2", "G-10"]);
    expect([...g.get("Maternidade")!.keys()]).toEqual(["Sem galpão/sala"]);
  });
});
