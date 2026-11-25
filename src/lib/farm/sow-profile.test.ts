import { describe, expect, it } from "vitest";
import {
  buildSowTimeline,
  parityOf,
  sowSituation,
  validateSowForm,
  type SituationSettings,
} from "./sow-profile";
import {
  settingsFromRow,
  settingsToRow,
  validateExtraDays,
  DEFAULT_FARM_SETTINGS,
} from "./farm-settings";

const S: SituationSettings = {
  attentionStart: 105,
  gestationDays: 114,
  maternityTransferDay: null,
};
const T = "2026-11-25";
const cycle = (
  over: Partial<{
    breeding_date: string;
    cycle_status: string;
    pregnancy_check: string;
    closed_at: string | null;
  }> = {},
) => ({
  breeding_date: "2026-10-01",
  cycle_status: "ativo",
  pregnancy_check: "pendente",
  closed_at: null,
  ...over,
});
const litter = (
  over: Partial<{ farrowing_date: string; status: string; weaning_date: string | null }> = {},
) => ({
  farrowing_date: "2026-06-01",
  status: "desmamada",
  weaning_date: "2026-06-22",
  ...over,
});

describe("sowSituation", () => {
  it("saídas do plantel vêm do status gravado", () => {
    expect(sowSituation({ status: "morta" }, [cycle()], [], S, T).key).toBe("morta");
    expect(sowSituation({ status: "descartada" }, [], [], S, T).key).toBe("descartada");
    expect(sowSituation({ status: "transferida" }, [], [], S, T).key).toBe("em_transferencia");
  });
  it("leitegada em maternidade = lactação", () => {
    expect(
      sowSituation(
        { status: "lactante" },
        [],
        [litter({ status: "maternidade", weaning_date: null })],
        S,
        T,
      ).key,
    ).toBe("em_lactacao");
  });
  it("ciclo ativo: coberta, gestante, pré-parto e maternidade configurada", () => {
    expect(
      sowSituation({ status: "coberta" }, [cycle({ breeding_date: "2026-11-10" })], [], S, T).key,
    ).toBe("inseminada");
    expect(
      sowSituation({ status: "gestante" }, [cycle({ pregnancy_check: "positivo" })], [], S, T).key,
    ).toBe("gestante");
    const late = cycle({ breeding_date: "2026-08-10", pregnancy_check: "positivo" }); // dia 107
    expect(sowSituation({ status: "gestante" }, [late], [], S, T).key).toBe("pre_parto");
    expect(
      sowSituation({ status: "gestante" }, [late], [], { ...S, maternityTransferDay: 107 }, T).key,
    ).toBe("em_maternidade");
  });
  it("sem prazo de transferência configurado não inventa a data", () => {
    const r = sowSituation(
      { status: "gestante" },
      [cycle({ breeding_date: "2026-08-10" })],
      [],
      S,
      T,
    );
    expect(r.key).toBe("pre_parto");
    expect(r.reason).toContain("Dia 107");
  });
  it("retorno ao cio e desmame", () => {
    expect(
      sowSituation(
        { status: "vazia" },
        [cycle({ cycle_status: "retorno", closed_at: "2026-10-22" })],
        [],
        S,
        T,
      ).key,
    ).toBe("cio_identificado");
    expect(
      sowSituation(
        { status: "vazia" },
        [cycle({ breeding_date: "2026-01-01", cycle_status: "parido" })],
        [litter()],
        S,
        T,
      ).key,
    ).toBe("desmamada");
  });
  it("leitoa só pela categoria e sem partos", () => {
    expect(sowSituation({ status: "vazia", category: "leitoa" }, [], [], S, T).key).toBe("leitoa");
    expect(
      sowSituation({ status: "vazia", category: "em_preparacao" }, [], [litter()], S, T).key,
    ).toBe("desmamada");
  });
  it("condição sanitária acompanha a situação sem escondê-la", () => {
    const r = sowSituation(
      { status: "gestante", condition: "em_tratamento" },
      [cycle({ pregnancy_check: "positivo" })],
      [],
      S,
      T,
    );
    expect(r.key).toBe("gestante");
    expect(r.condition).toBe("Em tratamento");
  });
  it("negativo e sem histórico = vazia", () => {
    expect(
      sowSituation({ status: "vazia" }, [cycle({ cycle_status: "negativo" })], [], S, T).reason,
    ).toContain("negativo");
    expect(sowSituation({ status: "vazia" }, [], [], S, T).key).toBe("vazia");
  });
  it("ordem de parto ignora leitegadas canceladas", () => {
    expect(
      parityOf([litter(), litter({ status: "cancelada" }), litter({ status: "maternidade" })]),
    ).toBe(2);
  });
});

