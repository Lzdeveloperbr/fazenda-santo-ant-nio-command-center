import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CONFIG, type GestationConfig } from "./gestation";

/** Parâmetros da granja gravados no banco (migration 0016). */
export type FarmSettings = {
  farmName: string;
  gestation: GestationConfig;
  diagnosisDay: number | null;
  maternityTransferDay: number | null;
  weaningAgeDays: number | null;
  /** false quando o banco ainda não tem a tabela: valores padrão do código. */
  stored: boolean;
  updatedAt: string | null;
};

export const DEFAULT_FARM_SETTINGS: FarmSettings = {
  farmName: "Fazenda Santo Antônio",
  gestation: DEFAULT_CONFIG,
  diagnosisDay: null,
  maternityTransferDay: null,
  weaningAgeDays: null,
  stored: false,
  updatedAt: null,
};

type Row = {
  farm_name: string;
  heat_prep_day: number;
  heat_start_day: number;
  heat_end_day: number;
  attention_start_day: number;
  approach_day: number;
  intensive_day: number;
  gestation_days: number;
  diagnosis_day: number | null;
  maternity_transfer_day: number | null;
  weaning_age_days: number | null;
  updated_at: string;
};

export function settingsFromRow(r: Row): FarmSettings {
  return {
    farmName: r.farm_name,
    gestation: {
      heatPrep: r.heat_prep_day,
      heatStart: r.heat_start_day,
      heatEnd: r.heat_end_day,
      attentionStart: r.attention_start_day,
      approachDay: r.approach_day,
      intensiveDay: r.intensive_day,
      gestationDays: r.gestation_days,
    },
    diagnosisDay: r.diagnosis_day,
    maternityTransferDay: r.maternity_transfer_day,
    weaningAgeDays: r.weaning_age_days,
    stored: true,
    updatedAt: r.updated_at,
  };
}

export function settingsToRow(
  s: Pick<FarmSettings, "gestation" | "diagnosisDay" | "maternityTransferDay" | "weaningAgeDays">,
) {
  const g = s.gestation;
  return {
    heat_prep_day: g.heatPrep,
    heat_start_day: g.heatStart,
    heat_end_day: g.heatEnd,
    attention_start_day: g.attentionStart,
    approach_day: g.approachDay,
    intensive_day: g.intensiveDay,
    gestation_days: g.gestationDays,
    diagnosis_day: s.diagnosisDay,
    maternity_transfer_day: s.maternityTransferDay,
    weaning_age_days: s.weaningAgeDays,
  };
}

/** Mesmas regras das constraints de farm_settings. */
export function validateExtraDays(
  s: Pick<FarmSettings, "gestation" | "diagnosisDay" | "maternityTransferDay" | "weaningAgeDays">,
): string | null {
  const int = (v: number | null) => v === null || Number.isInteger(v);
  if (![s.diagnosisDay, s.maternityTransferDay, s.weaningAgeDays].every(int))
    return "Use números inteiros de dias.";
  if (s.diagnosisDay !== null && (s.diagnosisDay < s.gestation.heatEnd || s.diagnosisDay > 60))
    return `Diagnóstico deve ficar entre o dia ${s.gestation.heatEnd} e o dia 60.`;
  if (
    s.maternityTransferDay !== null &&
    (s.maternityTransferDay < 60 || s.maternityTransferDay > s.gestation.gestationDays)
  )
    return `Transferência para maternidade deve ficar entre o dia 60 e o dia ${s.gestation.gestationDays}.`;
  if (s.weaningAgeDays !== null && (s.weaningAgeDays < 7 || s.weaningAgeDays > 60))
    return "Idade de desmame deve ficar entre 7 e 60 dias.";
  return null;
}

export const farmSettingsQuery = queryOptions({
  queryKey: ["farm-settings"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<FarmSettings> => {
    const { data, error } = await supabase.from("farm_settings").select("*").maybeSingle();
    if (error) {
      // Tabela ainda não existe no banco (migration 0016 pendente).
      if (error.code === "42P01" || error.code === "PGRST205") return DEFAULT_FARM_SETTINGS;
      throw error;
    }
    return data ? settingsFromRow(data) : DEFAULT_FARM_SETTINGS;
  },
});
