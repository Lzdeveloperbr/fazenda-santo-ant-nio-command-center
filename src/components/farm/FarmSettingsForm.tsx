import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle } from "@/components/farm/Kpi";
import { Field } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_CONFIG,
  validateGestationConfig,
  type GestationConfig,
} from "@/lib/farm/gestation";
import { farmSettingsQuery, settingsToRow, validateExtraDays } from "@/lib/farm/farm-settings";
import { usePermissions } from "@/lib/access";

const GESTATION_FIELDS = [
  ["heatPrep", "Preparar observação de cio (dia)"],
  ["heatStart", "Início da janela de cio"],
  ["heatEnd", "Fim da janela de cio"],
  ["attentionStart", "Início da janela de atenção ao parto (pré-parto)"],
  ["approachDay", "Alerta de proximidade do parto"],
  ["intensiveDay", "Preparação intensificada"],
  ["gestationDays", "Duração de referência da gestação"],
] as const;

const EXTRA_FIELDS = [
  ["diagnosisDay", "Diagnóstico de gestação (dia após a cobertura)"],
  ["maternityTransferDay", "Transferência para maternidade (dia de gestação)"],
  ["weaningAgeDays", "Idade de desmame (dias após o parto)"],
] as const;

/** Prazos reprodutivos da granja, gravados no banco e iguais para todos os usuários. */
export function FarmSettingsForm() {
  const qc = useQueryClient();
  const settings = useQuery(farmSettingsQuery);
  const perms = usePermissions();
  const [busy, setBusy] = useState(false);
  const s = settings.data;
  if (settings.isLoading || !s)
    return <p className="text-sm text-muted-foreground">Carregando parâmetros…</p>;
  const canEdit = !!perms?.canDelete && s.stored;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const gestation = Object.fromEntries(
      GESTATION_FIELDS.map(([k]) => [k, Number(f.get(k))]),
    ) as GestationConfig;
    const opt = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? null : Number(v);
    };
    const next = {
      gestation,
      diagnosisDay: opt("diagnosisDay"),
      maternityTransferDay: opt("maternityTransferDay"),
      weaningAgeDays: opt("weaningAgeDays"),
    };
    const err = validateGestationConfig(gestation) ?? validateExtraDays(next);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("farm_settings")
      .update(settingsToRow(next))
      .eq("id", true);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Parâmetros salvos para toda a granja.");
    await qc.invalidateQueries({ queryKey: ["farm-settings"] });
  }

  return (
    <section className="panel max-w-2xl p-5">
      <SectionTitle kicker="Para toda a granja" title="Parâmetros reprodutivos" />
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        Estes prazos geram previsões e alertas para todos os usuários. São referências da granja,
        não regras biológicas: devem ser definidos pelo responsável técnico. Campos opcionais vazios
        significam “não configurado” e o sistema não cria previsão para eles.
        {s.updatedAt && ` Última alteração: ${new Date(s.updatedAt).toLocaleString("pt-BR")}.`}
      </p>
      {!s.stored && (
        <p className="mb-4 rounded-lg bg-warn/10 p-3 text-xs">
          O banco ainda não tem a tabela de parâmetros (migration 0016 pendente). Usando os valores
          padrão do sistema, sem edição.
        </p>
      )}
      {s.stored && !perms?.canDelete && (
        <p className="mb-4 text-xs text-muted-foreground">
          Somente administrador ou gerente pode alterar.
        </p>
      )}
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
        {GESTATION_FIELDS.map(([k, label]) => (
          <Field key={k} label={label}>
            <Input
              name={k}
              type="number"
              min={1}
              max={130}
              required
              defaultValue={s.gestation[k]}
              disabled={!canEdit}
              className="h-11"
            />
          </Field>
        ))}
        {EXTRA_FIELDS.map(([k, label]) => (
          <Field key={k} label={`${label} — opcional`}>
            <Input
              name={k}
              type="number"
              min={1}
              max={130}
              defaultValue={s[k] ?? ""}
              placeholder="Não configurado"
              disabled={!canEdit}
              className="h-11"
            />
          </Field>
        ))}
        {canEdit && (
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" className="h-11 flex-1" disabled={busy}>
              {busy ? "Salvando…" : "Salvar para a granja"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={busy}
              onClick={(e) => {
                const form = e.currentTarget.form;
                if (!form) return;
                for (const [k] of GESTATION_FIELDS)
                  (form.elements.namedItem(k) as HTMLInputElement).value = String(
                    DEFAULT_CONFIG[k],
                  );
                toast.message("Valores padrão preenchidos. Clique em salvar para aplicar.");
              }}
            >
              Preencher padrão
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}
