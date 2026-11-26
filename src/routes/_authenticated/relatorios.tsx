import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Printer, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { LogoMark } from "@/components/farm/Logo";
import { selectCls } from "@/components/farm/FormDialog";
import { PeriodFilter, usePeriod } from "@/components/farm/PeriodFilter";
import { Button } from "@/components/ui/button";
import { allSowsQuery, fmtDate, todayISO } from "@/lib/farm";
import { farmSettingsQuery, DEFAULT_FARM_SETTINGS } from "@/lib/farm/farm-settings";
import { REPORTS, type ReportData } from "@/lib/farm/reports";
import { usePermissions } from "@/lib/access";
import { downloadCsv, downloadXlsx } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [
    { title: "Central de relatórios | Fazenda Santo Antônio" },
    { name: "description", content: "Relatórios de rebanho, reprodução, maternidade, sanidade, estoque, financeiro, instalações, indicadores e auditoria em PDF, Excel e CSV." },
  ] }),
  component: Relatorios,
});

const TABLES: Record<Exclude<keyof ReportData, "gestation" | "today" | "sows">, [string, string]> = {
  breedings: ["breedings", "*"], diagnoses: ["pregnancy_diagnoses", "*"], litters: ["litters", "*"], litterEvents: ["litter_events", "*"],
  sowEvents: ["sow_events", "*"], piglets: ["piglet_identifications", "*"], pens: ["farm_pens", "*"], penRecords: ["pen_records", "*"],
  batches: ["production_batches", "*"], batchEvents: ["batch_events", "*"], batchWeights: ["batch_weights", "*"], batchFeed: ["batch_feed_movements", "*"],
  vaccinations: ["vaccination_records", "*"], medications: ["medication_records", "*"], stockItems: ["stock_items", "*"], feeds: ["feed_products", "*"],
  feedMovements: ["feed_movements", "*"], medLots: ["farm_medication_lots", "*"], meds: ["farm_medications", "id,name"], finance: ["finance_entries", "*"],
  audit: ["audit_logs", "*"], profiles: ["profiles", "id,display_name"],
};

function tableQuery(key: keyof typeof TABLES, enabled: boolean) {
  const [table, cols] = TABLES[key];
  return {
    queryKey: ["report", table],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const q = supabase.from(table as never).select(cols);
      const { data, error } = key === "audit" ? await q.order("occurred_at", { ascending: false }).limit(5000) : await q;
      if (error) { if (error.code === "42P01" || error.code === "PGRST205") return []; throw error; }
      return (data ?? []) as unknown[];
    },
  };
}

