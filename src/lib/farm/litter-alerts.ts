/** Data-driven observations about a litter. Only uses recorded numbers; never a diagnosis. */
export type AlertLevel = "alerta" | "atencao" | "info" | "ok";
export type LitterAlert = { id: string; level: AlertLevel; title: string; detail: string; anchor: "cabeca" | "ventre" | "dorso" | "leitoes" | "patas" };

export type LitterInput = { farrowing_date: string; born_total: number; born_alive: number; stillborn: number; deaths: number; transfers_in: number; transfers_out: number; avg_weight: number | null };

export function daysSince(dateISO: string, today = new Date()) {
  return Math.max(0, Math.floor((today.getTime() - new Date(dateISO + "T12:00:00").getTime()) / 86400000));
}

export function litterAlerts(l: LitterInput, live: number, today = new Date()): LitterAlert[] {
  const out: LitterAlert[] = [];
  const days = daysSince(l.farrowing_date, today);
  const base = l.born_alive + l.transfers_in;
  const mort = base > 0 ? l.deaths / base : 0;
  const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;

  if (live === 0) out.push({ id: "sem-vivos", level: "alerta", anchor: "leitoes", title: "Nenhum leitão vivo registrado", detail: "Confira a leitegada e registre o desmame ou a correção." });
  if (l.deaths > 0) {
    const level: AlertLevel = mort >= 0.15 ? "alerta" : mort >= 0.08 ? "atencao" : "info";
    out.push({ id: "mortalidade", level, anchor: "leitoes", title: `Mortalidade ${pct(mort)}`, detail: `${l.deaths} morte(s) de ${base} leitão(ões) que a porca recebeu.${level !== "info" ? " Revise causas no histórico." : ""}` });
  }
  if (l.born_total > 0 && l.stillborn / l.born_total >= 0.1) out.push({ id: "natimortos", level: "atencao", anchor: "ventre", title: `Natimortos ${pct(l.stillborn / l.born_total)}`, detail: `${l.stillborn} de ${l.born_total} nascidos. Vale anotar a duração do parto.` });
  if (live > 14) out.push({ id: "tetos", level: "atencao", anchor: "ventre", title: `${live} leitões mamando`, detail: "Confira se há tetos funcionais para todos ou avalie adoção." });
  if (l.avg_weight == null && days >= 3) out.push({ id: "pesagem", level: "info", anchor: "dorso", title: "Sem pesagem registrada", detail: `Leitegada com ${days} dias e nenhuma pesagem lançada.` });
  if (days > 28) out.push({ id: "desmame", level: "alerta", anchor: "patas", title: `${days} dias de lactação`, detail: "Passou da idade usual de desmame (21–28 dias)." });
  else if (days >= 21) out.push({ id: "desmame", level: "atencao", anchor: "patas", title: `${days} dias de lactação`, detail: "Janela de desmame: prepare a saída dos leitões." });
  if (out.length === 0) out.push({ id: "ok", level: "ok", anchor: "cabeca", title: "Sem pendências nos registros", detail: "Nenhum ponto de atenção nos dados lançados." });
  const order: Record<AlertLevel, number> = { alerta: 0, atencao: 1, info: 2, ok: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
