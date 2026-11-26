import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  boarsQuery,
  feedPlansQuery,
  feedProductsQuery,
  fmtDate,
  heatDetectionsQuery,
  semenBatchesQuery,
  sowConditionQuery,
  suppliersQuery,
  todayISO,
  type FeedPlan,
  type Sow,
} from "@/lib/farm";
import {
  FEED_PLAN_CATEGORY,
  heatDurationHours,
  SEMEN_STATE_LABEL,
  semenState,
  validateCondition,
} from "@/lib/farm/repro-extras";
import { usePermissions } from "@/lib/access";

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const num = (f: FormData, k: string) => {
  const v = txt(f, k);
  return v === null ? null : Number(v.replace(",", "."));
};
const dt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
/** Valor para input datetime-local no fuso do aparelho. */
const localInput = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// ---------------------------------------------------------------- Sêmen
export function SemenBatches() {
  const batches = useQuery({ ...semenBatchesQuery, retry: false });
  const boars = useQuery(boarsQuery);
  const today = todayISO();
  const boarName = new Map(
    (boars.data ?? []).map((b) => [b.id, `${b.code}${b.name ? ` · ${b.name}` : ""}`]),
  );
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle kicker="Reprodução" title="Lotes de sêmen" />
        <NewSemenBatch />
      </div>
      <p className="text-xs text-muted-foreground">
        As doses do lote diminuem quando uma cobertura usa o lote; o banco recusa lote vencido ou
        sem doses. Corrigir a cobertura devolve as doses.
      </p>
      {batches.isError ? (
        <Empty>Lotes de sêmen indisponíveis: aplique a migration 0021 no banco.</Empty>
      ) : (batches.data ?? []).length === 0 ? (
        <Empty>Nenhum lote de sêmen cadastrado.</Empty>
      ) : (
        <div className="panel overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                {[
                  "Lote",
                  "Reprodutor",
                  "Coleta",
                  "Validade",
                  "Doses",
                  "Situação",
                  "Armazenamento",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(batches.data ?? []).map((b) => {
                const st = semenState(b, today);
                return (
                  <tr key={b.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-mono font-semibold">{b.code}</td>
                    <td className="px-3 py-2">
                      {b.boar_id ? boarName.get(b.boar_id) : (b.boar_description ?? "—")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{fmtDate(b.collection_date)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmtDate(b.expiry_date)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {b.doses_available} / {b.doses_received}
                    </td>
                    <td
                      className={`px-3 py-2 ${st === "ok" ? "" : st === "acabando" || st === "vence_logo" ? "text-warn" : "text-destructive"}`}
                    >
                      {SEMEN_STATE_LABEL[st]}
                    </td>
                    <td className="px-3 py-2 text-xs">{b.storage ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function NewSemenBatch() {
  const qc = useQueryClient();
  const perms = usePermissions();
  const boars = useQuery(boarsQuery);
  const suppliers = useQuery(suppliersQuery);
  const [busy, setBusy] = useState(false);
  if (!perms?.canWrite) return null;
  return (
    <FormDialog
      title="Novo lote de sêmen"
      trigger={
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Novo lote
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const doses = Number(f.get("doses"));
            if (!Number.isInteger(doses) || doses < 1) {
              toast.error("Informe a quantidade de doses.");
              return;
            }
            setBusy(true);
            const { error } = await supabase
              .from("semen_batches")
              .insert({
                code: String(f.get("code")).trim(),
                boar_id: txt(f, "boar_id"),
                boar_description: txt(f, "boar_description"),
                supplier_id: txt(f, "supplier_id"),
                collection_date: txt(f, "collection"),
                received_date: String(f.get("received")),
                expiry_date: txt(f, "expiry"),
                doses_received: doses,
                doses_available: doses,
                storage: txt(f, "storage"),
                notes: txt(f, "notes"),
              });
            setBusy(false);
            if (error) {
              toast.error(
                error.message.includes("unique")
                  ? "Já existe lote com esse código."
                  : error.message,
              );
              return;
            }
            toast.success("Lote de sêmen cadastrado.");
            await qc.invalidateQueries({ queryKey: ["semen_batches"] });
            close();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código do lote *">
              <Input name="code" required className="h-11" />
            </Field>
            <Field label="Doses recebidas *">
              <Input name="doses" type="number" min={1} required className="h-11" />
            </Field>
            <Field label="Reprodutor cadastrado">
              <select name="boar_id" className={selectCls} defaultValue="">
                <option value="">—</option>
                {(boars.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                    {b.name ? ` · ${b.name}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ou identificação do reprodutor">
              <Input name="boar_description" className="h-11" />
            </Field>
            <Field label="Data da coleta">
              <Input name="collection" type="date" max={todayISO()} className="h-11" />
            </Field>
            <Field label="Recebido em">
              <Input
                name="received"
                type="date"
                defaultValue={todayISO()}
                max={todayISO()}
                required
                className="h-11"
              />
            </Field>
            <Field label="Validade">
              <Input name="expiry" type="date" className="h-11" />
            </Field>
            <Field label="Fornecedor / central">
              <select name="supplier_id" className={selectCls} defaultValue="">
                <option value="">—</option>
                {(suppliers.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Armazenamento (ex.: conservadora a 15–18 °C)">
            <Input name="storage" className="h-11" />
          </Field>
          <Field label="Observações">
            <Textarea name="notes" rows={2} />
          </Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}

/** Campos de lote de sêmen dentro do formulário de cobertura. */
export function SemenBatchFields() {
  const batches = useQuery({ ...semenBatchesQuery, retry: false });
  const today = todayISO();
  const usable = (batches.data ?? []).filter((b) => {
    const s = semenState(b, today);
    return s !== "vencido" && s !== "sem_doses";
  });
  if (batches.isError || usable.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Lote de sêmen (controle de doses)">
        <select name="semen_batch_id" className={selectCls} defaultValue="">
          <option value="">Não usar lote cadastrado</option>
          {usable.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} · {b.doses_available} dose(s)
              {b.expiry_date ? ` · vence ${fmtDate(b.expiry_date)}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Doses usadas">
        <Input
          name="semen_doses_used"
          type="number"
          min={1}
          max={10}
          defaultValue={1}
          className="h-11"
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------- Cio
export function HeatDetections({ sows }: { sows: Sow[] }) {
  const heats = useQuery({ ...heatDetectionsQuery, retry: false });
  const tag = new Map(sows.map((s) => [s.id, s.ear_tag]));
  const open = (heats.data ?? []).filter((h) => !h.ended_at);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle kicker="Reprodução" title="Observação de cio" />
        <NewHeat sows={sows} />
      </div>
      <p className="text-xs text-muted-foreground">
        Registre quando o cio começou e terminou. Cios em aberto aparecem primeiro para registrar o
        término.
      </p>
      {heats.isError ? (
        <Empty>Observações de cio indisponíveis: aplique a migration 0021 no banco.</Empty>
      ) : (heats.data ?? []).length === 0 ? (
        <Empty>Nenhum cio registrado.</Empty>
      ) : (
        <ul className="space-y-2">
          {[...open, ...(heats.data ?? []).filter((h) => h.ended_at)].slice(0, 60).map((h) => {
            const dur = heatDurationHours(h.started_at, h.ended_at);
            return (
              <li
                key={h.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm ${h.ended_at ? "border-border/70" : "border-primary/40 bg-primary/5"}`}
              >
                <span className="font-mono font-semibold">{tag.get(h.sow_id) ?? "?"}</span>
                <span className="text-xs">
                  Início {dt(h.started_at)}
                  {h.ended_at ? ` · término ${dt(h.ended_at)}` : " · em andamento"}
                </span>
                {dur !== null && <span className="text-xs text-muted-foreground">{dur} h</span>}
                {h.intensity && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{h.intensity}</span>
                )}
                {h.signs.length > 0 && (
                  <span className="text-xs text-muted-foreground">{h.signs.join(", ")}</span>
                )}
                {!h.ended_at && <EndHeat id={h.id} startedAt={h.started_at} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const SIGNS = [
  "Reflexo de imobilidade",
  "Vulva avermelhada/inchada",
  "Muco vulvar",
  "Inquietação",
  "Orelhas eretas",
  "Aceita o macho",
];

function NewHeat({ sows }: { sows: Sow[] }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const [busy, setBusy] = useState(false);
  if (!perms?.canWrite) return null;
  const eligible = sows.filter(
    (s) => !s.archived_at && !["morta", "descartada", "transferida"].includes(s.status),
  );
  return (
    <FormDialog
      title="Registrar cio"
      trigger={
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Registrar cio
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const start = new Date(String(f.get("start")));
            const endRaw = txt(f, "end");
            const end = endRaw ? new Date(endRaw) : null;
            if (start.getTime() > Date.now() + 3600_000) {
              toast.error("O início não pode estar no futuro.");
              return;
            }
            if (end && end < start) {
              toast.error("O término deve ser depois do início.");
              return;
            }
            setBusy(true);
            const { error } = await supabase
              .from("heat_detections")
              .insert({
                sow_id: String(f.get("sow")),
                started_at: start.toISOString(),
                ended_at: end ? end.toISOString() : null,
                intensity: txt(f, "intensity"),
                signs: f.getAll("signs").map(String),
                detected_by: txt(f, "by"),
                notes: txt(f, "notes"),
              });
            setBusy(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Cio registrado.");
            await qc.invalidateQueries({ queryKey: ["heat_detections"] });
            close();
          }}
        >
          <Field label="Matriz *">
            <select name="sow" className={selectCls} required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {eligible.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ear_tag}
                  {s.name ? ` · ${s.name}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início *">
              <Input
                name="start"
                type="datetime-local"
                defaultValue={localInput()}
                required
                className="h-11"
              />
            </Field>
            <Field label="Término (se já terminou)">
              <Input name="end" type="datetime-local" className="h-11" />
            </Field>
            <Field label="Intensidade">
              <select name="intensity" className={selectCls} defaultValue="">
                <option value="">Não avaliada</option>
                <option value="fraco">Fraco</option>
                <option value="moderado">Moderado</option>
                <option value="forte">Forte</option>
              </select>
            </Field>
            <Field label="Observado por">
              <Input name="by" className="h-11" />
            </Field>
          </div>
          <fieldset className="grid grid-cols-2 gap-1 text-sm">
            <legend className="mb-1 text-xs font-semibold text-muted-foreground">
              Sinais observados
            </legend>
            {SIGNS.map((s) => (
              <label key={s} className="flex items-center gap-2">
                <input type="checkbox" name="signs" value={s} className="h-4 w-4" />
                {s}
              </label>
            ))}
          </fieldset>
          <Field label="Observações">
            <Textarea name="notes" rows={2} />
          </Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}

function EndHeat({ id, startedAt }: { id: string; startedAt: string }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const [busy, setBusy] = useState(false);
  if (!perms?.canWrite) return null;
  return (
    <FormDialog
      title="Registrar término do cio"
      trigger={
        <Button size="sm" variant="outline" className="ml-auto">
          Registrar término
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const end = new Date(String(new FormData(e.currentTarget).get("end")));
            if (end < new Date(startedAt)) {
              toast.error("O término deve ser depois do início.");
              return;
            }
            setBusy(true);
            const { error } = await supabase
              .from("heat_detections")
              .update({ ended_at: end.toISOString() })
              .eq("id", id);
            setBusy(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Término registrado.");
            await qc.invalidateQueries({ queryKey: ["heat_detections"] });
            close();
          }}
        >
          <p className="text-sm text-muted-foreground">Início: {dt(startedAt)}</p>
          <Field label="Término">
            <Input
              name="end"
              type="datetime-local"
              defaultValue={localInput()}
              required
              className="h-11"
            />
          </Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------- Condição corporal (ficha)
export function SowConditionSection({ sow }: { sow: Sow }) {
  const records = useQuery({ ...sowConditionQuery, retry: false });
  const feeds = useQuery(feedProductsQuery);
  const feedName = new Map((feeds.data ?? []).map((f) => [f.id, f.name]));
  const list = (records.data ?? []).filter((r) => r.sow_id === sow.id);
  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle kicker="Gestação e nutrição" title="Condição corporal e alimentação" />
        <NewCondition sow={sow} />
      </div>
      {records.isError ? (
        <Empty>Indisponível: aplique a migration 0021 no banco.</Empty>
      ) : list.length === 0 ? (
        <Empty>Nenhuma avaliação de condição corporal ou alimentação registrada.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                {[
                  "Data",
                  "Escore (1–5)",
                  "Toucinho (mm)",
                  "Ração",
                  "kg/dia",
                  "Responsável",
                  "Obs.",
                ].map((h) => (
                  <th key={h} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-2 py-1.5 font-mono text-xs">{fmtDate(r.record_date)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.body_condition_score ?? "—"}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.backfat_mm ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    {r.feed_product_id ? feedName.get(r.feed_product_id) : "—"}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{r.feed_kg_day ?? "—"}</td>
                  <td className="px-2 py-1.5">{r.responsible ?? "—"}</td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Registre o que foi avaliado e fornecido. Metas de escore e quantidade dependem do plano
        validado pelo responsável técnico (Estoque de ração › Planos).
      </p>
    </section>
  );
}

function NewCondition({ sow }: { sow: Sow }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const feeds = useQuery(feedProductsQuery);
  const [busy, setBusy] = useState(false);
  if (!perms?.canWrite) return null;
  return (
    <FormDialog
      title={`Condição e alimentação · ${sow.ear_tag}`}
      trigger={
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Registrar
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const row = {
              body_condition_score: num(f, "score"),
              backfat_mm: num(f, "backfat"),
              feed_kg_day: num(f, "kg"),
              notes: txt(f, "notes"),
            };
            const err = validateCondition(row);
            if (err) {
              toast.error(err);
              return;
            }
            setBusy(true);
            const { error } = await supabase
              .from("sow_condition_records")
              .insert({
                sow_id: sow.id,
                record_date: String(f.get("date")),
                feed_product_id: txt(f, "feed"),
                responsible: txt(f, "responsible"),
                ...row,
              });
            setBusy(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Registro salvo.");
            await qc.invalidateQueries({ queryKey: ["sow_condition_records"] });
            close();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input
                name="date"
                type="date"
                defaultValue={todayISO()}
                max={todayISO()}
                required
                className="h-11"
              />
            </Field>
            <Field label="Escore corporal (1 a 5)">
              <select name="score" className={selectCls} defaultValue="">
                <option value="">Não avaliado</option>
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((v) => (
                  <option key={v} value={v}>
                    {String(v).replace(".", ",")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Espessura de toucinho (mm)">
              <Input name="backfat" inputMode="decimal" placeholder="Se medido" className="h-11" />
            </Field>
            <Field label="Ração fornecida">
              <select name="feed" className={selectCls} defaultValue="">
                <option value="">Não informada</option>
                {(feeds.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantidade (kg/dia)">
              <Input name="kg" inputMode="decimal" className="h-11" />
            </Field>
            <Field label="Responsável">
              <Input name="responsible" className="h-11" />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea name="notes" rows={2} />
          </Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------- Planos de alimentação
export function FeedPlans() {
  const plans = useQuery({ ...feedPlansQuery, retry: false });
  const feeds = useQuery(feedProductsQuery);
  const perms = usePermissions();
  const feedName = new Map((feeds.data ?? []).map((f) => [f.id, f.name]));
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-bold">Planos de alimentação por fase</h3>
        {perms?.canManageHealth && <FeedPlanDialog />}
      </div>
      <p className="text-xs text-muted-foreground">
        O sistema não traz quantidades prontas. Cada plano é escrito e validado pelo responsável
        técnico (nome e registro); só planos validados aparecem como vigentes. Mudar a ração ou a
        quantidade exige nova validação.
      </p>
      {plans.isError ? (
        <Empty>Planos indisponíveis: aplique a migration 0021 no banco.</Empty>
      ) : (plans.data ?? []).length === 0 ? (
        <Empty>Nenhum plano cadastrado.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(plans.data ?? []).map((p) => (
            <div key={p.id} className={`panel p-4 text-sm ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {FEED_PLAN_CATEGORY[p.category]}
                    {p.day_from !== null || p.day_to !== null
                      ? ` · dia ${p.day_from ?? 0} a ${p.day_to ?? "fim"}`
                      : ""}
                  </p>
                </div>
                {p.validated_at ? (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[.68rem] font-semibold text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Vigente
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-warn/15 px-2 py-1 text-[.68rem] font-semibold text-warn">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Aguardando validação
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs">
                <b>Ração:</b> {p.feed_product_id ? feedName.get(p.feed_product_id) : "—"} ·{" "}
                <b>Quantidade:</b>{" "}
                {p.kg_per_animal_day
                  ? `${String(p.kg_per_animal_day).replace(".", ",")} kg/animal/dia`
                  : "—"}
              </p>
              {p.validated_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Validado por {p.validated_by_name} em {fmtDate(p.validated_at)}
                </p>
              )}
              {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
              {perms?.canManageHealth && (
                <div className="mt-3">
                  <FeedPlanDialog plan={p} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FeedPlanDialog({ plan }: { plan?: FeedPlan }) {
  const qc = useQueryClient();
  const feeds = useQuery(feedProductsQuery);
  const [busy, setBusy] = useState(false);
  const d = (v: string | number | null | undefined) =>
    v === null || v === undefined ? "" : String(v);
  return (
    <FormDialog
      title={plan ? `Plano · ${plan.name}` : "Novo plano de alimentação"}
      trigger={
        plan ? (
          <Button size="sm" variant="outline">
            Editar / validar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Novo plano
          </Button>
        )
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const from = num(f, "from"),
              to = num(f, "to"),
              kg = num(f, "kg");
            if (from !== null && to !== null && to < from) {
              toast.error("O dia final deve ser maior que o inicial.");
              return;
            }
            if (kg !== null && !(kg > 0 && kg < 20)) {
              toast.error("Quantidade entre 0 e 20 kg/animal/dia.");
              return;
            }
            const validate = f.get("validate") === "on";
            const validator = txt(f, "validator");
            if (validate && (!validator || validator.length < 3)) {
              toast.error("Informe nome e registro de quem validou.");
              return;
            }
            const payload = {
              name: String(f.get("name")).trim(),
              category: String(f.get("category")),
              day_from: from,
              day_to: to,
              feed_product_id: txt(f, "feed"),
              kg_per_animal_day: kg,
              notes: txt(f, "notes"),
              active: f.get("active") !== "off",
              ...(validate ? { validated_by_name: validator, validated_at: todayISO() } : {}),
            };
            setBusy(true);
            const { error } = plan
              ? await supabase.from("feed_plans").update(payload).eq("id", plan.id)
              : await supabase.from("feed_plans").insert(payload);
            setBusy(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success(
              validate
                ? "Plano salvo e validado."
                : "Plano salvo; fica vigente depois de validado.",
            );
            await qc.invalidateQueries({ queryKey: ["feed_plans"] });
            close();
          }}
        >
          <Field label="Nome *">
            <Input
              name="name"
              required
              minLength={3}
              defaultValue={d(plan?.name)}
              className="h-11"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fase / categoria">
              <select
                name="category"
                className={selectCls}
                defaultValue={plan?.category ?? "gestacao"}
              >
                {Object.entries(FEED_PLAN_CATEGORY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Situação">
              <select
                name="active"
                className={selectCls}
                defaultValue={plan?.active === false ? "off" : "on"}
              >
                <option value="on">Ativo</option>
                <option value="off">Inativo</option>
              </select>
            </Field>
            <Field label="Do dia (da fase)">
              <Input
                name="from"
                type="number"
                min={0}
                defaultValue={d(plan?.day_from)}
                className="h-11"
              />
            </Field>
            <Field label="Até o dia">
              <Input
                name="to"
                type="number"
                min={0}
                defaultValue={d(plan?.day_to)}
                className="h-11"
              />
            </Field>
            <Field label="Ração">
              <select name="feed" className={selectCls} defaultValue={d(plan?.feed_product_id)}>
                <option value="">—</option>
                {(feeds.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="kg por animal por dia">
              <Input
                name="kg"
                inputMode="decimal"
                defaultValue={d(plan?.kg_per_animal_day)}
                className="h-11"
              />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea name="notes" rows={2} defaultValue={d(plan?.notes)} />
          </Field>
          <div className="space-y-2 rounded-xl border border-border/70 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="validate" className="h-4 w-4" />
              Validar agora (responsável técnico)
            </label>
            <Field label="Nome e registro profissional">
              <Input
                name="validator"
                placeholder="Ex.: Nome — CRMV/CRZ-UF 0000"
                defaultValue={d(plan?.validated_by_name)}
                className="h-11"
              />
            </Field>
          </div>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}
