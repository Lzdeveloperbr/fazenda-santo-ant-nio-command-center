import { describe, expect, it } from "vitest";
import { isActiveSowStatus, litterEventError, breedingDateError, farrowingTimeError } from "./reproduction";

describe("situação das matrizes", () => {
  it("mantém no plantel somente as situações reprodutivas ativas", () => {
    expect(["vazia", "coberta", "gestante", "lactante"].every(isActiveSowStatus)).toBe(true);
    expect(["descartada", "morta", "transferida"].some(isActiveSowStatus)).toBe(false);
  });
});

describe("limites dos eventos da leitegada", () => {
  it("bloqueia uma morte acima dos 3 leitões vivos", () => {
    expect(litterEventError({ eventType: "morte", quantity: 4, live: 3 })).toContain("3 leitões");
    expect(litterEventError({ eventType: "morte", quantity: 3, live: 3 })).toBeNull();
  });

  it("bloqueia uma transferência de saída acima dos 3 leitões vivos", () => {
    expect(litterEventError({ eventType: "transferencia_saida", quantity: 4, live: 3 })).toContain("3 leitões");
    expect(litterEventError({ eventType: "transferencia_saida", quantity: 2, live: 3 })).toBeNull();
  });

  it("exige que o desmame registre os 5 leitões vivos, sem excedente nem restante", () => {
    expect(litterEventError({ eventType: "desmame", quantity: 4, live: 5 })).toContain("todos os 5");
    expect(litterEventError({ eventType: "desmame", quantity: 6, live: 5 })).toContain("todos os 5");
    expect(litterEventError({ eventType: "desmame", quantity: 5, live: 5 })).toBeNull();
  });

  it("exige quantidade inteira e positiva nas contagens", () => {
    expect(litterEventError({ eventType: "morte", quantity: 0, live: 3 })).toContain("maior que zero");
    expect(litterEventError({ eventType: "transferencia_entrada", quantity: 1.5, live: 3 })).toContain("inteira");
  });

  it("exige peso médio maior que zero", () => {
    expect(litterEventError({ eventType: "pesagem", quantity: 0, live: 3, value: 0 })).toContain("maior que zero");
    expect(litterEventError({ eventType: "pesagem", quantity: 0, live: 3, value: 1.25 })).toBeNull();
  });
});


describe("validação da cobertura", () => {
  it("aceita uma data válida até hoje", () => {
    expect(breedingDateError("2026-11-24", "2026-11-24")).toBeNull();
    expect(breedingDateError("2026-11-20", "2026-11-24")).toBeNull();
  });
  it("rejeita data futura e datas impossíveis", () => {
    expect(breedingDateError("2026-11-25", "2026-11-24")).toContain("futuro");
    expect(breedingDateError("2026-02-30", "2026-11-24")).toContain("válida");
    expect(breedingDateError("", "2026-11-24")).toContain("válida");
  });
});


describe("validação dos horários de parto", () => {
  it("aceita horários coerentes e registros sem horário", () => {
    expect(farrowingTimeError("08:10", "10:30")).toBeNull();
    expect(farrowingTimeError("", "")).toBeNull();
  });
  it("rejeita horário final anterior ao inicial e formatos inválidos", () => {
    expect(farrowingTimeError("10:30", "08:10")).toContain("anterior");
    expect(farrowingTimeError("8h", "09:00")).toContain("inicial válido");
  });
});
