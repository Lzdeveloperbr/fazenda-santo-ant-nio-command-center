import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  allSowsQuery,
  fmtDate,
  litterEventsQuery,
  littersQuery,
  livePiglets,
  pensQuery,
  pigletsQuery,
  todayISO,
  type Piglet,
} from "@/lib/farm";
import { daysBetween } from "@/lib/farm/gestation";
import { usePermissions } from "@/lib/access";
import { downloadCsv } from "@/lib/export";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/leitoes")({
  head: () => ({
    meta: [
      { title: "Leitões | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Prontuário individual e coletivo dos leitões: manejo, ferro, castração, mortalidade, adoções e desmame.",
      },
    ],
  }),
  component: Leitoes,
});

const STATUS_LABEL: Record<string, string> = {
  ativo: "Vivo na maternidade",
  morto: "Morto",
  transferido: "Transferido",
  desmamado: "Desmamado",
};
const SEX_LABEL: Record<string, string> = {
  macho: "Macho",
  femea: "Fêmea",
  nao_informado: "Não informado",
};
const COND_LABEL: Record<string, string> = { normal: "Normal", fraco: "Fraco", refugo: "Refugo" };

function Leitoes() {
  const piglets = useQuery(pigletsQuery),
    litters = useQuery(littersQuery),
    sows = useQuery(allSowsQuery),
    events = useQuery(litterEventsQuery);
  const [status, setStatus] = useState("ativo");
  const [q, setQ] = useState("");
  const today = todayISO();
  const tag = useMemo(() => {
    const m = new Map((sows.data ?? []).map((s) => [s.id, s.ear_tag]));
    return (id: string) => m.get(id) ?? "?";
  }, [sows.data]);
  const litterById = useMemo(
    () => new Map((litters.data ?? []).map((l) => [l.id, l])),
    [litters.data],
  );
  const sowOf = (p: Piglet) => {
    const l = litterById.get(p.litter_id);
    return l ? tag(l.sow_id) : "?";
  };
  const ageOf = (p: Piglet) => {
    const born = p.birth_date ?? litterById.get(p.litter_id)?.farrowing_date;
    return born ? daysBetween(born, today) : null;
  };

  const list = (piglets.data ?? [])
    .filter((p) => status === "todos" || (p.status ?? "ativo") === status)
    .filter(
      (p) =>
        !q ||
        `${p.australian_number} ${p.piglet_number} ${sowOf(p)}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    );
  const activeP = (piglets.data ?? []).filter((p) => (p.status ?? "ativo") === "ativo");
  const pending = [
    { label: "Sem registro de ferro", items: activeP.filter((p) => !p.iron_date) },
    {
      label: "Sem registro de colostragem",
      items: activeP.filter(
        (p) => p.colostrum_checked === null || p.colostrum_checked === undefined,
      ),
    },
    {
      label: "Machos sem registro de castração",
      items: activeP.filter((p) => p.sex === "macho" && !p.castration_date),
    },
    { label: "Sem peso ao nascer", items: activeP.filter((p) => !p.birth_weight_kg) },
  ];
  const adoptions = (events.data ?? []).filter(
    (e) => e.event_type === "transferencia_saida" && e.related_litter_id,
  );
  const nursing = (litters.data ?? []).filter((l) => l.status === "maternidade");

  function exportCsv() {
    downloadCsv(
      "Prontuário de leitões",
      [
        "Marca",
        "Nº",
        "Matriz",
        "Nascimento",
        "Idade (dias)",
        "Sexo",
        "Peso ao nascer",
        "Condição",
        "Colostragem",
        "Ferro",
        "Corte de cauda",
        "Castração",
        "Situação",
        "Data morte",
        "Motivo",
        "Desmame",
        "Peso desmame",
      ],
      list.map((p) => [
        p.australian_number,
        p.piglet_number,
        sowOf(p),
        fmtDate(p.birth_date ?? litterById.get(p.litter_id)?.farrowing_date),
        ageOf(p),
        SEX_LABEL[p.sex ?? ""] ?? "",
        p.birth_weight_kg,
        COND_LABEL[p.birth_condition ?? ""] ?? "",
        p.colostrum_checked === null || p.colostrum_checked === undefined
          ? ""
          : p.colostrum_checked
            ? "Sim"
            : "Não",
        fmtDate(p.iron_date),
        fmtDate(p.tail_dock_date),
        fmtDate(p.castration_date),
        STATUS_LABEL[p.status ?? "ativo"],
        fmtDate(p.death_date),
        p.death_cause,
        fmtDate(p.weaning_date),
        p.weaning_weight_kg,
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        kicker="Rebanho"
        title="Leitões"
        action={
          <Button variant="outline" onClick={exportCsv} disabled={!list.length}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        }
      />
      <p className="max-w-3xl text-sm text-muted-foreground">
        Leitões identificados individualmente (cadastro em{" "}
        <Link to="/desmame" className="font-semibold text-primary underline">
          Marcação e desmame
        </Link>
        ). Mortes, adoções e desmame são lançados na{" "}
        <Link to="/maternidade" className="font-semibold text-primary underline">
          Maternidade
        </Link>
        , para o saldo da leitegada continuar correto; aqui ficam o manejo individual e as
        consultas.
      </p>
      <Tabs defaultValue="individual">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="individual">Prontuário individual</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências de manejo</TabsTrigger>
          <TabsTrigger value="coletivo">Por leitegada</TabsTrigger>
          <TabsTrigger value="adocoes">Adoções</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar marca, número ou matriz…"
              className="h-10 max-w-xs"
            />
            <select
              aria-label="Situação"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${selectCls} h-10 max-w-xs`}
            >
              <option value="todos">Todos</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {piglets.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : list.length === 0 ? (
            <Empty>Nenhum leitão com esses filtros.</Empty>
          ) : (
            <div className="panel overflow-x-auto p-0">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Marca",
                      "Matriz",
                      "Idade",
                      "Sexo",
                      "Peso nasc.",
                      "Condição",
                      "Colostro",
                      "Ferro",
                      "Cauda",
                      "Castração",
                      "Situação",
                      "",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono font-semibold">
                        {p.australian_number}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          nº {p.piglet_number}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{sowOf(p)}</td>
                      <td className="px-3 py-2 tabular-nums">{ageOf(p) ?? "—"} d</td>
                      <td className="px-3 py-2">{SEX_LABEL[p.sex ?? ""] ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {p.birth_weight_kg
                          ? `${String(p.birth_weight_kg).replace(".", ",")} kg`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{COND_LABEL[p.birth_condition ?? ""] ?? "—"}</td>
                      <td className="px-3 py-2">
                        {p.colostrum_checked === null || p.colostrum_checked === undefined
                          ? "—"
                          : p.colostrum_checked
                            ? "Sim"
                            : "Não"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{fmtDate(p.iron_date)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{fmtDate(p.tail_dock_date)}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {p.sex === "macho" ? fmtDate(p.castration_date) : "n/a"}
                      </td>
                      <td className="px-3 py-2">
                        {STATUS_LABEL[p.status ?? "ativo"]}
                        {p.status === "morto" && p.death_cause ? (
                          <span className="block text-xs text-muted-foreground">
                            {p.death_cause}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <PigletEdit p={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendencias">
          <p className="mb-3 text-xs text-muted-foreground">
            Leitões vivos na maternidade sem o registro indicado. O prazo de cada manejo segue o
            protocolo do responsável técnico; o sistema só aponta a falta de registro, sem sugerir
            dose ou produto.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((g) => (
              <div key={g.label} className="panel p-4">
                <p className="text-sm font-semibold">
                  {g.label} <span className="font-mono text-primary">({g.items.length})</span>
                </p>
                {g.items.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">Nada pendente.</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {g.items.slice(0, 40).map((p) => (
                      <li key={p.id} className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                        {p.australian_number} · {sowOf(p)} · {ageOf(p) ?? "?"}d
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coletivo">
          {nursing.length === 0 ? (
            <Empty>Nenhuma leitegada em maternidade.</Empty>
          ) : (
            <div className="panel overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Matriz",
                      "Parto",
                      "Idade",
                      "Vivos (saldo)",
                      "Identificados vivos",
                      "Sem ferro",
                      "Refugos no parto",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nursing.map((l) => {
                    const ps = activeP.filter((p) => p.litter_id === l.id);
                    return (
                      <tr key={l.id} className="border-t border-border/60">
                        <td className="px-3 py-2 font-mono">{tag(l.sow_id)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{fmtDate(l.farrowing_date)}</td>
                        <td className="px-3 py-2">{daysBetween(l.farrowing_date, today)} d</td>
                        <td className="px-3 py-2 tabular-nums">{livePiglets(l)}</td>
                        <td className="px-3 py-2 tabular-nums">{ps.length}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {ps.filter((p) => !p.iron_date).length}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{l.runts ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="adocoes">
          {adoptions.length === 0 ? (
            <Empty>Nenhuma adoção entre matrizes registrada.</Empty>
          ) : (
            <div className="panel overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Data",
                      "Matriz de origem",
                      "Matriz receptora",
                      "Quantidade",
                      "Motivo",
                      "Responsável",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adoptions.map((e) => {
                    const from = litterById.get(e.litter_id);
                    const to = e.related_litter_id
                      ? litterById.get(e.related_litter_id)
                      : undefined;
                    return (
                      <tr key={e.id} className="border-t border-border/60">
                        <td className="px-3 py-2 font-mono text-xs">{fmtDate(e.event_date)}</td>
                        <td className="px-3 py-2 font-mono">{from ? tag(from.sow_id) : "?"}</td>
                        <td className="px-3 py-2 font-mono">{to ? tag(to.sow_id) : "?"}</td>
                        <td className="px-3 py-2 tabular-nums">{e.quantity}</td>
                        <td className="px-3 py-2">{e.cause ?? "—"}</td>
                        <td className="px-3 py-2">{e.responsible ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PigletEdit({ p }: { p: Piglet }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const pens = useQuery(pensQuery);
  const [busy, setBusy] = useState(false);
  if (!perms?.canWrite) return null;
  const d = (v: string | number | null | undefined) =>
    v === null || v === undefined ? "" : String(v);
  return (
    <FormDialog
      title={`Manejo do leitão ${p.australian_number}`}
      trigger={
        <Button size="sm" variant="ghost">
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Manejo
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const opt = (k: string) => {
              const v = String(f.get(k) ?? "").trim();
              return v === "" ? null : v;
            };
            const num = (k: string) => {
              const v = opt(k);
              return v === null ? null : Number(v.replace(",", "."));
            };
            const today = todayISO();
            const dates = ["iron_date", "tail_dock_date", "castration_date"].map(opt);
            if (dates.some((x) => x && x > today)) {
              toast.error("Datas de manejo não podem estar no futuro.");
              return;
            }
            const bw = num("birth_weight_kg"),
              ww = num("weaning_weight_kg");
            if ((bw !== null && !(bw > 0 && bw < 5)) || (ww !== null && !(ww > 0 && ww < 60))) {
              toast.error("Confira os pesos informados.");
              return;
            }
            const colostrum = opt("colostrum_checked");
            setBusy(true);
            const { error } = await supabase
              .from("piglet_identifications")
              .update({
                sex: opt("sex"),
                birth_weight_kg: bw,
                birth_condition: opt("birth_condition"),
                colostrum_checked: colostrum === null ? null : colostrum === "sim",
                iron_date: dates[0] ?? null,
                tail_dock_date: dates[1] ?? null,
                castration_date: dates[2] ?? null,
                pen_id: opt("pen_id"),
                weaning_weight_kg: ww,
                notes: opt("notes"),
              })
              .eq("id", p.id);
            setBusy(false);
            if (error) {
              toast.error(friendlyError(error));
              return;
            }
            toast.success("Manejo registrado.");
            await qc.invalidateQueries({ queryKey: ["piglet_identifications"] });
            close();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sexo">
              <select name="sex" className={selectCls} defaultValue={d(p.sex)}>
                <option value="">Não informado</option>
                <option value="macho">Macho</option>
                <option value="femea">Fêmea</option>
              </select>
            </Field>
            <Field label="Peso ao nascer (kg)">
              <Input
                name="birth_weight_kg"
                inputMode="decimal"
                defaultValue={d(p.birth_weight_kg)}
                className="h-11"
              />
            </Field>
            <Field label="Condição inicial">
              <select
                name="birth_condition"
                className={selectCls}
                defaultValue={d(p.birth_condition)}
              >
                <option value="">Não avaliada</option>
                {Object.entries(COND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Colostragem observada">
              <select
                name="colostrum_checked"
                className={selectCls}
                defaultValue={
                  p.colostrum_checked === null || p.colostrum_checked === undefined
                    ? ""
                    : p.colostrum_checked
                      ? "sim"
                      : "nao"
                }
              >
                <option value="">Não registrada</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </Field>
            <Field label="Aplicação de ferro (data)">
              <Input
                name="iron_date"
                type="date"
                max={todayISO()}
                defaultValue={d(p.iron_date)}
                className="h-11"
              />
            </Field>
            <Field label="Corte de cauda (data)">
              <Input
                name="tail_dock_date"
                type="date"
                max={todayISO()}
                defaultValue={d(p.tail_dock_date)}
                className="h-11"
              />
            </Field>
            {p.sex === "macho" && (
              <Field label="Castração (data)">
                <Input
                  name="castration_date"
                  type="date"
                  max={todayISO()}
                  defaultValue={d(p.castration_date)}
                  className="h-11"
                />
              </Field>
            )}
            <Field label="Baia">
              <select name="pen_id" className={selectCls} defaultValue={d(p.pen_id)}>
                <option value="">Com a matriz</option>
                {(pens.data ?? []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.code} · {x.sector}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Peso ao desmame (kg)">
              <Input
                name="weaning_weight_kg"
                inputMode="decimal"
                defaultValue={d(p.weaning_weight_kg)}
                className="h-11"
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Produto, dose e via de ferro, vacinas e medicamentos ficam no prontuário sanitário da
            matriz (opção “Um leitão identificado”), seguindo a prescrição do veterinário.
          </p>
          <Field label="Observações">
            <Textarea name="notes" rows={2} defaultValue={d(p.notes)} />
          </Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}
