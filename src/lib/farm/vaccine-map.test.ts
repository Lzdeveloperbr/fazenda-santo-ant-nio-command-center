import { describe, expect, it } from "vitest";
import {
  ageLabel,
  cellFor,
  columnAliases,
  vaccineColumns,
  weightStale,
  worst,
} from "./vaccine-map";

const T = "2026-11-27";
const protos = [
  {
    id: "p1",
    name: "Parvovirose matrizes",
    product: "Parvo-X",
    kind: "vacina",
    target: "matriz",
    active: true,
    repeat_every_days: 180,
    dose_instructions: "Conforme bula",
    validated_at: "2026-01-01",
  },
  {
    id: "p2",
    name: "Ferro",
    product: null,
    kind: "ferro",
    target: "leitegada",
    active: true,
    repeat_every_days: null,
    dose_instructions: null,
    validated_at: null,
  },
  {
    id: "p3",
    name: "Antiga",
    product: null,
    kind: "vacina",
    target: "matriz",
    active: false,
    repeat_every_days: null,
    dose_instructions: null,
    validated_at: null,
  },
];
const recs = [
  {
    sow_id: "a",
    animal_scope: "matriz",
    vaccine_name: "parvo-x",
    vaccination_date: "2026-04-01",
    next_due_date: null,
  },
  {
    sow_id: "a",
    animal_scope: "matriz",
    vaccine_name: "Parvo-X",
    vaccination_date: "2025-10-01",
    next_due_date: null,
  },
  {
    sow_id: "b",
    animal_scope: "matriz",
    vaccine_name: "Parvovirose matrizes",
    vaccination_date: "2026-11-01",
    next_due_date: null,
  },
  {
    sow_id: "a",
    animal_scope: "matriz",
    vaccine_name: "Erisipela",
    vaccination_date: "2026-10-01",
    next_due_date: "2026-12-05",
  },
  {
    sow_id: null,
    animal_scope: "grupo",
    vaccine_name: "Circovírus",
    vaccination_date: "2026-10-01",
    next_due_date: null,
  },
];

describe("mapa de vacinação", () => {
  it("colunas: protocolos ativos de vacina para matriz + vacinas avulsas", () => {
    const cols = vaccineColumns(protos, recs);
    expect(cols.map((c) => c.name)).toEqual(["Parvo-X", "Erisipela"]);
    expect(cols[0]).toMatchObject({ repeatEvery: 180, validated: true });
  });
  it("situação pela última aplicação e reforço do protocolo ou anotado", () => {
    const [parvo, eri] = vaccineColumns(protos, recs);
    const pa = columnAliases(parvo!, protos);
    expect(cellFor(recs, "a", pa, 180, T)).toEqual({
      state: "atrasada",
      last: "2026-04-01",
      due: "2026-09-28",
      count: 2,
    });
    expect(cellFor(recs, "b", pa, 180, T).state).toBe("em_dia");
    expect(cellFor(recs, "c", pa, 180, T).state).toBe("nunca");
    expect(cellFor(recs, "a", columnAliases(eri!, protos), null, T)).toMatchObject({
      state: "vence",
      due: "2026-12-05",
    });
    expect(cellFor(recs, "b", pa, null, T).state).toBe("aplicada");
  });
  it("pior situação, idade e peso antigo", () => {
    expect(
      worst([
        { state: "em_dia", last: null, due: null, count: 1 },
        { state: "nunca", last: null, due: null, count: 0 },
      ]),
    ).toBe("nunca");
    expect(ageLabel("2025-05-27", T)).toBe("18 meses");
    expect(ageLabel("2023-11-27", T)).toBe("3 anos");
    expect(ageLabel("2026-11-01", T)).toBe("26 dias");
    expect(ageLabel(null, T)).toBeNull();
    expect(weightStale("2026-10-01", T)).toBe(false);
    expect(weightStale("2026-01-01", T)).toBe(true);
    expect(weightStale(null, T)).toBe(true);
  });
});
