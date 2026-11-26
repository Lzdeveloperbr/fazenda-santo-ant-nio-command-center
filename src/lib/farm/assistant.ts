/**
 * Santo Antônio AI — parte determinística. Responde perguntas frequentes,
 * monta o resumo do dia e aponta dados inconsistentes usando SOMENTE os
 * registros carregados. Quando não há registro, diz que não há.
 * Não diagnostica e não prescreve.
 */
import { addDays, daysBetween, type GestationConfig } from "./gestation";
import { sowSituation, SOW_SITUATIONS, type SowSituation } from "./sow-profile";
import { maternityIndicators } from "./maternity";
import { sowVsHerd } from "./zootech";
import { normalize } from "../search";

type Sow = {
  id: string;
  ear_tag: string;
  status: string;
  category?: string | null;
  condition?: string | null;
  archived_at?: string | null;
};
type Breeding = {
  id: string;
  sow_id: string;
  breeding_date: string;
  cycle_status: string;
  pregnancy_check: string;
};
type Litter = {
  id: string;
  sow_id: string;
  farrowing_date: string;
  status: string;
  weaning_date: string | null;
  born_total: number;
  born_alive: number;
  stillborn: number;
  mummified: number | null;
  deaths: number;
  transfers_in: number;
  transfers_out: number;
  weaned: number | null;
};
type LEvent = { litter_id: string; event_type: string; event_date: string; quantity: number };
type Task = { title: string; status: string; due_date: string | null };
type Stock = { level: "alta" | "media"; module: string; title: string };
type Feed = { movement_type: string; quantity_kg: number | string; movement_date: string };

export type AssistantData = {
  sows: Sow[];
  breedings: Breeding[];
  litters: Litter[];
  events: LEvent[];
  tasks: Task[];
  stockAlerts: Stock[];
  feed: Feed[];
  piglets: {
    litter_id: string;
    birth_weight_kg: number | null;
    weaning_weight_kg: number | null;
    weaning_date: string | null;
    birth_date: string | null;
  }[];
  gestation: GestationConfig;
  maternityTransferDay: number | null;
  today: string;
};

export type Answer = { text: string; items?: string[]; source: string };

