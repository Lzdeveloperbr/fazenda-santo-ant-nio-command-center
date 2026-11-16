import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { penRecordsQuery, pensQuery, tasksQuery, fmtDate } from "@/lib/farm";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import type { PenView } from "@/components/farm3d/FarmScene";

const FarmScene = lazy(() => import("@/components/farm3d/FarmScene"));

export const Route = createFileRoute("/_authenticated/granja-3d")({
  head: () => ({ meta: [
    { title: "Granja 3D | Fazenda Santo Antônio" },
    { name: "description", content: "Planta 3D das baias cadastradas, com ocupação pela última contagem registrada." },
    { property: "og:title", content: "Granja 3D | Fazenda Santo Antônio" },
    { property: "og:description", content: "Baias clicáveis com ocupação registrada." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Granja,
});

function Granja() {
  const pens = useQuery(pensQuery), records = useQuery(penRecordsQuery), tasks = useQuery(tasksQuery);
  const [sel, setSel] = useState<string>();
  const views: PenView[] = useMemo(() => (pens.data ?? []).map((p) => {
    const last = (records.data ?? []).find((r) => r.pen_id === p.id && r.animal_count != null);
    return { id: p.id, code: p.code, sector: p.sector, capacity: p.capacity, count: last?.animal_count ?? null };
  }), [pens.data, records.data]);
  const pen = pens.data?.find((p) => p.id === sel);
  const view = views.find((v) => v.id === sel);
  const penRecs = (records.data ?? []).filter((r) => r.pen_id === sel);
  const lastCount = penRecs.find((r) => r.animal_count != null);
  const lastClean = penRecs.find((r) => r.record_type === "Limpeza");
  const openTasks = (tasks.data ?? []).filter((t) => t.status !== "concluida" && pen && (t.sector ?? "").toLowerCase().includes(pen.code.toLowerCase()));

  if (pens.isLoading) return <div className="panel p-8 text-center text-sm text-muted-foreground">Carregando a granja…</div>;
  return (
    <div className="space-y-5">
      <SectionTitle kicker="Digital twin" title="Granja 3D" />
      <p className="-mt-3 text-sm text-muted-foreground">Planta esquemática das baias cadastradas, agrupadas por setor — não é a posição física exata. Verde: tem contagem registrada; laranja: contagem igual à capacidade; cinza: sem contagem. Toque numa baia.</p>
      {views.length === 0 ? <Empty>Nenhuma baia cadastrada. Cadastre em <Link to="/baias" className="text-info underline">Baias e caderno</Link>.</Empty> :
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Suspense fallback={<div className="panel h-80 p-8 text-center text-sm text-muted-foreground">Montando a granja 3D…</div>}><FarmScene pens={views.slice(0, 120)} selectedId={sel} onSelect={setSel} /></Suspense>
          <aside className="panel p-4">
            {!pen || !view ? <p className="text-sm text-muted-foreground">Toque numa baia para ver os detalhes.</p> : <div className="space-y-3 text-sm">
              <div><p className="label-tech">{pen.sector}</p><p className="font-mono text-2xl font-bold">{pen.code}</p></div>
              <dl className="grid grid-cols-2 gap-2">
                <div><dt className="text-xs text-muted-foreground">Capacidade</dt><dd className="font-mono font-semibold">{pen.capacity}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Animais (última contagem)</dt><dd className="font-mono font-semibold">{view.count ?? "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Contagem em</dt><dd className="font-mono font-semibold">{fmtDate(lastCount?.event_date)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Última limpeza</dt><dd className="font-mono font-semibold">{fmtDate(lastClean?.event_date)}</dd></div>
              </dl>
              <div><p className="label-tech mb-1">Tarefas abertas citando esta baia</p>{openTasks.length === 0 ? <p className="text-muted-foreground">Nenhuma.</p> : <ul className="list-disc pl-4">{openTasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>}</div>
              <div><p className="label-tech mb-1">Últimos registros</p>{penRecs.length === 0 ? <p className="text-muted-foreground">Nenhum registro no caderno.</p> : <ul className="space-y-1">{penRecs.slice(0, 5).map((r) => <li key={r.id}><span className="font-mono text-xs">{fmtDate(r.event_date)}</span> · {r.record_type}</li>)}</ul>}</div>
              <Link to="/baias" className="block text-center text-xs font-semibold text-info underline">Registrar no caderno da baia</Link>
            </div>}
          </aside>
        </div>}
    </div>
  );
}
