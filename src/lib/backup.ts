/**
 * Cópia de segurança da granja: lê todas as tabelas que o usuário pode ver (RLS limita à
 * própria granja) e gera um arquivo JSON. Não restaura sozinho: a restauração é um
 * procedimento manual documentado em docs/DIAGNOSTICO_ERP.md, para nunca sobrescrever dados.
 */
export const BACKUP_TABLES = [
  "farms",
  "farm_settings",
  "profiles",
  "user_access",
  "sows",
  "boars",
  "breedings",
  "heat_detections",
  "semen_batches",
  "pregnancy_diagnoses",
  "gestation_events",
  "litters",
  "litter_events",
  "piglet_identifications",
  "weaning_feed_schedules",
  "sow_events",
  "sow_condition_records",
  "sow_weighings",
  "farm_pens",
  "pen_records",
  "production_batches",
  "batch_events",
  "batch_weights",
  "batch_feed_products",
  "batch_feed_movements",
  "feed_products",
  "feed_movements",
  "feed_plans",
  "stock_items",
  "stock_movements",
  "suppliers",
  "inventory_checks",
  "farm_medications",
  "farm_medication_lots",
  "farm_medication_movements",
  "medication_records",
  "vaccination_records",
  "veterinary_treatment_records",
  "health_events",
  "health_records",
  "health_samples",
  "health_protocols",
  "monitoring_records",
  "biosecurity_checks",
  "farm_visit_reports",
  "ai_health_analyses",
  "ai_questions",
  "finance_entries",
  "tasks",
  "shift_handovers",
  "issue_reports",
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type BackupFile = {
  format: "fazenda-santo-antonio-backup";
  version: 1;
  generated_at: string;
  farm: { id: string | null; name: string | null };
  counts: Record<string, number>;
  errors: Record<string, string>;
  tables: Record<string, unknown[]>;
};

export function buildBackup(
  tables: Record<string, unknown[]>,
  errors: Record<string, string>,
  farm: { id: string | null; name: string | null },
  now = new Date(),
): BackupFile {
  return {
    format: "fazenda-santo-antonio-backup",
    version: 1,
    generated_at: now.toISOString(),
    farm,
    counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
    errors,
    tables,
  };
}

/** Confere se um arquivo é uma cópia válida e bate as contagens (usado antes de qualquer restauração). */
export function verifyBackup(
  raw: unknown,
): { ok: true; total: number } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object")
    return { ok: false, error: "Arquivo não é JSON de cópia de segurança." };
  const b = raw as Partial<BackupFile>;
  if (b.format !== "fazenda-santo-antonio-backup" || b.version !== 1)
    return { ok: false, error: "Formato desconhecido." };
  if (!b.tables || !b.counts) return { ok: false, error: "Cópia incompleta." };
  let total = 0;
  for (const [t, rows] of Object.entries(b.tables)) {
    if (!Array.isArray(rows)) return { ok: false, error: `Tabela ${t} corrompida.` };
    if (b.counts[t] !== rows.length) return { ok: false, error: `Contagem de ${t} não confere.` };
    total += rows.length;
  }
  return { ok: true, total };
}
