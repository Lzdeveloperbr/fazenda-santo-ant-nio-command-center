import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Baby, CheckCircle2, Ear, HeartHandshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Field, selectCls } from "@/components/farm/FormDialog";
import { Wizard } from "@/components/farm/Wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  boarsQuery,
  breedingsQuery,
  fmtDate,
  littersQuery,
  livePiglets,
  pensQuery,
  pigletsQuery,
  semenBatchesQuery,
  sowsQuery,
  todayISO,
} from "@/lib/farm";
import { farmSettingsQuery, DEFAULT_FARM_SETTINGS } from "@/lib/farm/farm-settings";
import { daysBetween } from "@/lib/farm/gestation";
import {
  breedingErrors,
  breedingPreview,
  farrowingErrors,
  farrowingMinutes,
  weaningAverage,
  weaningErrors,
} from "@/lib/farm/flows";
import { semenState } from "@/lib/farm/repro-extras";
import { usePermissions } from "@/lib/access";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/manejo-guiado")({
  head: () => ({
    meta: [
      { title: "Manejo guiado | Fazenda Santo Antônio" },
      {
        name: "description",
        content: "Cobertura, parto e desmame passo a passo, gravados de uma vez com validação.",
      },
    ],
  }),
  component: ManejoGuiado,
});

type Flow = "cobertura" | "parto" | "desmame";
const FLOWS: { id: Flow; title: string; text: string; icon: typeof Baby }[] = [
  {
    id: "cobertura",
    title: "Cobertura / inseminação",
    text: "Matriz, cio, sêmen, doses e responsável. Gera os lembretes de retorno ao cio e diagnóstico.",
    icon: HeartHandshake,
  },
  {
    id: "parto",
    title: "Parto",
    text: "Nascidos vivos, natimortos, mumificados, cuidados iniciais e prontuário dos leitões.",
    icon: Baby,
  },
  {
    id: "desmame",
    title: "Desmame",
    text: "Quantidade, sexo, pesos e destino. Encerra a leitegada e atualiza a matriz.",
    icon: Ear,
  },
];
const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const errMsg = (e: unknown) => friendlyError(e);

function ManejoGuiado() {
  const perms = usePermissions();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [done, setDone] = useState<{ title: string; lines: string[] } | null>(null);
  if (perms && !perms.canWrite) return <Empty>Seu perfil é somente leitura.</Empty>;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionTitle kicker="Rebanho" title="Manejo guiado" />
      {done ? (
        <div className="panel space-y-4 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h2 className="text-xl font-bold">{done.title}</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {done.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                setDone(null);
                setFlow(null);
              }}
            >
              Novo manejo
            </Button>
            <Link to="/agenda">
              <Button variant="outline">Ver na agenda</Button>
            </Link>
          </div>
        </div>
      ) : !flow ? (
        <>
          <p className="text-sm text-muted-foreground">
            Escolha o manejo. Cada etapa é conferida antes de seguir, e tudo é gravado de uma vez no
            final: se algo der errado, nada fica pela metade.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {FLOWS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFlow(f.id)}
                className="panel flex flex-col items-start gap-3 p-5 text-left"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <span className="font-bold">{f.title}</span>
                <span className="text-xs leading-5 text-muted-foreground">{f.text}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={() => setFlow(null)}>
            ← Trocar manejo
          </Button>
          {flow === "cobertura" && <BreedingFlow onDone={setDone} />}
          {flow === "parto" && <FarrowingFlow onDone={setDone} />}
          {flow === "desmame" && <WeaningFlow onDone={setDone} />}
        </>
      )}
    </div>
  );
}

type DoneFn = (d: { title: string; lines: string[] }) => void;

