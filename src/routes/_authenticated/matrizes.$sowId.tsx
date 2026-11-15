import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, PiggyBank, CalendarDays, Baby, Scale } from "lucide-react";
import { breedingsQuery, litterEventsQuery, littersQuery, LITTER_EVENT_LABEL, SOW_EVENT_LABEL, SOW_STATUS, sowEventsQuery, sowsQuery, fmtDate, livePiglets } from "@/lib/farm";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/matrizes/$sowId")({
  head: () => ({
    meta: [
      { title: "Ficha individual da matriz | Fazenda Santo Antônio" },
      { name: "description", content: "Histórico reprodutivo, partos, leitegadas e eventos individuais da matriz." },
      { property: "og:title", content: "Ficha individual da matriz | Fazenda Santo Antônio" },
      { property: "og:description", content: "Histórico reprodutivo e produtivo individual da matriz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SowRecord,
});

function SowRecord() {
  const { sowId } = Route.useParams();
  const sows = useQuery(sowsQuery);
  const breedings = useQuery(breedingsQuery);
  const litters = useQuery(littersQuery);
  const sowEvents = useQuery(sowEventsQuery);
  const litterEvents = useQuery(litterEventsQuery);
  const loading = sows.isLoading || breedings.isLoading || litters.isLoading || sowEvents.isLoading || litterEvents.isLoading;
  const sow = sows.data?.find((item) => item.id === sowId);

  if (loading) return <div className="panel p-8 text-center text-sm text-muted-foreground">Carregando a ficha da matriz…</div>;
  if (!sow) return <Empty>Matriz não encontrada. <Link to="/matrizes" className="text-info underline">Voltar para matrizes</Link>.</Empty>;

  const sowBreedings = (breedings.data ?? []).filter((item) => item.sow_id === sow.id);
  const sowLitters = (litters.data ?? []).filter((item) => item.sow_id === sow.id);
  const events = (sowEvents.data ?? []).filter((item) => item.sow_id === sow.id);
  const totalAlive = sowLitters.reduce((sum, litter) => sum + litter.born_alive, 0);
  const totalWeaned = sowLitters.reduce((sum, litter) => sum + (litter.weaned ?? 0), 0);
  const totalDeaths = sowLitters.reduce((sum, litter) => sum + litter.deaths, 0);
  const averageAlive = sowLitters.length ? (totalAlive / sowLitters.length).toFixed(1) : "—";

  return (
    <div className="sow-record space-y-6">
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } body * { visibility: hidden !important; } .sow-record, .sow-record * { visibility: visible !important; } .sow-record { position: absolute !important; inset: 0 !important; width: 100% !important; } .sow-record .panel { box-shadow: none !important; break-inside: avoid; } .no-print { display: none !important; } }`}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/matrizes"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Voltar às matrizes</Button></Link>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir / salvar PDF</Button>
      </div>

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-tech">Ficha individual da matriz</p>
            <h1 className="mt-2 font-mono text-3xl font-bold">{sow.ear_tag}</h1>
            <p className="mt-1 text-lg">{sow.name || "Sem nome cadastrado"}</p>
          </div>
          <span className={`rounded-full bg-muted px-3 py-1.5 text-sm font-semibold ${SOW_STATUS[sow.status]?.tone}`}>{SOW_STATUS[sow.status]?.label ?? sow.status}</span>
        </div>
        <dl className="mt-5 grid gap-3 border-t pt-5 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Raça / genética</dt><dd className="mt-1 font-semibold">{sow.breed || "—"}</dd></div>
          <div><dt className="text-muted-foreground">Nascimento</dt><dd className="mt-1 font-semibold">{fmtDate(sow.birth_date)}</dd></div>
          <div><dt className="text-muted-foreground">Cadastro</dt><dd className="mt-1 font-semibold">{fmtDate(sow.created_at)}</dd></div>
        </dl>
        {sow.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-6">{sow.notes}</p>}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RecordStat label="Partos" value={sowLitters.length} />
        <RecordStat label="Nascidos vivos" value={totalAlive} hint={`Média ${averageAlive} por parto`} />
        <RecordStat label="Desmamados" value={totalWeaned} />
        <RecordStat label="Mortes registradas" value={totalDeaths} />
      </div>

      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Reprodução" title="Coberturas e diagnósticos" />
        {sowBreedings.length === 0 ? <Empty>Nenhuma cobertura registrada.</Empty> : <div className="space-y-3">{sowBreedings.map((breeding) => (
          <article key={breeding.id} className="rounded-xl border p-3 sm:flex sm:items-center sm:justify-between">
            <div><p className="font-semibold">Cobertura em {fmtDate(breeding.breeding_date)}</p><p className="mt-1 text-xs text-muted-foreground">Reprodutor / sêmen: {breeding.boar || "não informado"}</p></div>
            <div className="mt-2 text-sm sm:mt-0 sm:text-right"><p>Diagnóstico: <strong>{breeding.pregnancy_check}</strong></p><p className="mt-1 text-xs text-muted-foreground">Parto estimado: {fmtDate(breeding.expected_farrowing)}</p></div>
          </article>
        ))}</div>}
      </section>

      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Produção" title="Partos e leitegadas" />
        {sowLitters.length === 0 ? <Empty>Nenhum parto registrado.</Empty> : <div className="space-y-4">{sowLitters.map((litter) => {
          const eventsForLitter = (litterEvents.data ?? []).filter((event) => event.litter_id === litter.id);
          return <article key={litter.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="flex items-center gap-2 font-semibold"><Baby className="h-4 w-4 text-primary" />Parto em {fmtDate(litter.farrowing_date)}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{litter.status === "desmamada" ? `Desmamada em ${fmtDate(litter.weaning_date)}` : "Em maternidade"}</p></div>
              <p className="font-mono text-sm">{litter.status === "maternidade" ? `${livePiglets(litter)} vivos agora` : `${litter.weaned ?? 0} desmamados`}</p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center text-sm sm:grid-cols-6">
              <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-mono font-semibold">{litter.born_total}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Vivos</dt><dd className="font-mono font-semibold">{litter.born_alive}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Natimortos</dt><dd className="font-mono font-semibold">{litter.stillborn}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Mortes</dt><dd className="font-mono font-semibold">{litter.deaths}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Transferências</dt><dd className="font-mono font-semibold">+{litter.transfers_in} / −{litter.transfers_out}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Peso médio</dt><dd className="font-mono font-semibold">{litter.avg_weight ? `${litter.avg_weight} kg` : "—"}</dd></div>
            </dl>
            {eventsForLitter.length > 0 && <div className="mt-3 border-t pt-3"><p className="label-tech mb-2">Eventos da leitegada</p><ul className="space-y-2">{eventsForLitter.map((event) => <li key={event.id} className="text-sm"><span className="font-mono text-xs text-muted-foreground">{fmtDate(event.event_date)}</span> · <strong>{LITTER_EVENT_LABEL[event.event_type] ?? event.event_type}</strong>{event.quantity > 0 ? ` · ${event.quantity} leitão(ões)` : ""}{event.value ? ` · ${event.value} kg` : ""}{event.note ? <span className="block pl-1 text-xs text-muted-foreground">{event.note}</span> : null}</li>)}</ul></div>}
          </article>;
        })}</div>}
      </section>

      <section className="panel p-4 sm:p-5">
        <SectionTitle kicker="Ocorrências e movimentação" title="Histórico da matriz" />
        {events.length === 0 ? <Empty>Nenhum evento individual registrado.</Empty> : <ul className="divide-y">{events.map((event) => <li key={event.id} className="py-3"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span className="font-mono text-xs">{fmtDate(event.event_date)}</span><strong className="text-sm">{SOW_EVENT_LABEL[event.event_type] ?? event.event_type}</strong></div>{event.notes && <p className="mt-1 whitespace-pre-wrap pl-6 text-sm text-muted-foreground">{event.notes}</p>}</li>)}</ul>}
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground"><PiggyBank className="h-4 w-4" />Ficha gerada somente com os registros lançados no sistema. <Scale className="ml-2 h-4 w-4" />Valores sem registro aparecem como “—”.</p>
    </div>
  );
}

function RecordStat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return <div className="panel p-4"><p className="label-tech">{label}</p><p className="mt-2 font-mono text-3xl font-bold">{value}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div>;
}