function Relatorios() {
  const { user } = Route.useRouteContext();
  const perms = usePermissions();
  const available = REPORTS.filter((r) => !r.restricted || perms?.canViewAudit);
  const [id, setId] = useState(available[0]?.id ?? "matrizes");
  const report = available.find((r) => r.id === id) ?? available[0]!;
  const p = usePeriod("30d");
  const [sowId, setSowId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [userId, setUserId] = useState("");
  const sows = useQuery(allSowsQuery);
  const settings = useQuery(farmSettingsQuery);
  const keys = Object.keys(TABLES) as (keyof typeof TABLES)[];
  // Uma consulta por tabela (cache compartilhado entre relatórios).
  const queries = useQueries({ queries: keys.map((k) => tableQuery(k, k === "audit" ? !!perms?.canViewAudit : true)) });
  const results = keys.map((k, i) => [k, queries[i]!] as const);
  const loading = sows.isLoading || results.some(([, r]) => r.isLoading);
  const failed = results.find(([, r]) => r.isError)?.[1].error as Error | undefined;

  const table = useMemo(() => {
    if (loading) return null;
    const data = { sows: sows.data ?? [], gestation: (settings.data ?? DEFAULT_FARM_SETTINGS).gestation, today: todayISO() } as unknown as ReportData;
    for (const [k, r] of results) (data as unknown as Record<string, unknown>)[k] = r.data ?? [];
    return report.build(data, { from: p.period.from, to: p.period.to, sowId, batchId, userId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, report, p.period.from, p.period.to, sowId, batchId, userId, sows.data, settings.data, ...results.map(([, r]) => r.data)]);

  const batches = (results.find(([k]) => k === "batches")?.[1].data ?? []) as { id: string; name: string }[];
  const profiles = (results.find(([k]) => k === "profiles")?.[1].data ?? []) as { id: string; display_name: string }[];
  const me = profiles.find((x) => x.id === user.id)?.display_name ?? user.email ?? "";
  const periodText = report.uses.includes("period") ? `Período: ${fmtDate(p.period.from)} a ${fmtDate(p.period.to)}` : "Posição atual";
  const fileTitle = `${report.title}${report.uses.includes("period") ? ` ${p.period.from} a ${p.period.to}` : ""}`;
  const groups = Array.from(new Set(available.map((r) => r.group)));

  return (
    <div className="report-center space-y-5">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body * { visibility: hidden !important; } .report-print, .report-print * { visibility: visible !important; } .report-print { position: absolute !important; inset: 0 !important; width: 100% !important; } .report-print table { font-size: 9px; } .report-print .print-only { display: flex !important; } .no-print { display: none !important; } }`}</style>
      <div className="no-print"><SectionTitle kicker="Gestão" title="Central de relatórios" /></div>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Relatórios" className="no-print space-y-4">
          {groups.map((g) => <div key={g}><p className="mb-1 text-[.65rem] font-bold uppercase tracking-wider text-muted-foreground">{g}</p>
            <ul className="space-y-0.5">{available.filter((r) => r.group === g).map((r) => <li key={r.id}><button type="button" onClick={() => setId(r.id)} aria-current={r.id === report.id} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${r.id === report.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{r.title}</button></li>)}</ul></div>)}
        </nav>
        <div className="min-w-0 space-y-4">
          <div className="no-print panel space-y-3 p-4">
            {report.uses.includes("period") && <PeriodFilter {...p} />}
            <div className="flex flex-wrap gap-2">
              {report.uses.includes("sow") && <select aria-label="Matriz" value={sowId} onChange={(e) => setSowId(e.target.value)} className={`${selectCls} max-w-xs`}><option value="">Todas as matrizes</option>{(sows.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.ear_tag}{x.name ? ` · ${x.name}` : ""}</option>)}</select>}
              {report.uses.includes("batch") && <select aria-label="Lote" value={batchId} onChange={(e) => setBatchId(e.target.value)} className={`${selectCls} max-w-xs`}><option value="">Todos os lotes</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
              {report.uses.includes("user") && <select aria-label="Funcionário" value={userId} onChange={(e) => setUserId(e.target.value)} className={`${selectCls} max-w-xs`}><option value="">Todos os usuários</option>{profiles.map((u) => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.print()} disabled={!table}><FileText className="mr-2 h-4 w-4" />PDF</Button>
              <Button variant="outline" onClick={() => table && void downloadXlsx(fileTitle, table.header, table.rows)} disabled={!table}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
              <Button variant="outline" onClick={() => table && downloadCsv(fileTitle, table.header, table.rows)} disabled={!table}><Download className="mr-2 h-4 w-4" />CSV</Button>
              <Button variant="outline" onClick={() => window.print()} disabled={!table}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            </div>
            <p className="text-xs text-muted-foreground">PDF: na janela de impressão, escolha “Salvar como PDF”.</p>
          </div>

          <section className="report-print panel p-4">
            <header className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <LogoMark className="h-10 w-10" />
              <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-primary">Fazenda Santo Antônio</p><h2 className="text-lg font-bold">{report.title}</h2><p className="text-xs text-muted-foreground">{periodText}{sowId ? ` · Matriz ${sows.data?.find((x) => x.id === sowId)?.ear_tag}` : ""}{batchId ? ` · Lote ${batches.find((b) => b.id === batchId)?.name}` : ""}</p></div>
              <p className="text-right text-[.65rem] text-muted-foreground">Gerado em {new Date().toLocaleString("pt-BR")}<br />por {me}</p>
            </header>
            {failed ? <Empty>Não foi possível carregar os dados: {failed.message}</Empty> : !table ? <p className="text-sm text-muted-foreground">Carregando registros…</p> : (
              <>
                {table.note && <p className="mb-3 text-xs text-muted-foreground">{table.note}</p>}
                {table.rows.length === 0 ? <Empty>Nenhum registro para estes filtros.</Empty> : (
                  <div className="overflow-x-auto"><table className="w-full text-xs">
                    <thead className="bg-muted/40 text-left text-muted-foreground"><tr>{table.header.map((h) => <th key={h} className="px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                    <tbody>{table.rows.map((r, i) => <tr key={i} className="border-t border-border/60">{r.map((c, j) => <td key={j} className="whitespace-nowrap px-2 py-1.5 tabular-nums">{c === null || c === undefined || c === "" ? "—" : typeof c === "number" ? c.toLocaleString("pt-BR") : c}</td>)}</tr>)}</tbody>
                  </table></div>
                )}
                <p className="mt-3 text-[.65rem] text-muted-foreground">{table.rows.length} linha(s). Somente dados registrados no sistema; “—” indica ausência de registro.</p>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
