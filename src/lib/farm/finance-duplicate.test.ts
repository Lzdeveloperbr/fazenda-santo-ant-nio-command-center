import { describe, expect, it } from "vitest";
import { duplicateDraft, possibleDuplicates } from "./finance";

const e = {
  id: "1",
  entry_type: "despesa",
  category: "Energia",
  amount: "350.5",
  status: "pago",
  entry_date: "2026-10-05",
  due_date: "2026-10-10",
  counterpart: "Copel",
  description: "Conta de luz",
  document_number: "NF 9",
  supplier_id: "s",
};

describe("duplicação controlada", () => {
  it("copia valores, mas data hoje, pendente e sem documento", () => {
    expect(duplicateDraft(e, "2026-11-26")).toMatchObject({
      category: "Energia",
      amount: 350.5,
      supplier_id: "s",
      entry_date: "2026-11-26",
      status: "pendente",
      document_number: null,
      due_date: null,
    });
  });
  it("não copia a marca de estorno", () => {
    expect(
      duplicateDraft({ ...e, description: "[ESTORNO:x]" }, "2026-11-26").description,
    ).toBeNull();
  });
  it("avisa lançamento igual no mesmo dia", () => {
    const d = {
      entry_type: "despesa",
      category: "Energia",
      amount: 350.5,
      entry_date: "2026-10-05",
      counterpart: " copel ",
    };
    expect(possibleDuplicates([e], d)).toHaveLength(1);
    expect(possibleDuplicates([e], { ...d, entry_date: "2026-10-06" })).toHaveLength(0);
    expect(possibleDuplicates([e], { ...d, amount: 351 })).toHaveLength(0);
  });
});
