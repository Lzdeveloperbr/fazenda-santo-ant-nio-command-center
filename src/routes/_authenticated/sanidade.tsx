import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BookOpen, FlaskConical, HeartPulse, Plus, Syringe, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayISO, fmtDate, addDaysISO } from "@/lib/farm";
import { BOOK_SOURCE, DISEASE_DOMAINS, MONITORING_TYPES, CLINICAL_INDICATORS, HERD_VISIT_AREAS, SAMPLE_WORKFLOW, BOOK_REFERENCES } from "@/lib/farm/manual-sanitario";

const db = supabase as any;
const inputCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const areaCls = "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const SECTORS = ["Gestação", "Maternidade", "Creche", "Crescimento", "Terminação", "Reprodutores", "Quarentena", "Enfermaria"];
const PHASES = ["Gestação", "Lactação", "Maternidade", "Pré-inicial", "Creche", "Crescimento", "Terminação", "Reprodutores", "Quarentena", "Outra"];

export const Route = createFileRoute("/_authenticated/sanidade")({
  head: () => ({ meta: [{ title: "Saúde e prevenção | Fazenda Santo Antônio" }, { name: "description", content: "Registros sanitários, monitoramento, amostras, vacinação, medicamentos e biossegurança." }] }),
  component: Sanidade,
});

const eventsQuery = { queryKey: ["health_events"], queryFn: async () => { const {data,error}=await db.from("health_events").select("*,farm_pens(code,sector)").order("event_date",{ascending:false}).limit(200); if(error)throw error; return data??[]; } };
const samplesQuery = { queryKey: ["health_samples"], queryFn: async () => { const {data,error}=await db.from("health_samples").select("*,health_events(event_date,sector,sign_group)").order("sample_date",{ascending:false}).limit(150); if(error)throw error; return data??[]; } };
const vaccinesQuery = { queryKey: ["vaccination_records"], queryFn: async () => { const {data,error}=await db.from("vaccination_records").select("*,farm_pens(code)").order("vaccination_date",{ascending:false}).limit(150); if(error)throw error; return data??[]; } };
const medicationsQuery = { queryKey: ["medication_records"], queryFn: async () => { const {data,error}=await db.from("medication_records").select("*,health_events(event_date,sector)").order("administration_start",{ascending:false}).limit(150); if(error)throw error; return data??[]; } };
const monitoringQuery = { queryKey: ["monitoring_records"], queryFn: async () => { const {data,error}=await db.from("monitoring_records").select("*,farm_pens(code)").order("monitoring_date",{ascending:false}).limit(200); if(error)throw error; return data??[]; } };
const checksQuery = { queryKey: ["biosecurity_checks"], queryFn: async () => { const {data,error}=await db.from("biosecurity_checks").select("*").order("check_date",{ascending:false}).limit(120); if(error)throw error; return data??[]; } };
const visitsQuery = { queryKey: ["farm_visit_reports"], queryFn: async () => { const {data,error}=await db.from("farm_visit_reports").select("*").order("visit_date",{ascending:false}).limit(80); if(error)throw error; return data??[]; } };
const pensQuery = { queryKey: ["farm_pens"], queryFn: async () => { const {data,error}=await db.from("farm_pens").select("id,code,sector").order("sector").order("code"); if(error)throw error; return data??[]; } };

