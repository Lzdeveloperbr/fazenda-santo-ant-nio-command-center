import { describe, expect, it } from "vitest";
import { quickActionsFor } from "./quick-actions";

describe("ações rápidas por perfil", () => {
  it("consulta não recebe ações de gravação", () => {
    const tos = quickActionsFor("consulta").map((a) => a.to);
    expect(tos).not.toContain("/manejo-guiado");
    expect(tos).toContain("/relatorios");
  });
  it("veterinário começa pela saúde; funcionário não vê financeiro", () => {
    expect(quickActionsFor("veterinario")[0]!.to).toBe("/sanidade");
    expect(quickActionsFor("funcionario").map((a) => a.to)).not.toContain("/financeiro");
    expect(quickActionsFor("admin").map((a) => a.to)).toContain("/financeiro");
  });
  it("sem perfil, nada", () => expect(quickActionsFor(null)).toEqual([]));
});
