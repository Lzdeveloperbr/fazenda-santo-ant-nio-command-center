/**
 * Financeiro: fluxo de caixa, contas a pagar/receber e custos.
 * Regra central: valor PAGO (realizado) e valor PENDENTE (previsto) nunca
 * são somados no mesmo número.
 */
import { daysBetween } from "./gestation";

export type Entry = {
  id: string;
  entry_type: string; // receita | despesa
  category: string;
  amount: number | string;
  status: string; // pago | pendente
  entry_date: string;
  due_date: string | null;
  paid_at?: string | null;
  cost_center?: string | null;
  batch_id?: string | null;
  counterpart?: string | null;
  description?: string | null;
};

export const COST_CENTERS: Record<string, string> = {
  geral: "Granja (geral)",
  reproducao: "Reprodução",
  gestacao: "Gestação",
  maternidade: "Maternidade",
  creche: "Creche",
  crescimento: "Crescimento",
  terminacao: "Terminação",
  administrativo: "Administrativo",
};

export const FINANCE_CATEGORIES = {
  receita: [
    "Venda de animais",
    "Venda de leitões",
    "Venda de terminados",
    "Venda de reprodutores",
    "Venda de matrizes",
    "Venda de descarte",
    "Outras receitas",
  ],
  despesa: [
    "Ração",
    "Medicamentos",
    "Vacinas",
    "Energia",
    "Água",
    "Manutenção",
    "Equipamentos",
    "Mão de obra",
    "Transporte",
    "Genética / sêmen",
    "Outros",
  ],
} as const;

const n = (v: number | string) => Number(v) || 0;
const sign = (e: Entry) => (e.entry_type === "receita" ? 1 : -1);

/** Data em que o dinheiro entrou/saiu (pago) ou deve entrar/sair (pendente). */
export function cashDate(e: Entry) {
  return e.status === "pago" ? (e.paid_at ?? e.entry_date) : (e.due_date ?? e.entry_date);
}

export type CashMonth = {
  month: string;
  realizedIn: number;
  realizedOut: number;
  realizedNet: number;
  plannedIn: number;
  plannedOut: number;
  plannedNet: number;
};

/** Fluxo de caixa mensal com realizado e previsto separados. */
export function cashFlow(entries: Entry[], months: string[]): CashMonth[] {
  return months.map((month) => {
    const inMonth = entries.filter((e) => cashDate(e).startsWith(month));
    const sum = (status: string, type: string) =>
      inMonth
        .filter((e) => e.status === status && e.entry_type === type)
        .reduce((a, e) => a + n(e.amount), 0);
    const realizedIn = sum("pago", "receita"),
      realizedOut = sum("pago", "despesa");
    const plannedIn = sum("pendente", "receita"),
      plannedOut = sum("pendente", "despesa");
    return {
      month,
      realizedIn,
      realizedOut,
      realizedNet: realizedIn - realizedOut,
      plannedIn,
      plannedOut,
      plannedNet: plannedIn - plannedOut,
    };
  });
}

export function lastMonths(today: string, count: number, ahead = 0): string[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const out: string[] = [];
  for (let i = -(count - 1); i <= ahead; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export type OpenItem = Entry & { dueOn: string; daysLeft: number; overdue: boolean };

/** Pendentes ordenados por vencimento: atrasados primeiro. */
export function openItems(
  entries: Entry[],
  type: "receita" | "despesa",
  today: string,
): OpenItem[] {
  return entries
    .filter((e) => e.status === "pendente" && e.entry_type === type)
    .map((e) => {
      const dueOn = e.due_date ?? e.entry_date;
      const daysLeft = daysBetween(today, dueOn);
      return { ...e, dueOn, daysLeft, overdue: daysLeft < 0 };
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}

/** Despesas pagas por chave (centro de custo, lote, categoria) no período. */
export function paidExpensesBy(
  entries: Entry[],
  key: (e: Entry) => string | null | undefined,
  from: string,
  to: string,
) {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (e.entry_type !== "despesa" || e.status !== "pago") continue;
    const d = cashDate(e);
    if (d < from || d > to) continue;
    const k = key(e) || "Sem classificação";
    m.set(k, (m.get(k) ?? 0) + n(e.amount));
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Custo por animal do lote = despesas pagas vinculadas ÷ animais que entraram no lote. */
export function costPerHead(totalPaid: number, headcount: number): number | null {
  return headcount > 0 ? totalPaid / headcount : null;
}

export function signedTotal(entries: Entry[]) {
  return entries.reduce((a, e) => a + sign(e) * n(e.amount), 0);
}

/** Rascunho para duplicar um lançamento (ex.: conta mensal): data de hoje, pendente, sem documento. */
export function duplicateDraft(e: Entry & { supplier_id?: string | null; document_number?: string | null }, today: string) {
  return {
    entry_type: e.entry_type,
    category: e.category,
    cost_center: e.cost_center ?? null,
    supplier_id: e.supplier_id ?? null,
    batch_id: e.batch_id ?? null,
    counterpart: e.counterpart ?? null,
    amount: Number(e.amount),
    description: e.description && !e.description.startsWith("[ESTORNO:") ? e.description : null,
    entry_date: today,
    status: "pendente",
    due_date: null as string | null,
    document_number: null as string | null,
  };
}

/** Lançamentos já gravados que parecem o mesmo (tipo, categoria, valor, data e contraparte). */
export function possibleDuplicates(
  entries: Entry[],
  d: { entry_type: string; category: string; amount: number; entry_date: string; counterpart: string | null },
) {
  const who = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  return entries.filter(
    (e) =>
      e.entry_type === d.entry_type &&
      e.category === d.category &&
      Math.abs(Number(e.amount) - d.amount) < 0.005 &&
      e.entry_date === d.entry_date &&
      who(e.counterpart) === who(d.counterpart),
  );
}
