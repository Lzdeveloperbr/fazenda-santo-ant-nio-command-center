/** Regras da pesagem em lote e do cadastro incompleto (validação antes de gravar). */
export type WeighEntry = { sowId: string; tag: string; raw: string };

export function parseKg(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export function batchWeighErrors(entries: WeighEntry[], date: string, today: string): string[] {
  const errs: string[] = [];
  if (!date || date > today) errs.push("Data da pesagem inválida (não pode ser futura).");
  for (const e of entries) {
    const kg = parseKg(e.raw);
    if (kg === null) continue;
    if (Number.isNaN(kg) || kg <= 20 || kg >= 500)
      errs.push(`${e.tag}: peso "${e.raw}" fora de 20–500 kg.`);
  }
  return errs;
}

export function filledWeights(entries: WeighEntry[]) {
  return entries.flatMap((e) => {
    const kg = parseKg(e.raw);
    return kg === null || Number.isNaN(kg) ? [] : [{ sowId: e.sowId, kg }];
  });
}

/** O que falta no cadastro da matriz para o mapa ficar completo. */
export function missingFields(s: {
  birth_date: string | null;
  breed: string | null;
  weight_kg: number | null;
  entry_date: string | null;
}) {
  const m: string[] = [];
  if (!s.birth_date) m.push("nascimento");
  if (!s.breed?.trim()) m.push("raça");
  if (!s.entry_date) m.push("entrada na granja");
  if (s.weight_kg == null) m.push("peso");
  return m;
}
