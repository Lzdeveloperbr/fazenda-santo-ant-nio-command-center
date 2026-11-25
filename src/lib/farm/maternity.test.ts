import { describe, expect, it } from "vitest";
import {
  ageBand,
  maternityIndicators,
  mortalityRows,
  sumBy,
  weaningSexError,
  weekdayOf,
} from "./maternity";

const litter = (over: Record<string, unknown> = {}) => ({
  id: "l1",
  sow_id: "s1",
  farrowing_date: "2026-11-01",
  pen_id: "p1",
  status: "maternidade",
  born_total: 14,
  born_alive: 12,
  stillborn: 1,
  mummified: 1,
  deaths: 1,
  transfers_in: 0,
  transfers_out: 0,
  weaned: null,
  weaning_date: null,
  ...over,
});

describe("ficha de mortalidade", () => {
  it("calcula dia da semana e idade a partir do parto", () => {
    expect(weekdayOf("2026-11-25")).toBe("Quarta");
    expect(ageBand(0)).toBe("Dia do parto");
    expect(ageBand(5)).toBe("4–7 dias");
    const rows = mortalityRows(
      [
        {
          id: "e1",
          litter_id: "l1",
          event_type: "morte",
          event_date: "2026-11-04",
          quantity: 2,
          cause: "Esmagamento",
          weight_kg: 1.5,
          responsible: "Ana",
        },
        { id: "e2", litter_id: "l1", event_type: "pesagem", event_date: "2026-11-04", quantity: 0 },
        { id: "e3", litter_id: "lx", event_type: "morte", event_date: "2026-11-04", quantity: 1 },
        { id: "e4", litter_id: "l1", event_type: "morte", event_date: "2026-10-01", quantity: 1 },
      ],
      [litter(), litter({ id: "lx", status: "cancelada" })],
      () => "M-1",
      () => "B-1",
      () => "",
      "2026-11-01",
      "2026-11-30",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ageDays: 3,
      ageBand: "1–3 dias",
      weekday: "Quarta",
      cause: "Esmagamento",
      sow: "M-1",
      pen: "B-1",
      quantity: 2,
    });
  });
  it("motivo vazio aparece como não informado e agrupa por quantidade", () => {
    const rows = [
      { cause: "A", q: 2 },
      { cause: "B", q: 1 },
      { cause: "A", q: 3 },
    ];
    expect(
      sumBy(
        rows,
        (r) => r.cause,
        (r) => r.q,
      ),
    ).toEqual([
      ["A", 5],
      ["B", 1],
    ]);
  });
});

describe("indicadores de maternidade", () => {
  it("usa denominadores explícitos e não inventa sem dados", () => {
    const L = [
      litter({
        id: "a",
        farrowing_date: "2026-10-01",
        status: "desmamada",
        weaned: 10,
        weaning_date: "2026-10-22",
        deaths: 2,
        transfers_in: 0,
        born_alive: 12,
      }),
      litter({
        id: "b",
        farrowing_date: "2026-10-05",
        born_total: 10,
        born_alive: 10,
        stillborn: 0,
        mummified: 0,
      }),
      litter({ id: "c", farrowing_date: "2026-10-06", status: "cancelada" }),
    ];
    const r = maternityIndicators(
      L,
      [
        {
          litter_id: "a",
          birth_date: null,
          birth_weight_kg: 1.5,
          weaning_weight_kg: 6,
          weaning_date: "2026-10-22",
        },
        {
          litter_id: "b",
          birth_date: null,
          birth_weight_kg: 1.3,
          weaning_weight_kg: null,
          weaning_date: null,
        },
      ],
      [],
      "2026-10-01",
      "2026-10-31",
    );
    expect(r.farrowings).toBe(2);
    expect(r.bornTotalPerLitter).toEqual({ value: 12, n: 2 });
    expect(r.stillbornRate.value).toBeCloseTo((1 / 24) * 100);
    expect(r.preWeaningMortality.value).toBeCloseTo((2 / 12) * 100);
    expect(r.weaningAgeDays).toEqual({ value: 21, n: 1 });
    expect(r.birthWeight.value).toBeCloseTo(1.4);
    expect(r.weaningWeight).toEqual({ value: 6, n: 1 });
    const empty = maternityIndicators([], [], [], "2026-10-01", "2026-10-31");
    expect(empty.bornAlivePerLitter).toEqual({ value: null, n: 0 });
    expect(empty.preWeaningMortality.value).toBeNull();
  });
  it("peso ao desmame usa a média do evento quando não há pesagem individual", () => {
    const L = [litter({ id: "a", status: "desmamada", weaned: 10, weaning_date: "2026-11-20" })];
    expect(
      maternityIndicators(
        L,
        [],
        [{ litter_id: "a", event_date: "2026-11-20", weight_kg: 6.5 }],
        "2026-11-01",
        "2026-11-30",
      ).weaningWeight,
    ).toEqual({ value: 6.5, n: 1 });
  });
  it("valida sexo no desmame", () => {
    expect(weaningSexError(10, 5, 5)).toBeNull();
    expect(weaningSexError(10, 6, 5)).toMatch(/não pode passar/);
  });
});
