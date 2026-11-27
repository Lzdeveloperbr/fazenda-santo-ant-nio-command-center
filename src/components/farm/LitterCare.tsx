import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDot, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty } from "@/components/farm/Kpi";
import { Field, FormDialog, SubmitRow } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fmtDate,
  healthProtocolsQuery,
  litterHealthQuery,
  littersQuery,
  livePiglets,
  pigletsQuery,
  sowsQuery,
  todayISO,
  type Litter,
} from "@/lib/farm";
import {
  LITTER_LABEL,
  litterCell,
  litterColumns,
  type LitterCell,
  type LitterColumn,
  type LitterState,
} from "@/lib/farm/litter-care";
import { norm } from "@/lib/farm/vaccine-map";
import { usePermissions } from "@/lib/access";

const TONE: Record<LitterState, string> = {
  atrasada: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  hoje: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  parcial: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  programada: "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-300",
  feito: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
};
const ICON: Record<LitterState, typeof Clock> = {
  atrasada: AlertTriangle,
  hoje: Clock,
  parcial: CircleDot,
  programada: CalendarClock,
  feito: CheckCircle2,
};
const errMsg = (e: unknown) =>
  e && typeof e === "object" && "message" in e
    ? String((e as { message: string }).message)
    : "Não foi possível salvar.";
const daysSince = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** Leitegadas na maternidade × protocolos dos leitões (ferro, vacinas, manejos). */
export function LitterCareMap() {
  const today = todayISO();
  const perms = usePermissions();
  const protos = useQuery(healthProtocolsQuery),
    litters = useQuery(littersQuery),
    sows = useQuery(sowsQuery);
  const health = useQuery(litterHealthQuery),
    piglets = useQuery(pigletsQuery);
  const cols = useMemo(() => litterColumns(protos.data ?? []), [protos.data]);
  const names = useMemo(
    () =>
      new Map(
        cols.map((c) => {
          const p = (protos.data ?? []).find((x) => x.id === c.id);
          return [c.id, new Set([p?.name, p?.product].filter((x): x is string => !!x).map(norm))];
        }),
      ),
    [cols, protos.data],
  );
  const tag = useMemo(() => new Map((sows.data ?? []).map((s) => [s.id, s.ear_tag])), [sows.data]);
  const nursing = (litters.data ?? [])
    .filter((l) => l.status === "maternidade")
    .sort((a, b) => a.farrowing_date.localeCompare(b.farrowing_date));
  const data = {
    vacs: health.data?.vacs ?? [],
    meds: health.data?.meds ?? [],
    piglets: piglets.data ?? [],
  };
  const rows = nursing.map((l) => ({
    l,
    cells: cols.map((c) => litterCell(c, names.get(c.id)!, l, data, today)),
  }));
  const late = rows.filter((r) => r.cells.some((c) => c.state === "atrasada")).length;
  const todayN = rows.filter((r) => r.cells.some((c) => c.state === "hoje")).length;

  if ([protos, litters, health, piglets].some((q) => q.isLoading))
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!cols.length)
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <p className="font-semibold">Nenhum protocolo para leitegada cadastrado.</p>
        <p className="mt-1 text-muted-foreground">
          O veterinário cadastra em{" "}
          <Link to="/agenda" className="font-semibold underline">
            Agenda › Protocolos sanitários
          </Link>
          : alvo "leitegada", a partir do parto, com os dias (ex.: ferro no 3º dia). Depois o mapa
          mostra cada leitegada.
        </p>
      </div>
    );
  if (!rows.length) return <Empty>Nenhuma leitegada na maternidade agora.</Empty>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-xl border p-3 ${TONE.atrasada}`}>
          <p className="text-2xl font-bold">{late}</p>
          <p className="text-xs font-semibold">Leitegadas com manejo atrasado</p>
        </div>
        <div className={`rounded-xl border p-3 ${TONE.hoje}`}>
          <p className="text-2xl font-bold">{todayN}</p>
          <p className="text-xs font-semibold">Com manejo para hoje</p>
        </div>
      </div>
      <ul className="space-y-3">
        {rows.map(({ l, cells }) => (
          <li key={l.id} className="panel space-y-2 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p>
                <span className="font-mono text-lg font-bold">{tag.get(l.sow_id) ?? "?"}</span>{" "}
                <span className="text-sm text-muted-foreground">
                  · parto {fmtDate(l.farrowing_date)} · {daysSince(l.farrowing_date, today)} dias
                </span>
              </p>
              <span className="text-sm font-semibold">{livePiglets(l)} leitões vivos</span>
            </div>
            <ul className="space-y-1.5">
              {cols.map((c, i) => {
                const cell = cells[i]!;
                const I = ICON[cell.state];
                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${TONE[cell.state]}`}
                  >
                    <I className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {c.name} <span className="font-normal">· dia {c.offset}</span>
                      </span>
                      <span>
                        {LITTER_LABEL[cell.state]}
                        {cell.state === "parcial"
                          ? ` (${cell.done} de ${cell.total} leitões identificados)`
                          : ""}
                        {cell.doneOn
                          ? ` em ${fmtDate(cell.doneOn)}`
                          : ` · previsto ${fmtDate(cell.due)}`}
                      </span>
                    </span>
                    {perms?.canWrite && cell.state !== "feito" && c.kind !== "medicacao" && (
                      <RegisterLitterCare
                        litter={l}
                        col={c}
                        cell={cell}
                        sowTag={tag.get(l.sow_id) ?? ""}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-5 text-muted-foreground">
        Dias contados a partir do parto, pelo protocolo do veterinário. Medicação (antibiótico etc.)
        se registra em Saúde, com receita. O sistema não indica produto nem dose.
      </p>
    </div>
  );
}

