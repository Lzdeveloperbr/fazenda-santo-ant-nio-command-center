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

describe("xlsx", () => {
  it("gera um pacote válido com texto protegido e números como números", async () => {
    const { buildXlsx } = await import("./export");
    const { unzipSync, strFromU8 } = await import("fflate");
    const bytes = await buildXlsx("Teste <&>", ["Nome", "Qtd"], [["=SUM(A1)", 3.5], [null, 2]]);
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toEqual(expect.arrayContaining(["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]));
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]!);
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).toContain("<v>3.5</v>");
    expect(sheet).not.toContain("<f>");
    expect(strFromU8(files["xl/workbook.xml"]!)).toContain('name="Teste &lt;&amp;&gt;"');
  });
});
