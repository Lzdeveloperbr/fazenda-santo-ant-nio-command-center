import { describe, expect, it } from "vitest";
import { normalize, scoreDoc, searchDocs, type SearchDoc } from "./search";

const docs: SearchDoc[] = [
  { kind: "matriz", id: "1", title: "M-012", terms: ["Estrela"] },
  { kind: "matriz", id: "2", title: "M-120", terms: [null] },
  { kind: "baia", id: "3", title: "Gestação 12", terms: ["gestação"] },
  { kind: "medicamento", id: "4", title: "Ferro dextrano", terms: ["Ferro"] },
];

describe("busca global", () => {
  it("ignora acentos e caixa", () => {
    expect(normalize("  Gestação ")).toBe("gestacao");
  });
  it("prioriza identificação exata", () => {
    expect(scoreDoc(docs[0]!, "m-012")).toBe(3);
    expect(scoreDoc(docs[1]!, "m-12")).toBe(2);
    expect(scoreDoc(docs[0]!, "strela")).toBe(1);
    expect(scoreDoc(docs[0]!, "")).toBe(0);
  });
  it("agrupa por categoria e ordena pela relevância", () => {
    const g = searchDocs(docs, "12");
    expect(g.get("matriz")?.map((d) => d.id)).toEqual(["1", "2"]);
    expect(g.get("baia")?.map((d) => d.id)).toEqual(["3"]);
    expect(g.has("medicamento")).toBe(false);
    expect(searchDocs(docs, "gestacao").get("baia")?.[0]?.id).toBe("3");
  });
});
