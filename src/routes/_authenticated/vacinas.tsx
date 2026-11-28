import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Scale,
  Search,
  ShieldQuestion,
  Syringe,
  CalendarClock,
  MinusCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Field, FormDialog, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fmtDate,
  healthProtocolsQuery,
  SOW_STATUS,
  sowsQuery,
  breedingsQuery,
  littersQuery,
  sowVaccinationsQuery,
  todayISO,
  type Sow,
} from "@/lib/farm";
import {
  ageLabel,
  CELL_LABEL,
  cellForColumn,
  CELL_TONE,
  sowCycle,
  columnAliases,
  vaccineColumns,
  weightStale,
  worst,
  type Cell,
  type CellState,
  type VaccineColumn,
} from "@/lib/farm/vaccine-map";
import { downloadCsv } from "@/lib/export";
import { usePermissions } from "@/lib/access";
import { isActiveSowStatus } from "@/lib/farm/reproduction";
import { missingFields } from "@/lib/farm/sow-care";
import { BatchWeighing, CompleteRecords } from "@/components/farm/SowCare";
import { LitterCareMap } from "@/components/farm/LitterCare";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/vacinas")({
  head: () => ({
    meta: [
      { title: "Mapa de vacinação | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Situação de vacina, idade e peso de cada matriz, com vacinação em lote e pesagem rápida.",
      },
    ],
  }),
  component: MapaVacinas,
});

const TONE = CELL_TONE;
const ICON: Record<CellState, typeof Clock> = {
  atrasada: AlertTriangle,
  nunca: ShieldQuestion,
  vence: Clock,
  aplicada: Syringe,
  em_dia: CheckCircle2,
  programada: CalendarClock,
  fora_ciclo: MinusCircle,
};
const errMsg = (e: unknown) => friendlyError(e);
type Row = { sow: Sow; cells: Cell[]; worst: CellState; age: string | null };

