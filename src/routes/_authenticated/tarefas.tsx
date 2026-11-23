import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, Trash2, ClipboardCheck, Droplets, Wheat, HeartPulse, ClipboardList, Thermometer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tasksQuery, profilesQuery, sowsQuery, PRIORITY, fmtDate, todayISO, type Task } from "@/lib/farm";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [
    { title: "Rotinas e tarefas | Fazenda Santo Antônio" },
    { name: "description", content: "Tarefas, responsáveis, prioridades, prazos e rotinas diárias da granja." },
    { property: "og:title", content: "Rotinas e tarefas | Fazenda Santo Antônio" },
    { property: "og:description", content: "Organização do trabalho e dos prazos da equipe." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Tarefas,
});

const SECTORS = ["Maternidade", "Gestação", "Creche", "Crescimento", "Terminação", "Ração", "Sanidade", "Geral"];

function Tarefas() {
  const qc = useQueryClient();
  const tasks = useQuery(tasksQuery);
  const profiles = useQuery(profilesQuery);
  const [view, setView] = useState<"abertas" | "concluidas">("abertas");
  const [sectorFilter,setSectorFilter] = useState("todos");
  const [who, setWho] = useState("todos");
  const today = todayISO();
  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const name = (id: string | null) => profiles.data?.find((p) => p.id === id)?.display_name ?? "—";

  const list = (tasks.data ?? [])
    .filter((t) => (view === "abertas" ? t.status !== "concluida" : t.status === "concluida"))
    .filter((t) => who === "todos" || t.assignee_id === who)
    .filter((t) => sectorFilter === "todos" || t.sector === sectorFilter)
    .sort((a,b) => {
      if (view === "concluidas") return (b.completed_at ?? "").localeCompare(a.completed_at ?? "");
      const aLate = Boolean(a.due_date && a.due_date < today), bLate = Boolean(b.due_date && b.due_date < today);
      if (aLate !== bLate) return aLate ? -1 : 1;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

  async function complete(t: Task) {
    const { error } = await supabase.from("tasks").update({ status: "concluida", completed_at: new Date().toISOString() }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa concluída"); refresh();
  }
  async function remove(t: Task) {
    if (!confirm(`Excluir a tarefa “${t.title}”?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Rotina da granja" title="Tarefas" action={<div className="flex gap-2"><QuickRoutine onDone={refresh}/><NewTask profiles={profiles.data ?? []} onDone={refresh} /></div>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="panel p-3"><p className="text-xs text-muted-foreground">Abertas</p><p className="mt-1 text-2xl font-bold tabular-nums">{(tasks.data??[]).filter(t=>t.status!=="concluida").length}</p></div>
        <div className="panel p-3"><p className="text-xs text-muted-foreground">Para hoje</p><p className="mt-1 text-2xl font-bold tabular-nums">{(tasks.data??[]).filter(t=>t.status!=="concluida"&&t.due_date===today).length}</p></div>
        <div className="panel p-3"><p className="text-xs text-muted-foreground">Atrasadas</p><p className="mt-1 text-2xl font-bold tabular-nums text-destructive">{(tasks.data??[]).filter(t=>t.status!=="concluida"&&t.due_date&&t.due_date<today).length}</p></div>
        <div className="panel p-3"><p className="text-xs text-muted-foreground">Concluídas</p><p className="mt-1 text-2xl font-bold tabular-nums">{(tasks.data??[]).filter(t=>t.status==="concluida").length}</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-md border p-1">
          {(["abertas", "concluidas"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded px-4 py-2 text-sm ${view === v ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
              {v === "abertas" ? "Abertas" : "Concluídas"}
            </button>
          ))}
        </div>
        <select aria-label="Filtrar por setor" value={sectorFilter} onChange={(e)=>setSectorFilter(e.target.value)} className={`${selectCls} w-auto`}><option value="todos">Todos os setores</option>{SECTORS.map((s)=><option key={s} value={s}>{s}</option>)}</select>
        <select value={who} onChange={(e) => setWho(e.target.value)} className={`${selectCls} w-auto`}>
          <option value="todos">Todos os responsáveis</option>
          {(profiles.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      </div>

      {tasks.isLoading ? <p className="label-tech animate-pulse-soft">Carregando…</p> : list.length === 0 ? (
        <Empty>{view === "abertas" ? "Nenhuma tarefa aberta." : "Nenhuma tarefa concluída ainda."}</Empty>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => {
            const late = t.status !== "concluida" && t.due_date && t.due_date < today;
            return (
              <li key={t.id} className={`panel flex items-center gap-3 p-3 ${late ? "border-destructive/50" : ""}`}>
                {t.status !== "concluida" && (
                  <button onClick={() => complete(t)} aria-label="Concluir" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:border-ok hover:text-ok-glow">
                    <Check className="h-5 w-5" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[0.7rem] text-muted-foreground">
                    <span className={PRIORITY[t.priority]?.tone}>● {PRIORITY[t.priority]?.label}</span>
                    {t.sector && <span>{t.sector}</span>}
                    <span>{name(t.assignee_id)}</span>
                    <span className={late ? "text-destructive" : ""}>{t.status === "concluida" ? `Concluída ${fmtDate(t.completed_at)}` : `Prevista ${fmtDate(t.due_date)}`}</span>
                  </p>
                </div>
                <button onClick={() => remove(t)} aria-label="Excluir" className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuickRoutine({onDone}:{onDone:()=>void}) {
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const routines=[
    {title:"Conferir água e funcionamento dos bebedouros",sector:"Geral",icon:Droplets},
    {title:"Conferir temperatura, ventilação e conforto dos setores",sector:"Geral",icon:Thermometer},
    {title:"Conferir limpeza, piso e condições das baias",sector:"Geral",icon:ClipboardList},
    {title:"Verificar controle de acesso e condições de higiene da entrada",sector:"Geral",icon:ClipboardCheck},
    {title:"Conferir ração e funcionamento dos comedouros",sector:"Ração",icon:Wheat},
    {title:"Registrar recebimento, consumo e saldo de ração",sector:"Ração",icon:Wheat},
    {title:"Verificar armazenamento e identificação dos lotes de ração",sector:"Ração",icon:Wheat},
    {title:"Conferir matrizes com retorno ao cio ou diagnóstico pendente",sector:"Gestação",icon:HeartPulse},
    {title:"Revisar previsões de parto e preparação das baias",sector:"Gestação",icon:ClipboardCheck},
    {title:"Acompanhar matrizes em trabalho de parto e registrar ocorrências",sector:"Maternidade",icon:HeartPulse},
    {title:"Conferir nascidos e conciliar vivos, natimortos e mumificados",sector:"Maternidade",icon:ClipboardList},
    {title:"Conferir saldo vivo das leitegadas e registrar mortes e transferências",sector:"Maternidade",icon:ClipboardList},
    {title:"Observar acesso dos leitões ao colostro e comportamento da leitegada",sector:"Maternidade",icon:HeartPulse},
    {title:"Conferir limpeza e preparação das baias de maternidade",sector:"Maternidade",icon:ClipboardCheck},
    {title:"Observar apetite, comportamento, respiração e sinais clínicos",sector:"Sanidade",icon:HeartPulse},
    {title:"Registrar ocorrências sanitárias e comunicar o responsável técnico",sector:"Sanidade",icon:ClipboardList},
    {title:"Conferir prescrições veterinárias em andamento e registrar execuções",sector:"Sanidade",icon:ClipboardCheck},
    {title:"Conferir validade e saldo cadastrado dos medicamentos",sector:"Sanidade",icon:ClipboardList},
    {title:"Registrar nascimentos, mortalidade, transferências e desmames do dia",sector:"Maternidade",icon:ClipboardList},
    {title:"Conferir tarefas pendentes e repassar ocorrências ao próximo turno",sector:"Geral",icon:ClipboardCheck},
  ];
  async function add(title:string,sector:string){
    setBusy(true);
    const date=todayISO();
    const {data:existing,error:lookupError}=await supabase.from("tasks").select("id").eq("title",title).eq("sector",sector).eq("due_date",date).neq("status","concluida").limit(1);
    if(lookupError){setBusy(false);toast.error(lookupError.message);return;}
    if(existing?.length){setBusy(false);toast.info("Essa rotina já está aberta para hoje.");setOpen(false);return;}
    const{error}=await supabase.from("tasks").insert({title,priority:"media",sector,due_date:date});
    setBusy(false);
    if(error){toast.error(error.message);return;}
    toast.success("Rotina adicionada às tarefas de hoje");
    setOpen(false);onDone();
  }
  return <div className="relative">
    <Button variant="outline" className="h-10" onClick={()=>setOpen(v=>!v)}><ClipboardCheck className="mr-1 h-4 w-4"/>Rotina rápida</Button>
    {open&&<div className="absolute right-0 top-12 z-30 w-[min(88vw,360px)] max-h-[70vh] overflow-y-auto rounded-xl border bg-card p-2 shadow-xl">
      <div className="px-3 py-2"><p className="text-xs font-semibold text-muted-foreground">Rotinas operacionais</p><p className="mt-1 text-[11px] text-muted-foreground">Escolha uma atividade para adicionar às tarefas de hoje. Os itens são modelos editáveis, não substituem o protocolo técnico da granja.</p></div>
      {routines.map(item=><button key={item.title} disabled={busy} onClick={()=>add(item.title,item.sector)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-muted disabled:opacity-50"><item.icon className="h-4 w-4 shrink-0 text-primary"/><span className="min-w-0"><span className="block">{item.title}</span><span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">{item.sector}</span></span></button>)}
    </div>}
  </div>;
}

function NewTask({ profiles, onDone }: { profiles: { id: string; display_name: string }[]; onDone: () => void }) {
  const sows = useQuery(sowsQuery);
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title="Nova tarefa" trigger={<Button className="h-10"><Plus className="mr-1 h-4 w-4" />Nova</Button>}>
      {(close) => (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          const f = new FormData(e.currentTarget);
          const { error } = await supabase.from("tasks").insert({
            title: String(f.get("title")), priority: String(f.get("priority")), sector: String(f.get("sector")),
            due_date: String(f.get("due") || "") || null, assignee_id: String(f.get("who") || "") || null, sow_id: String(f.get("sow") || "") || null,
          });
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          toast.success("Tarefa criada"); onDone(); close();
        }}>
          <Field label="Tarefa *"><Input name="title" required className="h-11" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prioridade"><select name="priority" defaultValue="media" className={selectCls}>{Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
            <Field label="Setor"><select name="sector" className={selectCls}>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></Field>
          </div>
          <Field label="Data prevista"><Input name="due" type="date" defaultValue={todayISO()} className="h-11" /></Field>
          <Field label="Responsável"><select name="who" className={selectCls}><option value="">—</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></Field>
          <Field label="Matriz relacionada"><select name="sow" className={selectCls}><option value="">—</option>{(sows.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.ear_tag}</option>)}</select></Field>
          <SubmitRow busy={busy} />
        </form>
      )}
    </FormDialog>
  );
}
