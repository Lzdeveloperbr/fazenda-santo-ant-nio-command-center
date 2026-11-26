import { describe, expect, it } from "vitest";
import { parseCsv, parseDate, validateSowImport } from "./import-sows";

const T = "2026-11-26";
describe("importação de matrizes", () => {
  it("lê CSV do Excel com ; aspas e BOM", () => {
    expect(parseCsv('\ufeffBrinco;Nome\r\nM-1;"Rosa; a grande"\r\n\r\nM-2;"Diz ""oi"""\n')).toEqual([
      ["Brinco", "Nome"],
      ["M-1", "Rosa; a grande"],
      [""],
      ["M-2", 'Diz "oi"'],
    ]);
    expect(parseCsv("brinco,nome\nA,B")).toEqual([
      ["brinco", "nome"],
      ["A", "B"],
    ]);
  });
  it("datas brasileiras e ISO, recusa datas impossíveis", () => {
    expect(parseDate("05/03/2025")).toBe("2025-03-05");
    expect(parseDate("2025-03-05")).toBe("2025-03-05");
    expect(parseDate("31/02/2025")).toBe("erro");
    expect(parseDate("")).toBeNull();
  });
  it("valida linha a linha sem gravar nada inválido", () => {
    const rows = parseCsv(
      "Brinco;Nome;Raça;Nascimento;Entrada;Peso\nM-1;Rosa;Landrace;01/01/2025;01/06/2025;180,5\nM-2;;;;;\nm-1;;;;;\nX-9;;;01/01/2030;;\n;;;;;\nOLD;;;;;\n=1+1;;;;;\nE;;;01/06/2025;01/01/2025;900",
    );
    const { lines, missing } = validateSowImport(rows, ["old"], T);
    expect(missing).toBeNull();
    expect(lines[0]!.row).toMatchObject({
      ear_tag: "M-1",
      breed: "Landrace",
      birth_date: "2025-01-01",
      weight_kg: 180.5,
    });
    expect(lines[1]!.row).toMatchObject({ ear_tag: "M-2", name: null });
    expect(lines[2]!.errors).toContain("brinco repetido no arquivo");
    expect(lines[3]!.errors).toContain("nascimento no futuro");
    expect(lines.find((l) => l.line === 7)!.errors).toContain("brinco já cadastrado");
    expect(lines.find((l) => l.line === 8)!.errors).toContain(
      "brinco não pode começar com = + - @",
    );
    expect(lines.at(-1)!.errors).toEqual(["entrada antes do nascimento", "peso inválido"]);
  });
  it("exige a coluna brinco", () =>
    expect(validateSowImport([["Nome"], ["x"]], [], T).missing).toMatch(/Brinco/));
});
