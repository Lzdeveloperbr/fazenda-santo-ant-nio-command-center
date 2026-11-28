import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Printer, PiggyBank, CalendarDays, Baby, Scale, Syringe, Pill, ShieldCheck, CalendarClock } from "lucide-react";
import { allSowsQuery, breedingsQuery, litterEventsQuery, littersQuery, LITTER_EVENT_LABEL, pensQuery, SOW_EVENT_LABEL, SOW_STATUS, sowEventsQuery, fmtDate, livePiglets, todayISO, isCountedLitter } from "@/lib/farm";
import { farmSettingsQuery, DEFAULT_FARM_SETTINGS } from "@/lib/farm/farm-settings";
import { parityOf, SOW_CATEGORY_LABEL, sowSituation } from "@/lib/farm/sow-profile";
import { daysBetween } from "@/lib/farm/gestation";
import { SowFormDialog } from "@/components/farm/SowForm";
import { farrowingInterval, sowVsHerd } from "@/lib/farm/zootech";
import { FavoriteButton } from "@/components/farm/Favorites";
import { SowHealthSummary } from "@/components/farm/SowCare";
import { ArchiveSowButton, SowPhoto, SowQrCode, SowTimeline } from "@/components/farm/SowRecordExtras";
import { SowConditionSection } from "@/components/farm/ReproExtras";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/lib/access";
import { FormDialog, Field, SubmitRow, selectCls } from "@/components/farm/FormDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Litter, Sow } from "@/lib/farm";
import { useState } from "react";
import { friendlyError } from "@/lib/errors";


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
  const qc = useQueryClient();
  const sows = useQuery(allSowsQuery);
  const pens = useQuery(pensQuery);
  const settings = useQuery(farmSettingsQuery);
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
  const countedLitters = sowLitters.filter(isCountedLitter);
  const events = (sowEvents.data ?? []).filter((item) => item.sow_id === sow.id);
  const totalAlive = countedLitters.reduce((sum, litter) => sum + litter.born_alive, 0);
  const totalWeaned = countedLitters.reduce((sum, litter) => sum + (litter.weaned ?? 0), 0);
  const totalDeaths = countedLitters.reduce((sum, litter) => sum + litter.deaths, 0);
  const averageAlive = countedLitters.length ? (totalAlive / countedLitters.length).toFixed(1) : "—";
  const today = todayISO();
  const cfg = settings.data ?? DEFAULT_FARM_SETTINGS;
  const situation = sowSituation(sow, sowBreedings, sowLitters, { attentionStart: cfg.gestation.attentionStart, gestationDays: cfg.gestation.gestationDays, maternityTransferDay: cfg.maternityTransferDay }, today);
  const pen = pens.data?.find((p) => p.id === sow.pen_id);
  const ageMonths = sow.birth_date ? Math.floor(daysBetween(sow.birth_date, today) / 30.44) : null;
  const info: [string, string][] = [
    ["Raça / genética", sow.breed || "—"],
    ["Linhagem", sow.lineage || "—"],
    ["Categoria", sow.category ? SOW_CATEGORY_LABEL[sow.category] ?? sow.category : "—"],
    ["Nascimento", sow.birth_date ? `${fmtDate(sow.birth_date)}${ageMonths !== null ? ` (${ageMonths} meses)` : ""}` : "—"],
    ["Entrada na granja", fmtDate(sow.entry_date)],
    ["Origem", sow.origin || "—"],
    ["Pai", sow.sire || "—"],
    ["Mãe", sow.dam || "—"],
    ["Ordem de parto", String(parityOf(sowLitters))],
    ["Baia", pen ? `${pen.code} · ${pen.sector}` : "—"],
    ["Lote / grupo", sow.group_label || "—"],
    ["Peso", sow.weight_kg !== null && sow.weight_kg !== undefined ? `${String(sow.weight_kg).replace(".", ",")} kg em ${fmtDate(sow.weight_date)}` : "—"],
    ["Situação gravada", SOW_STATUS[sow.status]?.label ?? sow.status],
    ["Cadastro", fmtDate(sow.created_at)],
  ];

  return (
    <div className="sow-record space-y-6">
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } body * { visibility: hidden !important; } .sow-record, .sow-record * { visibility: visible !important; } .sow-record { position: absolute !important; inset: 0 !important; width: 100% !important; } .sow-record .panel { box-shadow: none !important; break-inside: avoid; } .no-print { display: none !important; } }`}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/matrizes"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Voltar às matrizes</Button></Link>
        <div className="flex flex-wrap gap-2"><SowFormDialog sow={sow} onDone={() => void qc.invalidateQueries({ queryKey: ["sows"] })} trigger={<Button variant="outline"><Pencil className="mr-2 h-4 w-4" />Editar cadastro</Button>} /><ArchiveSowButton sow={sow} /><DeleteSowButton sow={sow} /><Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir / salvar PDF</Button></div>
      </div>

      <section className="panel p-5 sm:p-6">
        {sow.archived_at && <p className="mb-4 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">Cadastro arquivado em {fmtDate(sow.archived_at)}: {sow.archived_reason}. Fora das listas e indicadores; histórico preservado.</p>}
        <div className="flex flex-wrap items-start gap-4">
          <SowPhoto sow={sow} />
          <div className="min-w-0 flex-1">
            <p className="label-tech">Ficha individual da matriz</p>
            <div className="mt-2 flex items-center gap-2"><h1 className="font-mono text-3xl font-bold">{sow.ear_tag}</h1><FavoriteButton kind="matriz" path={sow.id} label={sow.ear_tag} className="no-print h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-muted" /></div>
            <p className="mt-1 text-lg">{sow.name || "Sem nome cadastrado"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">{situation.label}</span>
              {situation.condition && <span className="rounded-full bg-warn/15 px-3 py-1.5 text-sm font-semibold text-warn">{situation.condition}</span>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{situation.reason}</p>
          </div>
          <SowQrCode sow={sow} />
        </div>
        <dl className="mt-5 grid gap-3 border-t pt-5 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {info.map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
        </dl>
        {sow.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-6">{sow.notes}</p>}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RecordStat label="Partos" value={countedLitters.length} />
        <RecordStat label="Nascidos vivos" value={totalAlive} hint={`Média ${averageAlive} por parto`} />
        <RecordStat label="Desmamados" value={totalWeaned} />
        <RecordStat label="Mortes registradas" value={totalDeaths} />
      </div>
      {countedLitters.length > 0 && (() => {
        const herd = sowVsHerd(litters.data ?? []);
        const me = herd.rows.find((r) => r.sowId === sow.id);
        const interval = farrowingInterval(countedLitters.map((l) => l.farrowing_date));
        const fmt = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(1).replace(".", ","));
        const sign = (v: number | null | undefined) => (v == null || Math.abs(v) < 0.05 ? "" : ` (${v > 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")})`);
        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <RecordStat label="Vivos por parto × plantel" value={fmt(me?.bornAlive.value)} hint={`Plantel: ${fmt(herd.herdNV.value)}${sign(me?.nvDiff)}`} />
            <RecordStat label="Desmamados por leitegada × plantel" value={fmt(me?.weaned.value)} hint={`Plantel: ${fmt(herd.herdW.value)}${sign(me?.wDiff)}`} />
            <RecordStat label="Intervalo médio entre partos" value={interval == null ? "—" : `${interval} d`} hint={interval == null ? "Precisa de 2 partos registrados" : `${countedLitters.length} partos registrados`} />
          </div>
        );
      })()}
      <SowHealthSummary sow={sow} />

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
              <div><p className="flex items-center gap-2 font-semibold"><Baby className="h-4 w-4 text-primary" />Parto em {fmtDate(litter.farrowing_date)}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{litter.status === "desmamada" ? `Desmamada em ${fmtDate(litter.weaning_date)}` : litter.status === "cancelada" ? "Cadastro arquivado — histórico preservado" : "Em maternidade"}</p></div>
              <p className="font-mono text-sm">{litter.status === "maternidade" ? `${livePiglets(litter)} vivos agora` : litter.status === "cancelada" ? "Arquivada" : `${litter.weaned ?? 0} desmamados`}</p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center text-sm sm:grid-cols-6">
              <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-mono font-semibold">{litter.born_total}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Vivos</dt><dd className="font-mono font-semibold">{litter.born_alive}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Natimortos</dt><dd className="font-mono font-semibold">{litter.stillborn}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Mortes</dt><dd className="font-mono font-semibold">{litter.deaths}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Transferências</dt><dd className="font-mono font-semibold">+{litter.transfers_in} / −{litter.transfers_out}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Peso médio</dt><dd className="font-mono font-semibold">{litter.avg_weight ? `${litter.avg_weight} kg` : "—"}</dd></div>
            </dl>
            {litter.farrowing_notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">{litter.farrowing_notes}</p>}
            {eventsForLitter.length > 0 && <div className="mt-3 border-t pt-3"><p className="label-tech mb-2">Eventos da leitegada</p><ul className="space-y-2">{eventsForLitter.map((event) => <li key={event.id} className="text-sm"><span className="font-mono text-xs text-muted-foreground">{fmtDate(event.event_date)}</span> · <strong>{LITTER_EVENT_LABEL[event.event_type] ?? event.event_type}</strong>{event.quantity > 0 ? ` · ${event.quantity} leitão(ões)` : ""}{event.value ? ` · ${event.value} kg` : ""}{event.note ? <span className="block pl-1 text-xs text-muted-foreground">{event.note}</span> : null}</li>)}</ul></div>}
          </article>;
        })}</div>}
      </section>

      <SowConditionSection sow={sow} />

      <AnimalHealthSection sow={sow} litters={countedLitters} />

      <SowTimeline sow={sow} breedings={sowBreedings} litters={sowLitters} litterEvents={litterEvents.data ?? []} sowEvents={events} />

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


