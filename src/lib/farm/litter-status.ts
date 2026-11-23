/** Pure litter status helpers shared by UI and tests. */
export type LitterLiveCounts = {
  born_alive: number;
  deaths: number;
  transfers_in: number;
  transfers_out: number;
  status: string;
};

/** Archived/cancelled records remain in history but are excluded from operating indicators. */
export function isCountedLitter(litter: { status: string }) {
  return litter.status !== "cancelada";
}

/** Current live count is meaningful only while a litter is in the maternity phase. */
export function livePiglets(litter: LitterLiveCounts) {
  if (litter.status !== "maternidade") return 0;
  return Math.max(0, litter.born_alive - litter.deaths + litter.transfers_in - litter.transfers_out);
}
