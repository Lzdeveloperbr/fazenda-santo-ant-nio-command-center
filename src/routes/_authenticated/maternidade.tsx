import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sowsQuery, littersQuery, livePiglets, fmtDate, todayISO, type Litter } from "@/lib/farm";
import { SectionTitle, Empty } from "@/components/farm/Kpi";
import { FormDialog, SubmitRow, Field } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/maternidade")({
  head: () => ({ meta: [{ title: "Maternidade | AgroTech Command Center" }, { name: "description", content: "Leitegadas, mortes, transferências e desmames." }] }),
  component: Maternidade,
});

const ACTIONS = [
  { type: "morte", label: "Morte", qty: true, value: false, confirm: true },
  { type: "transferencia_saida", label: "Transferir saída", qty: true, value: false, confirm: true },
  { type: "transferencia_entrada", label: "Transferir entrada", qty: true, value: false, confirm: true },
  { type: "pesagem", label: "Pesagem média", qty: false, value: true, confirm: false },
  { type: "observacao", label: "Observação", qty: false, value: false, confirm: false },
  { type: "desmame", label: "Desmame", qty: true, value: false, confirm: true },
] as const;

function Maternidade() {
  const qc = useQueryClient();
  const sows = useQuery(sowsQuery);
  const litters = useQuery(littersQuery);
  const active = (litters.data ?? []).filter((l) => l.status === "maternidade");
  const recentWeaned = (litters.data ?? []).filter((l) => l.status === "desmamada").sort((a, b) => (b.weaning_date ?? "").localeCompare(a.weaning_date ?? "")).slice(0, 6);
  const tag = (id: string) => sows.data?.find((s) => s.id === id)?.ear_tag ?? "?";
  const total = active.reduce((a, l) => a + livePiglets(l), 0);
  const ageGroups = useMemo(() => { const groups = [{ faixa: "0–7 dias", total: 0 }, { faixa: "8–14 dias", total: 0 }, { faixa: "15–21 dias", total: 0 }, { faixa: "22+ dias", total: 0 }]; for (const l of active) { const age = Math.max(0, Math.floor((Date.now() - new Date(l.farrowing_date + "T12:00:00").getTime()) / 86400000)); const index = age <= 7 ? 0 : age <= 14 ? 1 : age <= 21 ? 2 : 3; groups[index].total += livePiglets(l); } return groups; }, [active]);

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Central da maternidade" title="Leitegadas ativas" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Leitegadas" v={active.length} />
        <Stat label="Leitões vivos" v={total} tone="text-ok-glow" />
        <Stat label="Mortes registradas" v={active.reduce((a, l) => a + l.deaths, 0)} tone="text-destructive" />
      </div>

      {!litters.isLoading && active.length > 0 && <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel p-4 sm:p-5 lg:col-span-2">
          <SectionTitle kicker="Distribuição etária" title="Leitões por idade"/>
          <p className="mb-2 text-xs text-muted-foreground">Quantidade de leitões vivos por faixa de dias desde o parto.</p>
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={ageGroups} margin={{top:8,right:8,left:-18,bottom:0}}><CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="4 5"/><XAxis dataKey="faixa" tick={{fontSize:10}} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tick={{fontSize:10}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12}}/><Bar dataKey="total" name="Leitões vivos" fill="var(--ok)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>
        </section>
        <section className="panel overflow-hidden lg:col-span-3">
          <div className="flex items-center gap-2 border-b border-border px-4 py-4"><ClipboardList className="h-4 w-4 text-muted-foreground"/><div><h2 className="text-sm font-semibold">Resumo das leitegadas</h2><p className="text-xs text-muted-foreground">Conferência rápida da maternidade</p></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[570px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Matriz</th><th className="px-3 py-3 font-medium">Parto</th><th className="px-3 py-3 font-medium">Dias</th><th className="px-3 py-3 font-medium">Nascidos vivos</th><th className="px-3 py-3 font-medium">Mortes</th><th className="px-3 py-3 font-medium">Vivos agora</th></tr></thead><tbody className="divide-y divide-border">{active.map(l=>{const days=Math.max(0,Math.floor((Date.now()-new Date(l.farrowing_date+"T12:00:00").getTime())/86400000));return <tr key={l.id}><td className="px-4 py-3 font-mono font-semibold">{tag(l.sow_id)}</td><td className="px-3 py-3 font-mono text-xs">{fmtDate(l.farrowing_date)}</td><td className="px-3 py-3 font-mono">{days}</td><td className="px-3 py-3 font-mono">{l.born_alive}</td><td className="px-3 py-3 font-mono">{l.deaths}</td><td className="px-3 py-3 font-mono font-semibold">{livePiglets(l)}</td></tr>})}</tbody></table></div>
        </section>
      </div>}

      {litters.isLoading ? <p className="label-tech animate-pulse-soft">Carregando…</p> : active.length === 0 ? (
        <Empty>Nenhuma leitegada na maternidade. Registre um parto em <Link to="/matrizes" className="text-info underline">Matrizes</Link>.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((l, i) => <LitterCard key={l.id} l={l} tag={tag(l.sow_id)} delay={i * 40} onDone={() => qc.invalidateQueries()} />)}
        </div>
      )}

      {recentWeaned.length > 0 && (
        <section>
          <p className="label-tech mb-3">Desmamadas recentemente</p>
          <div className="panel divide-y">
            {recentWeaned.map((l) => (
              <div key={l.id} className="flex justify-between px-4 py-3 text-sm">
                <span className="font-mono">{tag(l.sow_id)}</span>
                <span className="text-muted-foreground">{l.weaned ?? 0} desmamados · {fmtDate(l.weaning_date)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, v, tone = "" }: { label: string; v: number; tone?: string }) {
  return (
    <div className="panel p-3">
      <p className="label-tech !text-[0.6rem]">{label}</p>
      <p className={`mt-1 font-mono text-2xl ${tone}`}>{v}</p>
    </div>
  );
}

function LitterCard({ l, tag, delay, onDone }: { l: Litter; tag: string; delay: number; onDone: () => void }) {
  const live = livePiglets(l);
  const days = Math.floor((Date.now() - new Date(l.farrowing_date + "T12:00:00").getTime()) / 86400000);
  return (
    <div className="panel animate-rise p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="label-tech">Matriz</p>
          <p className="font-mono text-xl">{tag}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl text-ok-glow">{live}</p>
          <p className="text-xs text-muted-foreground">leitões vivos</p>
        </div>
      </div>
      {/* One dot per recorded live piglet */}
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`${live} leitões`}>
        {Array.from({ length: live }).map((_, i) => <span key={i} className="h-3 w-3 rounded-full bg-ok/80" />)}
        {Array.from({ length: l.deaths }).map((_, i) => <span key={"d" + i} className="h-3 w-3 rounded-full border border-destructive/60" />)}
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 border-t pt-3 font-mono text-xs">
        <div><dt className="text-muted-foreground">Vivos</dt><dd>{l.born_alive}</dd></div>
        <div><dt className="text-muted-foreground">Mortes</dt><dd>{l.deaths}</dd></div>
        <div><dt className="text-muted-foreground">Transf.</dt><dd>{l.transfers_in - l.transfers_out >= 0 ? "+" : ""}{l.transfers_in - l.transfers_out}</dd></div>
        <div><dt className="text-muted-foreground">Peso</dt><dd>{l.avg_weight ? `${l.avg_weight}kg` : "—"}</dd></div>
      </dl>
      <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">Parto {fmtDate(l.farrowing_date)} · {days} dias</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => <EventAction key={a.type} a={a} l={l} tag={tag} live={live} onDone={onDone} />)}
      </div>
    </div>
  );
}

function EventAction({ a, l, tag, live, onDone }: { a: (typeof ACTIONS)[number]; l: Litter; tag: string; live: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog title={`${a.label} · ${tag}`} trigger={<Button size="sm" variant={a.type === "morte" ? "destructive" : "outline"} className="h-10">{a.label}</Button>}>
      {(close) => (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const qty = Number(f.get("qty") || 0);
          if (a.qty && qty <= 0) { toast.error("Informe a quantidade"); return; }
          if ((a.type === "morte" || a.type === "transferencia_saida") && qty > live) { toast.error(`A leitegada tem ${live} leitões vivos registrados`); return; }
          if (a.confirm && !confirm(`Confirmar ${a.label.toLowerCase()} de ${qty} leitão(ões) na matriz ${tag}?`)) return;
          setBusy(true);
          const { error } = await supabase.from("litter_events").insert({
            litter_id: l.id, event_type: a.type, quantity: qty,
            value: a.value ? Number(f.get("value")) : null, note: String(f.get("note") || "") || null, event_date: String(f.get("date")),
          });
          if (!error && a.type === "desmame") await supabase.from("sows").update({ status: "vazia" }).eq("id", l.sow_id);
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          toast.success("Registrado"); onDone(); close();
        }}>
          <Field label="Data"><Input name="date" type="date" defaultValue={todayISO()} required className="h-11" /></Field>
          {a.qty && <Field label="Quantidade de leitões"><Input name="qty" type="number" min={1} inputMode="numeric" defaultValue={a.type === "desmame" ? live : undefined} required className="h-11" /></Field>}
          {a.value && <Field label="Peso médio (kg)"><Input name="value" type="number" step="0.01" min={0} inputMode="decimal" required className="h-11" /></Field>}
          <Field label="Observação"><Textarea name="note" rows={2} required={a.type === "observacao"} /></Field>
          <SubmitRow busy={busy} label="Confirmar" />
        </form>
      )}
    </FormDialog>
  );
}
