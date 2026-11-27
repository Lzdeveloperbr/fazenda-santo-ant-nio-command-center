import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Field, FormDialog, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { CountBars, PeriodFilter, usePeriod } from "@/components/farm/PeriodFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { financeQuery, fmtDate, suppliersQuery, todayISO, type FinanceEntry } from "@/lib/farm";
import {
  cashFlow,
  costPerHead,
  COST_CENTERS,
  lastMonths,
  openItems,
  paidExpensesBy,
  type OpenItem,
} from "@/lib/farm/finance";
import { usePermissions } from "@/lib/access";
import { downloadCsv } from "@/lib/export";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const batchesQuery = {
  queryKey: ["production_batches", "finance"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("production_batches")
      .select("id,name,phase,initial_headcount,status");
    if (error) throw error;
    return data ?? [];
  },
};

/** Fornecedor cadastrado e lote, dentro do formulário de lançamento. */
export function EntryLinks({ supplierId, batchId }: { supplierId?: string | null | undefined; batchId?: string | null | undefined } = {}) {
  const suppliers = useQuery(suppliersQuery);
  const batches = useQuery(batchesQuery);
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Fornecedor cadastrado">
        <select name="supplier" className={selectCls} defaultValue={supplierId ?? ""}>
          <option value="">Nenhum</option>
          {(suppliers.data ?? [])
            .filter((s) => s.active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Lote (para custo por lote)">
        <select name="batch" className={selectCls} defaultValue={batchId ?? ""}>
          <option value="">Nenhum</option>
          {(batches.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.phase})
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function PayDialog({ item }: { item: OpenItem }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const [busy, setBusy] = useState(false);
  if (!perms?.canWrite) return null;
  const verb = item.entry_type === "receita" ? "recebimento" : "pagamento";
  return (
    <FormDialog
      title={`Registrar ${verb}`}
      trigger={
        <Button size="sm" variant="outline">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Baixar
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const date = String(f.get("date"));
            if (date > todayISO()) {
              toast.error("A data do pagamento não pode estar no futuro.");
              return;
            }
            setBusy(true);
            const { error } = await supabase
              .from("finance_entries")
              .update({
                status: "pago",
                paid_at: date,
                payment_method: String(f.get("method") || "") || null,
              })
              .eq("id", item.id)
              .eq("status", "pendente");
            setBusy(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success(`${verb[0]!.toUpperCase()}${verb.slice(1)} registrado.`);
            await qc.invalidateQueries({ queryKey: ["finance_entries"] });
            close();
          }}
        >
          <p className="text-sm">
            {item.category} · <strong>{brl(Number(item.amount))}</strong> · vencimento{" "}
            {fmtDate(item.dueOn)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Data do ${verb}`}>
              <Input
                name="date"
                type="date"
                defaultValue={todayISO()}
                max={todayISO()}
                required
                className="h-11"
              />
            </Field>
            <Field label="Forma">
              <select name="method" className={selectCls} defaultValue="">
                <option value="">Não informada</option>
                {["PIX", "Dinheiro", "Boleto", "Transferência", "Cartão", "Cheque"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            O valor não é alterado; a mudança fica no Histórico de alterações.
          </p>
          <SubmitRow busy={busy} label="Confirmar" />
        </form>
      )}
    </FormDialog>
  );
}

function OpenList({ title, items }: { title: string; items: OpenItem[] }) {
  const total = items.reduce((a, i) => a + Number(i.amount), 0);
  const overdue = items.filter((i) => i.overdue);
  return (
    <section className="panel p-4">
      <SectionTitle kicker={title} title={`${brl(total)} em ${items.length} conta(s)`} />
      {overdue.length > 0 && (
        <p className="mb-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          {overdue.length} vencida(s): {brl(overdue.reduce((a, i) => a + Number(i.amount), 0))}
        </p>
      )}
      {items.length === 0 ? (
        <Empty>Nada em aberto.</Empty>
      ) : (
        <ul className="divide-y text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span
                className={`w-24 shrink-0 font-mono text-xs ${i.overdue ? "font-bold text-destructive" : ""}`}
              >
                {fmtDate(i.dueOn)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{i.category}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[i.counterpart, i.description].filter(Boolean).join(" · ") || "—"} ·{" "}
                  {i.overdue
                    ? `vencida há ${-i.daysLeft} dia(s)`
                    : i.daysLeft === 0
                      ? "vence hoje"
                      : `vence em ${i.daysLeft} dia(s)`}
                </p>
              </div>
              <span className="font-mono font-semibold">{brl(Number(i.amount))}</span>
              <PayDialog item={i} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function OpenAccountsTab() {
  const entries = useQuery(financeQuery);
  const today = todayISO();
  if (entries.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const E = entries.data ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <OpenList title="Contas a pagar" items={openItems(E, "despesa", today)} />
      <OpenList title="Contas a receber" items={openItems(E, "receita", today)} />
    </div>
  );
}

export function CashFlowTab() {
  const entries = useQuery(financeQuery);
  const today = todayISO();
  const flow = useMemo(() => cashFlow(entries.data ?? [], lastMonths(today, 12, 3)), [entries.data, today]);
  const rows = flow.map((m) => ({
    mes: `${m.month.slice(5)}/${m.month.slice(2, 4)}`,
    "Entradas pagas": m.realizedIn,
    "Saídas pagas": m.realizedOut,
    "A receber": m.plannedIn,
    "A pagar": m.plannedOut,
  }));
  let running = 0;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Realizado = pago/recebido, na data do pagamento. Previsto = pendente, na data de vencimento.
        Os dois nunca são somados.
      </p>
      <div className="panel h-80 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: number) => brl(v)} />
            <Legend />
            <Bar dataKey="Entradas pagas" fill="hsl(150 45% 32%)" />
            <Bar dataKey="Saídas pagas" fill="hsl(0 60% 50%)" />
            <Bar dataKey="A receber" fill="hsl(150 45% 32% / .35)" />
            <Bar dataKey="A pagar" fill="hsl(0 60% 50% / .35)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="panel overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              {[
                "Mês",
                "Entradas pagas",
                "Saídas pagas",
                "Saldo realizado",
                "Saldo acumulado realizado",
                "A receber",
                "A pagar",
              ].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flow.map((m) => {
              running += m.realizedNet;
              return (
                <tr key={m.month} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono">
                    {m.month.slice(5)}/{m.month.slice(0, 4)}
                    {m.month > today.slice(0, 7) && (
                      <span className="ml-1 text-xs text-muted-foreground">(futuro)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{brl(m.realizedIn)}</td>
                  <td className="px-3 py-2 tabular-nums">{brl(m.realizedOut)}</td>
                  <td
                    className={`px-3 py-2 font-semibold tabular-nums ${m.realizedNet < 0 ? "text-destructive" : ""}`}
                  >
                    {brl(m.realizedNet)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{brl(running)}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {brl(m.plannedIn)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {brl(m.plannedOut)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        O saldo acumulado começa em zero no primeiro mês da tabela: o sistema não tem o saldo
        bancário inicial.
      </p>
    </div>
  );
}

export function CostsTab() {
  const entries = useQuery(financeQuery);
  const batches = useQuery(batchesQuery);
  const p = usePeriod("90d");
  const { from, to } = p.period;
  const E: FinanceEntry[] = entries.data ?? [];
  const byCenter = paidExpensesBy(
    E,
    (e) => (e.cost_center ? (COST_CENTERS[e.cost_center] ?? e.cost_center) : null),
    from,
    to,
  );
  const byCat = paidExpensesBy(E, (e) => e.category, from, to);
  const allTime = "0000-01-01",
    end = "9999-12-31";
  const batchRows = (batches.data ?? [])
    .map((b) => {
      const paid =
        paidExpensesBy(
          E.filter((e) => e.batch_id === b.id),
          () => "x",
          allTime,
          end,
        )[0]?.[1] ?? 0;
      return { b, paid, perHead: costPerHead(paid, b.initial_headcount) };
    })
    .filter((r) => r.paid > 0);
  return (
    <div className="space-y-4">
      <PeriodFilter {...p} />
      <p className="text-xs text-muted-foreground">
        Somente despesas pagas no período ({fmtDate(from)} a {fmtDate(to)}). Lançamentos sem centro
        de custo aparecem como “Sem classificação”.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <CountBars
          title="Por centro de custo (R$)"
          rows={byCenter.map(([k, v]) => [k, Math.round(v)])}
        />
        <CountBars title="Por categoria (R$)" rows={byCat.map(([k, v]) => [k, Math.round(v)])} />
      </div>
      <section className="panel p-4">
        <SectionTitle
          kicker="Custo por lote"
          title="Despesas pagas vinculadas a lotes"
          action={
            <Button
              variant="outline"
              size="sm"
              disabled={!batchRows.length}
              onClick={() =>
                downloadCsv(
                  "Custo por lote",
                  ["Lote", "Fase", "Animais na entrada", "Despesas pagas", "Custo por animal"],
                  batchRows.map((r) => [
                    r.b.name,
                    r.b.phase,
                    r.b.initial_headcount,
                    r.paid,
                    r.perHead,
                  ]),
                )
              }
            >
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
          }
        />
        {batchRows.length === 0 ? (
          <Empty>
            Nenhuma despesa paga vinculada a lote. Escolha o lote no lançamento para calcular o
            custo por animal.
          </Empty>
        ) : (
          <ul className="divide-y text-sm">
            {batchRows.map((r) => (
              <li key={r.b.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <strong>{r.b.name}</strong>{" "}
                  <span className="text-muted-foreground">
                    ({r.b.phase}, {r.b.initial_headcount} animais na entrada)
                  </span>
                </span>
                <span className="font-mono">
                  {brl(r.paid)} · {r.perHead === null ? "—" : `${brl(r.perHead)}/animal`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Custo por animal = despesas pagas vinculadas ao lote ÷ animais que entraram no lote. Ração
          e medicamentos lançados só no estoque não entram aqui, a menos que também tenham
          lançamento financeiro.
        </p>
      </section>
    </div>
  );
}
