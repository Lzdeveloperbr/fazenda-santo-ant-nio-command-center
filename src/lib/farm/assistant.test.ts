import { describe, expect, it } from "vitest";
import {
  answerLocal,
  dailySummary,
  dataIssues,
  snapshotForAI,
  trends,
  type AssistantData,
} from "./assistant";
import { DEFAULT_CONFIG } from "./gestation";

const L = (over: Partial<AssistantData["litters"][number]>) => ({
  id: "l",
  sow_id: "s1",
  farrowing_date: "2026-11-10",
  status: "maternidade",
  weaning_date: null,
  born_total: 12,
  born_alive: 11,
  stillborn: 1,
  mummified: 0,
  deaths: 1,
  transfers_in: 0,
  transfers_out: 0,
  weaned: null,
  ...over,
});
const base: AssistantData = {
  sows: [
    { id: "s1", ear_tag: "M-1", status: "lactante" },
    { id: "s2", ear_tag: "M-2", status: "gestante" },
    { id: "s3", ear_tag: "M-3", status: "gestante" },
  ],
  breedings: [
    {
      id: "b2",
      sow_id: "s2",
      breeding_date: "2026-08-10",
      cycle_status: "ativo",
      pregnancy_check: "positivo",
    },
    {
      id: "b3",
      sow_id: "s3",
      breeding_date: "2026-07-20",
      cycle_status: "ativo",
      pregnancy_check: "positivo",
    },
  ],
  litters: [L({ id: "l1" })],
  events: [{ litter_id: "l1", event_type: "morte", event_date: "2026-11-25", quantity: 1 }],
  tasks: [
    { title: "Lavar", status: "pendente", due_date: "2026-11-20" },
    { title: "Pesar", status: "pendente", due_date: "2026-11-26" },
  ],
  stockAlerts: [{ level: "alta", module: "Farmácia", title: "Lote vencido: Remédio" }],
  feed: [{ movement_type: "consumo", quantity_kg: 300, movement_date: "2026-11-24" }],
  piglets: [],
  gestation: DEFAULT_CONFIG,
  maternityTransferDay: null,
  today: "2026-11-26",
};

describe("Santo Antônio AI — respostas calculadas", () => {
  it("gestantes, partos da semana e atrasos", () => {
    expect(answerLocal("Quantas matrizes estão gestantes?", base)?.text).toMatch(/^2 matrizes/);
    const week = answerLocal("Quais porcas vão parir nesta semana?", base)!;
    expect(week.items).toEqual(["M-2 — 02/12/2026"]);
    const late = answerLocal("Quais matrizes estão atrasadas?", base)!;
    expect(late.items).toEqual(["M-3: dia 129 de gestação", "Tarefa: Lavar"]);
  });
  it("nascimentos, mortalidade, ração, tarefas e estoque", () => {
    expect(answerLocal("Quantos leitões nasceram neste mês?", base)?.text).toContain(
      "11 nascidos vivos",
    );
    expect(answerLocal("Qual foi a mortalidade da maternidade?", base)?.text).toContain("1 morte");
    expect(answerLocal("Qual foi o consumo de ração?", base)?.text).toContain("300 kg");
    expect(answerLocal("Quais tarefas estão pendentes?", base)?.items).toHaveLength(2);
    expect(answerLocal("Quais medicamentos estão acabando?", base)?.items).toEqual([
      "Farmácia: Lote vencido: Remédio",
    ]);
    expect(answerLocal("Qual matriz teve melhor desempenho?", base)?.text).toMatch(
      /pelo menos 2 partos/,
    );
    expect(answerLocal("Qual a previsão do tempo?", base)).toBeNull();
  });
  it("sem registros diz que não há", () => {
    const empty = { ...base, litters: [], events: [], feed: [], breedings: [] };
    expect(answerLocal("Quantos leitões nasceram?", empty)?.text).toBe(
      "Nenhum parto registrado neste mês.",
    );
    expect(answerLocal("consumo de ração", empty)?.text).toMatch(/Nenhum consumo/);
  });
});

describe("conferência de dados e resumo", () => {
  it("aponta inconsistências sem corrigir", () => {
    const d = {
      ...base,
      litters: [
        L({ id: "l1", born_total: 15 }),
        L({ id: "l2", sow_id: "s2", farrowing_date: "2026-09-01" }),
      ],
      sows: [...base.sows, { id: "s4", ear_tag: "m-1", status: "vazia" }],
      events: [{ litter_id: "l1", event_type: "morte", event_date: "2026-11-01", quantity: 1 }],
    };
    const texts = dataIssues(d).map((i) => i.text);
    expect(texts.some((t) => t.includes("total 15"))).toBe(true);
    expect(texts.some((t) => t.includes("antes do parto"))).toBe(true);
    expect(texts.some((t) => t.includes("gestação fora do período"))).toBe(true);
    expect(texts.some((t) => t.includes('Brinco "m-1"'))).toBe(true);
    expect(texts.some((t) => t.includes("há 86 dias"))).toBe(true);
  });
  it("resumo diário e tendência com base explícita", () => {
    const s = dailySummary(base);
    expect(s[0]).toContain("3 matrizes");
    expect(s.some((x) => x.includes("Partos previstos nos próximos 7 dias: 1 (M-2)"))).toBe(true);
    expect(s.some((x) => x.includes("Tarefas para hoje: 1; atrasadas: 1"))).toBe(true);
    expect(trends(base)[0]).toMatchObject({ label: "Nascidos vivos", current: 11, previous: 0 });
    const snap = snapshotForAI(base);
    expect(snap.ciclos_atrasados).toEqual([{ sow: "M-3", day: 129 }]);
    expect(JSON.stringify(snap)).not.toMatch(/@/);
  });
});