type HealthScope = "matriz" | "leitegada" | "leitao";
const db = supabase as any;
const healthScopeText = (scope:string, piglet?:string|null) => scope==="matriz"?"Matriz":scope==="leitegada"?"Leitegada inteira":scope==="leitao"?`Leitão · ${piglet||"sem identificação"}`:"Grupo/lote";

function AnimalHealthSection({sow,litters}:{sow:Sow;litters:Litter[]}) {
 const qc=useQueryClient();
 const vaccines=useQuery({queryKey:["vaccination_records","sow",sow.id],queryFn:async()=>{const {data,error}=await db.from("vaccination_records").select("*").eq("sow_id",sow.id).order("vaccination_date",{ascending:false});if(error)throw error;return data??[];}});
 const meds=useQuery({queryKey:["medication_records","sow",sow.id],queryFn:async()=>{const {data,error}=await db.from("medication_records").select("*").eq("sow_id",sow.id).order("administration_start",{ascending:false});if(error)throw error;return data??[];}});
 const refresh=()=>{void qc.invalidateQueries({queryKey:["vaccination_records"]});void qc.invalidateQueries({queryKey:["medication_records"]});void qc.invalidateQueries({queryKey:["vaccination_records","sow",sow.id]});void qc.invalidateQueries({queryKey:["medication_records","sow",sow.id]});};
 const V=vaccines.data??[], M=meds.data??[];
 return <section className="panel space-y-5 p-4 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><SectionTitle kicker="Prontuário sanitário individual" title="Vacinação e medicamentos"/><p className="mt-1 text-xs leading-5 text-muted-foreground">Histórico vinculado a esta matriz, suas leitegadas e aos leitões identificados individualmente.</p></div><ShieldCheck className="h-6 w-6 text-primary"/></div>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><RecordStat label="Vacinações" value={V.length}/><RecordStat label="Medicamentos" value={M.length}/><RecordStat label="Próximos reforços" value={V.filter((x:any)=>x.next_due_date&&x.next_due_date>=todayISO()).length}/><RecordStat label="Antimicrobianos" value={M.filter((x:any)=>x.is_antimicrobial).length}/></div>
  <div className="space-y-3">
   <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Syringe className="h-4 w-4 text-primary"/><h3 className="font-semibold">Tabela de vacinação</h3></div><NewAnimalVaccine sow={sow} litters={litters} onDone={refresh}/></div>
   {vaccines.isLoading?<p className="text-xs text-muted-foreground">Carregando vacinações…</p>:vaccines.isError?<p className="rounded-lg bg-warn/10 p-3 text-xs">Não foi possível carregar as vacinações: {(vaccines.error as Error).message}</p>:V.length===0?<Empty>Nenhuma vacinação vinculada a esta matriz foi registrada.</Empty>:<div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Data","Vacina / produto","Alvo / identificação","Quantidade","Próxima data","Lote / validade","Responsáveis"].map(x=><th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead><tbody className="divide-y">{V.map((x:any)=><tr key={x.id}><td className="px-3 py-3 font-mono text-xs">{fmtDate(x.vaccination_date)}</td><td className="px-3 py-3"><b>{x.vaccine_name}</b><p className="text-xs text-muted-foreground">{healthScopeText(x.animal_scope,x.piglet_identifier)}</p></td><td className="px-3 py-3 text-xs">{healthScopeText(x.animal_scope,x.piglet_identifier)}<p className="text-muted-foreground">{x.target_group}</p></td><td className="px-3 py-3 font-mono text-xs">{x.animals_vaccinated}/{x.animals_planned||"—"}</td><td className="px-3 py-3 font-mono text-xs">{fmtDate(x.next_due_date)}</td><td className="px-3 py-3 text-xs">{x.batch||"—"}<p className="text-muted-foreground">Val.: {fmtDate(x.expiry_date)}</p></td><td className="px-3 py-3 text-xs">{x.veterinarian||"Vet. —"}<p className="text-muted-foreground">{x.responsible||"Aplicador —"}</p></td></tr>)}</tbody></table></div>}
  </div>
  <div className="space-y-3">
   <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Pill className="h-4 w-4 text-primary"/><h3 className="font-semibold">Tabela de medicamentos e tratamentos</h3></div><NewAnimalMedication sow={sow} litters={litters} onDone={refresh}/></div>
   {meds.isLoading?<p className="text-xs text-muted-foreground">Carregando medicamentos…</p>:meds.isError?<p className="rounded-lg bg-warn/10 p-3 text-xs">Não foi possível carregar os medicamentos: {(meds.error as Error).message}</p>:M.length===0?<Empty>Nenhum medicamento vinculado a esta matriz foi registrado.</Empty>:<div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Início / fim","Produto / princípio ativo","Alvo / identificação","Prescrição / dose registrada","Carência","Lote","Veterinário / responsável"].map(x=><th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead><tbody className="divide-y">{M.map((x:any)=><tr key={x.id}><td className="px-3 py-3 font-mono text-xs">{fmtDate(x.administration_start)}<p className="text-muted-foreground">até {fmtDate(x.administration_end)}</p></td><td className="px-3 py-3"><b>{x.product_name}</b><p className="text-xs text-muted-foreground">{x.active_ingredient||x.therapeutic_class||"—"}</p>{x.is_antimicrobial&&<span className="mt-1 inline-flex rounded-full bg-warn/15 px-2 py-0.5 text-[.65rem] font-bold">Antimicrobiano</span>}</td><td className="px-3 py-3 text-xs">{healthScopeText(x.animal_scope,x.piglet_identifier)}</td><td className="px-3 py-3 text-xs">{x.prescription_reference||"Prescrição —"}<p className="text-muted-foreground">{x.dose_as_prescribed||"Dose não informada"}</p></td><td className="px-3 py-3 font-mono text-xs">{x.withdrawal_days} dias</td><td className="px-3 py-3 text-xs">{x.batch||"—"}</td><td className="px-3 py-3 text-xs">{x.veterinarian||"Vet. —"}<p className="text-muted-foreground">{x.responsible||"Responsável —"}</p></td></tr>)}</tbody></table></div>}
  </div>
  <p className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs leading-5"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0"/>Registre somente aplicações efetivamente realizadas e prescrições confirmadas. Dose, via, frequência, intervalo, reforços e carência devem seguir a bula e a orientação do médico-veterinário responsável. Esta tela não prescreve nem calcula tratamentos.</p>
 </section>;
}

function HealthTargetFields({sow,litters,scope,setScope}:{sow:Sow;litters:Litter[];scope:HealthScope;setScope:(v:HealthScope)=>void}) {
 const [litterId,setLitterId]=useState("");
 return <>
  <Field label="Aplicação destinada a"><select className={selectCls} value={scope} onChange={e=>setScope(e.target.value as HealthScope)}><option value="matriz">Somente a matriz</option><option value="leitegada">Leitegada inteira</option><option value="leitao">Um leitão identificado</option></select></Field>
  {scope!=="matriz"&&<Field label="Leitegada"><select name="litter_id" className={selectCls} required value={litterId} onChange={e=>setLitterId(e.target.value)}><option value="">Selecione a leitegada</option>{litters.map(l=><option key={l.id} value={l.id}>{fmtDate(l.farrowing_date)} · {l.status==="maternidade"?"Em maternidade":"Desmamada"} · {l.born_alive} nascidos vivos</option>)}</select></Field>}
  {scope==="leitao"&&<Field label="Identificação individual do leitão"><Input name="piglet_identifier" required placeholder="Brinco, marca ou código individual"/></Field>}
  <input type="hidden" name="animal_scope" value={scope}/>
  <input type="hidden" name="sow_id" value={sow.id}/>
 </>;
}

function NewAnimalVaccine({sow,litters,onDone}:{sow:Sow;litters:Litter[];onDone:()=>void}) {
 const [busy,setBusy]=useState(false),[scope,setScope]=useState<HealthScope>("matriz");
 return <FormDialog title={`Nova vacinação · matriz ${sow.ear_tag}`} trigger={<Button size="sm"><Syringe className="mr-2 h-4 w-4"/>Registrar vacina</Button>}>{close=><form className="space-y-3" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const s=String(fd.get("animal_scope"));const litter=String(fd.get("litter_id")||"")||null;const piglet=String(fd.get("piglet_identifier")||"").trim()||null;if(s!=="matriz"&&!litter){toast.error("Selecione a leitegada.");return;}if(s==="leitao"&&!piglet){toast.error("Informe a identificação do leitão.");return;}const payload={animal_scope:s,sow_id:sow.id,litter_id:litter,piglet_identifier:piglet,vaccine_name:String(fd.get("vaccine_name")).trim(),target_group:s==="matriz"?"Matriz":s==="leitegada"?"Leitegada":"Leitão individual",vaccination_date:String(fd.get("vaccination_date")),next_due_date:String(fd.get("next_due_date")||"")||null,animals_planned:Number(fd.get("planned")||0),animals_vaccinated:Number(fd.get("vaccinated")||0),manufacturer:String(fd.get("manufacturer")||"")||null,batch:String(fd.get("batch")||"")||null,expiry_date:String(fd.get("expiry_date")||"")||null,route:String(fd.get("route")||"")||null,protocol_reference:String(fd.get("protocol")||"")||null,veterinarian:String(fd.get("veterinarian")||"")||null,responsible:String(fd.get("responsible")||"")||null,notes:String(fd.get("notes")||"")||null};setBusy(true);const {error}=await db.from("vaccination_records").insert(payload);setBusy(false);if(error){toast.error(friendlyError(error));return;}toast.success("Vacinação registrada no prontuário.");close();onDone();}}><p className="text-xs text-muted-foreground">Registre somente uma aplicação realizada. Confira produto, lote, validade e protocolo com o médico-veterinário.</p><HealthTargetFields sow={sow} litters={litters} scope={scope} setScope={setScope}/><Field label="Vacina / produto"><Input name="vaccine_name" required/></Field><div className="grid grid-cols-2 gap-3"><Field label="Data aplicada"><Input name="vaccination_date" type="date" defaultValue={todayISO()} required/></Field><Field label="Próxima dose/revisão"><Input name="next_due_date" type="date"/></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Animais planejados"><Input name="planned" type="number" min="0" defaultValue={scope==="matriz"?"1":"0"}/></Field><Field label="Animais vacinados"><Input name="vaccinated" type="number" min="0" defaultValue={scope==="matriz"?"1":"0"}/></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Fabricante"><Input name="manufacturer"/></Field><Field label="Lote"><Input name="batch"/></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Validade"><Input name="expiry_date" type="date"/></Field><Field label="Via (conforme bula)"><Input name="route"/></Field></div><Field label="Protocolo / referência veterinária"><Input name="protocol"/></Field><div className="grid grid-cols-2 gap-3"><Field label="Médico-veterinário"><Input name="veterinarian"/></Field><Field label="Aplicador"><Input name="responsible"/></Field></div><Field label="Observações"><Textarea name="notes" rows={2}/></Field><SubmitRow busy={busy} label="Salvar vacinação"/></form>}</FormDialog>;
}

function NewAnimalMedication({sow,litters,onDone}:{sow:Sow;litters:Litter[];onDone:()=>void}) {
 const [busy,setBusy]=useState(false),[scope,setScope]=useState<HealthScope>("matriz");
 return <FormDialog title={`Novo medicamento · matriz ${sow.ear_tag}`} trigger={<Button size="sm" variant="outline"><Pill className="mr-2 h-4 w-4"/>Registrar medicamento</Button>}>{close=><form className="space-y-3" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const s=String(fd.get("animal_scope"));const litter=String(fd.get("litter_id")||"")||null;const piglet=String(fd.get("piglet_identifier")||"").trim()||null;const antimicrobial=fd.has("antimicrobial");const vet=String(fd.get("veterinarian")||"").trim();const prescription=String(fd.get("prescription")||"").trim();if(s!=="matriz"&&!litter){toast.error("Selecione a leitegada.");return;}if(s==="leitao"&&!piglet){toast.error("Informe a identificação do leitão.");return;}if(antimicrobial&&(!vet||!prescription)){toast.error("Antimicrobianos exigem veterinário e referência da prescrição.");return;}const payload={animal_scope:s,sow_id:sow.id,litter_id:litter,piglet_identifier:piglet,product_name:String(fd.get("product_name")).trim(),active_ingredient:String(fd.get("active_ingredient")||"")||null,therapeutic_class:String(fd.get("therapeutic_class")||"")||null,is_antimicrobial:antimicrobial,prescription_reference:prescription||null,veterinarian:vet||null,batch:String(fd.get("batch")||"")||null,animals_treated:Number(fd.get("animals_treated")||0),dose_as_prescribed:String(fd.get("dose")||"")||null,route:String(fd.get("route")||"")||null,frequency:String(fd.get("frequency")||"")||null,administration_start:String(fd.get("start")),administration_end:String(fd.get("end")||"")||null,withdrawal_days:Number(fd.get("withdrawal")||0),responsible:String(fd.get("responsible")||"")||null,notes:String(fd.get("notes")||"")||null};if(payload.administration_end&&payload.administration_end<payload.administration_start){toast.error("A data final não pode anteceder o início.");return;}setBusy(true);const {error}=await db.from("medication_records").insert(payload);setBusy(false);if(error){toast.error(friendlyError(error));return;}toast.success("Medicamento registrado no prontuário.");close();onDone();}}><p className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs leading-5">Transcreva a prescrição confirmada. Não escolha produto, dose, via, frequência ou duração por conta própria. Respeite a carência definida na bula e pelo veterinário.</p><HealthTargetFields sow={sow} litters={litters} scope={scope} setScope={setScope}/><Field label="Medicamento / produto"><Input name="product_name" required/></Field><div className="grid grid-cols-2 gap-3"><Field label="Princípio ativo"><Input name="active_ingredient"/></Field><Field label="Classe terapêutica"><Input name="therapeutic_class"/></Field></div><label className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm"><input type="checkbox" name="antimicrobial" className="h-4 w-4"/>É antimicrobiano</label><div className="grid grid-cols-2 gap-3"><Field label="Referência da prescrição"><Input name="prescription"/></Field><Field label="Médico-veterinário"><Input name="veterinarian"/></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Data de início"><Input name="start" type="date" defaultValue={todayISO()} required/></Field><Field label="Data de término"><Input name="end" type="date"/></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Quantidade de animais tratados"><Input name="animals_treated" type="number" min="0" defaultValue={scope==="matriz"?"1":"0"}/></Field><Field label="Carência (dias, conforme bula)"><Input name="withdrawal" type="number" min="0" defaultValue="0"/></Field></div><Field label="Dose exatamente como prescrita"><Input name="dose" placeholder="Transcrever da prescrição"/></Field><div className="grid grid-cols-2 gap-3"><Field label="Via"><Input name="route"/></Field><Field label="Frequência"><Input name="frequency"/></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Lote do produto"><Input name="batch"/></Field><Field label="Responsável pela administração"><Input name="responsible"/></Field></div><Field label="Observações"><Textarea name="notes" rows={2}/></Field><SubmitRow busy={busy} label="Salvar medicamento"/></form>}</FormDialog>;
}


