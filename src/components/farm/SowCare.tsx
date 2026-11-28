import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Save, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty } from "@/components/farm/Kpi";
import { Field } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fmtDate,
  breedingsQuery,
  healthProtocolsQuery,
  littersQuery,
  sowVaccinationsQuery,
  sowWeighingsQuery,
  todayISO,
  type Sow,
} from "@/lib/farm";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { batchWeighErrors, filledWeights, missingFields, parseKg } from "@/lib/farm/sow-care";
import {
  ageLabel,
  CELL_LABEL,
  CELL_TONE,
  cellForColumn,
  columnAliases,
  sowCycle,
  vaccineColumns,
} from "@/lib/farm/vaccine-map";
import { friendlyError } from "@/lib/errors";

const errMsg = (e: unknown) => friendlyError(e);
const kg = (v: number | null) => (v == null ? "—" : `${String(v).replace(".", ",")} kg`);

/** Pesar várias matrizes seguidas: digita o peso de cada uma e grava tudo de uma vez. */
export function BatchWeighing({ sows }: { sows: Sow[] }) {
  const qc = useQueryClient();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const list = sows.filter(
    (s) => !q || `${s.ear_tag} ${s.name ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  const entries = sows.map((s) => ({ sowId: s.id, tag: s.ear_tag, raw: vals[s.id] ?? "" }));
  const filled = filledWeights(entries);
  const errors = batchWeighErrors(entries, date, today);

  async function save() {
    if (errors.length) {
      toast.error(errors[0]!);
      return;
    }
    if (!filled.length) {
      toast.error("Digite o peso de pelo menos uma matriz.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("sow_weighings").upsert(
      filled.map((f) => ({ sow_id: f.sowId, weighed_on: date, weight_kg: f.kg })),
      { onConflict: "sow_id,weighed_on" },
    );
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(`${filled.length} pesagem(ns) gravadas.`);
    setVals({});
    void qc.invalidateQueries({ queryKey: ["sows"] });
    void qc.invalidateQueries({ queryKey: ["sow_weighings"] });
  }

  if (!sows.length) return <Empty>Nenhuma matriz ativa.</Empty>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Digite o peso de cada porca que passar pela balança e toque em gravar no fim. Campo vazio =
        não pesada. Se a porca já tiver peso nesse dia, ele é corrigido.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Data da pesagem">
          <Input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-auto"
          />
        </Field>
        <Field label="Procurar">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Brinco"
            className="h-11 w-40"
          />
        </Field>
      </div>
      <ul className="divide-y rounded-xl border bg-card pb-2">
        {list.map((s) => {
          const raw = vals[s.id] ?? "";
          const v = parseKg(raw);
          const bad = v !== null && (Number.isNaN(v) || v <= 20 || v >= 500);
          const diff = v !== null && !bad && s.weight_kg != null ? v - s.weight_kg : null;
          return (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono font-bold">{s.ear_tag}</p>
                <p className="text-xs text-muted-foreground">
                  Último: {kg(s.weight_kg)}
                  {s.weight_date ? ` em ${fmtDate(s.weight_date)}` : ""}
                </p>
                {bad && (
                  <p className="text-xs font-semibold text-destructive">Peso fora de 20–500 kg</p>
                )}
              </div>
              {diff !== null && (
                <span
                  className={`text-xs font-semibold tabular-nums ${diff < 0 ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(1).replace(".", ",")}
                </span>
              )}
              <Input
                inputMode="decimal"
                enterKeyHint="next"
                aria-label={`Peso da ${s.ear_tag}`}
                placeholder="kg"
                value={raw}
                onChange={(e) => setVals({ ...vals, [s.id]: e.target.value })}
                className={`h-12 w-24 text-right text-lg ${bad ? "border-destructive" : ""}`}
              />
            </li>
          );
        })}
      </ul>
      {errors.length > 0 && (
        <ul className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.slice(0, 5).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="h-4" aria-hidden />
      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button
          className="h-12 w-full shadow-lg"
          disabled={busy || !filled.length || errors.length > 0}
          onClick={() => void save()}
        >
          <Scale className="mr-2 h-5 w-5" />
          {busy ? "Gravando…" : `Gravar ${filled.length} pesagem(ns)`}
        </Button>
      </div>
    </div>
  );
}