describe("validateSowForm", () => {
  const base = {
    ear_tag: "M1",
    birth_date: "2025-01-01",
    entry_date: "2025-06-01",
    weight_kg: null,
    weight_date: null,
  };
  it("aceita cadastro válido", () => expect(validateSowForm(base, T)).toBeNull());
  it("recusa brinco vazio, datas futuras e entrada antes do nascimento", () => {
    expect(validateSowForm({ ...base, ear_tag: " " }, T)).toMatch(/brinco/);
    expect(validateSowForm({ ...base, birth_date: "2027-01-01", entry_date: null }, T)).toMatch(
      /futuro/,
    );
    expect(validateSowForm({ ...base, entry_date: "2024-12-01" }, T)).toMatch(
      /antes do nascimento/,
    );
  });
  it("peso exige faixa válida e data", () => {
    expect(validateSowForm({ ...base, weight_kg: 0 }, T)).toMatch(/Peso/);
    expect(validateSowForm({ ...base, weight_kg: 200 }, T)).toMatch(/data da pesagem/);
    expect(validateSowForm({ ...base, weight_kg: 200, weight_date: "2026-11-01" }, T)).toBeNull();
  });
});

describe("buildSowTimeline", () => {
  it("ordena do mais recente ao mais antigo e traduz os tipos", () => {
    const t = buildSowTimeline({
      breedings: [
        {
          breeding_date: "2026-01-10",
          breeding_type: "inseminacao",
          boar: "R1",
          semen_code: "S9",
          created_at: "2026-01-10T10:00:00Z",
        },
      ],
      diagnoses: [
        {
          diagnosis_date: "2026-02-05",
          result: "positivo",
          method: "ultrassom",
          created_at: "2026-02-05T10:00:00Z",
        },
      ],
      gestationEvents: [],
      litters: [
        {
          farrowing_date: "2026-05-04",
          born_total: 14,
          born_alive: 12,
          stillborn: 1,
          mummified: 1,
          status: "desmamada",
          weaning_date: "2026-05-25",
          weaned: 11,
          created_at: "2026-05-04T10:00:00Z",
        },
      ],
      litterEvents: [
        {
          event_date: "2026-05-25",
          event_type: "desmame",
          quantity: 11,
          created_at: "2026-05-25T10:00:00Z",
        },
      ],
      sowEvents: [
        {
          event_date: "2026-06-01",
          event_type: "observacao",
          notes: "ok",
          created_at: "2026-06-01T10:00:00Z",
        },
      ],
      vaccines: [
        { vaccination_date: "2026-03-01", vaccine_name: "V1", created_at: "2026-03-01T10:00:00Z" },
      ],
      medications: [],
      labels: { sowEvent: { observacao: "Observação" }, litterEvent: {} },
    });
    expect(t.map((i) => i.kind)).toEqual([
      "evento",
      "desmame",
      "parto",
      "vacina",
      "diagnostico",
      "cobertura",
    ]);
    expect(t[2]?.detail).toBe("14 nascidos: 12 vivos, 1 natimortos, 1 mumificados");
    expect(t[5]?.title).toBe("Inseminação artificial");
    expect(t[5]?.detail).toBe("Reprodutor: R1 · Sêmen: S9");
  });
});

describe("parâmetros da granja", () => {
  it("converte linha do banco e volta sem perder valores", () => {
    const row = {
      farm_name: "F",
      heat_prep_day: 18,
      heat_start_day: 19,
      heat_end_day: 21,
      attention_start_day: 105,
      approach_day: 110,
      intensive_day: 112,
      gestation_days: 114,
      diagnosis_day: 28,
      maternity_transfer_day: null,
      weaning_age_days: 21,
      updated_at: "x",
    };
    const s = settingsFromRow(row);
    expect(s.gestation.gestationDays).toBe(114);
    const { farm_name: _n, updated_at: _u, ...rest } = row;
    expect(settingsToRow(s)).toEqual(rest);
  });
  it("valida prazos opcionais", () => {
    const base = { ...DEFAULT_FARM_SETTINGS };
    expect(validateExtraDays(base)).toBeNull();
    expect(validateExtraDays({ ...base, diagnosisDay: 10 })).toMatch(/Diagnóstico/);
    expect(validateExtraDays({ ...base, maternityTransferDay: 120 })).toMatch(/maternidade/);
    expect(validateExtraDays({ ...base, weaningAgeDays: 5 })).toMatch(/desmame/);
    expect(validateExtraDays({ ...base, weaningAgeDays: 21.5 })).toMatch(/inteiros/);
  });
});
