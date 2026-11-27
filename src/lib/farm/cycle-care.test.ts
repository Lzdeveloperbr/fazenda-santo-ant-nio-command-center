import { describe, expect, it } from "vitest";
import { cellForColumn, cycleCell, sowCycle, type VaccineColumn } from "./vaccine-map";
import { litterCell, litterColumns } from "./litter-care";

const T = "2026-11-27";
const breedings = [
  {
    id: "b1",
    sow_id: "a",
    breeding_date: "2026-08-20",
    cycle_status: "ativo",
    expected_farrowing: "2026-12-12",
  },
  {
    id: "b0",
    sow_id: "c",
    breeding_date: "2026-07-01",
    cycle_status: "encerrado",
    expected_farrowing: "2026-10-23",
  },
];
const litters = [
  { sow_id: "c", breeding_id: "b0", farrowing_date: "2026-10-23", status: "maternidade" },
];

describe("vacina ligada ao ciclo da matriz", () => {
  it("ciclo atual: cobertura ativa ou maternidade", () => {
    expect(sowCycle("a", breedings, litters)).toEqual({
      start: "2026-08-20",
      cover: "2026-08-20",
      farrowing: "2026-12-12",
      estimated: true,
    });
    expect(sowCycle("c", breedings, litters)).toEqual({
      start: "2026-07-01",
      cover: "2026-07-01",
      farrowing: "2026-10-23",
      estimated: false,
    });
    expect(sowCycle("x", breedings, litters)).toBeNull();
  });
  it("14 dias antes do parto: vence, feita no ciclo, fora do ciclo", () => {
    const al = new Set(["parvo"]);
    const cyc = sowCycle("a", breedings, litters);
    expect(cycleCell([], "a", al, "parto", -14, cyc, T)).toMatchObject({
      state: "vence",
      due: "2026-11-28",
    });
    expect(
      cycleCell(
        [
          {
            sow_id: "a",
            animal_scope: "matriz",
            vaccine_name: "Parvo",
            vaccination_date: "2026-11-20",
            next_due_date: null,
          },
        ],
        "a",
        al,
        "parto",
        -14,
        cyc,
        T,
      ).state,
    ).toBe("em_dia");
    expect(
      cycleCell(
        [
          {
            sow_id: "a",
            animal_scope: "matriz",
            vaccine_name: "Parvo",
            vaccination_date: "2026-05-01",
            next_due_date: null,
          },
        ],
        "a",
        al,
        "parto",
        -30,
        cyc,
        T,
      ).state,
    ).toBe("atrasada");
    expect(cycleCell([], "x", al, "parto", -14, null, T).state).toBe("fora_ciclo");
  });
  it("coluna com reforço usa a regra do reforço", () => {
    const col: VaccineColumn = {
      key: "p:1",
      name: "Parvo",
      protocolId: "1",
      repeatEvery: 180,
      doseInstructions: null,
      validated: true,
      anchor: "parto",
      offset: -14,
    };
    expect(
      cellForColumn([], "a", new Set(["parvo"]), col, sowCycle("a", breedings, litters), T).state,
    ).toBe("nunca");
  });
});

describe("mapa das leitegadas", () => {
  const protos = [
    {
      id: "f",
      name: "Ferro dextrano",
      product: null,
      kind: "ferro",
      target: "leitegada",
      active: true,
      anchor: "parto",
      offset_days: 3,
      dose_instructions: null,
      validated_at: "x",
    },
    {
      id: "v",
      name: "Micoplasma",
      product: "Myco",
      kind: "vacina",
      target: "leitegada",
      active: true,
      anchor: "parto",
      offset_days: 21,
      dose_instructions: null,
      validated_at: null,
    },
    {
      id: "m",
      name: "Matriz",
      product: null,
      kind: "vacina",
      target: "matriz",
      active: true,
      anchor: "parto",
      offset_days: -14,
      dose_instructions: null,
      validated_at: null,
    },
  ];
  const cols = litterColumns(protos);
  const litter = { id: "L", farrowing_date: "2026-11-20" };
  it("só protocolos de leitegada, pela ordem dos dias", () =>
    expect(cols.map((c) => c.name)).toEqual(["Ferro dextrano", "Myco"]));
  it("ferro pelos leitões: parcial e feito", () => {
    const pigs = [
      { litter_id: "L", status: "ativo", iron_date: "2026-11-23" },
      { litter_id: "L", status: "ativo", iron_date: null },
      { litter_id: "L", status: "morto", iron_date: null },
    ];
    expect(
      litterCell(
        cols[0]!,
        new Set(["ferro dextrano"]),
        litter,
        { vacs: [], meds: [], piglets: pigs },
        T,
      ),
    ).toMatchObject({ state: "parcial", done: 1, total: 2 });
    pigs[1]!.iron_date = "2026-11-24";
    expect(
      litterCell(
        cols[0]!,
        new Set(["ferro dextrano"]),
        litter,
        { vacs: [], meds: [], piglets: pigs },
        T,
      ),
    ).toMatchObject({ state: "feito", doneOn: "2026-11-24" });
  });
  it("vacina: programada, atrasada, feita por registro", () => {
    const names = new Set(["myco", "micoplasma"]);
    expect(
      litterCell(cols[1]!, names, litter, { vacs: [], meds: [], piglets: [] }, T),
    ).toMatchObject({ state: "programada", due: "2026-12-11" });
    expect(
      litterCell(cols[1]!, names, litter, { vacs: [], meds: [], piglets: [] }, "2026-12-12").state,
    ).toBe("atrasada");
    expect(
      litterCell(
        cols[1]!,
        names,
        litter,
        {
          vacs: [{ litter_id: "L", vaccine_name: "MYCO", vaccination_date: "2026-12-11" }],
          meds: [],
          piglets: [],
        },
        "2026-12-12",
      ).state,
    ).toBe("feito");
  });
});
