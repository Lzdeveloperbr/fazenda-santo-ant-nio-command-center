/** Validações dos fluxos guiados (mesmas regras das funções do banco, 0023). */
import { addDays } from "./gestation";

export type BreedingForm = {
  sowId: string;
  sowStatus: string | null;
  date: string;
  type: string;
  semenBatchId: string;
  doses: number | null;
  heatStartedAt: string;
};
export type FarrowingForm = {
  breedingId: string;
  breedingDate: string | null;
  date: string;
  alive: number;
  stillborn: number;
  mummified: number;
  runts: number;
  deathsAfter: number;
  piglets: number;
  start: string;
  end: string;
};
export type WeaningForm = {
  litterId: string;
  farrowingDate: string | null;
  live: number;
  date: string;
  males: number | null;
  females: number | null;
  avgWeight: number | null;
  weights: number[];
};

const int = (n: number | null) => n === null || Number.isInteger(n);

export function breedingErrors(f: BreedingForm, today: string): string | null {
  if (!f.sowId) return "Escolha a matriz.";
  if (f.sowStatus && !["vazia", "coberta"].includes(f.sowStatus))
    return `Matriz está como "${f.sowStatus}"; só vazias ou cobertas recebem cobertura.`;
  if (!f.date || f.date > today) return "Data da cobertura inválida (não pode ser futura).";
  if (!["monta_natural", "inseminacao", "reinseminacao", "complementar"].includes(f.type))
    return "Escolha o tipo de cobertura.";
  if (f.semenBatchId && (!f.doses || f.doses < 1 || !int(f.doses)))
    return "Informe as doses usadas do lote de sêmen.";
  if (f.heatStartedAt && f.heatStartedAt.slice(0, 10) > f.date)
    return "O cio não pode começar depois da cobertura.";
  return null;
}

export function breedingPreview(
  date: string,
  cfg: { heatStart: number; gestationDays: number; diagnosisDay: number | null },
) {
  return {
    heatCheck: addDays(date, cfg.heatStart),
    diagnosis: cfg.diagnosisDay === null ? null : addDays(date, cfg.diagnosisDay),
    farrowing: addDays(date, cfg.gestationDays),
  };
}

export function farrowingErrors(f: FarrowingForm, today: string): string | null {
  if (!f.breedingId) return "Escolha a matriz/ciclo.";
  if (!f.date || (f.breedingDate && f.date < f.breedingDate) || f.date > today)
    return "Data do parto inválida.";
  const nums = [f.alive, f.stillborn, f.mummified, f.runts, f.deathsAfter];
  if (nums.some((n) => !Number.isInteger(n) || n < 0))
    return "Use números inteiros, sem negativos.";
  if (f.alive + f.stillborn + f.mummified === 0) return "Informe os leitões nascidos.";
  if (f.runts > f.alive || f.deathsAfter > f.alive)
    return "Refugos e mortes após o nascimento não podem passar dos nascidos vivos.";
  if (f.piglets > f.alive) return "Mais leitões identificados do que nascidos vivos.";
  return null;
}

/** Duração do parto em minutos (atravessa a meia-noite quando o fim é menor). */
export function farrowingMinutes(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [h1, m1] = start.split(":").map(Number) as [number, number];
  const [h2, m2] = end.split(":").map(Number) as [number, number];
  let d = h2 * 60 + m2 - (h1 * 60 + m1);
  if (d < 0) d += 1440;
  return d;
}

export function weaningErrors(f: WeaningForm, today: string): string | null {
  if (!f.litterId) return "Escolha a leitegada.";
  if (f.live <= 0) return "A leitegada não tem leitões vivos registrados.";
  if (!f.date || (f.farrowingDate && f.date < f.farrowingDate) || f.date > today)
    return "Data de desmame inválida.";
  if (!int(f.males) || !int(f.females) || (f.males ?? 0) < 0 || (f.females ?? 0) < 0)
    return "Machos e fêmeas: números inteiros, sem negativos.";
  if ((f.males ?? 0) + (f.females ?? 0) > f.live)
    return `Machos + fêmeas passam dos ${f.live} leitões vivos.`;
  if (f.avgWeight !== null && !(f.avgWeight > 0 && f.avgWeight < 60)) return "Peso médio inválido.";
  if (f.weights.some((w) => !(w > 0 && w < 60))) return "Algum peso individual é inválido.";
  return null;
}

export function weaningAverage(avg: number | null, weights: number[]) {
  if (avg !== null) return avg;
  if (!weights.length) return null;
  return Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 100) / 100;
}
