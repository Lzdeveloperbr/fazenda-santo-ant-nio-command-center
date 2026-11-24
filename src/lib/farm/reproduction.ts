const ACTIVE_SOW_STATUSES = new Set(["vazia", "coberta", "gestante", "lactante"]);

/** Only animals still in the breeding herd can receive new reproductive records. */
export function isActiveSowStatus(status: string) {
  return ACTIVE_SOW_STATUSES.has(status);
}

/** Validate a coverage date before creating a reproductive event. */
export function breedingDateError(date: string, today: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return "Informe uma data de cobertura válida.";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return "Informe uma data de cobertura válida.";
  if (date > today) return "A data da cobertura não pode estar no futuro.";
  return null;
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