function RegisterLitterCare({
  litter,
  col,
  cell,
  sowTag,
}: {
  litter: Litter;
  col: LitterColumn;
  cell: LitterCell;
  sowTag: string;
}) {
  const qc = useQueryClient();
  const today = todayISO();
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>, close: () => void) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date"));
    if (!date || date > today || date < litter.farrowing_date) {
      toast.error("Data entre o parto e hoje.");
      return;
    }
    const n = Number(fd.get("n") || 0);
    const t = (k: string) => String(fd.get(k) ?? "").trim() || null;
    setBusy(true);
    const res =
      col.kind === "vacina"
        ? await supabase.from("vaccination_records").insert({
            animal_scope: "leitegada",
            sow_id: litter.sow_id,
            litter_id: litter.id,
            target_group: "Leitegada",
            vaccine_name: col.name,
            vaccination_date: date,
            animals_planned: n,
            animals_vaccinated: n,
            batch: t("batch"),
            manufacturer: t("manufacturer"),
            protocol_reference: col.name,
            responsible: t("responsible"),
            notes: t("notes"),
          })
        : await supabase.from("medication_records").insert({
            animal_scope: "leitegada",
            sow_id: litter.sow_id,
            litter_id: litter.id,
            product_name: col.name,
            administration_start: date,
            animals_treated: n,
            batch: t("batch"),
            dose_as_prescribed: col.doseInstructions,
            responsible: t("responsible"),
            notes: [`Protocolo: ${col.name}`, t("notes")].filter(Boolean).join(" · "),
          });
    if (!res.error && col.kind === "ferro" && fd.get("pigs") === "on") {
      const r2 = await supabase
        .from("piglet_identifications")
        .update({ iron_date: date })
        .eq("litter_id", litter.id)
        .eq("status", "ativo")
        .is("iron_date", null);
      if (r2.error) toast.error(`Registrado, mas não marcou os leitões: ${errMsg(r2.error)}`);
    }
    setBusy(false);
    if (res.error) {
      toast.error(errMsg(res.error));
      return;
    }
    toast.success(`${col.name} registrado na leitegada da ${sowTag}.`);
    void qc.invalidateQueries({ queryKey: ["vaccination_records"] });
    void qc.invalidateQueries({ queryKey: ["piglet_identifications"] });
    close();
  }
  return (
    <FormDialog
      title={`${col.name} · leitegada da ${sowTag}`}
      trigger={
        <Button size="sm" variant="outline" className="h-8 shrink-0 bg-card">
          Registrar
        </Button>
      }
    >
      {(close) => (
        <form className="space-y-3" onSubmit={(e) => void save(e, close)}>
          {col.doseInstructions && (
            <p className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">
              <b>Protocolo{col.validated ? " validado" : ""}:</b> {col.doseInstructions}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input
                name="date"
                type="date"
                defaultValue={
                  cell.due <= today && cell.due >= litter.farrowing_date ? cell.due : today
                }
                min={litter.farrowing_date}
                max={today}
                className="h-11"
              />
            </Field>
            <Field label="Leitões">
              <Input
                name="n"
                type="number"
                min={0}
                defaultValue={livePiglets(litter)}
                className="h-11"
              />
            </Field>
            <Field label="Partida / lote">
              <Input name="batch" />
            </Field>
            {col.kind === "vacina" ? (
              <Field label="Fabricante">
                <Input name="manufacturer" />
              </Field>
            ) : (
              <Field label="Responsável">
                <Input name="responsible" />
              </Field>
            )}
          </div>
          {col.kind === "vacina" && (
            <Field label="Responsável">
              <Input name="responsible" />
            </Field>
          )}
          {col.kind === "ferro" && cell.total > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="pigs" defaultChecked className="h-4 w-4" />
              Marcar ferro nos {cell.total - cell.done} leitão(ões) identificados sem ferro
            </label>
          )}
          <Field label="Observações">
            <Input name="notes" />
          </Field>
          <SubmitRow busy={busy} label="Registrar" />
        </form>
      )}
    </FormDialog>
  );
}
