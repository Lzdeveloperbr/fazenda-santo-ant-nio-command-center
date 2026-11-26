import { describe, expect, it } from "vitest";
import { buildAgenda, overdue, protocolDates, type AgendaInput, type AgendaSettings } from "./agenda";
import { DEFAULT_CONFIG } from "./gestation";

const base: AgendaInput = {
  breedings: [{ id: "b1", sow_id: "s1", breeding_date: "2026-11-01", cycle_status: "ativo", pregnancy_check: "pendente" }],
  litters: [{ id: "l1", sow_id: "s2", farrowing_date: "2026-11-10", status: "maternidade", weaning_date: null }],
  weaningPlans: [],
  vaccinations: [], medications: [], healthEvents: [],
  tasks: [{ id: "t1", title: "Limpar baias", due_date: "2026-11-20", status: "pendente", sector: "Maternidade", sow_id: null }],
  finance: [{ id: "f1", entry_type: "despesa", category: "Ração", amount: 100, status: "pendente", due_date: "2026-11-28" }],
  medLots: [], protocols: [], batches: [],
  sowTag: (id) => (id === "s1" ? "M-1" : "M-2"),
  medName: () => "Med",
};
const S: AgendaSettings = { gestation: DEFAULT_CONFIG, diagnosisDay: null, maternityTransferDay: null, weaningAgeDays: null };

describe("agenda", () => {
  it("não inventa diagnóstico, transferência nem desmame sem parâmetro", () => {
    const kinds = buildAgenda(base, S, "2026-11-01", "2027-03-31", "2026-11-25").map((i) => i.kind);
    expect(kinds).toContain("cio");
    expect(kinds).toContain("parto");
    expect(kinds).not.toContain("diagnostico");
    expect(kinds).not.toContain("transferencia");
    expect(kinds.filter((k) => k === "desmame")).toHaveLength(0);
  });
  it("usa parâmetros configurados e marca previsões como estimativa", () => {
    const items = buildAgenda(base, { ...S, diagnosisDay: 28, maternityTransferDay: 110, weaningAgeDays: 21 }, "2026-11-01", "2027-03-31", "2026-11-25");
    const dg = items.find((i) => i.kind === "diagnostico");
    expect(dg).toMatchObject({ date: "2026-11-29", estimated: true });
    expect(items.find((i) => i.kind === "transferencia")?.date).toBe("2027-02-19");
    expect(items.find((i) => i.kind === "parto" && i.estimated)?.date).toBe("2027-02-23");
    expect(items.find((i) => i.id === "dp-l1")?.date).toBe("2026-12-01");
  });
  it("data de desmame planejada tem prioridade sobre a idade configurada", () => {
    const items = buildAgenda({ ...base, weaningPlans: [{ litter_id: "l1", weaning_date: "2026-12-03" }] }, { ...S, weaningAgeDays: 21 }, "2026-11-01", "2026-12-31", "2026-11-25");
    expect(items.find((i) => i.id === "dp-l1")).toMatchObject({ date: "2026-12-03" });
  });
  it("protocolo só aparece validado e repete no intervalo", () => {
    const p = { id: "p1", name: "Protocolo", kind: "vacina", target: "matriz", anchor: "parto", offset_days: -14, repeat_every_days: null, product: "Produto", validated_at: null, active: true };
    expect(buildAgenda({ ...base, protocols: [p] }, S, "2026-11-01", "2027-03-31", "2026-11-25").some((i) => i.kind === "protocolo")).toBe(false);
    const items = buildAgenda({ ...base, protocols: [{ ...p, validated_at: "2026-11-01" }] }, S, "2026-11-01", "2027-03-31", "2026-11-25").filter((i) => i.kind === "protocolo");
    expect(items.map((i) => i.date).sort()).toEqual(["2027-02-09"]);
    expect(items[0]?.estimated).toBe(true);
    expect(protocolDates("2026-01-01", 0, 30, "2026-01-15", "2026-03-15")).toEqual(["2026-01-31", "2026-03-02"]);
  });
  it("tarefas e contas atrasadas viram pendência", () => {
    const items = buildAgenda(base, S, "2026-11-01", "2026-11-30", "2026-11-25");
    expect(overdue(items, "2026-11-25").map((i) => i.id)).toEqual(["tk-t1"]);
  });
});
