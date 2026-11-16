import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { breedingsQuery, littersQuery, sowsQuery, SOW_STATUS, fmtDate, livePiglets } from "@/lib/farm";
import { isActiveSowStatus } from "@/lib/farm/reproduction";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";
import { PIG_STATUS_COLOR } from "@/components/farm3d/Pig";

const HerdScene = lazy(() => import("@/components/farm3d/HerdScene"));

export const Route = createFileRoute("/_authenticated/plantel")({
  head: () => ({
    meta: [
      { title: "Plantel 3D | Fazenda Santo Antônio" },
      { name: "description", content: "Visualização 3D do plantel: um porco para cada matriz cadastrada, com situação reprodutiva real." },
      { property: "og:title", content: "Plantel 3D | Fazenda Santo Antônio" },
      { property: "og:description", content: "Cada matriz cadastrada representada em 3D, ligada à sua ficha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Plantel,
});

function Plantel() {
  const sows = useQuery(sowsQuery);
  const breedings = useQuery(breedingsQuery);
  const litters = useQuery(littersQuery);
  const [filter, setFilter] = useState<string>("ativas");
  const [selectedId, setSelectedId] = useState<string>();
  const list = useMemo(() => (sows.data ?? []).filter((s) => filter === "todas" ? true : filter === "ativas" ? isActiveSowStatus(s.status) : s.status === filter), [sows.data, filter]);
  const selected = list.find((s) => s.id === selectedId);
  const counts = useMemo(() => { const c: Record<string, number> = {}; for (const s of sows.data ?? []) c[s.status] = (c[s.status] ?? 0) + 1; return c; }, [sows.data]);

  if (sows.isLoading) return <div className="panel p-8 text-center text-sm text-muted-foreground">Carregando o plantel…</div>;
  const lastBreeding = selected && (breedings.data ?? []).find((b) => b.sow_id === selected.id);
  const sowLitters = selected ? (litters.data ?? []).filter((l) => l.sow_id === selected.id) : [];
  const current = sowLitters.find((l) => l.status === "maternidade");

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Rebanho" title="Plantel 3D" />
      <p className="-mt-3 text-sm text-muted-foreground">Cada porco representa uma matriz cadastrada. A cor da coleira mostra a situação registrada. Toque em um porco para ver o resumo; arraste para girar.</p>
      <div className="flex flex-wrap gap-2">
        {([["ativas", "Ativas"], ["todas", "Todas"], ...Object.entries(SOW_STATUS).map(([k, v]) => [k, v.label] as [string, string])] as [string, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === k ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {PIG_STATUS_COLOR[k] && <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIG_STATUS_COLOR[k] }} />}
            {label}{counts[k] ? ` · ${counts[k]}` : ""}
          </button>
        ))}
      </div>
      {list.length === 0 ? <Empty>Nenhuma matriz nesta seleção. <Link to="/matrizes" className="text-info underline">Cadastrar matrizes</Link>.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Suspense fallback={<div className="panel h-80 p-8 text-center text-sm text-muted-foreground">Montando a cena 3D…</div>}>
            <HerdScene sows={list.slice(0, 80)} selectedId={selectedId} onSelect={setSelectedId} />
          </Suspense>
          <aside className="panel p-4">
            {!selected ? <p className="text-sm text-muted-foreground">Toque em um porco ou no brinco para ver a matriz.{list.length > 80 ? " Mostrando as 80 primeiras." : ""}</p> : (
              <div className="space-y-3">
                <div><p className="label-tech">Matriz</p><p className="font-mono text-2xl font-bold">{selected.ear_tag}</p><p className="text-sm">{selected.name || "Sem nome"}</p></div>
                <p className={`text-sm font-semibold ${SOW_STATUS[selected.status]?.tone}`}>{SOW_STATUS[selected.status]?.label ?? selected.status}</p>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Partos</dt><dd className="font-mono font-semibold">{sowLitters.length}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Última cobertura</dt><dd className="font-mono font-semibold">{fmtDate(lastBreeding?.breeding_date)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Parto previsto</dt><dd className="font-mono font-semibold">{lastBreeding && selected.status !== "lactante" && selected.status !== "vazia" ? fmtDate(lastBreeding.expected_farrowing) : "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Leitões agora</dt><dd className="font-mono font-semibold">{current ? livePiglets(current) : "—"}</dd></div>
                </dl>
                <Link to="/matrizes/$sowId" params={{ sowId: selected.id }}><Button className="w-full">Abrir ficha completa</Button></Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