function DeleteSowButton({ sow }: { sow: Sow }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const perms = usePermissions();
  if (!perms?.canDelete) return null;
  return (
    <FormDialog title={`Excluir matriz ${sow.ear_tag}`} trigger={<Button variant="destructive">Excluir matriz</Button>}>
      {(close) => (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (typed.trim() !== sow.ear_tag) { toast.error("Digite o brinco exatamente para confirmar."); return; }
          setBusy(true);
          const { error } = await supabase.rpc("delete_sow", { p_sow_id: sow.id });
          setBusy(false);
          if (error) { toast.error(friendlyError(error)); return; }
          await qc.invalidateQueries();
          toast.success("Matriz excluída.");
          close();
          navigate({ to: "/matrizes" });
        }}>
          <p className="text-sm text-muted-foreground">Isto apaga a matriz e todo o histórico dela: coberturas, partos, leitegadas, eventos e registros sanitários. Não dá para desfazer pelo aplicativo; uma cópia dos dados apagados fica no Histórico de alterações. Se ela só saiu do plantel, prefira registrar descarte, morte ou transferência.</p>
          <Field label={`Digite o brinco "${sow.ear_tag}" para confirmar`}><Input value={typed} onChange={(e) => setTyped(e.target.value)} /></Field>
          <Button type="submit" variant="destructive" disabled={busy || typed.trim() !== sow.ear_tag} className="h-11 w-full">{busy ? "Excluindo…" : "Excluir definitivamente"}</Button>
        </form>
      )}
    </FormDialog>
  );
}
