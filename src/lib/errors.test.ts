import { describe, expect, it } from "vitest";
import { friendlyError, isMissingSchema } from "./errors";

describe("mensagens de erro", () => {
  it("regras do banco passam como estão", () => {
    expect(
      friendlyError({ code: "P0001", message: "A data da pesagem não pode ser futura." }),
    ).toBe("A data da pesagem não pode ser futura.");
  });
  it("traduz erros técnicos conhecidos", () => {
    expect(
      friendlyError({
        code: "PGRST205",
        message: "Could not find the table 'public.sow_weighings' in the schema cache",
      }),
    ).toMatch(/atualização do banco/);
    expect(
      friendlyError({ code: "42501", message: "new row violates row-level security policy" }),
    ).toMatch(/permissão/);
    expect(friendlyError({ code: "23505", message: "duplicate key" })).toMatch(/registro igual/);
    expect(friendlyError(new TypeError("Failed to fetch"))).toMatch(/Sem conexão/);
    expect(friendlyError(null)).toMatch(/Não foi possível/);
    expect(friendlyError({ message: "Invalid login credentials" })).toBe(
      "E-mail ou senha incorretos.",
    );
  });
  it("detecta tabela ou coluna ausente", () => {
    expect(
      isMissingSchema({ code: "42703", message: "column sows.weight_date does not exist" }),
    ).toBe(true);
    expect(isMissingSchema({ code: "23505", message: "x" })).toBe(false);
  });
});