function MapaVacinas() {
  const today = todayISO();
  const perms = usePermissions();
  const sows = useQuery(sowsQuery),
    protos = useQuery(healthProtocolsQuery),
    breedings = useQuery(breedingsQuery),
    litters = useQuery(littersQuery),
    recs = useQuery(sowVaccinationsQuery);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"todas" | "pendentes" | "sem_peso">("todas");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("vacinas");
  const activeSows = useMemo(
    () => (sows.data ?? []).filter((x) => isActiveSowStatus(x.status)),
    [sows.data],
  );
  const incomplete = activeSows.filter((x) => missingFields(x).length > 0).length;

  const cols = useMemo(
    () => vaccineColumns(protos.data ?? [], recs.data ?? []),
    [protos.data, recs.data],
  );
  const rows: Row[] = useMemo(() => {
    const R = recs.data ?? [],
      P = protos.data ?? [];
    const aliases = cols.map((c) => columnAliases(c, P));
    return (sows.data ?? [])
      .filter((sow) => isActiveSowStatus(sow.status))
      .map((sow) => {
        const cycle = sowCycle(sow.id, breedings.data ?? [], litters.data ?? []);
        const cells = cols.map((c, i) => cellForColumn(R, sow.id, aliases[i]!, c, cycle, today));
        return {
          sow,
          cells,
          worst: cells.length ? worst(cells) : "em_dia",
          age: ageLabel(sow.birth_date, today),
        };
      });
  }, [sows.data, recs.data, protos.data, cols, today]);

  const order: CellState[] = [
    "atrasada",
    "nunca",
    "vence",
    "programada",
    "aplicada",
    "em_dia",
    "fora_ciclo",
  ];
  const visible = rows
    .filter(
      (r) => !q || `${r.sow.ear_tag} ${r.sow.name ?? ""}`.toLowerCase().includes(q.toLowerCase()),
    )
    .filter(
      (r) =>
        only === "todas" ||
        (only === "pendentes"
          ? ["atrasada", "nunca", "vence"].includes(r.worst)
          : weightStale(r.sow.weight_date, today)),
    )
    .sort(
      (a, b) =>
        order.indexOf(a.worst) - order.indexOf(b.worst) ||
        a.sow.ear_tag.localeCompare(b.sow.ear_tag, "pt-BR", { numeric: true }),
    );

  const count = (s: CellState) => rows.filter((r) => r.cells.some((c) => c.state === s)).length;
  const noWeight = rows.filter((r) => weightStale(r.sow.weight_date, today)).length;
  const noBirth = rows.filter((r) => !r.sow.birth_date).length;
  const loading =
    sows.isLoading ||
    protos.isLoading ||
    recs.isLoading ||
    breedings.isLoading ||
    litters.isLoading;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function exportCsv() {
    downloadCsv(
      "mapa-vacinacao",
      [
        "Brinco",
        "Nome",
        "Situação",
        "Idade",
        "Peso (kg)",
        "Data do peso",
        ...cols.flatMap((c) => [
          `${c.name} - situação`,
          `${c.name} - última`,
          `${c.name} - próxima`,
        ]),
      ],
      visible.map((r) => [
        r.sow.ear_tag,
        r.sow.name ?? "",
        SOW_STATUS[r.sow.status]?.label ?? r.sow.status,
        r.age ?? "",
        r.sow.weight_kg ?? "",
        r.sow.weight_date ?? "",
        ...r.cells.flatMap((c) => [CELL_LABEL[c.state], c.last ?? "", c.due ?? ""]),
      ]),
    );
  }

  return (
    <div className="space-y-5">
      <div className="no-print">
        <SectionTitle
          kicker="Saúde do rebanho"
          title="Mapa das matrizes: vacinas, peso e idade"
          action={
            <>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!visible.length}>
                <Download className="mr-1 h-4 w-4" />
                Planilha
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" />
                Imprimir
              </Button>
            </>
          }
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-print max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="vacinas">Matrizes</TabsTrigger>
          <TabsTrigger value="leitegadas">Leitegadas</TabsTrigger>
          {perms?.canWrite && <TabsTrigger value="pesagem">Pesagem em lote</TabsTrigger>}
          {perms?.canWrite && (
            <TabsTrigger value="cadastro">
              Completar cadastro{incomplete ? ` (${incomplete})` : ""}
            </TabsTrigger>
          )}
        </TabsList>
        {perms?.canWrite && (
          <TabsContent value="pesagem" className="mt-4">
            <BatchWeighing sows={activeSows} />
          </TabsContent>
        )}
        {perms?.canWrite && (
          <TabsContent value="cadastro" className="mt-4">
            <CompleteRecords sows={activeSows} />
          </TabsContent>
        )}
        <TabsContent value="leitegadas" className="mt-4">
          <LitterCareMap />
        </TabsContent>
        <TabsContent value="vacinas" className="mt-4 space-y-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !rows.length ? (
            <Empty>
              Nenhuma matriz ativa cadastrada.{" "}
              <Link to="/importar-matrizes" className="font-semibold text-primary underline">
                Importe ou cadastre as matrizes
              </Link>{" "}
              para montar o mapa.
            </Empty>
          ) : (
            <>
              <div className="no-print grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Summary
                  tone="atrasada"
                  label="Com vacina atrasada"
                  value={count("atrasada")}
                  onClick={() => setOnly("pendentes")}
                />
                <Summary
                  tone="nunca"
                  label="Sem registro de alguma vacina"
                  value={count("nunca")}
                  onClick={() => setOnly("pendentes")}
                />
                <Summary
                  tone="vence"
                  label="Vencem em 15 dias"
                  value={count("vence")}
                  onClick={() => setOnly("pendentes")}
                />
                <Summary
                  tone="aplicada"
                  icon={Scale}
                  label="Peso ausente ou com +90 dias"
                  value={noWeight}
                  onClick={() => setOnly("sem_peso")}
                />
              </div>

              {cols.length === 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                  <p className="font-semibold">Nenhuma vacina de matriz cadastrada ainda.</p>
                  <p className="mt-1 text-muted-foreground">
                    Peça ao veterinário para cadastrar os protocolos em{" "}
                    <Link to="/agenda" className="font-semibold underline">
                      Agenda › Protocolos sanitários
                    </Link>{" "}
                    (tipo vacina, para matriz), ou registre a primeira vacinação abaixo: ela vira
                    uma coluna do mapa.
                  </p>
                </div>
              )}
              {noBirth > 0 && (
                <p className="text-xs text-muted-foreground">
                  {noBirth} matriz(es) sem data de nascimento: a idade aparece como "—". Preencha na
                  ficha da matriz.
                </p>
              )}

              <div className="no-print flex flex-wrap items-center gap-2">
                <div className="relative min-w-48 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Brinco ou nome"
                    className="h-11 pl-9"
                  />
                </div>
                <select
                  className={`${selectCls} w-auto`}
                  value={only}
                  onChange={(e) => setOnly(e.target.value as typeof only)}
                  aria-label="Mostrar"
                >
                  <option value="todas">Todas as matrizes</option>
                  <option value="pendentes">Só com vacina pendente</option>
                  <option value="sem_peso">Só peso desatualizado</option>
                </select>
                {perms?.canWrite && (
                  <>
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() =>
                        setSelected(
                          selected.size === visible.length
                            ? new Set()
                            : new Set(visible.map((r) => r.sow.id)),
                        )
                      }
                    >
                      {selected.size === visible.length && visible.length
                        ? "Desmarcar todas"
                        : `Marcar ${visible.length}`}
                    </Button>
                    <BatchVaccination
                      sows={visible.filter((r) => selected.has(r.sow.id)).map((r) => r.sow)}
                      cols={cols}
                      onDone={() => setSelected(new Set())}
                    />
                  </>
                )}
              </div>

              <div className="no-print flex flex-wrap gap-3 text-xs text-muted-foreground">
                {order.map((s) => {
                  const I = ICON[s];
                  return (
                    <span key={s} className="inline-flex items-center gap-1">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded border ${TONE[s]}`}
                      >
                        <I className="h-3 w-3" />
                      </span>
                      {CELL_LABEL[s]}
                    </span>
                  );
                })}
              </div>

              {!visible.length ? (
                <Empty>Nenhuma matriz com esse filtro.</Empty>
              ) : (
                <>
                  <ul className="space-y-3 md:hidden">
                    {visible.map((r) => (
                      <li
                        key={r.sow.id}
                        className={`panel p-4 ${selected.has(r.sow.id) ? "ring-2 ring-primary" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          {perms?.canWrite && (
                            <input
                              type="checkbox"
                              className="mt-1 h-5 w-5 accent-[var(--primary)]"
                              checked={selected.has(r.sow.id)}
                              onChange={() => toggle(r.sow.id)}
                              aria-label={`Selecionar ${r.sow.ear_tag}`}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <Link
                                to="/matrizes/$sowId"
                                params={{ sowId: r.sow.id }}
                                className="font-mono text-lg font-bold"
                              >
                                {r.sow.ear_tag}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                {SOW_STATUS[r.sow.status]?.label ?? r.sow.status}
                              </span>
                            </div>
                            {r.sow.name && (
                              <p className="text-sm text-muted-foreground">{r.sow.name}</p>
                            )}
                            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              <div className="rounded-lg bg-muted/60 p-2">
                                <dt className="text-[.65rem] uppercase text-muted-foreground">
                                  Idade
                                </dt>
                                <dd className="font-semibold">{r.age ?? "—"}</dd>
                              </div>
                              <div
                                className={`rounded-lg p-2 ${weightStale(r.sow.weight_date, today) ? "bg-amber-500/10" : "bg-muted/60"}`}
                              >
                                <dt className="text-[.65rem] uppercase text-muted-foreground">
                                  Peso
                                </dt>
                                <dd className="font-semibold">
                                  {r.sow.weight_kg
                                    ? `${String(r.sow.weight_kg).replace(".", ",")} kg`
                                    : "—"}
                                  {r.sow.weight_date && (
                                    <span className="block text-[.65rem] font-normal text-muted-foreground">
                                      em {fmtDate(r.sow.weight_date)}
                                    </span>
                                  )}
                                </dd>
                              </div>
                            </dl>
                            {cols.length > 0 && (
                              <ul className="mt-2 space-y-1.5">
                                {cols.map((c, i) => (
                                  <CellChip key={c.key} col={c} cell={r.cells[i]!} />
                                ))}
                              </ul>
                            )}
                            {perms?.canWrite && (
                              <div className="mt-3">
                                <WeighSow sow={r.sow} />
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="print-area panel hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left text-xs text-muted-foreground">
                        <tr>
                          {perms?.canWrite && <th className="no-print p-2" />}
                          <th className="p-2">Matriz</th>
                          <th className="p-2">Idade</th>
                          <th className="p-2">Peso</th>
                          {cols.map((c) => (
                            <th key={c.key} className="min-w-32 p-2">
                              {c.name}
                              {c.repeatEvery ? (
                                <span className="block font-normal">reforço {c.repeatEvery} d</span>
                              ) : null}
                            </th>
                          ))}
                          {perms?.canWrite && <th className="no-print p-2" />}
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((r) => (
                          <tr
                            key={r.sow.id}
                            className={`border-t align-top ${selected.has(r.sow.id) ? "bg-primary/5" : ""}`}
                          >
                            {perms?.canWrite && (
                              <td className="no-print p-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={selected.has(r.sow.id)}
                                  onChange={() => toggle(r.sow.id)}
                                  aria-label={`Selecionar ${r.sow.ear_tag}`}
                                />
                              </td>
                            )}
                            <td className="p-2">
                              <Link
                                to="/matrizes/$sowId"
                                params={{ sowId: r.sow.id }}
                                className="font-mono font-bold"
                              >
                                {r.sow.ear_tag}
                              </Link>
                              <span className="block text-xs text-muted-foreground">
                                {SOW_STATUS[r.sow.status]?.label ?? r.sow.status}
                              </span>
                            </td>
                            <td className="p-2">{r.age ?? "—"}</td>
                            <td
                              className={`p-2 ${weightStale(r.sow.weight_date, today) ? "text-amber-700 dark:text-amber-300" : ""}`}
                            >
                              {r.sow.weight_kg
                                ? `${String(r.sow.weight_kg).replace(".", ",")} kg`
                                : "—"}
                              {r.sow.weight_date && (
                                <span className="block text-xs text-muted-foreground">
                                  {fmtDate(r.sow.weight_date)}
                                </span>
                              )}
                            </td>
                            {r.cells.map((cell, i) => (
                              <td key={cols[i]!.key} className="p-2">
                                <CellBox cell={cell} />
                              </td>
                            ))}
                            {perms?.canWrite && (
                              <td className="no-print p-2">
                                <WeighSow sow={r.sow} compact />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                A situação vem da última aplicação registrada para cada matriz. O prazo do reforço é
                a "próxima dose" anotada na aplicação ou, se não houver, o intervalo do protocolo
                cadastrado pelo veterinário. Vacinas ligadas ao ciclo (ex.: dias antes do parto)
                também aparecem na Agenda. O sistema não indica vacina nem dose: siga o protocolo do
                médico-veterinário.
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({
  tone,
  icon,
  label,
  value,
  onClick,
}: {
  tone: CellState;
  icon?: typeof Clock;
  label: string;
  value: number;
  onClick: () => void;
}) {
  const I = icon ?? ICON[tone];
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition hover:brightness-95 ${TONE[tone]}`}
    >
      <span className="flex items-center justify-between">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <I className="h-5 w-5" />
      </span>
      <span className="mt-1 block text-xs font-semibold">{label}</span>
    </button>
  );
}

function CellBox({ cell }: { cell: Cell }) {
  const I = ICON[cell.state];
  return (
    <span
      className={`inline-flex w-full flex-col rounded-lg border px-2 py-1 text-xs ${TONE[cell.state]}`}
    >
      <span className="flex items-center gap-1 font-semibold">
        <I className="h-3.5 w-3.5" />
        {CELL_LABEL[cell.state]}
      </span>
      {cell.last && <span>Última {fmtDate(cell.last)}</span>}
      {cell.due && <span>Próxima {fmtDate(cell.due)}</span>}
    </span>
  );
}

function CellChip({ col, cell }: { col: VaccineColumn; cell: Cell }) {
  const I = ICON[cell.state];
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${TONE[cell.state]}`}
    >
      <I className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{col.name}</span>
        <span>
          {CELL_LABEL[cell.state]}
          {cell.last ? ` · última ${fmtDate(cell.last)}` : ""}
          {cell.due ? ` · próxima ${fmtDate(cell.due)}` : ""}
        </span>
      </span>
    </li>
  );
}

function WeighSow({ sow, compact }: { sow: Sow; compact?: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>, close: () => void) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kg = Number(String(fd.get("kg")).replace(",", "."));
    const date = String(fd.get("date"));
    if (!(kg > 20 && kg < 500)) {
      toast.error("Peso entre 20 e 500 kg.");
      return;
    }
    if (!date || date > todayISO()) {
      toast.error("Data inválida.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("sow_weighings")
      .upsert(
        { sow_id: sow.id, weighed_on: date, weight_kg: kg },
        { onConflict: "sow_id,weighed_on" },
      );
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(`Peso da ${sow.ear_tag} atualizado.`);
    close();
    void qc.invalidateQueries({ queryKey: ["sows"] });
    void qc.invalidateQueries({ queryKey: ["sow_weighings"] });
  }
  return (
    <FormDialog
      title={`Pesar matriz ${sow.ear_tag}`}
      trigger={
        <Button variant="outline" size="sm" className={compact ? "" : "w-full"}>
          <Scale className="mr-1 h-4 w-4" />
          Pesar
        </Button>
      }
    >
      {(close) => (
        <form className="space-y-3" onSubmit={(e) => void save(e, close)}>
          {sow.weight_kg && (
            <p className="text-sm text-muted-foreground">
              Último peso: {String(sow.weight_kg).replace(".", ",")} kg
              {sow.weight_date ? ` em ${fmtDate(sow.weight_date)}` : ""}. O anterior fica no
              histórico de alterações.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso (kg) *">
              <Input name="kg" inputMode="decimal" required autoFocus className="h-12 text-lg" />
            </Field>
            <Field label="Data">
              <Input
                name="date"
                type="date"
                defaultValue={todayISO()}
                max={todayISO()}
                className="h-12"
              />
            </Field>
          </div>
          <SubmitRow busy={busy} label="Salvar peso" />
        </form>
      )}
    </FormDialog>
  );
}

const addDays = (iso: string, d: number) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);

function BatchVaccination({
  sows,
  cols,
  onDone,
}: {
  sows: Sow[];
  cols: VaccineColumn[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [colKey, setColKey] = useState(cols[0]?.key ?? "novo");
  const [date, setDate] = useState(todayISO());
  const col = cols.find((c) => c.key === colKey);
  async function save(e: FormEvent<HTMLFormElement>, close: () => void) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = col ? col.name : String(fd.get("name") ?? "").trim();
    if (name.length < 2) {
      toast.error("Informe o nome da vacina.");
      return;
    }
    if (!date || date > todayISO()) {
      toast.error("A data da vacinação não pode ser futura.");
      return;
    }
    const next = String(fd.get("next") ?? "") || null;
    if (next && next <= date) {
      toast.error("A próxima dose deve ser depois da aplicação.");
      return;
    }
    const t = (k: string) => String(fd.get(k) ?? "").trim() || null;
    setBusy(true);
    const { error } = await supabase.from("vaccination_records").insert(
      sows.map((s) => ({
        animal_scope: "matriz",
        sow_id: s.id,
        target_group: "Matriz",
        vaccine_name: name,
        vaccination_date: date,
        next_due_date: next,
        animals_planned: 1,
        animals_vaccinated: 1,
        manufacturer: t("manufacturer"),
        batch: t("batch"),
        expiry_date: t("expiry"),
        route: t("route"),
        protocol_reference: col?.protocolId ? col.name : null,
        veterinarian: t("vet"),
        responsible: t("responsible"),
        notes: t("notes"),
      })),
    );
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(`Vacina registrada em ${sows.length} matriz(es).`);
    void qc.invalidateQueries({ queryKey: ["vaccination_records"] });
    close();
    onDone();
  }
  return (
    <FormDialog
      title={`Vacinar ${sows.length} matriz(es)`}
      trigger={
        <Button className="h-11" disabled={!sows.length}>
          <Syringe className="mr-1 h-4 w-4" />
          Vacinar selecionadas ({sows.length})
        </Button>
      }
    >
      {(close) => (
        <form className="space-y-3" onSubmit={(e) => void save(e, close)}>
          <p className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
            Matrizes: {sows.map((s) => s.ear_tag).join(", ")}
          </p>
          <Field label="Vacina *">
            <select
              className={selectCls}
              value={colKey}
              onChange={(e) => setColKey(e.target.value)}
            >
              {cols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                  {c.protocolId ? " (protocolo)" : ""}
                </option>
              ))}
              <option value="novo">Outra vacina…</option>
            </select>
          </Field>
          {!col && (
            <Field label="Nome da vacina *">
              <Input name="name" required />
            </Field>
          )}
          {col?.doseInstructions && (
            <p className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">
              <b>Protocolo{col.validated ? " validado" : ""}:</b> {col.doseInstructions}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data da aplicação *">
              <Input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
            </Field>
            <Field label="Próxima dose">
              <Input
                key={`${colKey}-${date}`}
                name="next"
                type="date"
                className="h-11"
                defaultValue={col?.repeatEvery && date ? addDays(date, col.repeatEvery) : ""}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fabricante">
              <Input name="manufacturer" />
            </Field>
            <Field label="Partida / lote">
              <Input name="batch" />
            </Field>
            <Field label="Validade do frasco">
              <Input name="expiry" type="date" />
            </Field>
            <Field label="Via">
              <select name="route" className={selectCls} defaultValue="">
                <option value="">—</option>
                <option>Intramuscular</option>
                <option>Subcutânea</option>
                <option>Oral</option>
                <option>Intranasal</option>
                <option>Outra</option>
              </select>
            </Field>
            <Field label="Responsável">
              <Input name="responsible" />
            </Field>
            <Field label="Veterinário">
              <Input name="vet" />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea name="notes" rows={2} />
          </Field>
          <SubmitRow busy={busy} label={`Registrar em ${sows.length} matriz(es)`} />
        </form>
      )}
    </FormDialog>
  );
}
