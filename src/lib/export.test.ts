import { describe, expect, it } from "vitest";
import { buildCsv, safeCell, slug } from "./export";

describe("exportação", () => {
  it("neutraliza fórmulas e formata números em pt-BR", () => {
    expect(safeCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeCell("-3")).toBe("'-3");
    expect(safeCell(-3.5)).toBe("-3,5");
    expect(safeCell(null)).toBe("");
  });
  it("monta CSV com cabeçalho da fazenda e aspas escapadas", () => {
    const csv = buildCsv(
      "Mortalidade",
      ["Matriz", "Obs"],
      [["M-1", 'disse "oi"']],
      new Date(2026, 10, 25, 10, 0),
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"Fazenda Santo Antônio — Mortalidade"');
    expect(lines[3]).toBe('"Matriz";"Obs"');
    expect(lines[4]).toBe('"M-1";"disse ""oi"""');
  });
  it("gera nomes de arquivo sem acento", () => {
    expect(slug("Relatório de Ração")).toBe("relatorio-de-racao");
  });
});