async function insertRow(table: string, payload: Record<string, unknown>, close: () => void, onDone: () => void, setBusy: (v:boolean)=>void) {
  setBusy(true);
  const {error}=await db.from(table).insert(payload);
  setBusy(false);
  if(error){toast.error(error.message);return;}
  toast.success("Registro salvo no histórico da granja.");
  close();
  onDone();
}
function value(fd: FormData, key: string) { return String(fd.get(key) ?? "").trim(); }
function optional(fd: FormData, key: string) { return value(fd,key) || null; }
function number(fd: FormData, key: string) { const v=value(fd,key); return v===""?0:Number(v); }
function optionalNumber(fd: FormData, key: string) { const v=value(fd,key); return v===""?null:Number(v); }
function FieldGrid({children,cols=2}:{children:ReactNode;cols?:2|3}) { return <div className={cols===3?"grid gap-3 sm:grid-cols-3":"grid gap-3 sm:grid-cols-2"}>{children}</div>; }
function Status({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"green"|"amber"|"red"|"blue"}) {
  const cls={neutral:"bg-muted text-muted-foreground",green:"bg-emerald-50 text-emerald-800",amber:"bg-amber-50 text-amber-900",red:"bg-red-50 text-red-800",blue:"bg-sky-50 text-sky-800"}[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[.68rem] font-bold ${cls}`}>{children}</span>;
}
function Card({children}:{children:ReactNode}) { return <article className="panel p-4">{children}</article>; }

function NewHealthEvent({pens,onDone}:{pens:any[];onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog trigger={<Button><Plus className="mr-2 h-4 w-4"/>Nova ocorrência</Button>} title="Registrar ocorrência sanitária">{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await insertRow("health_events",{event_date:value(fd,"event_date"),onset_date:optional(fd,"onset_date"),sector:value(fd,"sector"),pen_id:optional(fd,"pen_id"),production_phase:optional(fd,"phase"),sign_group:value(fd,"sign_group"),clinical_signs:value(fd,"clinical_signs"),severity:value(fd,"severity"),animal_count:number(fd,"animal_count"),affected_count:number(fd,"affected_count"),death_count:number(fd,"death_count"),suspected_condition:optional(fd,"suspected_condition"),feed_change:fd.has("feed_change"),water_change:fd.has("water_change"),isolation_started:fd.has("isolation_started"),veterinarian_notified:fd.has("veterinarian_notified"),veterinarian_name:optional(fd,"veterinarian"),status:"aberto",action_taken:optional(fd,"action_taken"),follow_up_date:optional(fd,"follow_up_date"),notes:optional(fd,"notes")},close,onDone,setBusy);}}>
  <p className="text-xs leading-5 text-muted-foreground">Registre o que foi observado. O campo de suspeita é apenas uma anotação inicial; o diagnóstico deve ser confirmado pelo médico-veterinário.</p>
  <FieldGrid><Field label="Data da observação"><Input name="event_date" type="date" defaultValue={todayISO()} required/></Field><Field label="Início dos sinais (se souber)"><Input name="onset_date" type="date"/></Field></FieldGrid>
  <FieldGrid><Field label="Setor"><select name="sector" className={selectCls}>{SECTORS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Fase"><select name="phase" className={selectCls}><option value="">Não informada</option>{PHASES.map(x=><option key={x}>{x}</option>)}</select></Field></FieldGrid>
  <Field label="Baia (opcional)"><select name="pen_id" className={selectCls}><option value="">Não vinculada</option>{pens.map((p:any)=><option key={p.id} value={p.id}>{p.code} · {p.sector}</option>)}</select></Field>
  <FieldGrid><Field label="Grupo de sinais"><select name="sign_group" className={selectCls}><option>Digestivo</option><option>Respiratório</option><option>Reprodutivo</option><option>Pele e ectoparasitas</option><option>Locomotor</option><option>Nervoso</option><option>Nutricional ou metabólico</option><option>Comportamento</option><option>Mortalidade súbita</option><option>Outro</option></select></Field><Field label="Gravidade percebida"><select name="severity" className={selectCls}><option value="observacao">Observação</option><option value="moderada">Moderada</option><option value="grave">Grave</option><option value="emergencia">Emergência</option></select></Field></FieldGrid>
  <Field label="Sinais observados (descreva, sem concluir diagnóstico)"><Textarea name="clinical_signs" placeholder="Ex.: tosse, diarreia, falta de apetite, claudicação, quando começou e como evoluiu..." required/></Field>
  <FieldGrid cols={3}><Field label="Animais no grupo"><Input name="animal_count" type="number" min="0" defaultValue="0"/></Field><Field label="Afetados"><Input name="affected_count" type="number" min="0" defaultValue="0"/></Field><Field label="Mortes"><Input name="death_count" type="number" min="0" defaultValue="0"/></Field></FieldGrid>
  <Field label="Condição suspeita (opcional)"><Input name="suspected_condition" placeholder="Somente hipótese anotada para avaliação veterinária"/></Field>
  <div className="grid gap-2 rounded-xl bg-muted/50 p-3 text-sm sm:grid-cols-2">{[["feed_change","Houve mudança de ração"],["water_change","Houve mudança na água"],["isolation_started","Animais foram separados/isolados"],["veterinarian_notified","Veterinário foi avisado"]].map(([name,label])=><label key={name} className="flex items-center gap-2"><input name={name} type="checkbox" className="h-4 w-4 accent-primary"/>{label}</label>)}</div>
  <FieldGrid><Field label="Veterinário contatado"><Input name="veterinarian" placeholder="Nome"/></Field><Field label="Data de retorno/acompanhar"><Input name="follow_up_date" type="date"/></Field></FieldGrid>
  <Field label="Medidas adotadas / orientação recebida"><Textarea name="action_taken" placeholder="Registre somente o que foi feito ou orientado pelo responsável técnico."/></Field>
  <Field label="Observações adicionais"><Textarea name="notes"/></Field>
  <SubmitRow busy={busy} label="Salvar ocorrência"/>
 </form>}</FormDialog>;
}

function NewSample({events,onDone}:{events:any[];onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog trigger={<Button variant="outline"><Plus className="mr-2 h-4 w-4"/>Registrar amostra</Button>} title="Coleta e envio ao laboratório">{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await insertRow("health_samples",{health_event_id:optional(fd,"event_id"),sample_date:value(fd,"sample_date"),sample_type:value(fd,"sample_type"),sample_origin:optional(fd,"origin"),collected_by:optional(fd,"collected_by"),storage_condition:optional(fd,"storage"),laboratory:optional(fd,"laboratory"),requested_tests:optional(fd,"tests"),result_status:"pendente",notes:optional(fd,"notes")},close,onDone,setBusy);}}>
  <p className="text-xs leading-5 text-muted-foreground">Confirme previamente com o laboratório e o veterinário qual material, recipiente, temperatura e prazo são adequados ao exame solicitado.</p>
  <Field label="Ocorrência relacionada"><select name="event_id" className={selectCls}><option value="">Sem vínculo</option>{events.map((x:any)=><option key={x.id} value={x.id}>{fmtDate(x.event_date)} · {x.sector} · {x.sign_group}</option>)}</select></Field>
  <FieldGrid><Field label="Data da coleta"><Input name="sample_date" type="date" defaultValue={todayISO()} required/></Field><Field label="Tipo de amostra"><select name="sample_type" className={selectCls}><option>Sangue</option><option>Soro</option><option>Fezes</option><option>Urina</option><option>Swab</option><option>Tecido/órgão</option><option>Raspado de pele</option><option>Ração/água</option><option>Outro</option></select></Field></FieldGrid>
  <FieldGrid><Field label="Origem/identificação"><Input name="origin" placeholder="Animal, baia, lote e fase"/></Field><Field label="Responsável pela coleta"><Input name="collected_by"/></Field></FieldGrid>
  <Field label="Conservação e transporte"><Input name="storage" placeholder="Conforme orientação específica do laboratório"/></Field>
  <FieldGrid><Field label="Laboratório"><Input name="laboratory"/></Field><Field label="Exame solicitado"><Input name="tests" placeholder="Conforme solicitação veterinária"/></Field></FieldGrid>
  <Field label="Observações / código da amostra"><Textarea name="notes"/></Field>
  <SubmitRow busy={busy} label="Salvar amostra"/>
 </form>}</FormDialog>;
}

function NewVaccine({pens,onDone}:{pens:any[];onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog trigger={<Button><Plus className="mr-2 h-4 w-4"/>Registrar vacina</Button>} title="Registro de vacinação">{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await insertRow("vaccination_records",{vaccine_name:value(fd,"vaccine"),target_group:value(fd,"group"),pen_id:optional(fd,"pen_id"),vaccination_date:value(fd,"date"),next_due_date:optional(fd,"next_due"),animals_planned:number(fd,"planned"),animals_vaccinated:number(fd,"vaccinated"),manufacturer:optional(fd,"manufacturer"),batch:optional(fd,"batch"),expiry_date:optional(fd,"expiry"),route:optional(fd,"route"),protocol_reference:optional(fd,"protocol"),veterinarian:optional(fd,"veterinarian"),responsible:optional(fd,"responsible"),notes:optional(fd,"notes")},close,onDone,setBusy);}}>
  <p className="text-xs leading-5 text-muted-foreground">Registre o protocolo definido pelo veterinário e siga a bula do produto. O sistema não cria calendário nem dose padrão automaticamente.</p>
  <Field label="Vacina/produto"><Input name="vaccine" required/></Field>
  <FieldGrid><Field label="Grupo ou fase"><select name="group" className={selectCls}>{PHASES.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Baia (opcional)"><select name="pen_id" className={selectCls}><option value="">Não vinculada</option>{pens.map((p:any)=><option key={p.id} value={p.id}>{p.code}</option>)}</select></Field></FieldGrid>
  <FieldGrid><Field label="Data aplicada"><Input name="date" type="date" defaultValue={todayISO()} required/></Field><Field label="Próxima dose/revisão"><Input name="next_due" type="date"/></Field></FieldGrid>
  <FieldGrid cols={3}><Field label="Planejados"><Input name="planned" type="number" min="0" defaultValue="0"/></Field><Field label="Vacinados"><Input name="vaccinated" type="number" min="0" defaultValue="0"/></Field><Field label="Via (conforme bula)"><Input name="route"/></Field></FieldGrid>
  <FieldGrid><Field label="Fabricante"><Input name="manufacturer"/></Field><Field label="Lote"><Input name="batch"/></Field></FieldGrid>
  <FieldGrid><Field label="Validade"><Input name="expiry" type="date"/></Field><Field label="Protocolo/referência"><Input name="protocol" placeholder="Protocolo veterinário"/></Field></FieldGrid>
  <FieldGrid><Field label="Veterinário responsável"><Input name="veterinarian"/></Field><Field label="Aplicador"><Input name="responsible"/></Field></FieldGrid>
  <Field label="Observações"><Textarea name="notes"/></Field>
  <SubmitRow busy={busy} label="Salvar vacinação"/>
 </form>}</FormDialog>;
}

function NewMedication({events,onDone}:{events:any[];onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog trigger={<Button><Plus className="mr-2 h-4 w-4"/>Registrar medicamento</Button>} title="Registro de medicamento e prescrição">{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await insertRow("medication_records",{health_event_id:optional(fd,"event_id"),product_name:value(fd,"product"),active_ingredient:optional(fd,"active"),therapeutic_class:optional(fd,"class"),is_antimicrobial:fd.has("antimicrobial"),prescription_reference:optional(fd,"prescription"),veterinarian:optional(fd,"veterinarian"),batch:optional(fd,"batch"),animals_treated:number(fd,"animals"),dose_as_prescribed:optional(fd,"dose"),route:optional(fd,"route"),frequency:optional(fd,"frequency"),administration_start:value(fd,"start"),administration_end:optional(fd,"end"),withdrawal_days:number(fd,"withdrawal"),feed_amount_kg:optionalNumber(fd,"feed"),water_amount_liters:optionalNumber(fd,"water"),responsible:optional(fd,"responsible"),notes:optional(fd,"notes")},close,onDone,setBusy);}}>
  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">Use esta ficha para transcrever uma prescrição veterinária e documentar o uso. Não use o sistema para escolher medicamento, dose ou duração por conta própria. Antimicrobianos exigem identificação do veterinário e da prescrição.</p>
  <Field label="Produto/medicamento"><Input name="product" required/></Field>
  <FieldGrid><Field label="Princípio ativo"><Input name="active"/></Field><Field label="Classe"><Input name="class" placeholder="Ex.: antimicrobiano, antiparasitário..."/></Field></FieldGrid>
  <Field label="Ocorrência relacionada"><select name="event_id" className={selectCls}><option value="">Sem vínculo</option>{events.map((x:any)=><option key={x.id} value={x.id}>{fmtDate(x.event_date)} · {x.sector} · {x.sign_group}</option>)}</select></Field>
  <label className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm"><input type="checkbox" name="antimicrobial" className="h-4 w-4 accent-primary"/>É antimicrobiano</label>
  <FieldGrid><Field label="Referência da prescrição"><Input name="prescription" placeholder="Número/identificação"/></Field><Field label="Médico-veterinário"><Input name="veterinarian"/></Field></FieldGrid>
  <FieldGrid><Field label="Lote do produto"><Input name="batch"/></Field><Field label="Animais tratados"><Input name="animals" type="number" min="0" defaultValue="0"/></Field></FieldGrid>
  <Field label="Dose exatamente como prescrita"><Input name="dose" placeholder="Transcrever da prescrição/bula"/></Field>
  <FieldGrid cols={3}><Field label="Via"><Input name="route"/></Field><Field label="Frequência"><Input name="frequency"/></Field><Field label="Carência (dias)"><Input name="withdrawal" type="number" min="0" defaultValue="0"/></Field></FieldGrid>
  <FieldGrid><Field label="Início"><Input name="start" type="date" defaultValue={todayISO()} required/></Field><Field label="Fim"><Input name="end" type="date"/></Field></FieldGrid>
  <FieldGrid><Field label="Ração utilizada (kg, se via ração)"><Input name="feed" type="number" min="0" step="0.01"/></Field><Field label="Água utilizada (L, se via água)"><Input name="water" type="number" min="0" step="0.01"/></Field></FieldGrid>
  <FieldGrid><Field label="Responsável pela administração"><Input name="responsible"/></Field><Field label="Observações"><Input name="notes"/></Field></FieldGrid>
  <SubmitRow busy={busy} label="Salvar medicamento"/>
 </form>}</FormDialog>;
}

function NewMonitoring({pens,onDone}:{pens:any[];onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog trigger={<Button><Plus className="mr-2 h-4 w-4"/>Nova medição</Button>} title="Registrar monitoramento">{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await insertRow("monitoring_records",{monitoring_date:value(fd,"date"),monitoring_type:value(fd,"type"),indicator:value(fd,"indicator"),production_phase:optional(fd,"phase"),pen_id:optional(fd,"pen_id"),animals_observed:number(fd,"observed"),animals_affected:number(fd,"affected"),deaths:number(fd,"deaths"),score:optional(fd,"score"),duration_days:optionalNumber(fd,"duration"),notes:optional(fd,"notes")},close,onDone,setBusy);}}>
  <FieldGrid><Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} required/></Field><Field label="Tipo de monitoramento"><select name="type" className={selectCls}>{MONITORING_TYPES.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></Field></FieldGrid>
  <Field label="Indicador"><select name="indicator" className={selectCls}>{CLINICAL_INDICATORS.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></Field>
  <FieldGrid><Field label="Fase"><select name="phase" className={selectCls}><option value="">Não informada</option>{PHASES.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Baia"><select name="pen_id" className={selectCls}><option value="">Geral do setor/lote</option>{pens.map((p:any)=><option key={p.id} value={p.id}>{p.code}</option>)}</select></Field></FieldGrid>
  <FieldGrid cols={3}><Field label="Observados"><Input name="observed" type="number" min="0" defaultValue="0"/></Field><Field label="Afetados"><Input name="affected" type="number" min="0" defaultValue="0"/></Field><Field label="Mortes"><Input name="deaths" type="number" min="0" defaultValue="0"/></Field></FieldGrid>
  <FieldGrid><Field label="Escore/categoria"><Input name="score" placeholder="Ex.: fezes pastosas, tosse leve..."/></Field><Field label="Duração (dias)"><Input name="duration" type="number" min="0" step="0.5"/></Field></FieldGrid>
  <Field label="Método, horário e observações"><Textarea name="notes" placeholder="Registre como a observação foi feita para comparar com as próximas medições."/></Field>
  <SubmitRow busy={busy} label="Salvar monitoramento"/>
 </form>}</FormDialog>;
}

function NewBiosecurityCheck({onDone}:{onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog trigger={<Button variant="outline"><Plus className="mr-2 h-4 w-4"/>Nova verificação</Button>} title="Checklist de biossegurança">{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await insertRow("biosecurity_checks",{check_date:value(fd,"date"),sector:optional(fd,"sector"),check_point:value(fd,"point"),result:value(fd,"result"),responsible:optional(fd,"responsible"),corrective_action:optional(fd,"action"),due_date:optional(fd,"due"),notes:optional(fd,"notes")},close,onDone,setBusy);}}>
  <FieldGrid><Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} required/></Field><Field label="Setor"><select name="sector" className={selectCls}><option value="">Geral</option>{SECTORS.map(x=><option key={x}>{x}</option>)}</select></Field></FieldGrid>
  <Field label="Ponto verificado"><select name="point" className={selectCls}><option>Entrada de pessoas e veículos</option><option>Quarentena e isolamento</option><option>Limpeza e desinfecção</option><option>Controle de pragas</option><option>Qualidade e acesso à água</option><option>Armazenamento de ração</option><option>Fluxo de animais e equipamentos</option><option>Destino de carcaças e resíduos</option><option>Ventilação e ambiente</option><option>Outro</option></select></Field>
  <Field label="Resultado"><select name="result" className={selectCls}><option value="conforme">Conforme</option><option value="nao_conforme">Não conforme</option><option value="nao_aplicavel">Não aplicável</option></select></Field>
  <Field label="Ação corretiva necessária"><Textarea name="action"/></Field>
  <FieldGrid><Field label="Responsável"><Input name="responsible"/></Field><Field label="Prazo da correção"><Input name="due" type="date"/></Field></FieldGrid>
  <Field label="Observações"><Textarea name="notes"/></Field>
  <SubmitRow busy={busy} label="Salvar verificação"/>
 </form>}</FormDialog>;
}

function NewVisit({onDone}:{onDone:()=>void}) {
 const [busy,setBusy]=useState(false);
 return <FormDialog trigger={<Button variant="outline"><Plus className="mr-2 h-4 w-4"/>Registrar visita técnica</Button>} title="Relatório de visita técnica">{close=><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await insertRow("farm_visit_reports",{visit_date:value(fd,"date"),visitor_name:value(fd,"visitor"),visitor_role:optional(fd,"role"),sectors_reviewed:optional(fd,"sectors"),records_reviewed:optional(fd,"records"),findings:optional(fd,"findings"),recommendations:optional(fd,"recommendations"),return_date:optional(fd,"return"),notes:optional(fd,"notes")},close,onDone,setBusy);}}>
  <FieldGrid><Field label="Data da visita"><Input name="date" type="date" defaultValue={todayISO()} required/></Field><Field label="Nome do visitante"><Input name="visitor" required/></Field></FieldGrid>
  <FieldGrid><Field label="Função"><Input name="role" placeholder="Veterinário, técnico, consultor..."/></Field><Field label="Setores avaliados"><Input name="sectors" placeholder="Gestação, maternidade, creche..."/></Field></FieldGrid>
  <Field label="Registros analisados"><Textarea name="records" placeholder="Produção, pesagens, mortalidade, reprodução, água, ração, vacinas..."/></Field>
  <Field label="Achados da visita"><Textarea name="findings"/></Field>
  <Field label="Recomendações combinadas"><Textarea name="recommendations"/></Field>
  <FieldGrid><Field label="Retorno previsto"><Input name="return" type="date"/></Field><Field label="Observações"><Input name="notes"/></Field></FieldGrid>
  <SubmitRow busy={busy} label="Salvar relatório"/>
 </form>}</FormDialog>;
}

function Sanidade() {
 const qc=useQueryClient();
 const events=useQuery(eventsQuery),samples=useQuery(samplesQuery),vaccines=useQuery(vaccinesQuery),medications=useQuery(medicationsQuery),monitoring=useQuery(monitoringQuery),checks=useQuery(checksQuery),visits=useQuery(visitsQuery),pens=useQuery(pensQuery);
 const [tab,setTab]=useState("resumo");
 const refresh=()=>{for(const key of ["health_events","health_samples","vaccination_records","medication_records","monitoring_records","biosecurity_checks","farm_visit_reports"])void qc.invalidateQueries({queryKey:[key]});};
 const E=events.data??[], S=samples.data??[], V=vaccines.data??[], M=medications.data??[], R=monitoring.data??[], C=checks.data??[], T=visits.data??[], P=pens.data??[];
 const today=todayISO();
 const openEvents=E.filter((x:any)=>x.status!=="encerrado");
 const dueVaccines=V.filter((x:any)=>x.next_due_date&&x.next_due_date<=addDaysISO(today,30));
 const withdrawalActive=M.filter((x:any)=>x.administration_end&&today<addDaysISO(x.administration_end,Number(x.withdrawal_days||0)+1));
 const dataError=[events,samples,vaccines,medications,monitoring,checks,visits,pens].find(q=>q.error)?.error as Error|undefined;
 const tabs=[["resumo","Visão geral"],["ocorrencias","Ocorrências"],["monitoramento","Monitoramento"],["amostras","Amostras e exames"],["vacinas","Vacinação"],["medicamentos","Medicamentos"],["biosseguranca","Biossegurança e visitas"],["guia","Guia do livro"]];
 return <div className="space-y-6">
  <SectionTitle kicker="Saúde, prevenção e diagnóstico" title="Central sanitária do rebanho" action={<NewHealthEvent pens={P} onDone={refresh}/>}/>
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><div className="flex items-center gap-2 font-bold"><BookOpen className="h-4 w-4"/>Base técnica: {BOOK_SOURCE.title}</div><p className="mt-1 text-xs leading-5">Estrutura prática inspirada na 2ª edição (2012), organizada para registrar dados da Fazenda Santo Antônio. Referências e checklists ficam na aba “Guia do livro”. Diagnóstico, vacinação e tratamentos devem ser validados pelo médico-veterinário responsável.</p></div>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
   <Metric label="Ocorrências em aberto" value={openEvents.length} icon={<HeartPulse className="h-4 w-4"/>} tone={openEvents.length?"amber":"green"}/>
   <Metric label="Amostras pendentes" value={S.filter((x:any)=>x.result_status==="pendente"||x.result_status==="em_analise").length} icon={<FlaskConical className="h-4 w-4"/>}/>
   <Metric label="Vacinas em até 30 dias" value={dueVaccines.length} icon={<Syringe className="h-4 w-4"/>}/>
   <Metric label="Carência em acompanhamento" value={withdrawalActive.length} icon={<Pill className="h-4 w-4"/>} tone={withdrawalActive.length?"amber":"green"}/>
  </div>
  <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1">{tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id!)} className={`shrink-0 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${tab===id?"bg-white text-primary shadow-sm":"text-muted-foreground hover:text-foreground"}`}>{label}</button>)}</div>
  {dataError&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">Estrutura do banco ainda não está ativa.</p><p className="mt-1 text-xs leading-5">Aplique a migration <code>drizzle/migrations/0004_saude_monitoramento_livro.sql</code> no projeto Supabase e atualize a página. Detalhe: {dataError.message}</p></div>}
  {(events.isLoading||samples.isLoading||vaccines.isLoading||medications.isLoading||monitoring.isLoading||checks.isLoading||visits.isLoading||pens.isLoading)?<div className="panel p-8 text-center text-sm text-muted-foreground">Carregando histórico sanitário...</div>:<>
   {tab==="resumo"&&<div className="grid gap-4 xl:grid-cols-2">
    <Card><div className="flex items-center justify-between"><h3 className="font-bold">Ocorrências que precisam de acompanhamento</h3><Status tone={openEvents.length?"amber":"green"}>{openEvents.length} abertas</Status></div>{openEvents.length===0?<Empty>Nenhuma ocorrência em aberto.</Empty>:<div className="mt-3 space-y-2">{openEvents.slice(0,6).map((x:any)=><EventRow key={x.id} x={x}/>)}</div>}</Card>
    <Card><div className="flex items-center justify-between"><h3 className="font-bold">Próximas vacinações/revisões</h3><Status tone={dueVaccines.length?"amber":"green"}>{dueVaccines.length} próximas</Status></div>{dueVaccines.length===0?<Empty>Nenhuma data de reforço registrada para os próximos 30 dias.</Empty>:<div className="mt-3 space-y-2">{dueVaccines.slice(0,6).map((x:any)=><div key={x.id} className="rounded-xl bg-muted/50 p-3"><div className="flex justify-between gap-2"><b className="text-sm">{x.vaccine_name}</b><span className="text-xs font-semibold">{fmtDate(x.next_due_date)}</span></div><p className="mt-1 text-xs text-muted-foreground">{x.target_group} · {x.animals_vaccinated} animais registrados</p></div>)}</div>}</Card>
    <Card><h3 className="font-bold">Últimos monitoramentos</h3>{R.length===0?<Empty>Nenhuma medição registrada.</Empty>:<div className="mt-3 space-y-2">{R.slice(0,5).map((x:any)=><MonitoringRow key={x.id} x={x}/>)}</div>}</Card>
    <Card><h3 className="font-bold">Últimas verificações de biossegurança</h3>{C.length===0?<Empty>Nenhuma verificação cadastrada.</Empty>:<div className="mt-3 space-y-2">{C.slice(0,5).map((x:any)=><CheckRow key={x.id} x={x}/>)}</div>}</Card>
   </div>}
   {tab==="ocorrencias"&&<section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Caderno de ocorrências sanitárias</h3><p className="text-xs text-muted-foreground">Cada registro acompanha sinais, animais afetados, mortalidade, ações e retorno.</p></div><NewHealthEvent pens={P} onDone={refresh}/></div>{E.length===0?<Empty>Nenhuma ocorrência. Use “Nova ocorrência” para iniciar o histórico.</Empty>:E.map((x:any)=><EventRow key={x.id} x={x} expanded/>)}</section>}
   {tab==="monitoramento"&&<section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Monitoramento sanitário e clínico</h3><p className="text-xs text-muted-foreground">Acompanhe indicadores com critérios e horários padronizados.</p></div><NewMonitoring pens={P} onDone={refresh}/></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{MONITORING_TYPES.map(x=><Card key={x.id}><p className="font-bold">{x.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{x.description}</p></Card>)}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{CLINICAL_INDICATORS.map(x=><Card key={x.id}><p className="font-semibold">{x.title}</p><p className="mt-1 text-xs text-primary">{x.unit}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{x.note}</p></Card>)}</div>{R.length===0?<Empty>Nenhuma medição lançada.</Empty>:<div className="space-y-2">{R.map((x:any)=><MonitoringRow key={x.id} x={x}/>)}</div>}</section>}
   {tab==="amostras"&&<section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Coleta, envio e resultado de exames</h3><p className="text-xs text-muted-foreground">Mantenha rastreabilidade da amostra desde a identificação até a interpretação.</p></div><NewSample events={E} onDone={refresh}/></div><div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-950">O material, recipiente, conservação, transporte e exame dependem da suspeita e do laboratório. Confirme essas etapas com o veterinário antes da coleta.</div>{S.length===0?<Empty>Nenhuma amostra cadastrada.</Empty>:S.map((x:any)=><Card key={x.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase text-primary">{x.sample_type} · {fmtDate(x.sample_date)}</p><h4 className="mt-1 font-semibold">{x.sample_origin||"Origem não informada"}</h4></div><Status tone={x.result_status==="concluido"?"green":x.result_status==="inconclusivo"?"amber":"blue"}>{({pendente:"Pendente",em_analise:"Em análise",concluido:"Concluído",inconclusivo:"Inconclusivo"} as any)[x.result_status]}</Status></div><p className="mt-2 text-xs text-muted-foreground">{x.laboratory||"Laboratório não informado"} · {x.requested_tests||"Exame não especificado"}</p>{x.storage_condition&&<p className="mt-1 text-xs">Conservação: {x.storage_condition}</p>}{x.result_summary&&<p className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm">{x.result_summary}</p>}</Card>)}</section>}
   {tab==="vacinas"&&<section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Livro de vacinação</h3><p className="text-xs text-muted-foreground">Produto, lote, validade, grupo, quantidade aplicada, responsável e reforço.</p></div><NewVaccine pens={P} onDone={refresh}/></div>{V.length===0?<Empty>Nenhuma vacinação registrada.</Empty>:V.map((x:any)=><Card key={x.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold">{x.vaccine_name}</h4><p className="text-xs text-muted-foreground">{x.target_group} · {fmtDate(x.vaccination_date)}</p></div>{x.next_due_date&&<Status tone={x.next_due_date<=addDaysISO(today,30)?"amber":"green"}>{x.next_due_date<=today?"Data vencida":`Próxima: ${fmtDate(x.next_due_date)}`}</Status>}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Mini label="Aplicados" value={x.animals_vaccinated}/><Mini label="Planejados" value={x.animals_planned}/><Mini label="Lote" value={x.batch||"—"}/><Mini label="Validade" value={fmtDate(x.expiry_date)}/></div><p className="mt-2 text-xs text-muted-foreground">Veterinário: {x.veterinarian||"Não informado"} · Aplicador: {x.responsible||"Não informado"}</p></Card>)}</section>}
   {tab==="medicamentos"&&<section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Registro de medicamentos e carência</h3><p className="text-xs text-muted-foreground">Documente a prescrição, administração, lote e prazo de carência antes do envio ao abate.</p></div><NewMedication events={E} onDone={refresh}/></div>{M.length===0?<Empty>Nenhum medicamento registrado.</Empty>:M.map((x:any)=><Card key={x.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold">{x.product_name}</h4><p className="text-xs text-muted-foreground">{x.active_ingredient||"Princípio ativo não informado"} · {fmtDate(x.administration_start)}</p></div>{x.is_antimicrobial?<Status tone="amber">Antimicrobiano</Status>:<Status>Registro</Status>}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Mini label="Animais" value={x.animals_treated}/><Mini label="Dose prescrita" value={x.dose_as_prescribed||"—"}/><Mini label="Fim" value={fmtDate(x.administration_end)}/><Mini label="Carência" value={`${x.withdrawal_days} dias`}/></div><p className="mt-2 text-xs text-muted-foreground">Veterinário: {x.veterinarian||"—"} · Prescrição: {x.prescription_reference||"—"} · Responsável: {x.responsible||"—"}</p>{x.administration_end&&<p className="mt-1 text-xs font-semibold">Data calculada para fim da carência: {fmtDate(addDaysISO(x.administration_end,Number(x.withdrawal_days||0)))}</p>}</Card>)}</section>}
   {tab==="biosseguranca"&&<div className="grid gap-4 xl:grid-cols-2"><Card><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Checklist de biossegurança</h3><p className="text-xs text-muted-foreground">Entrada, quarentena, água, ração, limpeza, pragas e resíduos.</p></div><NewBiosecurityCheck onDone={refresh}/></div>{C.length===0?<Empty>Nenhuma verificação lançada.</Empty>:<div className="mt-3 space-y-2">{C.map((x:any)=><CheckRow key={x.id} x={x}/>)}</div>}</Card><Card><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Visitas técnicas</h3><p className="text-xs text-muted-foreground">Histórico, achados, recomendações e retorno.</p></div><NewVisit onDone={refresh}/></div>{T.length===0?<Empty>Nenhuma visita técnica registrada.</Empty>:<div className="mt-3 space-y-2">{T.map((x:any)=><div key={x.id} className="rounded-xl bg-muted/50 p-3"><div className="flex justify-between gap-2"><b className="text-sm">{x.visitor_name}</b><span className="text-xs text-muted-foreground">{fmtDate(x.visit_date)}</span></div><p className="text-xs text-muted-foreground">{x.visitor_role||"Visita técnica"} · {x.sectors_reviewed||"Setores não informados"}</p>{x.findings&&<p className="mt-2 whitespace-pre-wrap text-sm">{x.findings}</p>}{x.recommendations&&<p className="mt-2 whitespace-pre-wrap border-t pt-2 text-xs">Recomendações: {x.recommendations}</p>}{x.return_date&&<p className="mt-2 text-xs font-semibold">Retorno: {fmtDate(x.return_date)}</p>}</div>)}</div>}</Card></div>}
   {tab==="guia"&&<div className="space-y-4">
    <Card><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/><div><h3 className="font-bold">{BOOK_SOURCE.title}</h3><p className="text-xs text-muted-foreground">{BOOK_SOURCE.edition} · {BOOK_SOURCE.year} · Editores: {BOOK_SOURCE.editors}</p></div></div><p className="mt-3 text-sm leading-6">O conteúdo do livro foi convertido em rotinas de trabalho: observar o lote, registrar sinais, acompanhar indicadores, coletar e rastrear exames, documentar vacinações e medicamentos, revisar biossegurança e registrar visitas técnicas. As seções abaixo servem como índice prático para organizar os registros.</p></Card>
    <Card><h3 className="font-bold">Roteiro de visita e avaliação do rebanho</h3><p className="mt-1 text-xs text-muted-foreground">Use como checklist nas visitas, em cada setor.</p><div className="mt-3 grid gap-3 md:grid-cols-2">{HERD_VISIT_AREAS.map(area=><div key={area.title} className="rounded-xl bg-muted/50 p-3"><h4 className="font-semibold">{area.title}</h4><ul className="mt-2 space-y-1.5">{area.items.map(item=><li key={item} className="flex gap-2 text-xs leading-5"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"/>{item}</li>)}</ul></div>)}</div></Card>
    <Card><h3 className="font-bold">Monitoramentos do livro</h3><div className="mt-3 grid gap-2 md:grid-cols-2">{MONITORING_TYPES.map(x=><div key={x.id} className="rounded-xl bg-muted/50 p-3"><b className="text-sm">{x.title}</b><p className="mt-1 text-xs leading-5 text-muted-foreground">{x.description}</p></div>)}</div></Card>
    <Card><h3 className="font-bold">Indicadores clínicos sugeridos</h3><div className="mt-3 space-y-2">{CLINICAL_INDICATORS.map(x=><div key={x.id} className="border-b pb-2 last:border-0"><b className="text-sm">{x.title}</b><p className="text-xs leading-5 text-muted-foreground">{x.note}</p></div>)}</div><p className="mt-2 text-xs text-muted-foreground">O livro descreve monitoramento clínico padronizado e classificação da consistência fecal. Para comparar períodos, mantenha método, horário e critério constantes.</p></Card>
    <Card><h3 className="font-bold">Coleta e envio de amostras: sequência de trabalho</h3><ol className="mt-3 space-y-2">{SAMPLE_WORKFLOW.map((x,i)=><li key={x} className="flex gap-3 text-sm leading-5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i+1}</span>{x}</li>)}</ol></Card>
    <Card><h3 className="font-bold">Índice das áreas de doenças do livro</h3><p className="mt-1 text-xs text-muted-foreground">Categorias do sumário usadas para classificar ocorrências e direcionar a consulta técnica.</p><div className="mt-3 grid gap-2 md:grid-cols-2">{DISEASE_DOMAINS.map(x=><details key={x.id} className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold">{x.title}</summary><p className="mt-2 text-xs leading-5 text-muted-foreground">{x.practice}</p></details>)}</div></Card>
    <Card><h3 className="font-bold">Referências por página impressa</h3><div className="mt-3 space-y-2">{BOOK_REFERENCES.map(x=><div key={x.section} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm last:border-0"><span>{x.section}</span><span className="font-mono text-xs text-muted-foreground">p. {x.pages}</span></div>)}</div></Card>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><b>Importante:</b> a edição de 2012 é uma referência técnica histórica. Doenças de notificação, protocolos oficiais, produtos, doses, carências e calendários de vacinação devem ser conferidos com o médico-veterinário e as regras vigentes. O site não fecha diagnóstico nem prescreve tratamento.</div>
   </div>}
  </>}
 </div>;
}

function Metric({label,value,icon,tone="neutral"}:{label:string;value:number;icon:ReactNode;tone?:"neutral"|"amber"|"green"}) {
 return <div className="panel p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-semibold">{label}</span>{icon}</div><p className={`mt-2 text-3xl font-bold tracking-tight ${tone==="amber"?"text-amber-700":tone==="green"?"text-emerald-700":""}`}>{value}</p></div>;
}
function Mini({label,value}:{label:string;value:ReactNode}) { return <div className="rounded-lg bg-muted/50 p-2"><p className="text-[.65rem] text-muted-foreground">{label}</p><p className="mt-1 break-words text-xs font-bold">{value}</p></div>; }
function EventRow({x,expanded=false}:{x:any;expanded?:boolean}) {
 const severityTone=x.severity==="emergencia"||x.severity==="grave"?"red":x.severity==="moderada"?"amber":"blue";
 const statusLabel=({aberto:"Aberto",em_avaliacao:"Em avaliação",aguardando_exame:"Aguardando exame",em_acompanhamento:"Em acompanhamento",encerrado:"Encerrado"} as any)[x.status]??x.status;
 return <Card><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">{x.sector} {x.farm_pens?.code? "· "+x.farm_pens.code:""} · {fmtDate(x.event_date)}</p><h4 className="mt-1 font-semibold">{x.sign_group}</h4></div><div className="flex gap-1.5"><Status tone={severityTone}>{x.severity}</Status><Status tone={x.status==="encerrado"?"green":"amber"}>{statusLabel}</Status></div></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{x.clinical_signs}</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Mini label="Grupo" value={x.animal_count}/><Mini label="Afetados" value={x.affected_count}/><Mini label="Mortes" value={x.death_count}/></div>{expanded&&<div className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground"><p>Fase: {x.production_phase||"—"} · Início: {fmtDate(x.onset_date)}</p><p>Suspeita anotada: {x.suspected_condition||"Não informada"}</p><p>Isolamento: {x.isolation_started?"Sim":"Não"} · Veterinário avisado: {x.veterinarian_notified?"Sim":"Não"}</p>{x.action_taken&&<p>Medidas: {x.action_taken}</p>}{x.follow_up_date&&<p>Retorno: {fmtDate(x.follow_up_date)}</p>}{x.notes&&<p>{x.notes}</p>}</div>}</Card>;
}
function MonitoringRow({x}:{x:any}) {
 const name=(CLINICAL_INDICATORS.find(i=>i.id===x.indicator)?.title)??x.indicator;
 const type=(MONITORING_TYPES.find(i=>i.id===x.monitoring_type)?.title)??x.monitoring_type;
 return <Card><div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs font-bold uppercase text-primary">{type} · {fmtDate(x.monitoring_date)}</p><h4 className="mt-1 font-semibold">{name}</h4><p className="text-xs text-muted-foreground">{x.production_phase||"Fase não informada"} {x.farm_pens?.code?"· "+x.farm_pens.code:""}</p></div><Status>{x.animals_affected} afetados</Status></div><div className="mt-2 grid grid-cols-3 gap-2"><Mini label="Observados" value={x.animals_observed}/><Mini label="Afetados" value={x.animals_affected}/><Mini label="Mortes" value={x.deaths}/></div>{x.score&&<p className="mt-2 text-xs">Escore: {x.score}</p>}{x.notes&&<p className="mt-2 text-xs leading-5 text-muted-foreground">{x.notes}</p>}</Card>;
}
function CheckRow({x}:{x:any}) {
 const tone=x.result==="conforme"?"green":x.result==="nao_conforme"?"red":"neutral";
 const label=x.result==="conforme"?"Conforme":x.result==="nao_conforme"?"Não conforme":"Não aplicável";
 return <div className="rounded-xl bg-muted/50 p-3"><div className="flex justify-between gap-2"><b className="text-sm">{x.check_point}</b><Status tone={tone}>{label}</Status></div><p className="mt-1 text-xs text-muted-foreground">{fmtDate(x.check_date)} · {x.sector||"Geral"} · {x.responsible||"Sem responsável"}</p>{x.corrective_action&&<p className="mt-2 text-xs">Ação: {x.corrective_action}</p>}{x.due_date&&<p className="text-xs">Prazo: {fmtDate(x.due_date)}</p>}</div>;
}