function BreedingFlow({ onDone }: { onDone: DoneFn }) {
  const qc = useQueryClient();
  const today = todayISO();
  const sows = useQuery(sowsQuery),
    boars = useQuery(boarsQuery),
    semen = useQuery({ ...semenBatchesQuery, retry: false }),
    settings = useQuery(farmSettingsQuery);
  const cfg = settings.data ?? DEFAULT_FARM_SETTINGS;
  const [f, setF] = useState({
    sowId: "",
    date: today,
    time: "",
    type: "inseminacao",
    boarId: "",
    boar: "",
    semenBatchId: "",
    doses: "1",
    heat: "",
    responsible: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligible = (sows.data ?? []).filter((s) => ["vazia", "coberta"].includes(s.status));
  const sow = eligible.find((s) => s.id === f.sowId);
  const form = {
    sowId: f.sowId,
    sowStatus: sow?.status ?? null,
    date: f.date,
    type: f.type,
    semenBatchId: f.semenBatchId,
    doses: num(f.doses),
    heatStartedAt: f.heat,
  };
  const prev = breedingPreview(f.date || today, {
    heatStart: cfg.gestation.heatStart,
    gestationDays: cfg.gestation.gestationDays,
    diagnosisDay: cfg.diagnosisDay,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  async function finish() {
    const err = breedingErrors(form, today);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("flow_register_breeding", {
      p_sow_id: f.sowId,
      p_date: f.date,
      p_time: f.time || null,
      p_type: f.type,
      p_boar_id: f.boarId || null,
      p_boar: f.boar || null,
      p_semen_batch_id: f.semenBatchId || null,
      p_doses: f.semenBatchId ? num(f.doses) : null,
      p_responsible: f.responsible || null,
      p_heat_started_at: f.heat ? new Date(f.heat).toISOString() : null,
      p_notes: f.notes || null,
    });
    setBusy(false);
    if (e) {
      setError(errMsg(e));
      return;
    }
    await qc.invalidateQueries();
    toast.success("Cobertura registrada.");
    onDone({
      title: `Cobertura de ${sow?.ear_tag} registrada`,
      lines: [
        `Observar retorno ao cio a partir de ${fmtDate(prev.heatCheck)}`,
        prev.diagnosis
          ? `Diagnóstico previsto em ${fmtDate(prev.diagnosis)}`
          : "Diagnóstico: configure o prazo em Gestação › Configurações para gerar o lembrete",
        `Parto previsto (estimativa) em ${fmtDate(prev.farrowing)}`,
      ],
    });
  }
  return (
    <Wizard
      busy={busy}
      error={error}
      finishLabel="Registrar cobertura"
      onFinish={finish}
      steps={[
        {
          title: "Matriz",
          validate: () => (f.sowId ? null : "Escolha a matriz."),
          content: (
            <Field label="Matriz (vazias ou cobertas) *">
              <select className={selectCls} value={f.sowId} onChange={set("sowId")}>
                <option value="">Selecione…</option>
                {eligible.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ear_tag}
                    {s.name ? ` · ${s.name}` : ""} — {s.status}
                  </option>
                ))}
              </select>
            </Field>
          ),
        },
        {
          title: "Cio",
          validate: () =>
            f.heat && f.heat.slice(0, 10) > f.date
              ? "O cio não pode começar depois da cobertura."
              : null,
          content: (
            <Field label="Início do cio observado (opcional)">
              <Input type="datetime-local" value={f.heat} onChange={set("heat")} className="h-12" />
            </Field>
          ),
        },
        {
          title: "Sêmen e reprodutor",
          validate: () => breedingErrors(form, today),
          content: (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data *">
                <Input
                  type="date"
                  max={today}
                  value={f.date}
                  onChange={set("date")}
                  className="h-12"
                />
              </Field>
              <Field label="Horário">
                <Input type="time" value={f.time} onChange={set("time")} className="h-12" />
              </Field>
              <Field label="Tipo">
                <select className={selectCls} value={f.type} onChange={set("type")}>
                  <option value="inseminacao">Inseminação artificial</option>
                  <option value="reinseminacao">Reinseminação</option>
                  <option value="monta_natural">Monta natural</option>
                  <option value="complementar">Complementar</option>
                </select>
              </Field>
              <Field label="Reprodutor cadastrado">
                <select className={selectCls} value={f.boarId} onChange={set("boarId")}>
                  <option value="">—</option>
                  {(boars.data ?? [])
                    .filter((b) => b.status === "ativo")
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                        {b.name ? ` · ${b.name}` : ""}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Ou identificação livre">
                <Input value={f.boar} onChange={set("boar")} className="h-12" />
              </Field>
              <Field label="Lote de sêmen">
                <select className={selectCls} value={f.semenBatchId} onChange={set("semenBatchId")}>
                  <option value="">Não usar lote cadastrado</option>
                  {(semen.data ?? [])
                    .filter((b) => !["vencido", "sem_doses"].includes(semenState(b, today)))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} · {b.doses_available} dose(s)
                      </option>
                    ))}
                </select>
              </Field>
              {f.semenBatchId && (
                <Field label="Doses usadas">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={f.doses}
                    onChange={set("doses")}
                    className="h-12"
                  />
                </Field>
              )}
            </div>
          ),
        },
        {
          title: "Confirmar",
          validate: () => breedingErrors(form, today),
          content: (
            <div className="space-y-3">
              <Field label="Responsável">
                <Input value={f.responsible} onChange={set("responsible")} className="h-12" />
              </Field>
              <Field label="Observações">
                <Textarea value={f.notes} onChange={set("notes")} rows={2} />
              </Field>
              <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                <dt className="text-muted-foreground">Matriz</dt>
                <dd className="font-semibold">{sow?.ear_tag ?? "—"}</dd>
                <dt className="text-muted-foreground">Observar retorno ao cio</dt>
                <dd>{fmtDate(prev.heatCheck)}</dd>
                <dt className="text-muted-foreground">Diagnóstico</dt>
                <dd>{prev.diagnosis ? fmtDate(prev.diagnosis) : "prazo não configurado"}</dd>
                <dt className="text-muted-foreground">Parto (estimativa)</dt>
                <dd>{fmtDate(prev.farrowing)}</dd>
              </dl>
            </div>
          ),
        },
      ]}
    />
  );
}

