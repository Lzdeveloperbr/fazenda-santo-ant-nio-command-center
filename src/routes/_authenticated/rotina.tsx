import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, MessageSquareWarning, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  dailyActivityQuery,
  fmtDate,
  issueReportsQuery,
  profilesQuery,
  shiftHandoversQuery,
  todayISO,
  type IssueReport,
} from "@/lib/farm";
import { AUDIT_TABLE_LABEL, usePermissions } from "@/lib/access";
import {
  currentShift,
  ISSUE_CATEGORY_LABEL,
  ISSUE_STATUS_LABEL,
  SHIFT_LABEL,
  summarizeActivity,
} from "@/lib/farm/team";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/rotina")({
  head: () => ({
    meta: [
      { title: "Rotina da equipe | Fazenda Santo Antônio" },
      {
        name: "description",
        content: "Passagem de turno, relatos de problemas e atividade diária da equipe.",
      },
    ],
  }),
  component: Rotina,
});

const errMsg = (e: unknown) => friendlyError(e);
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function useNames() {
  const profiles = useQuery(profilesQuery);
  return useMemo(() => {
    const m = new Map((profiles.data ?? []).map((p) => [p.id, p.display_name]));
    return (id: string | null) => (id ? m.get(id) || "Usuário" : "Sistema");
  }, [profiles.data]);
}

