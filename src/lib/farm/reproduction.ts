const ACTIVE_SOW_STATUSES = new Set(["vazia", "coberta", "gestante", "lactante"]);

/** Only animals still in the breeding herd can receive new reproductive records. */
export function isActiveSowStatus(status: string) {
  return ACTIVE_SOW_STATUSES.has(status);
}

export function litterEventError({
  eventType,
  quantity,
  live,
  value,
}: {
  eventType: string;
  quantity: number;
  live: number;
  value?: number | null;
}) {
  if (["morte", "transferencia_entrada", "transferencia_saida", "desmame"].includes(eventType)) {
    if (!Number.isInteger(quantity) || quantity <= 0) return "Informe uma quantidade inteira maior que zero.";
  }
  if ((eventType === "morte" || eventType === "transferencia_saida") && quantity > live) {
    return `A leitegada tem ${live} leitões vivos registrados.`;
  }
  if (eventType === "desmame" && quantity !== live) {
    return `O desmame precisa registrar todos os ${live} leitões vivos da leitegada.`;
  }
  if (eventType === "pesagem" && (!Number.isFinite(value) || Number(value) <= 0)) {
    return "Informe um peso médio maior que zero.";
  }
  return null;
}