type PigRow = { sex: string; weight: string; condition: string; colostrum: string; iron: boolean };

function FarrowingFlow({ onDone }: { onDone: DoneFn }) {
  const qc = useQueryClient();
  const today = todayISO();
  const breedings = useQuery(breedingsQuery),
    sows = useQuery(sowsQuery),
    pens = useQuery(pensQuery);
  const tag = useMemo(() => new Map((sows.data ?? []).map((s) => [s.id, s.ear_tag])), [sows.data]);
  const active = (breedings.data ?? []).filter((b) => b.cycle_status === "ativo");
  const [f, setF] = useState({
    breedingId: "",
    date: today,
    start: "",
    end: "",
    responsible: "",
    penId: "",
    alive: "",
    still: "0",
    mum: "0",
    runts: "0",
    deaths: "0",
    notes: "",
    complications: [] as string[],
  });
  const [pigs, setPigs] = useState<PigRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const b = active.find((x) => x.id === f.breedingId);
  const n = (v: string) => (v.trim() === "" ? 0 : Number(v));
  const form = {
    breedingId: f.breedingId,
    breedingDate: b?.breeding_date ?? null,
    date: f.date,
    alive: n(f.alive),
    stillborn: n(f.still),
    mummified: n(f.mum),
    runts: n(f.runts),
    deathsAfter: n(f.deaths),
    piglets: pigs.length,
    start: f.start,
    end: f.end,
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const dur = farrowingMinutes(f.start, f.end);
  async function finish() {
    const err = farrowingErrors(form, today);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError(null);
    const piglets = pigs.map((p, i) => ({
      piglet_number: i + 1,
      sex: p.sex || null,
      birth_weight_kg: num(p.weight),
      birth_condition: p.condition || null,
      colostrum_checked: p.colostrum === "" ? null : p.colostrum === "sim",
      iron_date: p.iron ? f.date : null,
    }));
    const { data, error: e } = await supabase.rpc("flow_register_farrowing", {
      p_breeding_id: f.breedingId,
      p_date: f.date,
      p_start: f.start || null,
      p_end: f.end || null,
      p_responsible: f.responsible || null,
      p_alive: n(f.alive),
      p_stillborn: n(f.still),
      p_mummified: n(f.mum),
      p_runts: n(f.runts),
      p_deaths_after: n(f.deaths),
      p_pen_id: f.penId || null,
      p_complications: f.complications,
      p_notes: f.notes || null,
      p_piglets: piglets,
    });
    setBusy(false);
    if (e) {
      setError(errMsg(e));
      return;
    }
    await qc.invalidateQueries();
    toast.success("Parto registrado.");
    const res = (data ?? {}) as { weaning?: string | null; piglets?: number };
    onDone({
      title: `Parto de ${tag.get(b!.sow_id)} registrado`,
      lines: [
        `${n(f.alive) + n(f.still) + n(f.mum)} nascidos: ${n(f.alive)} vivos, ${n(f.still)} natimortos, ${n(f.mum)} mumificados`,
        `${res.piglets ?? 0} leitão(ões) com prontuário individual`,
        res.weaning
          ? `Desmame programado para ${fmtDate(res.weaning)}`
          : "Desmame: configure a idade em Gestação › Configurações para programar",
      ],
    });
  }
  return (
    <Wizard
      busy={busy}
      error={error}
      finishLabel="Registrar parto"
      onFinish={finish}
      steps={[
        {
          title: "Matriz",
          validate: () => (f.breedingId ? null : "Escolha a matriz/ciclo."),
          content:
            active.length === 0 ? (
              <Empty>Nenhum ciclo ativo. Registre a cobertura primeiro.</Empty>
            ) : (
              <Field label="Matriz e ciclo *">
                <select className={selectCls} value={f.breedingId} onChange={set("breedingId")}>
                  <option value="">Selecione…</option>
                  {active.map((x) => (
                    <option key={x.id} value={x.id}>
                      {tag.get(x.sow_id) ?? "?"} · cobertura {fmtDate(x.breeding_date)} · dia{" "}
                      {daysBetween(x.breeding_date, today)}
                    </option>
                  ))}
                </select>
              </Field>
            ),
        },
        {
          title: "Parto",
          validate: () =>
            farrowingErrors(
              { ...form, alive: Math.max(1, form.alive), runts: 0, deathsAfter: 0, piglets: 0 },
              today,
            ),
          content: (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data *">
                <Input
                  type="date"
                  max={today}
                  value={f.date}
                  onChange={set("date")}
                  className="h-12"
                />
              </Field>
              <Field label="Baia de maternidade">
                <select className={selectCls} value={f.penId} onChange={set("penId")}>
                  <option value="">Não informada</option>
                  {(pens.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.sector}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Início">
                <Input type="time" value={f.start} onChange={set("start")} className="h-12" />
              </Field>
              <Field label="Término">
                <Input type="time" value={f.end} onChange={set("end")} className="h-12" />
              </Field>
              <Field label="Responsável">
                <Input value={f.responsible} onChange={set("responsible")} className="h-12" />
              </Field>
              {dur !== null && (
                <p className="self-end pb-3 text-sm text-muted-foreground">
                  Duração: {Math.floor(dur / 60)} h {dur % 60} min
                </p>
              )}
              <fieldset className="sm:col-span-2">
                <legend className="mb-1 text-sm font-medium">Intercorrências</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Parto normal",
                    "Parto prolongado",
                    "Assistência necessária",
                    "Intervenção veterinária",
                    "Retenção ou outra intercorrência",
                  ].map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={f.complications.includes(c)}
                        onChange={(e) =>
                          setF({
                            ...f,
                            complications: e.target.checked
                              ? [...f.complications, c]
                              : f.complications.filter((x) => x !== c),
                          })
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ),
        },
        {
          title: "Nascidos",
          validate: () => farrowingErrors({ ...form, piglets: 0 }, today),
          content: (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ["alive", "Nascidos vivos *"],
                  ["still", "Natimortos"],
                  ["mum", "Mumificados"],
                  ["runts", "Refugos (entre os vivos)"],
                  ["deaths", "Mortos após nascer"],
                ] as const
              ).map(([k, l]) => (
                <Field key={k} label={l}>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={f[k]}
                    onChange={set(k)}
                    className="h-12 text-lg"
                  />
                </Field>
              ))}
              <p className="col-span-full text-sm text-muted-foreground">
                Total nascidos: <b>{n(f.alive) + n(f.still) + n(f.mum)}</b>
              </p>
            </div>
          ),
        },
        {
          title: "Leitões e cuidados",
          validate: () => farrowingErrors(form, today),
          content: (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Opcional: crie o prontuário individual. Marque só o que foi feito; produto e dose do
                ferro ficam no prontuário sanitário, conforme a prescrição.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPigs(
                      Array.from(
                        { length: n(f.alive) },
                        (_, i) =>
                          pigs[i] ?? {
                            sex: "",
                            weight: "",
                            condition: "",
                            colostrum: "",
                            iron: false,
                          },
                      ),
                    )
                  }
                  disabled={n(f.alive) < 1}
                >
                  Criar {n(f.alive)} prontuário(s)
                </Button>
                {pigs.length > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setPigs([])}>
                    Sem prontuário individual
                  </Button>
                )}
              </div>
              {pigs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="p-1">Nº</th>
                        <th className="p-1">Sexo</th>
                        <th className="p-1">Peso (kg)</th>
                        <th className="p-1">Condição</th>
                        <th className="p-1">Colostragem</th>
                        <th className="p-1">Ferro hoje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pigs.map((p, i) => {
                        const up = (patch: Partial<PigRow>) =>
                          setPigs(pigs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                        return (
                          <tr key={i} className="border-t">
                            <td className="p-1 font-mono">{i + 1}</td>
                            <td className="p-1">
                              <select
                                className={`${selectCls} h-10`}
                                value={p.sex}
                                onChange={(e) => up({ sex: e.target.value })}
                              >
                                <option value="">—</option>
                                <option value="macho">Macho</option>
                                <option value="femea">Fêmea</option>
                              </select>
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-10"
                                inputMode="decimal"
                                value={p.weight}
                                onChange={(e) => up({ weight: e.target.value })}
                              />
                            </td>
                            <td className="p-1">
                              <select
                                className={`${selectCls} h-10`}
                                value={p.condition}
                                onChange={(e) => up({ condition: e.target.value })}
                              >
                                <option value="">—</option>
                                <option value="normal">Normal</option>
                                <option value="fraco">Fraco</option>
                                <option value="refugo">Refugo</option>
                              </select>
                            </td>
                            <td className="p-1">
                              <select
                                className={`${selectCls} h-10`}
                                value={p.colostrum}
                                onChange={(e) => up({ colostrum: e.target.value })}
                              >
                                <option value="">—</option>
                                <option value="sim">Sim</option>
                                <option value="nao">Não</option>
                              </select>
                            </td>
                            <td className="p-1 text-center">
                              <input
                                type="checkbox"
                                className="h-5 w-5"
                                checked={p.iron}
                                onChange={(e) => up({ iron: e.target.checked })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ),
        },
        {
          title: "Confirmar",
          validate: () => farrowingErrors(form, today),
          content: (
            <div className="space-y-3">
              <Field label="Observações">
                <Textarea value={f.notes} onChange={set("notes")} rows={2} />
              </Field>
              <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                <dt className="text-muted-foreground">Matriz</dt>
                <dd className="font-semibold">{b ? tag.get(b.sow_id) : "—"}</dd>
                <dt className="text-muted-foreground">Data</dt>
                <dd>{fmtDate(f.date)}</dd>
                <dt className="text-muted-foreground">Nascidos</dt>
                <dd>
                  {n(f.alive)} vivos · {n(f.still)} natimortos · {n(f.mum)} mumificados
                </dd>
                <dt className="text-muted-foreground">Prontuários</dt>
                <dd>{pigs.length}</dd>
              </dl>
            </div>
          ),
        },
      ]}
    />
  );
}

function WeaningFlow({ onDone }: { onDone: DoneFn }) {
  const qc = useQueryClient();
  const today = todayISO();
  const litters = useQuery(littersQuery),
    sows = useQuery(sowsQuery),
    pens = useQuery(pensQuery),
    piglets = useQuery(pigletsQuery);
  const tag = useMemo(() => new Map((sows.data ?? []).map((s) => [s.id, s.ear_tag])), [sows.data]);
  const nursing = (litters.data ?? []).filter((l) => l.status === "maternidade");
  const [f, setF] = useState({
    litterId: "",
    date: today,
    males: "",
    females: "",
    avg: "",
    destination: "Creche da granja",
    penId: "",
    responsible: "",
    notes: "",
  });
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const l = nursing.find((x) => x.id === f.litterId);
  const live = l ? livePiglets(l) : 0;
  const alivePigs = (piglets.data ?? []).filter(
    (p) => p.litter_id === f.litterId && (p.status ?? "ativo") === "ativo",
  );
  const wList = Object.entries(weights)
    .filter(([, v]) => v.trim() !== "")
    .map(([id, v]) => ({ piglet_id: id, weight: Number(v.replace(",", ".")) }));
  const form = {
    litterId: f.litterId,
    farrowingDate: l?.farrowing_date ?? null,
    live,
    date: f.date,
    males: num(f.males),
    females: num(f.females),
    avgWeight: num(f.avg),
    weights: wList.map((w) => w.weight),
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  async function finish() {
    const err = weaningErrors(form, today);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("flow_register_weaning", {
      p_litter_id: f.litterId,
      p_date: f.date,
      p_males: num(f.males),
      p_females: num(f.females),
      p_avg_weight: num(f.avg),
      p_piglet_weights: wList,
      p_destination: f.destination || null,
      p_dest_pen: f.penId || null,
      p_responsible: f.responsible || null,
      p_notes: f.notes || null,
    });
    setBusy(false);
    if (e) {
      setError(errMsg(e));
      return;
    }
    await qc.invalidateQueries();
    toast.success("Desmame registrado.");
    const res = (data ?? {}) as { weaned?: number; avg_weight?: number | null; age_days?: number };
    onDone({
      title: `Desmame de ${tag.get(l!.sow_id)} registrado`,
      lines: [
        `${res.weaned} leitão(ões) desmamados com ${res.age_days} dias`,
        res.avg_weight
          ? `Peso médio ${String(res.avg_weight).replace(".", ",")} kg`
          : "Peso médio não informado",
        "Matriz volta para vazia; acompanhe o retorno ao cio na agenda",
      ],
    });
  }
  return (
    <Wizard
      busy={busy}
      error={error}
      finishLabel="Registrar desmame"
      onFinish={finish}
      steps={[
        {
          title: "Leitegada",
          validate: () =>
            f.litterId
              ? live > 0
                ? null
                : "A leitegada não tem leitões vivos registrados."
              : "Escolha a leitegada.",
          content:
            nursing.length === 0 ? (
              <Empty>Nenhuma leitegada em maternidade.</Empty>
            ) : (
              <Field label="Matriz / leitegada *">
                <select className={selectCls} value={f.litterId} onChange={set("litterId")}>
                  <option value="">Selecione…</option>
                  {nursing.map((x) => (
                    <option key={x.id} value={x.id}>
                      {tag.get(x.sow_id) ?? "?"} · parto {fmtDate(x.farrowing_date)} ·{" "}
                      {livePiglets(x)} vivos · {daysBetween(x.farrowing_date, today)} dias
                    </option>
                  ))}
                </select>
              </Field>
            ),
        },
        {
          title: "Quantidade e destino",
          validate: () => weaningErrors({ ...form, weights: [], avgWeight: null }, today),
          content: (
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="sm:col-span-2 rounded-lg bg-muted/60 p-3 text-sm">
                Serão desmamados os <b>{live}</b> leitões vivos registrados
                {l ? `, com ${daysBetween(l.farrowing_date, f.date || today)} dias de idade` : ""}.
                Se o número real for diferente, registre antes a morte ou a transferência na
                Maternidade.
              </p>
              <Field label="Data *">
                <Input
                  type="date"
                  max={today}
                  value={f.date}
                  onChange={set("date")}
                  className="h-12"
                />
              </Field>
              <Field label="Responsável">
                <Input value={f.responsible} onChange={set("responsible")} className="h-12" />
              </Field>
              <Field label="Machos">
                <Input
                  type="number"
                  min={0}
                  value={f.males}
                  onChange={set("males")}
                  className="h-12"
                />
              </Field>
              <Field label="Fêmeas">
                <Input
                  type="number"
                  min={0}
                  value={f.females}
                  onChange={set("females")}
                  className="h-12"
                />
              </Field>
              <Field label="Destino">
                <select className={selectCls} value={f.destination} onChange={set("destination")}>
                  {["Creche da granja", "Venda", "Outra granja", "Outro"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Baia de destino">
                <select className={selectCls} value={f.penId} onChange={set("penId")}>
                  <option value="">Não informada</option>
                  {(pens.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.sector}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ),
        },
        {
          title: "Pesos",
          validate: () => weaningErrors(form, today),
          content: (
            <div className="space-y-3">
              <Field label="Peso médio (kg) — ou preencha os pesos individuais">
                <Input inputMode="decimal" value={f.avg} onChange={set("avg")} className="h-12" />
              </Field>
              {alivePigs.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {alivePigs.map((p) => (
                    <label key={p.id} className="text-xs">
                      Nº {p.piglet_number}
                      {p.australian_number ? ` (${p.australian_number})` : ""}
                      <Input
                        inputMode="decimal"
                        value={weights[p.id] ?? ""}
                        onChange={(e) => setWeights({ ...weights, [p.id]: e.target.value })}
                        className="h-10"
                      />
                    </label>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Peso médio que será gravado:{" "}
                <b>
                  {(() => {
                    const a = weaningAverage(
                      num(f.avg),
                      wList.map((w) => w.weight),
                    );
                    return a === null ? "não informado" : `${String(a).replace(".", ",")} kg`;
                  })()}
                </b>
              </p>
            </div>
          ),
        },
        {
          title: "Confirmar",
          validate: () => weaningErrors(form, today),
          content: (
            <div className="space-y-3">
              <Field label="Observações">
                <Textarea value={f.notes} onChange={set("notes")} rows={2} />
              </Field>
              <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                <dt className="text-muted-foreground">Matriz</dt>
                <dd className="font-semibold">{l ? tag.get(l.sow_id) : "—"}</dd>
                <dt className="text-muted-foreground">Leitões</dt>
                <dd>
                  {live} ({f.males || 0} M · {f.females || 0} F)
                </dd>
                <dt className="text-muted-foreground">Destino</dt>
                <dd>{f.destination}</dd>
              </dl>
            </div>
          ),
        },
      ]}
    />
  );
}