const monthStart = (today: string) => `${today.slice(0, 7)}-01`;
const tagOf = (d: AssistantData) => {
  const m = new Map(d.sows.map((s) => [s.id, s.ear_tag]));
  return (id: string) => m.get(id) ?? "?";
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const counted = (d: AssistantData) => d.litters.filter((l) => l.status !== "cancelada");

export function herdSituation(d: AssistantData) {
  const counts = new Map<SowSituation, string[]>();
  for (const s of d.sows) {
    if (s.archived_at) continue;
    const r = sowSituation(
      s,
      d.breedings.filter((b) => b.sow_id === s.id),
      d.litters.filter((l) => l.sow_id === s.id),
      {
        attentionStart: d.gestation.attentionStart,
        gestationDays: d.gestation.gestationDays,
        maternityTransferDay: d.maternityTransferDay,
      },
      d.today,
    );
    counts.set(r.key, [...(counts.get(r.key) ?? []), s.ear_tag]);
  }
  return counts;
}

export function farrowingsBetween(d: AssistantData, from: string, to: string) {
  const tag = tagOf(d);
  return d.breedings
    .filter((b) => b.cycle_status === "ativo")
    .map((b) => ({ sow: tag(b.sow_id), due: addDays(b.breeding_date, d.gestation.gestationDays) }))
    .filter((x) => x.due >= from && x.due <= to)
    .sort((a, b) => a.due.localeCompare(b.due));
}

/** Ciclos com parto previsto já passado (com folga de 3 dias) sem parto registrado. */
export function lateCycles(d: AssistantData) {
  const tag = tagOf(d);
  return d.breedings
    .filter(
      (b) =>
        b.cycle_status === "ativo" &&
        daysBetween(addDays(b.breeding_date, d.gestation.gestationDays), d.today) > 3,
    )
    .map((b) => ({ sow: tag(b.sow_id), day: daysBetween(b.breeding_date, d.today) }));
}

export function answerLocal(question: string, d: AssistantData): Answer | null {
  const q = normalize(question);
  const has = (...w: string[]) => w.some((x) => q.includes(x));
  const tag = tagOf(d);
  const ms = monthStart(d.today);
  const src = "Calculado agora a partir dos registros do sistema.";

  if (has("gestante", "prenha", "prenhe")) {
    const sit = herdSituation(d);
    const g = [
      ...(sit.get("gestante") ?? []),
      ...(sit.get("pre_parto") ?? []),
      ...(sit.get("em_maternidade") ?? []),
    ];
    const unconfirmed = sit.get("inseminada") ?? [];
    return {
      text: `${plural(g.length, "matriz está gestante", "matrizes estão gestantes")} com diagnóstico positivo ou em fase final de gestação. Outras ${plural(unconfirmed.length, "está coberta", "estão cobertas")} aguardando diagnóstico.`,
      items: g,
      source: src,
    };
  }
  if (has("parir", "parto", "partos") && has("semana", "proxim", "vao")) {
    const end = addDays(d.today, 7);
    const list = farrowingsBetween(d, d.today, end);
    return {
      text: list.length
        ? `${plural(list.length, "parto previsto", "partos previstos")} até ${end.split("-").reverse().join("/")} (estimativa de ${d.gestation.gestationDays} dias):`
        : "Nenhum parto previsto para os próximos 7 dias nos ciclos registrados.",
      items: list.map((x) => `${x.sow} — ${x.due.split("-").reverse().join("/")}`),
      source: src,
    };
  }
  if (has("atrasad", "atraso")) {
    const late = lateCycles(d);
    const tasks = d.tasks.filter(
      (t) => t.status !== "concluida" && t.due_date && t.due_date < d.today,
    );
    return {
      text: `${plural(late.length, "matriz passou", "matrizes passaram")} da data prevista de parto sem parto registrado; ${plural(tasks.length, "tarefa atrasada", "tarefas atrasadas")}.`,
      items: [
        ...late.map((x) => `${x.sow}: dia ${x.day} de gestação`),
        ...tasks.map((t) => `Tarefa: ${t.title}`),
      ],
      source: src,
    };
  }
  if (has("nasce", "nascimento", "nasceram")) {
    const ls = counted(d).filter((l) => l.farrowing_date >= ms && l.farrowing_date <= d.today);
    const alive = ls.reduce((a, l) => a + l.born_alive, 0);
    return {
      text: ls.length
        ? `Neste mês: ${plural(ls.length, "parto", "partos")}, ${alive} nascidos vivos, ${ls.reduce((a, l) => a + l.stillborn, 0)} natimortos e ${ls.reduce((a, l) => a + (l.mummified ?? 0), 0)} mumificados.`
        : "Nenhum parto registrado neste mês.",
      source: src,
    };
  }
  if (has("mortalidade", "morreram", "mortes")) {
    const deaths = d.events
      .filter((e) => e.event_type === "morte" && e.event_date >= ms)
      .reduce((a, e) => a + e.quantity, 0);
    const ind = maternityIndicators(d.litters, d.piglets, [], addDays(d.today, -89), d.today);
    return {
      text: `Neste mês foram registradas ${plural(deaths, "morte", "mortes")} de leitões na maternidade. Mortalidade pré-desmame dos últimos 90 dias: ${ind.preWeaningMortality.value === null ? "sem leitegadas desmamadas no período" : `${ind.preWeaningMortality.value.toFixed(1).replace(".", ",")}% (${ind.weanedLitters} leitegadas desmamadas)`}.`,
      source: src,
    };
  }
  if (has("melhor", "desempenho") && has("matriz", "porca")) {
    const r = sowVsHerd(d.litters);
    const best = r.rows.filter((x) => x.litters >= 2).slice(0, 3);
    if (!best.length)
      return {
        text: "Ainda não há matrizes com pelo menos 2 partos registrados para comparar com segurança.",
        source: src,
      };
    return {
      text: `Maiores médias de nascidos vivos por parto (mínimo 2 partos). Média do plantel: ${r.herdNV.value?.toFixed(1).replace(".", ",") ?? "—"}.`,
      items: best.map(
        (x) =>
          `${tag(x.sowId)}: ${x.bornAlive.value?.toFixed(1).replace(".", ",")} vivos/parto em ${x.litters} partos`,
      ),
      source: src,
    };
  }
  if (has("medicamento", "remedio", "acabando", "estoque")) {
    const list = d.stockAlerts;
    return {
      text: list.length
        ? `${plural(list.length, "alerta de estoque", "alertas de estoque")} (mínimo, falta, validade):`
        : "Nenhum item abaixo do mínimo, sem estoque ou com validade próxima.",
      items: list.map((s) => `${s.module}: ${s.title}`),
      source: src,
    };
  }
  if (has("desmam")) {
    const ls = counted(d).filter((l) => l.weaning_date && l.weaning_date >= ms);
    return {
      text: ls.length
        ? `Neste mês: ${ls.reduce((a, l) => a + (l.weaned ?? 0), 0)} leitões desmamados em ${plural(ls.length, "leitegada", "leitegadas")}.`
        : "Nenhum desmame registrado neste mês.",
      source: src,
    };
  }
  if (has("racao", "consumo")) {
    const sum = (days: number) =>
      d.feed
        .filter(
          (f) =>
            f.movement_type === "consumo" &&
            f.movement_date > addDays(d.today, -days) &&
            f.movement_date <= d.today,
        )
        .reduce((a, f) => a + Number(f.quantity_kg), 0);
    const w = sum(7),
      m = sum(30);
    return {
      text: m
        ? `Consumo de ração lançado: ${w.toLocaleString("pt-BR")} kg nos últimos 7 dias e ${m.toLocaleString("pt-BR")} kg nos últimos 30 dias (média de ${(m / 30).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg/dia).`
        : "Nenhum consumo de ração lançado nos últimos 30 dias.",
      source: src,
    };
  }
  if (has("tarefa", "pendente", "pendencia")) {
    const open = d.tasks.filter((t) => t.status !== "concluida");
    return {
      text: `${plural(open.length, "tarefa em aberto", "tarefas em aberto")}.`,
      items: open
        .slice(0, 20)
        .map(
          (t) =>
            `${t.title}${t.due_date ? ` (prazo ${t.due_date.split("-").reverse().join("/")})` : ""}`,
        ),
      source: src,
    };
  }
  if (has("quantas matrizes", "plantel", "quantas porcas")) {
    const sit = herdSituation(d);
    const total = [...sit.values()].reduce((a, l) => a + l.length, 0);
    return {
      text: `Plantel ativo com ${plural(total, "matriz", "matrizes")}.`,
      items: [...sit.entries()].map(([k, v]) => `${SOW_SITUATIONS[k]}: ${v.length}`),
      source: src,
    };
  }
  return null;
}

export type Issue = { level: "alta" | "media"; text: string };

/** Possíveis falhas de registro. Indica o que conferir; não corrige nada sozinho. */
export function dataIssues(d: AssistantData): Issue[] {
  const tag = tagOf(d);
  const out: Issue[] = [];
  const byLitter = new Map(d.litters.map((l) => [l.id, l]));
  for (const l of counted(d)) {
    const parts = l.born_alive + l.stillborn + (l.mummified ?? 0);
    if (parts !== l.born_total)
      out.push({
        level: "alta",
        text: `${tag(l.sow_id)}, parto de ${l.farrowing_date}: total ${l.born_total} ≠ vivos + natimortos + mumificados (${parts}).`,
      });
    const live =
      l.born_alive -
      l.deaths +
      l.transfers_in -
      l.transfers_out -
      (l.status === "desmamada" ? (l.weaned ?? 0) : 0);
    if (live < 0)
      out.push({ level: "alta", text: `${tag(l.sow_id)}: saldo de leitões negativo (${live}).` });
    if (l.weaning_date && l.weaning_date < l.farrowing_date)
      out.push({ level: "alta", text: `${tag(l.sow_id)}: desmame antes do parto.` });
    if (l.status === "maternidade" && daysBetween(l.farrowing_date, d.today) > 60)
      out.push({
        level: "media",
        text: `${tag(l.sow_id)}: leitegada em maternidade há ${daysBetween(l.farrowing_date, d.today)} dias sem desmame registrado.`,
      });
  }
  for (const e of d.events) {
    const l = byLitter.get(e.litter_id);
    if (l && e.event_date < l.farrowing_date)
      out.push({
        level: "alta",
        text: `${tag(l.sow_id)}: evento "${e.event_type}" em ${e.event_date}, antes do parto.`,
      });
  }
  for (const b of d.breedings) {
    if (b.breeding_date > d.today)
      out.push({
        level: "alta",
        text: `${tag(b.sow_id)}: cobertura com data no futuro (${b.breeding_date}).`,
      });
    if (
      b.cycle_status === "ativo" &&
      daysBetween(b.breeding_date, d.today) > d.gestation.gestationDays + 10
    )
      out.push({
        level: "media",
        text: `${tag(b.sow_id)}: ciclo ativo há ${daysBetween(b.breeding_date, d.today)} dias — gestação fora do período esperado; confira parto, perda ou retorno.`,
      });
  }
  const tags = new Map<string, number>();
  for (const s of d.sows)
    if (!s.archived_at) tags.set(normalize(s.ear_tag), (tags.get(normalize(s.ear_tag)) ?? 0) + 1);
  for (const [t, n] of tags)
    if (n > 1) out.push({ level: "alta", text: `Brinco "${t}" usado por ${n} matrizes ativas.` });
  for (const s of d.sows)
    if (
      !s.archived_at &&
      s.status === "lactante" &&
      !d.litters.some((l) => l.sow_id === s.id && l.status === "maternidade")
    )
      out.push({
        level: "media",
        text: `${s.ear_tag}: situação "lactante" sem leitegada em maternidade.`,
      });
  return out;
}

/** Tendência simples: mês atual até hoje × mesmo número de dias do mês anterior. */
export function trends(d: AssistantData) {
  const day = Number(d.today.slice(8, 10));
  const curFrom = monthStart(d.today);
  const prevMonth = new Date(
    Date.UTC(Number(d.today.slice(0, 4)), Number(d.today.slice(5, 7)) - 2, 1),
  )
    .toISOString()
    .slice(0, 10);
  const prevTo = addDays(prevMonth, day - 1);
  const born = (f: string, t: string) =>
    counted(d)
      .filter((l) => l.farrowing_date >= f && l.farrowing_date <= t)
      .reduce((a, l) => a + l.born_alive, 0);
  const deaths = (f: string, t: string) =>
    d.events
      .filter((e) => e.event_type === "morte" && e.event_date >= f && e.event_date <= t)
      .reduce((a, e) => a + e.quantity, 0);
  return [
    { label: "Nascidos vivos", current: born(curFrom, d.today), previous: born(prevMonth, prevTo) },
    {
      label: "Mortes de leitões",
      current: deaths(curFrom, d.today),
      previous: deaths(prevMonth, prevTo),
    },
  ].map((x) => ({ ...x, note: `1º a ${day} deste mês × mesmos dias do mês anterior` }));
}

export function dailySummary(d: AssistantData): string[] {
  const sit = herdSituation(d);
  const total = [...sit.values()].reduce((a, l) => a + l.length, 0);
  const week = farrowingsBetween(d, d.today, addDays(d.today, 7));
  const late = lateCycles(d);
  const nursing = counted(d).filter((l) => l.status === "maternidade");
  const tasksToday = d.tasks.filter((t) => t.status !== "concluida" && t.due_date === d.today);
  const overdueTasks = d.tasks.filter(
    (t) => t.status !== "concluida" && t.due_date && t.due_date < d.today,
  );
  const deathsYesterday = d.events
    .filter((e) => e.event_type === "morte" && e.event_date === addDays(d.today, -1))
    .reduce((a, e) => a + e.quantity, 0);
  const issues = dataIssues(d);
  return [
    `Plantel ativo: ${plural(total, "matriz", "matrizes")} (${(sit.get("gestante")?.length ?? 0) + (sit.get("pre_parto")?.length ?? 0) + (sit.get("em_maternidade")?.length ?? 0)} gestantes confirmadas ou em fase final).`,
    `Maternidade: ${plural(nursing.length, "leitegada", "leitegadas")} com ${nursing.reduce((a, l) => a + Math.max(0, l.born_alive - l.deaths + l.transfers_in - l.transfers_out), 0)} leitões vivos.`,
    `Partos previstos nos próximos 7 dias: ${week.length}${week.length ? ` (${week.map((w) => w.sow).join(", ")})` : ""}.`,
    ...(late.length
      ? [
          `Atenção: ${plural(late.length, "matriz passou", "matrizes passaram")} da data prevista sem parto registrado.`,
        ]
      : []),
    `Mortes de leitões registradas ontem: ${deathsYesterday}.`,
    `Tarefas para hoje: ${tasksToday.length}; atrasadas: ${overdueTasks.length}.`,
    ...(d.stockAlerts.filter((s) => s.level === "alta").length
      ? [
          `Estoque: ${d.stockAlerts.filter((s) => s.level === "alta").length} alerta(s) grave(s) (falta ou validade vencida).`,
        ]
      : []),
    ...(issues.length
      ? [
          `Conferência de dados: ${plural(issues.length, "possível falha de registro", "possíveis falhas de registro")}.`,
        ]
      : []),
  ];
}

/** Resumo compacto (sem nomes de pessoas) enviado à IA para perguntas livres. */
export function snapshotForAI(d: AssistantData) {
  const sit = herdSituation(d);
  const ms = monthStart(d.today);
  return {
    data_de_hoje: d.today,
    parametros: { duracao_gestacao_dias: d.gestation.gestationDays },
    plantel_por_situacao: Object.fromEntries(
      [...sit.entries()].map(([k, v]) => [SOW_SITUATIONS[k], v]),
    ),
    partos_previstos_30_dias: farrowingsBetween(d, d.today, addDays(d.today, 30)),
    ciclos_atrasados: lateCycles(d),
    maternidade_atual: counted(d)
      .filter((l) => l.status === "maternidade")
      .map((l) => ({
        matriz: tagOf(d)(l.sow_id),
        parto: l.farrowing_date,
        vivos_no_parto: l.born_alive,
        mortes: l.deaths,
      })),
    indicadores_90_dias: maternityIndicators(
      d.litters,
      d.piglets,
      [],
      addDays(d.today, -89),
      d.today,
    ),
    mortes_leitoes_mes: d.events
      .filter((e) => e.event_type === "morte" && e.event_date >= ms)
      .reduce((a, e) => a + e.quantity, 0),
    tendencias: trends(d),
    alertas_estoque: d.stockAlerts.map((s) => `${s.module}: ${s.title}`),
    tarefas_abertas: d.tasks
      .filter((t) => t.status !== "concluida")
      .map((t) => ({ titulo: t.title, prazo: t.due_date })),
    possiveis_falhas_de_registro: dataIssues(d).map((i) => i.text),
  };
}
