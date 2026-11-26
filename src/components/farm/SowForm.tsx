import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { pensQuery, SOW_STATUS, todayISO, type Sow } from "@/lib/farm";
import { SOW_CATEGORY_LABEL, SOW_CONDITION_LABEL, validateSowForm } from "@/lib/farm/sow-profile";

const text = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

/** Lê o formulário no formato das colunas de `sows`. */
function readSowForm(f: FormData) {
  const weight = text(f, "weight_kg");
  return {
    ear_tag: String(f.get("ear_tag") ?? "").trim(),
    name: text(f, "name"),
    breed: text(f, "breed"),
    lineage: text(f, "lineage"),
    birth_date: text(f, "birth_date"),
    entry_date: text(f, "entry_date"),
    origin: text(f, "origin"),
    sire: text(f, "sire"),
    dam: text(f, "dam"),
    pen_id: text(f, "pen_id"),
    group_label: text(f, "group_label"),
    weight_kg: weight === null ? null : Number(weight.replace(",", ".")),
    weight_date: text(f, "weight_date"),
    category: text(f, "category"),
    condition: text(f, "condition"),
    notes: text(f, "notes"),
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-border/70 p-3">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function SowFormFields({ sow, withStatus }: { sow?: Sow; withStatus?: boolean }) {
  const pens = useQuery(pensQuery);
  const d = (v: string | number | null | undefined) =>
    v === null || v === undefined ? "" : String(v);
  return (
    <div className="space-y-4">
      <Section title="Identificação">
        <Field label="Brinco / número *">
          <Input name="ear_tag" defaultValue={d(sow?.ear_tag)} required className="h-11" />
        </Field>
        <Field label="Nome (opcional)">
          <Input name="name" defaultValue={d(sow?.name)} className="h-11" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Raça / genética">
            <Input name="breed" defaultValue={d(sow?.breed)} className="h-11" />
          </Field>
          <Field label="Linhagem">
            <Input name="lineage" defaultValue={d(sow?.lineage)} className="h-11" />
          </Field>
        </div>
        <Field label="Categoria">
          <select name="category" className={selectCls} defaultValue={d(sow?.category)}>
            <option value="">Não informada</option>
            {Object.entries(SOW_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {withStatus && (
          <Field label="Situação inicial">
            <select name="status" className={selectCls} defaultValue="vazia">
              {["vazia", "coberta", "gestante", "lactante"].map((k) => (
                <option key={k} value={k}>
                  {SOW_STATUS[k]?.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Section>
      <Section title="Origem e genealogia">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nascimento">
            <Input
              name="birth_date"
              type="date"
              max={todayISO()}
              defaultValue={d(sow?.birth_date)}
              className="h-11"
            />
          </Field>
          <Field label="Entrada na granja">
            <Input
              name="entry_date"
              type="date"
              max={todayISO()}
              defaultValue={d(sow?.entry_date)}
              className="h-11"
            />
          </Field>
        </div>
        <Field label="Origem (granja, fornecedor ou nascida aqui)">
          <Input name="origin" defaultValue={d(sow?.origin)} className="h-11" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pai (identificação)">
            <Input name="sire" defaultValue={d(sow?.sire)} className="h-11" />
          </Field>
          <Field label="Mãe (identificação)">
            <Input name="dam" defaultValue={d(sow?.dam)} className="h-11" />
          </Field>
        </div>
      </Section>
      <Section title="Localização e condição">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Baia">
            <select name="pen_id" className={selectCls} defaultValue={d(sow?.pen_id)}>
              <option value="">Sem baia vinculada</option>
              {(pens.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.sector}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lote / grupo">
            <Input name="group_label" defaultValue={d(sow?.group_label)} className="h-11" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Peso (kg)">
            <Input
              name="weight_kg"
              inputMode="decimal"
              defaultValue={d(sow?.weight_kg)}
              placeholder="Só se pesada"
              className="h-11"
            />
          </Field>
          <Field label="Data da pesagem">
            <Input
              name="weight_date"
              type="date"
              max={todayISO()}
              defaultValue={d(sow?.weight_date)}
              className="h-11"
            />
          </Field>
        </div>
        <Field label="Condição sanitária">
          <select name="condition" className={selectCls} defaultValue={d(sow?.condition)}>
            <option value="">Normal / não informada</option>
            {Object.entries(SOW_CONDITION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </Section>
      <Field label="Observações do cadastro">
        <Textarea name="notes" defaultValue={d(sow?.notes)} rows={3} />
      </Field>
    </div>
  );
}

/** Valida no cliente com as mesmas regras do banco e grava. */
async function saveSow(f: FormData, sow?: Sow) {
  const payload = readSowForm(f);
  const err = validateSowForm(payload, todayISO());
  if (err) return err;
  if (sow) {
    const { error } = await supabase.from("sows").update(payload).eq("id", sow.id);
    return error?.message ?? null;
  }
  const { error } = await supabase
    .from("sows")
    .insert({ ...payload, status: String(f.get("status") ?? "vazia") });
  return error?.message ?? null;
}

export function SowFormDialog({
  sow,
  trigger,
  onDone,
}: {
  sow?: Sow;
  trigger: ReactNode;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title={sow ? `Editar cadastro · ${sow.ear_tag}` : "Nova matriz"} trigger={trigger}>
      {(close) => (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const error = await saveSow(new FormData(e.currentTarget), sow);
            setBusy(false);
            if (error) {
              toast.error(error);
              return;
            }
            toast.success(sow ? "Cadastro atualizado" : "Matriz cadastrada");
            onDone();
            close();
          }}
        >
          <SowFormFields {...(sow ? { sow } : {})} withStatus={!sow} />
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}
