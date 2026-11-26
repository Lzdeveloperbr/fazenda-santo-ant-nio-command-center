import { describe, expect, it } from "vitest";
import { HELP_TOPICS, searchHelp } from "./help";

describe("central de ajuda", () => {
  it("busca sem acento e com várias palavras", () => {
    expect(searchHelp("desmame peso").map((t) => t.id)).toContain("desmame");
    expect(searchHelp("COPIA seguranca").map((t) => t.id)).toEqual(["backup"]);
    expect(searchHelp("")).toHaveLength(HELP_TOPICS.length);
    expect(searchHelp("xyzw")).toEqual([]);
  });
  it("ids únicos", () =>
    expect(new Set(HELP_TOPICS.map((t) => t.id)).size).toBe(HELP_TOPICS.length));
});