function Rotina() {
  const perms = usePermissions();
  return (
    <div className="space-y-6">
      <SectionTitle kicker="Equipe" title="Rotina da equipe" />
      <Tabs defaultValue="turno">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="turno">Passagem de turno</TabsTrigger>
          <TabsTrigger value="problemas">Problemas</TabsTrigger>
          {perms?.canViewAudit && <TabsTrigger value="atividade">Atividade do dia</TabsTrigger>}
        </TabsList>
        <TabsContent value="turno" className="mt-4">
          <Handovers />
        </TabsContent>
        <TabsContent value="problemas" className="mt-4">
          <Issues />
        </TabsContent>
        {perms?.canViewAudit && (
          <TabsContent value="atividade" className="mt-4">
            <Activity />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Handovers() {
  const qc = useQueryClient();
  const perms = usePermissions();
  const list = useQuery(shiftHandoversQuery);
  const name = useNames();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  const [busy, setBusy] = useState(false);

  async function create(e: FormEvent<HTMLFormElement>, close: () => void) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const summary = String(fd.get("summary") ?? "").trim();
    if (summary.length < 10) {
      toast.error("Descreva o turno com pelo menos 10 caracteres.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("shift_handovers").insert({
      shift_date: String(fd.get("date")),
      shift: String(fd.get("shift")),
      sector: String(fd.get("sector") ?? "").trim() || null,
      summary,
      pending: String(fd.get("pending") ?? "").trim() || null,
      occurrences: String(fd.get("occurrences") ?? "").trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success("Turno passado.");
    close();
    void qc.invalidateQueries({ queryKey: ["shift_handovers"] });
  }
  async function receive(id: string) {
    const { error } = await supabase
      .from("shift_handovers")
      .update({ received_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success("Recebimento confirmado.");
    void qc.invalidateQueries({ queryKey: ["shift_handovers"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Quem sai registra o que aconteceu e o que ficou pendente; quem entra confirma que leu.
          Depois de recebido, o registro não muda mais.
        </p>
        {perms?.canWrite && (
          <FormDialog
            title="Passar o turno"
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Passar turno
              </Button>
            }
          >
            {(close) => (
              <form className="space-y-3" onSubmit={(e) => void create(e, close)}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Data">
                    <Input
                      name="date"
                      type="date"
                      defaultValue={todayISO()}
                      max={todayISO()}
                      required
                    />
                  </Field>
                  <Field label="Turno">
                    <select name="shift" className={selectCls} defaultValue={currentShift()}>
                      {Object.entries(SHIFT_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Setor">
                  <Input name="sector" placeholder="Maternidade, gestação, creche…" />
                </Field>
                <Field label="Resumo do turno *">
                  <Textarea name="summary" rows={3} required minLength={10} />
                </Field>
                <Field label="Pendências para o próximo turno">
                  <Textarea name="pending" rows={2} />
                </Field>
                <Field label="Ocorrências (partos, mortes, animais doentes, equipamentos)">
                  <Textarea name="occurrences" rows={2} />
                </Field>
                <SubmitRow busy={busy} label="Registrar passagem" />
              </form>
            )}
          </FormDialog>
        )}
      </div>
      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !list.data?.length ? (
        <Empty>Nenhuma passagem de turno registrada.</Empty>
      ) : (
        <ul className="space-y-3">
          {list.data.map((h) => (
            <li key={h.id} className="panel space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {fmtDate(h.shift_date)} · {SHIFT_LABEL[h.shift] ?? h.shift}
                  {h.sector ? ` · ${h.sector}` : ""}
                </p>
                {h.received_at ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Recebido por {name(h.received_by)} às {time(h.received_at)}
                  </span>
                ) : me && me !== h.created_by && perms?.canWrite ? (
                  <Button size="sm" variant="outline" onClick={() => void receive(h.id)}>
                    Confirmar recebimento
                  </Button>
                ) : (
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Aguardando quem assume
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Passado por {name(h.created_by)} às {time(h.created_at)}
              </p>
              <p className="whitespace-pre-line text-sm">{h.summary}</p>
              {h.pending && (
                <p className="whitespace-pre-line rounded-lg bg-muted/60 p-2 text-sm">
                  <b>Pendências:</b> {h.pending}
                </p>
              )}
              {h.occurrences && (
                <p className="whitespace-pre-line text-sm">
                  <b>Ocorrências:</b> {h.occurrences}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Issues() {
  const qc = useQueryClient();
  const perms = usePermissions();
  const list = useQuery(issueReportsQuery);
  const name = useNames();
  const [filter, setFilter] = useState("abertos");
  const [busy, setBusy] = useState(false);
  const rows = (list.data ?? []).filter((r) =>
    filter === "abertos"
      ? ["aberto", "em_analise"].includes(r.status)
      : filter === "todos"
        ? true
        : r.status === filter,
  );

  async function create(e: FormEvent<HTMLFormElement>, close: () => void) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim(),
      description = String(fd.get("description") ?? "").trim();
    if (title.length < 4 || description.length < 10) {
      toast.error("Informe um título (4+ letras) e uma descrição (10+ letras).");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("issue_reports").insert({
      title,
      description,
      category: String(fd.get("category")),
      page: String(fd.get("page") ?? "").trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success("Relato enviado.");
    close();
    void qc.invalidateQueries({ queryKey: ["issue_reports"] });
  }
  async function setStatus(r: IssueReport, status: string) {
    const resolution = ["resolvido", "descartado"].includes(status)
      ? window.prompt("O que foi feito? (opcional)", r.resolution ?? "")
      : r.resolution;
    const { error } = await supabase
      .from("issue_reports")
      .update({ status, resolution: resolution?.trim() || null })
      .eq("id", r.id);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["issue_reports"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          className={`${selectCls} w-auto`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrar relatos"
        >
          <option value="abertos">Abertos e em análise</option>
          <option value="resolvido">Resolvidos</option>
          <option value="descartado">Descartados</option>
          <option value="todos">Todos</option>
        </select>
        <FormDialog
          title="Relatar problema"
          trigger={
            <Button>
              <MessageSquareWarning className="mr-1 h-4 w-4" />
              Relatar problema
            </Button>
          }
        >
          {(close) => (
            <form className="space-y-3" onSubmit={(e) => void create(e, close)}>
              <Field label="Tipo">
                <select name="category" className={selectCls} defaultValue="erro">
                  {Object.entries(ISSUE_CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Título *">
                <Input name="title" required minLength={4} />
              </Field>
              <Field label="O que aconteceu? *">
                <Textarea
                  name="description"
                  rows={4}
                  required
                  minLength={10}
                  placeholder="O que você fez, o que esperava e o que apareceu."
                />
              </Field>
              <Field label="Tela">
                <Input name="page" placeholder="Ex.: Maternidade" />
              </Field>
              <SubmitRow busy={busy} label="Enviar relato" />
            </form>
          )}
        </FormDialog>
      </div>
      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !rows.length ? (
        <Empty>Nenhum relato nesta lista.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="panel space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{r.title}</p>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {ISSUE_STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {ISSUE_CATEGORY_LABEL[r.category] ?? r.category}
                {r.page ? ` · ${r.page}` : ""} · {name(r.created_by)} ·{" "}
                {fmtDate(r.created_at.slice(0, 10))}
              </p>
              <p className="whitespace-pre-line text-sm">{r.description}</p>
              {r.resolution && (
                <p className="rounded-lg bg-primary/5 p-2 text-sm">
                  <b>Resolução:</b> {r.resolution}
                </p>
              )}
              {perms?.canDelete && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(ISSUE_STATUS_LABEL)
                    .filter(([k]) => k !== r.status)
                    .map(([k, v]) => (
                      <Button
                        key={k}
                        size="sm"
                        variant="outline"
                        onClick={() => void setStatus(r, k)}
                      >
                        {v}
                      </Button>
                    ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Activity() {
  const [day, setDay] = useState(todayISO());
  const q = useQuery(dailyActivityQuery(day));
  const name = useNames();
  const summary = useMemo(() => summarizeActivity(q.data ?? []), [q.data]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Dia">
          <Input
            type="date"
            value={day}
            max={todayISO()}
            onChange={(e) => setDay(e.target.value || todayISO())}
            className="w-auto"
          />
        </Field>
        <p className="pb-2 text-sm text-muted-foreground">
          Contagem dos registros gravados no histórico de auditoria. Mede lançamentos no sistema,
          não a qualidade do trabalho.
        </p>
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : q.isError ? (
        <Empty>Não foi possível ler o histórico.</Empty>
      ) : !summary.length ? (
        <Empty>Nenhum registro em {fmtDate(day)}.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {summary.map((s) => (
            <article key={s.actorId ?? "sistema"} className="panel space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  {name(s.actorId)}
                </p>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {time(s.first)}–{time(s.last)}
                </span>
              </div>
              <dl className="grid grid-cols-4 gap-2 text-center text-sm">
                {(
                  [
                    ["Total", s.total],
                    ["Novos", s.inserts],
                    ["Alterados", s.updates],
                    ["Excluídos", s.deletes],
                  ] as const
                ).map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-muted/60 p-2">
                    <dt className="text-[.65rem] uppercase text-muted-foreground">{l}</dt>
                    <dd className="text-lg font-bold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {s.byTable.slice(0, 8).map(([t, c]) => (
                  <li key={t} className="rounded-full border px-2 py-0.5">
                    {AUDIT_TABLE_LABEL[t] ?? t}: {c}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
