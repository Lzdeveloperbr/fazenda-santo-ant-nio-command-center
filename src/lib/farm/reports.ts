/**
 * Central de relatórios: cada relatório é uma função pura que transforma os
 * registros carregados numa tabela (título, cabeçalho, linhas). As mesmas
 * linhas alimentam tela, PDF (impressão), Excel e CSV.
 */
import type { Cell } from "@/lib/export";
import { addDays, daysBetween, type GestationConfig } from "./gestation";
import { maternityIndicators, mortalityRows } from "./maternity";
import {
  batchPerformance,
  comparisonPeriods,
  reproductiveIndicators,
  sowVsHerd,
  type Ind,
} from "./zootech";
import { cashDate, COST_CENTERS } from "./finance";
import { STOCK_CATEGORIES } from "./stock";
import { SOW_CATEGORY_LABEL, SOW_CONDITION_LABEL } from "./sow-profile";

/** Linha de qualquer tabela do Supabase (os relatórios cruzam muitas tabelas). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const n = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);
const br = (iso: unknown) => {
  const v = s(iso).slice(0, 10);
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
};
const inP = (d: unknown, f: Filters) => {
  const v = s(d).slice(0, 10);
  return !!v && v >= f.from && v <= f.to;
};

export type Filters = { from: string; to: string; sowId: string; batchId: string; userId: string };
export type ReportData = {
  sows: R[];
  breedings: R[];
  diagnoses: R[];
  litters: R[];
  litterEvents: R[];
  sowEvents: R[];
  piglets: R[];
  pens: R[];
  penRecords: R[];
  batches: R[];
  batchEvents: R[];
  batchWeights: R[];
  batchFeed: R[];
  vaccinations: R[];
  medications: R[];
  stockItems: R[];
  feeds: R[];
  feedMovements: R[];
  medLots: R[];
  meds: R[];
  finance: R[];
  audit: R[];
  profiles: R[];
  gestation: GestationConfig;
  today: string;
};
export type Table = { header: string[]; rows: Cell[][]; note?: string };
export type ReportDef = {
  id: string;
  title: string;
  group: string;
  uses: ("period" | "sow" | "batch" | "user")[];
  restricted?: boolean;
  build: (d: ReportData, f: Filters) => Table;
};

const tagMap = (d: ReportData) => new Map(d.sows.map((x) => [s(x.id), s(x.ear_tag)]));
const penMap = (d: ReportData) =>
  new Map(d.pens.map((x) => [s(x.id), `${s(x.code)} · ${s(x.sector)}`]));
const fmtInd = (i: Ind, digits = 1) => (i.value === null ? null : Number(i.value.toFixed(digits)));
const minutes = (a: unknown, b: unknown) => {
  if (!a || !b) return null;
  const [h1, m1] = s(a).split(":").map(Number) as [number, number];
  const [h2, m2] = s(b).split(":").map(Number) as [number, number];
  let diff = h2 * 60 + m2 - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  return diff;
};

export const REPORTS: ReportDef[] = [
  {
    id: "matrizes",
    title: "Cadastro de matrizes",
    group: "Rebanho",
    uses: ["sow"],
    build: (d, f) => {
      const pens = penMap(d);
      const parity = new Map<string, number>();
      for (const l of d.litters)
        if (l.status !== "cancelada") parity.set(s(l.sow_id), (parity.get(s(l.sow_id)) ?? 0) + 1);
      return {
        header: [
          "Brinco",
          "Nome",
          "Raça",
          "Linhagem",
          "Nascimento",
          "Entrada",
          "Origem",
          "Pai",
          "Mãe",
          "Situação gravada",
          "Categoria",
          "Condição",
          "Baia",
          "Lote/grupo",
          "Peso (kg)",
          "Data peso",
          "Partos",
          "Arquivada",
        ],
        rows: d.sows
          .filter((x) => !f.sowId || x.id === f.sowId)
          .map((x) => [
            s(x.ear_tag),
            s(x.name),
            s(x.breed),
            s(x.lineage),
            br(x.birth_date),
            br(x.entry_date),
            s(x.origin),
            s(x.sire),
            s(x.dam),
            s(x.status),
            SOW_CATEGORY_LABEL[s(x.category)] ?? "",
            SOW_CONDITION_LABEL[s(x.condition)] ?? "",
            pens.get(s(x.pen_id)) ?? "",
            s(x.group_label),
            n(x.weight_kg),
            br(x.weight_date),
            parity.get(s(x.id)) ?? 0,
            x.archived_at ? `Sim: ${s(x.archived_reason)}` : "",
          ]),
      };
    },
  },
  {
    id: "historico_reprodutivo",
    title: "Histórico reprodutivo",
    group: "Reprodução",
    uses: ["period", "sow"],
    build: (d, f) => {
      const tag = tagMap(d);
      return {
        header: [
          "Matriz",
          "Cobertura",
          "Tipo",
          "Reprodutor",
          "Sêmen",
          "Doses/serviços",
          "Responsável",
          "Diagnóstico",
          "Situação do ciclo",
          "Encerrado em",
        ],
        rows: d.breedings
          .filter((b) => inP(b.breeding_date, f) && (!f.sowId || b.sow_id === f.sowId))
          .map((b) => [
            tag.get(s(b.sow_id)) ?? "?",
            br(b.breeding_date),
            s(b.breeding_type),
            s(b.boar),
            s(b.semen_code),
            n(b.services_count),
            s(b.responsible),
            s(b.pregnancy_check),
            s(b.cycle_status),
            br(b.closed_at),
          ]),
      };
    },
  },
  {
    id: "gestacao",
    title: "Controle de gestação",
    group: "Reprodução",
    uses: ["sow"],
    build: (d, f) => {
      const tag = tagMap(d);
      return {
        note: `Dias contados a partir da cobertura; parto previsto com referência de ${d.gestation.gestationDays} dias.`,
        header: [
          "Matriz",
          "Cobertura",
          "Dia de gestação",
          "Diagnóstico",
          "Parto previsto",
          "Reprodutor",
        ],
        rows: d.breedings
          .filter((b) => b.cycle_status === "ativo" && (!f.sowId || b.sow_id === f.sowId))
          .map((b) => [
            tag.get(s(b.sow_id)) ?? "?",
            br(b.breeding_date),
            daysBetween(s(b.breeding_date), d.today),
            s(b.pregnancy_check),
            br(addDays(s(b.breeding_date), d.gestation.gestationDays)),
            s(b.boar),
          ]),
      };
    },
  },
  {
    id: "previsao_partos",
    title: "Previsão de partos",
    group: "Reprodução",
    uses: ["period"],
    build: (d, f) => {
      const tag = tagMap(d);
      const rows = d.breedings
        .filter((b) => b.cycle_status === "ativo")
        .map((b) => ({ b, due: addDays(s(b.breeding_date), d.gestation.gestationDays) }))
        .filter((x) => x.due >= f.from && x.due <= f.to)
        .sort((a, c) => a.due.localeCompare(c.due));
      return {
        note: "Estimativa pela duração de referência; não é data garantida.",
        header: ["Matriz", "Cobertura", "Parto previsto", "Dias restantes", "Diagnóstico"],
        rows: rows.map(({ b, due }) => [
          tag.get(s(b.sow_id)) ?? "?",
          br(b.breeding_date),
          br(due),
          daysBetween(d.today, due),
          s(b.pregnancy_check),
        ]),
      };
    },
  },
  {
    id: "maternidade",
    title: "Relatório de maternidade",
    group: "Maternidade",
    uses: ["period", "sow"],
    build: (d, f) => {
      const tag = tagMap(d),
        pens = penMap(d);
      return {
        header: [
          "Matriz",
          "Baia",
          "Parto",
          "Início",
          "Término",
          "Duração (min)",
          "Responsável",
          "Total",
          "Vivos",
          "Natimortos",
          "Mumificados",
          "Refugos",
          "Mortes",
          "Adotados (+)",
          "Cedidos (−)",
          "Desmamados",
          "Situação",
        ],
        rows: d.litters
          .filter(
            (l) =>
              l.status !== "cancelada" &&
              inP(l.farrowing_date, f) &&
              (!f.sowId || l.sow_id === f.sowId),
          )
          .map((l) => [
            tag.get(s(l.sow_id)) ?? "?",
            pens.get(s(l.pen_id)) ?? "",
            br(l.farrowing_date),
            s(l.start_time).slice(0, 5),
            s(l.end_time).slice(0, 5),
            minutes(l.start_time, l.end_time),
            s(l.responsible),
            n(l.born_total),
            n(l.born_alive),
            n(l.stillborn),
            n(l.mummified),
            n(l.runts),
            n(l.deaths),
            n(l.transfers_in),
            n(l.transfers_out),
            n(l.weaned),
            s(l.status),
          ]),
      };
    },
  },
  {
    id: "nascimentos",
    title: "Nascimentos por mês",
    group: "Maternidade",
    uses: ["period"],
    build: (d, f) => {
      const m = new Map<string, number[]>();
      for (const l of d.litters)
        if (l.status !== "cancelada" && inP(l.farrowing_date, f)) {
          const k = s(l.farrowing_date).slice(0, 7);
          const a = m.get(k) ?? [0, 0, 0, 0, 0];
          a[0]! += 1;
          a[1]! += Number(l.born_total);
          a[2]! += Number(l.born_alive);
          a[3]! += Number(l.stillborn);
          a[4]! += Number(l.mummified ?? 0);
          m.set(k, a);
        }
      return {
        header: ["Mês", "Partos", "Nascidos totais", "Nascidos vivos", "Natimortos", "Mumificados"],
        rows: [...m.entries()].sort().map(([k, a]) => [`${k.slice(5)}/${k.slice(0, 4)}`, ...a]),
      };
    },
  },
  {
    id: "mortalidade",
    title: "Mortalidade de leitões",
    group: "Maternidade",
    uses: ["period", "sow"],
    build: (d, f) => {
      const tag = tagMap(d),
        pens = penMap(d);
      const rows = mortalityRows(
        d.litterEvents as never,
        d.litters as never,
        (id) => tag.get(id) ?? "?",
        (id) => pens.get(s(id)) ?? "Não informada",
        () => "",
        f.from,
        f.to,
      );
      const sowTag = f.sowId ? tag.get(f.sowId) : null;
      return {
        note: "Motivos são observações da equipe, não diagnósticos.",
        header: [
          "Data",
          "Dia da semana",
          "Idade (dias)",
          "Matriz",
          "Baia",
          "Quantidade",
          "Peso (kg)",
          "Motivo observado",
          "Responsável",
          "Observação",
        ],
        rows: rows
          .filter((r) => !sowTag || r.sow === sowTag)
          .map((r) => [
            br(r.date),
            r.weekday,
            r.ageDays,
            r.sow,
            r.pen,
            r.quantity,
            r.weight,
            r.cause,
            r.responsible,
            r.note,
          ]),
      };
    },
  },
  {
    id: "desmames",
    title: "Desmames",
    group: "Maternidade",
    uses: ["period", "sow"],
    build: (d, f) => {
      const tag = tagMap(d);
      const ev = new Map(
        d.litterEvents.filter((e) => e.event_type === "desmame").map((e) => [s(e.litter_id), e]),
      );
      return {
        header: [
          "Matriz",
          "Parto",
          "Desmame",
          "Idade (dias)",
          "Desmamados",
          "Machos",
          "Fêmeas",
          "Peso médio (kg)",
          "Destino",
          "Mortes na maternidade",
          "Responsável",
        ],
        rows: d.litters
          .filter(
            (l) =>
              l.status === "desmamada" &&
              inP(l.weaning_date, f) &&
              (!f.sowId || l.sow_id === f.sowId),
          )
          .map((l) => {
            const e = ev.get(s(l.id));
            return [
              tag.get(s(l.sow_id)) ?? "?",
              br(l.farrowing_date),
              br(l.weaning_date),
              daysBetween(s(l.farrowing_date), s(l.weaning_date)),
              n(l.weaned),
              n(e?.males),
              n(e?.females),
              n(e?.weight_kg),
              s(e?.destination),
              n(l.deaths),
              s(e?.responsible),
            ];
          }),
      };
    },
  },
  {
    id: "desempenho_matriz",
    title: "Desempenho por matriz",
    group: "Indicadores",
    uses: ["sow"],
    build: (d, f) => {
      const tag = tagMap(d);
      const r = sowVsHerd(d.litters as never);
      return {
        note: `Média do plantel: ${r.herdNV.value?.toFixed(1) ?? "—"} nascidos vivos/parto (${r.herdNV.n} partos) e ${r.herdW.value?.toFixed(1) ?? "—"} desmamados/leitegada (${r.herdW.n}).`,
        header: [
          "Matriz",
          "Partos",
          "Nascidos vivos/parto",
          "Diferença p/ plantel",
          "Desmamados/leitegada",
          "Diferença p/ plantel",
        ],
        rows: r.rows
          .filter((x) => !f.sowId || x.sowId === f.sowId)
          .map((x) => [
            tag.get(x.sowId) ?? "?",
            x.litters,
            fmtInd(x.bornAlive),
            x.nvDiff === null ? null : Number(x.nvDiff.toFixed(1)),
            fmtInd(x.weaned),
            x.wDiff === null ? null : Number(x.wDiff.toFixed(1)),
          ]),
      };
    },
  },
  {
    id: "desempenho_lote",
    title: "Desempenho por lote",
    group: "Indicadores",
    uses: ["period", "batch"],
    build: (d, f) => {
      const perf = batchPerformance(
        d.batches as never,
        d.batchWeights as never,
        d.batchFeed as never,
        f.from,
        f.to,
      );
      return {
        note: "GMD exige duas pesagens no período; conversão exige consumo de ração lançado no lote.",
        header: [
          "Lote",
          "Fase",
          "Entrada",
          "Animais na entrada",
          "Animais atuais",
          "Mortes no período",
          "Pesagens",
          "GMD (kg/dia)",
          "Conversão alimentar",
        ],
        rows: perf
          .filter((p) => !f.batchId || p.batch.id === f.batchId)
          .map((p) => {
            const b = d.batches.find((x) => x.id === p.batch.id)!;
            const deaths = d.batchEvents
              .filter(
                (e) => e.batch_id === b.id && e.event_type === "morte" && inP(e.event_date, f),
              )
              .reduce((a, e) => a + Number(e.quantity), 0);
            return [
              s(b.name),
              s(b.phase),
              br(b.entry_date),
              n(b.initial_headcount),
              n(b.current_headcount),
              deaths,
              p.weighings,
              p.adg === null ? null : Number(p.adg.toFixed(3)),
              p.fcr === null ? null : Number(p.fcr.toFixed(2)),
            ];
          }),
      };
    },
  },
  {
    id: "vacinacao",
    title: "Vacinação",
    group: "Sanidade",
    uses: ["period", "sow"],
    build: (d, f) => {
      const tag = tagMap(d);
      return {
        header: [
          "Data",
          "Vacina",
          "Alvo",
          "Matriz",
          "Animais vacinados",
          "Lote do produto",
          "Validade",
          "Via",
          "Veterinário",
          "Aplicador",
          "Próxima data",
        ],
        rows: d.vaccinations
          .filter((v) => inP(v.vaccination_date, f) && (!f.sowId || v.sow_id === f.sowId))
          .map((v) => [
            br(v.vaccination_date),
            s(v.vaccine_name),
            s(v.animal_scope ?? v.target_group),
            tag.get(s(v.sow_id)) ?? "",
            n(v.animals_vaccinated),
            s(v.batch),
            br(v.expiry_date),
            s(v.route),
            s(v.veterinarian),
            s(v.responsible),
            br(v.next_due_date),
          ]),
      };
    },
  },
  {
    id: "tratamentos",
    title: "Tratamentos e medicamentos",
    group: "Sanidade",
    uses: ["period", "sow"],
    build: (d, f) => {
      const tag = tagMap(d);
      return {
        header: [
          "Início",
          "Fim",
          "Produto",
          "Princípio ativo",
          "Matriz",
          "Animais",
          "Dose prescrita",
          "Via",
          "Frequência",
          "Carência (dias)",
          "Antimicrobiano",
          "Veterinário",
          "Responsável",
        ],
        rows: d.medications
          .filter((m) => inP(m.administration_start, f) && (!f.sowId || m.sow_id === f.sowId))
          .map((m) => [
            br(m.administration_start),
            br(m.administration_end),
            s(m.product_name),
            s(m.active_ingredient),
            tag.get(s(m.sow_id)) ?? "",
            n(m.animals_treated),
            s(m.dose_as_prescribed),
            s(m.route),
            s(m.frequency),
            n(m.withdrawal_days),
            m.is_antimicrobial ? "Sim" : "",
            s(m.veterinarian),
            s(m.responsible),
          ]),
      };
    },
  },
  {
    id: "estoque",
    title: "Posição de estoque",
    group: "Estoque",
    uses: [],
    build: (d) => {
      const medName = new Map(d.meds.map((m) => [s(m.id), s(m.name)]));
      return {
        header: [
          "Módulo",
          "Item",
          "Categoria / lote",
          "Saldo",
          "Unidade",
          "Mínimo",
          "Validade",
          "Abaixo do mínimo",
        ],
        rows: [
          ...d.stockItems
            .filter((i) => i.active)
            .map((i) => [
              "Materiais",
              s(i.name),
              STOCK_CATEGORIES[s(i.category)] ?? s(i.category),
              n(i.current_stock),
              s(i.unit),
              n(i.minimum_stock),
              "",
              Number(i.minimum_stock) > 0 && Number(i.current_stock) < Number(i.minimum_stock)
                ? "Sim"
                : "",
            ]),
          ...d.feeds.map((x) => [
            "Ração",
            s(x.name),
            s(x.phase),
            n(x.stock_kg),
            "kg",
            n(x.minimum_stock_kg),
            "",
            Number(x.minimum_stock_kg) > 0 && Number(x.stock_kg) < Number(x.minimum_stock_kg)
              ? "Sim"
              : "",
          ]),
          ...d.medLots
            .filter((l) => Number(l.quantity) > 0)
            .map((l) => [
              "Farmácia",
              medName.get(s(l.medication_id)) ?? "Medicamento",
              `Lote ${s(l.lot_number) || "sem identificação"}`,
              n(l.quantity),
              s(l.unit),
              null,
              br(l.expiry_date),
              "",
            ]),
        ] as Cell[][],
      };
    },
  },
  {
    id: "consumo_racao",
    title: "Consumo de ração",
    group: "Estoque",
    uses: ["period", "batch"],
    build: (d, f) => {
      const feed = new Map(d.feeds.map((x) => [s(x.id), s(x.name)]));
      const pens = penMap(d);
      const batchName = new Map(d.batches.map((b) => [s(b.id), s(b.name)]));
      const rows: Cell[][] = [];
      if (!f.batchId)
        for (const m of d.feedMovements)
          if (m.movement_type === "consumo" && inP(m.movement_date, f))
            rows.push([
              br(m.movement_date),
              feed.get(s(m.product_id)) ?? "?",
              n(m.quantity_kg),
              pens.get(s(m.pen_id)) ?? "Baia não informada",
              s(m.notes),
            ]);
      for (const m of d.batchFeed)
        if (
          m.movement_type === "saida" &&
          inP(m.movement_date, f) &&
          (!f.batchId || m.batch_id === f.batchId)
        )
          rows.push([
            br(m.movement_date),
            "Ração do lote",
            n(m.quantity),
            `Lote ${batchName.get(s(m.batch_id)) ?? "?"}`,
            s(m.notes),
          ]);
      const total = rows.reduce((a, r) => a + Number(r[2] ?? 0), 0);
      return {
        note: `Total no período: ${total.toLocaleString("pt-BR")} kg.`,
        header: ["Data", "Ração", "Quantidade (kg)", "Destino", "Observação"],
        rows: rows.sort((a, c) =>
          s(c[0]).split("/").reverse().join().localeCompare(s(a[0]).split("/").reverse().join()),
        ),
      };
    },
  },
  {
    id: "financeiro",
    title: "Financeiro",
    group: "Administração",
    uses: ["period", "batch"],
    build: (d, f) => {
      const rows = d.finance.filter(
        (e) => inP(cashDate(e as never), f) && (!f.batchId || e.batch_id === f.batchId),
      );
      return {
        note: "Data = pagamento (pagos) ou vencimento (pendentes). Pagos e pendentes não devem ser somados.",
        header: [
          "Data",
          "Tipo",
          "Categoria",
          "Centro de custo",
          "Valor (R$)",
          "Situação",
          "Vencimento",
          "Pago em",
          "Contraparte",
          "Documento",
          "Descrição",
        ],
        rows: rows.map((e) => [
          br(cashDate(e as never)),
          s(e.entry_type),
          s(e.category),
          COST_CENTERS[s(e.cost_center)] ?? "",
          n(e.amount),
          s(e.status),
          br(e.due_date),
          br(e.paid_at),
          s(e.counterpart),
          s(e.document_number),
          s(e.description),
        ]),
      };
    },
  },
  {
    id: "ocupacao_baias",
    title: "Ocupação das baias",
    group: "Instalações",
    uses: [],
    build: (d) => {
      const latest = new Map<string, R>();
      for (const r of [...d.penRecords].sort((a, c) =>
        s(c.event_date).localeCompare(s(a.event_date)),
      ))
        if (r.animal_count !== null && r.animal_count !== undefined && !latest.has(s(r.pen_id)))
          latest.set(s(r.pen_id), r);
      return {
        header: [
          "Baia",
          "Setor",
          "Galpão",
          "Sala",
          "Situação",
          "Capacidade",
          "Matrizes vinculadas",
          "Último censo (animais)",
          "Data do censo",
        ],
        rows: d.pens.map((p) => {
          const sows = d.sows.filter(
            (x) =>
              x.pen_id === p.id &&
              !x.archived_at &&
              !["morta", "descartada", "transferida"].includes(s(x.status)),
          ).length;
          const r = latest.get(s(p.id));
          return [
            s(p.code),
            s(p.sector),
            s(p.building),
            s(p.room),
            s(p.status),
            n(p.capacity),
            sows,
            n(r?.animal_count),
            br(r?.event_date),
          ];
        }),
      };
    },
  },
  {
    id: "indicadores",
    title: "Indicadores zootécnicos",
    group: "Indicadores",
    uses: ["period"],
    build: (d, f) => {
      const { previous, lastYear } = comparisonPeriods(f.from, f.to);
      const calc = (p: { from: string; to: string }) => ({
        r: reproductiveIndicators(d as never, p.from, p.to),
        m: maternityIndicators(
          d.litters as never,
          d.piglets as never,
          d.litterEvents.filter((e) => e.event_type === "desmame") as never,
          p.from,
          p.to,
        ),
      });
      const a = calc(f),
        b = calc(previous),
        c = calc(lastYear);
      const line = (name: string, get: (x: typeof a) => Ind, base: string, digits = 1): Cell[] => [
        name,
        fmtInd(get(a), digits),
        fmtInd(get(b), digits),
        fmtInd(get(c), digits),
        `${base} (n = ${get(a).n})`,
      ];
      const count = (name: string, get: (x: typeof a) => number): Cell[] => [
        name,
        get(a),
        get(b),
        get(c),
        "contagem",
      ];
      return {
        note: `Atual: ${br(f.from)} a ${br(f.to)} · Anterior: ${br(previous.from)} a ${br(previous.to)} · Ano anterior: ${br(lastYear.from)} a ${br(lastYear.to)}. Vazio = sem dados suficientes.`,
        header: [
          "Indicador",
          "Período atual",
          "Período anterior",
          "Mesmo período do ano anterior",
          "Base de cálculo",
        ],
        rows: [
          count("Partos", (x) => x.m.farrowings),
          line("Nascidos totais por parto", (x) => x.m.bornTotalPerLitter, "média dos partos"),
          line("Nascidos vivos por parto", (x) => x.m.bornAlivePerLitter, "média dos partos"),
          line("Natimortalidade (%)", (x) => x.m.stillbornRate, "natimortos ÷ nascidos totais"),
          line("Mumificação (%)", (x) => x.m.mummifiedRate, "mumificados ÷ nascidos totais"),
          line(
            "Mortalidade na maternidade (%)",
            (x) => x.m.preWeaningMortality,
            "mortes ÷ (vivos + adotados), leitegadas desmamadas",
          ),
          line("Desmamados por leitegada", (x) => x.m.weanedPerLitter, "média dos desmames"),
          line("Peso médio ao nascimento (kg)", (x) => x.m.birthWeight, "leitões pesados", 2),
          line("Peso médio ao desmame (kg)", (x) => x.m.weaningWeight, "pesagens registradas", 2),
          line("Idade ao desmame (dias)", (x) => x.m.weaningAgeDays, "média dos desmames", 0),
          line(
            "Taxa de concepção (%)",
            (x) => x.r.conceptionRate,
            "positivos ÷ (positivos + negativos)",
          ),
          line(
            "Taxa de parto (%)",
            (x) => x.r.farrowingRate,
            "ciclos paridos ÷ ciclos com desfecho, coberturas do período",
          ),
          line("Serviços por parto", (x) => x.r.servicesPerFarrowing, "ciclos paridos"),
          count("Retornos ao cio", (x) => x.r.returns),
          line(
            "Intervalo desmame-cio (dias)",
            (x) => x.r.weaningToEstrus,
            "desmames com cobertura seguinte",
            0,
          ),
          line(
            "Intervalo entre partos (dias)",
            (x) => x.r.farrowingInterval,
            "pares de partos consecutivos",
            0,
          ),
          line(
            "Partos por matriz/ano",
            (x) => x.r.littersPerSowYear,
            "365 ÷ intervalo entre partos",
            2,
          ),
          count("Descartes de matrizes", (x) => x.r.discards),
          count("Mortes de matrizes", (x) => x.r.sowDeaths),
        ],
      };
    },
  },
  {
    id: "auditoria",
    title: "Auditoria de alterações",
    group: "Administração",
    uses: ["period", "user"],
    restricted: true,
    build: (d, f) => {
      const who = new Map(d.profiles.map((p) => [s(p.id), s(p.display_name)]));
      return {
        header: [
          "Data e hora",
          "Usuário",
          "Perfil",
          "Ação",
          "Tabela",
          "Registro",
          "Campos alterados",
          "Origem",
        ],
        rows: d.audit
          .filter((a) => inP(a.occurred_at, f) && (!f.userId || a.actor_id === f.userId))
          .map((a) => [
            new Date(s(a.occurred_at)).toLocaleString("pt-BR"),
            a.actor_id ? (who.get(s(a.actor_id)) ?? "Usuário") : "Sistema",
            s(a.actor_role),
            s(a.action),
            s(a.table_name),
            s(a.record_id),
            Array.isArray(a.changed_fields) ? (a.changed_fields as string[]).join(", ") : "",
            s(a.origin),
          ]),
      };
    },
  },
];
