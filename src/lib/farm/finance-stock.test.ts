import { describe, expect, it } from "vitest";
import {
  cashDate,
  cashFlow,
  costPerHead,
  lastMonths,
  openItems,
  paidExpensesBy,
  type Entry,
} from "./finance";
import { stockAlerts } from "./stock";

const e = (over: Partial<Entry>): Entry => ({
  id: "x",
  entry_type: "despesa",
  category: "Ração",
  amount: 100,
  status: "pago",
  entry_date: "2026-11-05",
  due_date: null,
  ...over,
});

describe("financeiro", () => {
  it("data de caixa: pagamento para pagos, vencimento para pendentes", () => {
    expect(cashDate(e({ paid_at: "2026-11-10" }))).toBe("2026-11-10");
    expect(cashDate(e({}))).toBe("2026-11-05");
    expect(cashDate(e({ status: "pendente", due_date: "2026-12-01" }))).toBe("2026-12-01");
  });
  it("fluxo de caixa nunca soma realizado com previsto", () => {
    const flow = cashFlow(
      [
        e({ amount: 100 }),
        e({ entry_type: "receita", amount: "500" }),
        e({ status: "pendente", amount: 300, due_date: "2026-11-20" }),
        e({ status: "pendente", entry_type: "receita", amount: 50, due_date: "2026-12-02" }),
      ],
      ["2026-11", "2026-12"],
    );
    expect(flow[0]).toMatchObject({
      realizedIn: 500,
      realizedOut: 100,
      realizedNet: 400,
      plannedOut: 300,
      plannedNet: -300,
    });
    expect(flow[1]).toMatchObject({ realizedNet: 0, plannedIn: 50 });
  });
  it("meses em sequência, inclusive virada de ano", () => {
    expect(lastMonths("2026-01-15", 3, 1)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
  it("contas em aberto com atraso", () => {
    const items = openItems(
      [
        e({ id: "a", status: "pendente", due_date: "2026-11-20" }),
        e({ id: "b", status: "pendente", due_date: "2026-12-10" }),
        e({ id: "c" }),
      ],
      "despesa",
      "2026-11-25",
    );
    expect(items.map((i) => [i.id, i.overdue, i.daysLeft])).toEqual([
      ["a", true, -5],
      ["b", false, 15],
    ]);
  });
  it("custos por centro só com despesas pagas no período", () => {
    const rows = paidExpensesBy(
      [
        e({ cost_center: "maternidade", amount: 70 }),
        e({ cost_center: "maternidade", status: "pendente", amount: 999 }),
        e({ amount: 30 }),
        e({ entry_type: "receita", amount: 5 }),
      ],
      (x) => x.cost_center,
      "2026-11-01",
      "2026-11-30",
    );
    expect(rows).toEqual([
      ["maternidade", 70],
      ["Sem classificação", 30],
    ]);
    expect(costPerHead(900, 30)).toBe(30);
    expect(costPerHead(900, 0)).toBeNull();
  });
});

describe("alertas de estoque", () => {
  it("consolida mínimo, validade, lote sem identificação e ajuste", () => {
    const alerts = stockAlerts(
      {
        items: [
          {
            id: "i1",
            name: "Seringa",
            unit: "un",
            minimum_stock: 50,
            current_stock: 10,
            active: true,
          },
          { id: "i2", name: "Luva", unit: "cx", minimum_stock: 0, current_stock: 0, active: true },
        ],
        movements: [
          {
            id: "m1",
            item_id: "i1",
            movement_type: "entrada",
            lot: null,
            expiry_date: "2026-12-10",
            quantity: 100,
            movement_date: "2026-11-01",
            reason: null,
          },
          {
            id: "m2",
            item_id: "i1",
            movement_type: "ajuste",
            lot: null,
            expiry_date: null,
            quantity: -3,
            movement_date: "2026-11-10",
            reason: "contagem",
          },
        ],
        feeds: [{ id: "f1", name: "Gestação", stock_kg: 100, minimum_stock_kg: 500 }],
        medLots: [
          {
            id: "l1",
            medication_id: "md",
            lot_number: "A1",
            expiry_date: "2026-11-01",
            quantity: 5,
            unit: "mL",
          },
          {
            id: "l2",
            medication_id: "md",
            lot_number: "A2",
            expiry_date: "2026-11-01",
            quantity: 0,
            unit: "mL",
          },
        ],
        medName: () => "Remédio X",
      },
      "2026-11-25",
    );
    const keys = alerts.map((a) => a.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "min-i1",
        "zero-i2",
        "lot-m1",
        "near-m1",
        "adj-m2",
        "feedmin-f1",
        "medexp-l1",
      ]),
    );
    expect(keys).not.toContain("medexp-l2");
    expect(alerts[0]?.level).toBe("alta");
  });
});
