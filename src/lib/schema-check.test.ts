import { describe, expect, it } from "vitest";
import { classifyProbe, MIGRATION_PROBES, pendingIds } from "./schema-check";

describe("verificação do banco", () => {
  it("classifica tabela ausente, ok e erro de rede", () => {
    expect(classifyProbe(null)).toBe("ok");
    expect(classifyProbe({ code: "PGRST205", message: "Could not find the table" })).toBe(
      "faltando",
    );
    expect(classifyProbe({ code: "42703", message: "column litters.runts does not exist" })).toBe(
      "faltando",
    );
    expect(classifyProbe({ message: "Failed to fetch" })).toBe("indefinido");
  });
  it("lista só as pendentes, sem repetir migrations", () => {
    expect(
      pendingIds([
        { id: "0021", label: "", state: "faltando" },
        { id: "0022", label: "", state: "ok" },
        { id: "0025", label: "", state: "indefinido" },
      ]),
    ).toEqual(["0021"]);
    expect(new Set(MIGRATION_PROBES.map((p) => p.id)).size).toBe(MIGRATION_PROBES.length);
  });
});
