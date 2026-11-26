/** Alertas de estoque consolidados (materiais, ração e farmácia). Funções puras. */
import { daysBetween } from "./gestation";

export const STOCK_CATEGORIES: Record<string, string> = {
  seringas: "Seringas",
  agulhas: "Agulhas",
  materiais_manejo: "Materiais de manejo",
  suplementos: "Suplementos",
  limpeza: "Produtos de limpeza",
  equipamentos: "Equipamentos",
  epi: "EPI",
  outros: "Outros",
};

export const MOVEMENT_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  devolucao: "Devolução",
  transferencia: "Transferência de local",
  ajuste: "Ajuste de inventário",
};

export type StockAlert = {
  key: string;
  level: "alta" | "media";
  module: "Materiais" | "Ração" | "Farmácia";
  title: string;
  detail: string;
};

type Item = {
  id: string;
  name: string;
  unit: string;
  minimum_stock: number;
  current_stock: number;
  active: boolean;
};
type Movement = {
  id: string;
  item_id: string;
  movement_type: string;
  lot: string | null;
  expiry_date: string | null;
  quantity: number;
  movement_date: string;
  reason: string | null;
};
type Feed = { id: string; name: string; stock_kg: number; minimum_stock_kg: number };
type MedLot = {
  id: string;
  medication_id: string;
  lot_number: string | null;
  expiry_date: string | null;
  quantity: number;
  unit: string;
};

/**
 * @param nearDays janela de "próximo do vencimento" (padrão 30 dias, exibida na tela).
 */
export function stockAlerts(
  input: {
    items: Item[];
    movements: Movement[];
    feeds: Feed[];
    medLots: MedLot[];
    medName: (id: string) => string;
  },
  today: string,
  nearDays = 30,
): StockAlert[] {
  const out: StockAlert[] = [];
  const itemName = new Map(input.items.map((i) => [i.id, i]));
  for (const i of input.items) {
    if (!i.active) continue;
    if (Number(i.current_stock) <= 0)
      out.push({
        key: `zero-${i.id}`,
        level: "alta",
        module: "Materiais",
        title: `${i.name} sem estoque`,
        detail: "Saldo zerado.",
      });
    else if (Number(i.minimum_stock) > 0 && Number(i.current_stock) < Number(i.minimum_stock))
      out.push({
        key: `min-${i.id}`,
        level: "media",
        module: "Materiais",
        title: `${i.name} abaixo do mínimo`,
        detail: `Saldo ${i.current_stock} ${i.unit}; mínimo ${i.minimum_stock}.`,
      });
  }
  const sinceAdjust = today.slice(0, 4) + "-01-01";
  for (const m of input.movements) {
    const it = itemName.get(m.item_id);
    if (!it || !it.active) continue;
    if (m.movement_type === "entrada" && Number(it.current_stock) > 0) {
      if (!m.lot?.trim() && daysBetween(m.movement_date, today) <= 90)
        out.push({
          key: `lot-${m.id}`,
          level: "media",
          module: "Materiais",
          title: `Entrada sem lote: ${it.name}`,
          detail: `Entrada de ${m.quantity} ${it.unit} em ${m.movement_date} sem identificação de lote.`,
        });
      if (m.expiry_date) {
        const left = daysBetween(today, m.expiry_date);
        if (left < 0)
          out.push({
            key: `exp-${m.id}`,
            level: "alta",
            module: "Materiais",
            title: `Lote vencido: ${it.name}`,
            detail: `Lote ${m.lot ?? "sem identificação"} venceu em ${m.expiry_date}. Confira se ainda há unidades.`,
          });
        else if (left <= nearDays)
          out.push({
            key: `near-${m.id}`,
            level: "media",
            module: "Materiais",
            title: `Vence em ${left} dia(s): ${it.name}`,
            detail: `Lote ${m.lot ?? "sem identificação"}, validade ${m.expiry_date}.`,
          });
      }
    }
    if (m.movement_type === "ajuste" && m.movement_date >= sinceAdjust)
      out.push({
        key: `adj-${m.id}`,
        level: "media",
        module: "Materiais",
        title: `Divergência de inventário: ${it.name}`,
        detail: `Ajuste de ${m.quantity > 0 ? "+" : ""}${m.quantity} ${it.unit} em ${m.movement_date}. Motivo: ${m.reason ?? "—"}.`,
      });
  }
  for (const f of input.feeds) {
    if (Number(f.stock_kg) <= 0)
      out.push({
        key: `feed0-${f.id}`,
        level: "alta",
        module: "Ração",
        title: `${f.name} sem estoque`,
        detail: "Saldo zerado.",
      });
    else if (Number(f.minimum_stock_kg) > 0 && Number(f.stock_kg) < Number(f.minimum_stock_kg))
      out.push({
        key: `feedmin-${f.id}`,
        level: "media",
        module: "Ração",
        title: `${f.name} abaixo do mínimo`,
        detail: `Saldo ${f.stock_kg} kg; mínimo ${f.minimum_stock_kg} kg.`,
      });
  }
  for (const l of input.medLots) {
    if (Number(l.quantity) <= 0) continue;
    const name = input.medName(l.medication_id);
    if (!l.lot_number?.trim())
      out.push({
        key: `medlot-${l.id}`,
        level: "media",
        module: "Farmácia",
        title: `Lote sem identificação: ${name}`,
        detail: `${l.quantity} ${l.unit} em estoque.`,
      });
    if (l.expiry_date) {
      const left = daysBetween(today, l.expiry_date);
      if (left < 0)
        out.push({
          key: `medexp-${l.id}`,
          level: "alta",
          module: "Farmácia",
          title: `Lote vencido: ${name}`,
          detail: `Lote ${l.lot_number ?? "—"} venceu em ${l.expiry_date} com ${l.quantity} ${l.unit}. Não usar; registrar descarte.`,
        });
      else if (left <= nearDays)
        out.push({
          key: `mednear-${l.id}`,
          level: "media",
          module: "Farmácia",
          title: `Vence em ${left} dia(s): ${name}`,
          detail: `Lote ${l.lot_number ?? "—"}, ${l.quantity} ${l.unit}.`,
        });
    }
  }
  return out.sort((a, b) =>
    a.level === b.level ? a.module.localeCompare(b.module) : a.level === "alta" ? -1 : 1,
  );
}
