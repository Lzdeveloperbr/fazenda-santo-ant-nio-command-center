import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeftRight, Download, Plus, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  feedProductsQuery,
  fmtDate,
  medicationLotsQuery,
  medicationsQuery,
  stockItemsQuery,
  stockMovementsQuery,
  suppliersQuery,
  todayISO,
  type StockItem,
} from "@/lib/farm";
import { MOVEMENT_LABEL, STOCK_CATEGORIES, stockAlerts } from "@/lib/farm/stock";
import { usePermissions } from "@/lib/access";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/almoxarifado")({
  head: () => ({
    meta: [
      { title: "Estoque geral | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Materiais, insumos, fornecedores, movimentações e alertas de estoque, ração e farmácia.",
      },
    ],
  }),
  component: Almoxarifado,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".");
  return s === "" ? null : Number(s);
};
const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

function Almoxarifado() {
  const items = useQuery(stockItemsQuery),
    movements = useQuery(stockMovementsQuery),
    suppliers = useQuery(suppliersQuery);
  const feeds = useQuery(feedProductsQuery),
    lots = useQuery(medicationLotsQuery),
    meds = useQuery(medicationsQuery);
  const [cat, setCat] = useState("");
  const today = todayISO();
  const medName = useMemo(() => {
    const m = new Map((meds.data ?? []).map((x) => [x.id, x.name]));
    return (id: string) => m.get(id) ?? "Medicamento";
  }, [meds.data]);
  const alerts = useMemo(
    () =>
      stockAlerts(
        {
          items: items.data ?? [],
          movements: movements.data ?? [],
          feeds: (feeds.data ?? []).map((f) => ({
            id: f.id,
            name: f.name,
            stock_kg: Number(f.stock_kg),
            minimum_stock_kg: Number(f.minimum_stock_kg),
          })),
          medLots: (lots.data ?? []).map((l) => ({
            id: l.id,
            medication_id: l.medication_id,
            lot_number: l.lot_number,
            expiry_date: l.expiry_date,
            quantity: Number(l.quantity),
            unit: l.unit,
          })),
          medName,
        },
        today,
      ),
    [items.data, movements.data, feeds.data, lots.data, medName, today],
  );
  const itemById = new Map((items.data ?? []).map((i) => [i.id, i]));
  const supplierName = new Map((suppliers.data ?? []).map((s) => [s.id, s.name]));
  const shown = (items.data ?? []).filter((i) => !cat || i.category === cat);

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Manejo e saúde" title="Estoque geral" action={<NewItem />} />
      <p className="max-w-3xl text-sm text-muted-foreground">
        Materiais e insumos (seringas, agulhas, manejo, suplementos, limpeza, equipamentos). Ração
        continua em{" "}
        <Link to="/estoque" className="font-semibold text-primary underline">
          Estoque de ração
        </Link>{" "}
        e medicamentos/vacinas na{" "}
        <Link to="/farmacia-ai" className="font-semibold text-primary underline">
          Farmácia
        </Link>
        ; os alertas de todos aparecem aqui. O saldo só muda por movimentação, e saída maior que o
        saldo é recusada.
      </p>
      <Tabs defaultValue="alertas">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="alertas">Alertas ({alerts.length})</TabsTrigger>
          <TabsTrigger value="itens">Materiais</TabsTrigger>
          <TabsTrigger value="movimentos">Movimentações</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>

        <TabsContent value="alertas">
          {alerts.length === 0 ? (
            <Empty>Nenhum alerta de estoque, validade ou inventário.</Empty>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {alerts.map((a) => (
                <li
                  key={a.key}
                  className={`flex gap-3 rounded-xl border p-3 ${a.level === "alta" ? "border-destructive/30 bg-destructive/5" : "border-warn/40 bg-warn/5"}`}
                >
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${a.level === "alta" ? "text-destructive" : "text-warn"}`}
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      {a.title}{" "}
                      <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[.65rem] font-normal">
                        {a.module}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            “Próximo do vencimento” = até 30 dias. Lotes vencidos não devem ser usados; registre a
            saída como descarte identificado.
          </p>
        </TabsContent>

        <TabsContent value="itens" className="space-y-3">
          <select
            aria-label="Categoria"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className={`${selectCls} max-w-xs`}
          >
            <option value="">Todas as categorias</option>
            {Object.entries(STOCK_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {items.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : shown.length === 0 ? (
            <Empty>Nenhum material cadastrado. Use “Novo material”.</Empty>
          ) : (
            <div className="panel overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    {["Material", "Categoria", "Saldo", "Mínimo", "Local", "Fornecedor", ""].map(
                      (h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i) => {
                    const low =
                      Number(i.minimum_stock) > 0 &&
                      Number(i.current_stock) < Number(i.minimum_stock);
                    return (
                      <tr key={i.id} className="border-t border-border/60">
                        <td className="px-3 py-2 font-semibold">
                          {i.name}
                          {!i.active && (
                            <span className="ml-1 text-xs text-muted-foreground">(inativo)</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{STOCK_CATEGORIES[i.category]}</td>
                        <td
                          className={`px-3 py-2 font-mono tabular-nums ${low ? "text-destructive" : ""}`}
                        >
                          {Number(i.current_stock).toLocaleString("pt-BR")} {i.unit}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {Number(i.minimum_stock).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2">{i.location ?? "—"}</td>
                        <td className="px-3 py-2">
                          {i.supplier_id ? supplierName.get(i.supplier_id) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <MovementDialog item={i} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movimentos" className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!movements.data?.length}
            onClick={() =>
              downloadCsv(
                "Movimentações de estoque",
                [
                  "Data",
                  "Material",
                  "Tipo",
                  "Quantidade",
                  "Unidade",
                  "Saldo após",
                  "Custo unit.",
                  "Custo total",
                  "Lote",
                  "Validade",
                  "Fornecedor",
                  "NF",
                  "Destino",
                  "Motivo",
                  "Responsável",
                ],
                (movements.data ?? []).map((m) => {
                  const it = itemById.get(m.item_id);
                  return [
                    fmtDate(m.movement_date),
                    it?.name,
                    MOVEMENT_LABEL[m.movement_type],
                    m.quantity,
                    it?.unit,
                    m.balance_after,
                    m.unit_cost,
                    m.unit_cost !== null
                      ? Number(m.unit_cost) * Math.abs(Number(m.quantity))
                      : null,
                    m.lot,
                    fmtDate(m.expiry_date),
                    m.supplier_id ? supplierName.get(m.supplier_id) : "",
                    m.invoice_number,
                    m.to_location,
                    m.reason,
                    m.responsible,
                  ];
                }),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          {(movements.data ?? []).length === 0 ? (
            <Empty>Nenhuma movimentação registrada.</Empty>
          ) : (
            <div className="panel overflow-x-auto p-0">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Data",
                      "Material",
                      "Tipo",
                      "Qtd.",
                      "Saldo após",
                      "Custo total",
                      "Lote / validade",
                      "Fornecedor / NF",
                      "Motivo / destino",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(movements.data ?? []).slice(0, 300).map((m) => {
                    const it = itemById.get(m.item_id);
                    return (
                      <tr key={m.id} className="border-t border-border/60">
                        <td className="px-3 py-2 font-mono text-xs">{fmtDate(m.movement_date)}</td>
                        <td className="px-3 py-2">{it?.name ?? "?"}</td>
                        <td className="px-3 py-2">{MOVEMENT_LABEL[m.movement_type]}</td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {m.movement_type === "saida"
                            ? "−"
                            : m.movement_type === "ajuste" && Number(m.quantity) > 0
                              ? "+"
                              : m.movement_type === "entrada" || m.movement_type === "devolucao"
                                ? "+"
                                : ""}
                          {Number(m.quantity).toLocaleString("pt-BR")} {it?.unit}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {m.balance_after ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {m.unit_cost !== null
                            ? brl(Number(m.unit_cost) * Math.abs(Number(m.quantity)))
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {m.lot ?? "—"}
                          {m.expiry_date ? ` · ${fmtDate(m.expiry_date)}` : ""}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {m.supplier_id ? supplierName.get(m.supplier_id) : "—"}
                          {m.invoice_number ? ` · ${m.invoice_number}` : ""}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {[m.reason, m.to_location && `→ ${m.to_location}`, m.responsible]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-3">
          <NewSupplier />
          {(suppliers.data ?? []).length === 0 ? (
            <Empty>Nenhum fornecedor cadastrado.</Empty>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(suppliers.data ?? []).map((s) => (
                <div key={s.id} className="panel p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <Truck className="h-4 w-4 text-primary" />
                    {s.name}
                    {!s.active && <span className="text-xs text-muted-foreground">(inativo)</span>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[s.category, s.document, s.phone, s.email].filter(Boolean).join(" · ") ||
                      "Sem contato cadastrado"}
                  </p>
                  {s.notes && <p className="mt-2 text-xs">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SupplierSelect({
  name = "supplier_id",
  defaultValue = "",
}: {
  name?: string;
  defaultValue?: string;
}) {
  const suppliers = useQuery(suppliersQuery);
  return (
    <select name={name} className={selectCls} defaultValue={defaultValue}>
      <option value="">Não informado</option>
      {(suppliers.data ?? [])
        .filter((s) => s.active)
        .map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
    </select>
  );
}

function NewItem() {
  const qc = useQueryClient();
  const perms = usePermissions();
  const [busy, setBusy] = useState(false);
  if (!perms?.canWrite) return null;
  return (
    <FormDialog
      title="Novo material"
      trigger={
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Novo material
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const min = num(f.get("minimum")) ?? 0;
            if (min < 0) {
              toast.error("Mínimo não pode ser negativo.");
              return;
            }
            setBusy(true);
            const { error } = await supabase
              .from("stock_items")
              .insert({
                name: String(f.get("name")).trim(),
                category: String(f.get("category")),
                unit: String(f.get("unit")).trim(),
                minimum_stock: min,
                location: txt(f.get("location")),
                supplier_id: txt(f.get("supplier_id")),
                notes: txt(f.get("notes")),
              });
            setBusy(false);
            if (error) {
              toast.error(
                error.message.includes("unique")
                  ? "Já existe material com esse nome e unidade."
                  : error.message,
              );
              return;
            }
            toast.success("Material cadastrado. Lance a entrada para formar o saldo.");
            await qc.invalidateQueries({ queryKey: ["stock_items"] });
            close();
          }}
        >
          <Field label="Nome *">
            <Input name="name" required className="h-11" placeholder="Ex.: Agulha 25x7" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria *">
              <select name="category" className={selectCls} required>
                {Object.entries(STOCK_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unidade *">
              <Input name="unit" required className="h-11" placeholder="un, cx, L, kg" />
            </Field>
            <Field label="Estoque mínimo">
              <Input name="minimum" inputMode="decimal" className="h-11" placeholder="0" />
            </Field>
            <Field label="Local de armazenamento">
              <Input name="location" className="h-11" />
            </Field>
          </div>
          <Field label="Fornecedor principal">
            <SupplierSelect />
          </Field>
          <Field label="Observações">
            <Textarea name="notes" rows={2} />
          </Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}

function MovementDialog({ item }: { item: StockItem }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState("entrada");
  if (!perms?.canWrite) return null;
  const types = Object.entries(MOVEMENT_LABEL).filter(([k]) => k !== "ajuste" || perms.canDelete);
  return (
    <FormDialog
      title={`Movimentar · ${item.name}`}
      trigger={
        <Button size="sm" variant="outline">
          <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
          Movimentar
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            let qty = num(f.get("quantity"));
            if (qty === null || !Number.isFinite(qty) || qty === 0) {
              toast.error("Informe a quantidade.");
              return;
            }
            if (type === "ajuste") {
              qty = f.get("direction") === "menos" ? -Math.abs(qty) : Math.abs(qty);
            } else if (qty < 0) {
              toast.error("Quantidade deve ser positiva.");
              return;
            }
            if (type === "saida" && qty > Number(item.current_stock)) {
              toast.error(
                `Saldo atual é ${item.current_stock} ${item.unit}. Para divergência, peça um ajuste de inventário a um administrador ou gerente.`,
              );
              return;
            }
            const date = String(f.get("date"));
            if (date > todayISO()) {
              toast.error("Data no futuro.");
              return;
            }
            setBusy(true);
            const { error } = await supabase
              .from("stock_movements")
              .insert({
                item_id: item.id,
                movement_type: type,
                quantity: qty,
                movement_date: date,
                unit_cost: num(f.get("unit_cost")),
                lot: txt(f.get("lot")),
                expiry_date: txt(f.get("expiry_date")),
                supplier_id: txt(f.get("supplier_id")),
                invoice_number: txt(f.get("invoice")),
                to_location: txt(f.get("to_location")),
                from_location: type === "transferencia" ? item.location : null,
                reason: txt(f.get("reason")),
                responsible: txt(f.get("responsible")),
              });
            setBusy(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Movimentação registrada no servidor.");
            await qc.invalidateQueries({ queryKey: ["stock_items"] });
            await qc.invalidateQueries({ queryKey: ["stock_movements"] });
            close();
          }}
        >
          <p className="text-xs text-muted-foreground">
            Saldo atual:{" "}
            <strong>
              {Number(item.current_stock).toLocaleString("pt-BR")} {item.unit}
            </strong>
            {item.location ? ` · ${item.location}` : ""}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)}>
                {types.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <Input
                name="date"
                type="date"
                defaultValue={todayISO()}
                max={todayISO()}
                required
                className="h-11"
              />
            </Field>
            {type === "ajuste" && (
              <Field label="Direção">
                <select name="direction" className={selectCls}>
                  <option value="mais">Somar ao saldo</option>
                  <option value="menos">Subtrair do saldo</option>
                </select>
              </Field>
            )}
            <Field label={`Quantidade (${item.unit})`}>
              <Input name="quantity" inputMode="decimal" required className="h-11" />
            </Field>
          </div>
          {type === "entrada" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Custo unitário (R$)">
                <Input name="unit_cost" inputMode="decimal" className="h-11" />
              </Field>
              <Field label="Nota fiscal">
                <Input name="invoice" className="h-11" />
              </Field>
              <Field label="Lote">
                <Input name="lot" className="h-11" />
              </Field>
              <Field label="Validade">
                <Input name="expiry_date" type="date" className="h-11" />
              </Field>
              <div className="col-span-2">
                <Field label="Fornecedor">
                  <SupplierSelect defaultValue={item.supplier_id ?? ""} />
                </Field>
              </div>
            </div>
          )}
          {type === "transferencia" && (
            <Field label="Novo local *">
              <Input name="to_location" required className="h-11" />
            </Field>
          )}
          {(type === "ajuste" || type === "devolucao" || type === "saida") && (
            <Field label={type === "saida" ? "Uso / destino" : "Motivo *"}>
              <Input
                name="reason"
                required={type !== "saida"}
                minLength={3}
                className="h-11"
                placeholder={type === "ajuste" ? "Ex.: contagem física de 25/11" : ""}
              />
            </Field>
          )}
          <Field label="Responsável">
            <Input name="responsible" className="h-11" />
          </Field>
          <SubmitRow busy={busy} label="Registrar" />
        </form>
      )}
    </FormDialog>
  );
}

function NewSupplier() {
  const qc = useQueryClient();
  const perms = usePermissions();
  const [busy, setBusy] = useState(false);
  if (!perms?.canWrite) return null;
  return (
    <FormDialog
      title="Novo fornecedor"
      trigger={
        <Button variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          Novo fornecedor
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            const { error } = await supabase
              .from("suppliers")
              .insert({
                name: String(f.get("name")).trim(),
                document: txt(f.get("document")),
                phone: txt(f.get("phone")),
                email: txt(f.get("email")),
                category: txt(f.get("category")),
                notes: txt(f.get("notes")),
              });
            setBusy(false);
            if (error) {
              toast.error(
                error.message.includes("unique") ? "Fornecedor já cadastrado." : error.message,
              );
              return;
            }
            toast.success("Fornecedor cadastrado.");
            await qc.invalidateQueries({ queryKey: ["suppliers"] });
            close();
          }}
        >
          <Field label="Nome / razão social *">
            <Input name="name" required minLength={2} className="h-11" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ / CPF">
              <Input name="document" className="h-11" />
            </Field>
            <Field label="Ramo">
              <Input name="category" className="h-11" placeholder="Ração, farmácia, manutenção…" />
            </Field>
            <Field label="Telefone">
              <Input name="phone" type="tel" className="h-11" />
            </Field>
            <Field label="E-mail">
              <Input name="email" type="email" className="h-11" />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea name="notes" rows={2} />
          </Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}