/** Matrizes com cadastro incompleto: preencher nascimento, raça e entrada sem abrir ficha por ficha. */
export function CompleteRecords({ sows }: { sows: Sow[] }) {
  const qc = useQueryClient();
  const today = todayISO();
  const pending = useMemo(() => sows.filter((s) => missingFields(s).length > 0), [sows]);
  const breeds = useMemo(
    () => [...new Set(sows.map((s) => s.breed?.trim()).filter((b): b is string => !!b))].sort(),
    [sows],
  );
  const [edits, setEdits] = useState<
    Record<string, { birth_date?: string; breed?: string; entry_date?: string }>
  >({});
  const [busy, setBusy] = useState(false);
  const changed = Object.entries(edits).filter(([, e]) =>
    Object.values(e).some((v) => v && v.trim()),
  );

  async function save() {
    for (const [id, e] of changed) {
      const s = sows.find((x) => x.id === id)!;
      if (e.birth_date && e.birth_date > today) {
        toast.error(`${s.ear_tag}: nascimento no futuro.`);
        return;
      }
      if (e.entry_date && e.entry_date > today) {
        toast.error(`${s.ear_tag}: entrada no futuro.`);
        return;
      }
      const birth = e.birth_date || s.birth_date,
        entry = e.entry_date || s.entry_date;
      if (birth && entry && entry < birth) {
        toast.error(`${s.ear_tag}: entrada antes do nascimento.`);
        return;
      }
    }
    setBusy(true);
    const results = await Promise.all(
      changed.map(([id, e]) => {
        const patch: { birth_date?: string; breed?: string; entry_date?: string } = {};
        if (e.birth_date) patch.birth_date = e.birth_date;
        if (e.breed?.trim()) patch.breed = e.breed.trim().slice(0, 80);
        if (e.entry_date) patch.entry_date = e.entry_date;
        return supabase.from("sows").update(patch).eq("id", id);
      }),
    );
    setBusy(false);
    const failed = results.filter((r) => r.error).length;
    if (failed)
      toast.error(
        `${failed} matriz(es) não foram salvas: ${errMsg(results.find((r) => r.error)?.error)}`,
      );
    else toast.success(`${changed.length} cadastro(s) atualizados.`);
    setEdits({});
    void qc.invalidateQueries({ queryKey: ["sows"] });
  }

  if (!pending.length)
    return (
      <div className="panel flex items-center gap-3 p-5">
        <CheckCircle2 className="h-6 w-6 text-primary" />
        <p className="text-sm">
          Todas as matrizes ativas têm nascimento, raça, entrada e peso cadastrados.
        </p>
      </div>
    );
  const set = (id: string, k: "birth_date" | "breed" | "entry_date", v: string) =>
    setEdits({ ...edits, [id]: { ...edits[id], [k]: v } });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <b>{pending.length}</b> matriz(es) com cadastro incompleto. Preencha o que souber e grave
        tudo de uma vez. Sem data de nascimento não dá para saber a idade. O peso se lança na aba
        Pesagem.
      </p>
      <datalist id="racas">
        {breeds.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <ul className="space-y-3">
        {pending.map((s) => {
          const miss = missingFields(s);
          return (
            <li key={s.id} className="panel space-y-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to="/matrizes/$sowId"
                  params={{ sowId: s.id }}
                  className="font-mono text-lg font-bold"
                >
                  {s.ear_tag}
                </Link>
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Falta: {miss.join(", ")}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {!s.birth_date ? (
                  <Field label="Nascimento">
                    <Input
                      type="date"
                      max={today}
                      value={edits[s.id]?.birth_date ?? ""}
                      onChange={(e) => set(s.id, "birth_date", e.target.value)}
                      className="h-11"
                    />
                  </Field>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Idade: {ageLabel(s.birth_date, today) ?? "—"}
                  </p>
                )}
                {!s.breed?.trim() ? (
                  <Field label="Raça / genética">
                    <Input
                      list="racas"
                      value={edits[s.id]?.breed ?? ""}
                      onChange={(e) => set(s.id, "breed", e.target.value)}
                      className="h-11"
                    />
                  </Field>
                ) : (
                  <p className="text-sm text-muted-foreground">Raça: {s.breed}</p>
                )}
                {!s.entry_date ? (
                  <Field label="Entrada na granja">
                    <Input
                      type="date"
                      max={today}
                      value={edits[s.id]?.entry_date ?? ""}
                      onChange={(e) => set(s.id, "entry_date", e.target.value)}
                      className="h-11"
                    />
                  </Field>
                ) : (
                  <p className="text-sm text-muted-foreground">Entrada: {fmtDate(s.entry_date)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button
          className="h-12 w-full shadow-lg"
          disabled={busy || !changed.length}
          onClick={() => void save()}
        >
          <Save className="mr-2 h-5 w-5" />
          {busy ? "Salvando…" : `Salvar ${changed.length} cadastro(s)`}
        </Button>
      </div>
    </div>
  );
}

/** Na ficha: situação das vacinas e evolução do peso da matriz. */
export function SowHealthSummary({ sow }: { sow: Sow }) {
  const today = todayISO();
  const weighings = useQuery(sowWeighingsQuery),
    protos = useQuery(healthProtocolsQuery),
    recs = useQuery(sowVaccinationsQuery),
    breedings = useQuery(breedingsQuery),
    litters = useQuery(littersQuery);
  const mine = useMemo(
    () =>
      (weighings.data ?? [])
        .filter((w) => w.sow_id === sow.id)
        .sort((a, b) => a.weighed_on.localeCompare(b.weighed_on)),
    [weighings.data, sow.id],
  );
  const cells = useMemo(() => {
    const P = protos.data ?? [],
      R = recs.data ?? [];
    const cycle = sowCycle(sow.id, breedings.data ?? [], litters.data ?? []);
    return vaccineColumns(P, R).map((c) => ({
      col: c,
      cell: cellForColumn(R, sow.id, columnAliases(c, P), c, cycle, today),
    }));
  }, [protos.data, recs.data, breedings.data, litters.data, sow.id, today]);
  const tone = CELL_TONE;
  const first = mine[0],
    last = mine[mine.length - 1];
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Vacinas</h2>
          <Link to="/vacinas" className="text-sm font-semibold text-primary">
            Mapa completo
          </Link>
        </div>
        {!cells.length ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma vacina de matriz cadastrada nos protocolos nem registrada.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {cells.map(({ col, cell }) => (
              <li
                key={col.key}
                className={`rounded-lg border px-3 py-2 text-sm ${tone[cell.state]}`}
              >
                <span className="font-semibold">{col.name}</span> · {CELL_LABEL[cell.state]}
                <span className="block text-xs">
                  {cell.last ? `Última ${fmtDate(cell.last)}` : "Sem aplicação registrada"}
                  {cell.due ? ` · próxima ${fmtDate(cell.due)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="panel p-4 sm:p-5">
        <h2 className="font-bold">Peso</h2>
        {!mine.length ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma pesagem registrada. Use Pesar no mapa das matrizes.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Atual: <b className="text-foreground">{kg(last!.weight_kg)}</b> em{" "}
              {fmtDate(last!.weighed_on)}
              {mine.length > 1
                ? ` · ${last!.weight_kg - first!.weight_kg >= 0 ? "+" : ""}${(last!.weight_kg - first!.weight_kg).toFixed(1).replace(".", ",")} kg desde ${fmtDate(first!.weighed_on)}`
                : ""}
            </p>
            {mine.length > 1 && (
              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={mine.map((w) => ({
                      d: fmtDate(w.weighed_on).slice(0, 5),
                      kg: Number(w.weight_kg),
                    }))}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="d" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 10", "dataMax + 10"]} />
                    <Tooltip formatter={(v) => [`${String(v).replace(".", ",")} kg`, "Peso"]} />
                    <Line
                      type="monotone"
                      dataKey="kg"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className="mt-3 divide-y text-sm">
              {[...mine]
                .reverse()
                .slice(0, 5)
                .map((w) => (
                  <li key={w.id} className="flex justify-between py-1.5">
                    <span>{fmtDate(w.weighed_on)}</span>
                    <span className="font-mono">{kg(Number(w.weight_kg))}</span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
