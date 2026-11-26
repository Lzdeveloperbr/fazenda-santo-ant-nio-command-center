import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allSowsQuery, todayISO } from "@/lib/farm";
import { download } from "@/lib/export";
import {
  parseCsv,
  SOW_IMPORT_TEMPLATE,
  validateSowImport,
  type ImportLine,
} from "@/lib/farm/import-sows";
import { usePermissions } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/importar-matrizes")({
  head: () => ({
    meta: [
      { title: "Importar matrizes | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Cadastro em lote de matrizes a partir de planilha CSV, com conferência antes de gravar.",
      },
    ],
  }),
  component: ImportarMatrizes,
});

function ImportarMatrizes() {
  const qc = useQueryClient();
  const perms = usePermissions();
  const sows = useQuery(allSowsQuery);
  const [lines, setLines] = useState<ImportLine[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  if (perms && !perms.canWrite) return <Empty>Seu perfil é somente leitura.</Empty>;

  async function read(file: File | undefined) {
    setLines(null);
    setProblem(null);
    setSaved(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProblem("Arquivo maior que 2 MB.");
      return;
    }
    if (/\.xlsx?$/i.test(file.name)) {
      setProblem("Salve a planilha como CSV (Arquivo › Salvar como › CSV) e envie de novo.");
      return;
    }
    const r = validateSowImport(
      parseCsv(await file.text()),
      (sows.data ?? []).filter((s) => !s.archived_at).map((s) => s.ear_tag),
      todayISO(),
    );
    if (r.missing) {
      setProblem(r.missing);
      return;
    }
    if (r.lines.length > 500) {
      setProblem("Até 500 matrizes por arquivo.");
      return;
    }
    setLines(r.lines);
  }
  const ok = (lines ?? []).filter((l) => l.row);
  const bad = (lines ?? []).filter((l) => !l.row);

  async function save() {
    if (!ok.length || bad.length) return;
    setBusy(true);
    const { error } = await supabase
      .from("sows")
      .insert(ok.map((l) => ({ ...l.row!, status: "vazia" })));
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("brinco") || error.code === "23505"
          ? "Algum brinco já existe. Nada foi gravado; atualize a página e confira."
          : error.message,
      );
      return;
    }
    setSaved(ok.length);
    setLines(null);
    void qc.invalidateQueries({ queryKey: ["sows"] });
    toast.success(`${ok.length} matriz(es) importadas.`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SectionTitle
        kicker="Rebanho"
        title="Importar matrizes"
        action={
          <Button
            variant="outline"
            onClick={() =>
              download("modelo-matrizes.csv", "\ufeff" + SOW_IMPORT_TEMPLATE, "text/csv;charset=utf-8")
            }
          >
            <Download className="mr-1 h-4 w-4" />
            Baixar modelo
          </Button>
        }
      />
      <div className="panel space-y-3 p-4 sm:p-6 text-sm text-muted-foreground">
        <p>
          1. Baixe o modelo e preencha uma matriz por linha. Só <b>Brinco</b> é obrigatório; datas
          em dd/mm/aaaa.
        </p>
        <p>
          2. No Excel, salve como <b>CSV</b>. 3. Envie o arquivo: o sistema confere tudo antes de
          gravar.
        </p>
        <p>
          As matrizes entram como <b>vazias</b>. Coberturas e partos anteriores devem ser lançados
          pelo Manejo guiado, para que os ciclos e alertas fiquem corretos.
        </p>
        <Input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => void read(e.target.files?.[0])}
          className="h-12"
        />
      </div>
      {problem && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {problem}
        </p>
      )}
      {saved !== null && (
        <div className="panel flex items-center gap-3 p-4">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <p className="flex-1 text-sm">{saved} matriz(es) cadastradas.</p>
          <Link to="/matrizes">
            <Button>Ver matrizes</Button>
          </Link>
        </div>
      )}
      {lines && (
        <div className="space-y-3">
          <p className="text-sm">
            <b>{ok.length}</b> pronta(s) para gravar ·{" "}
            <b className={bad.length ? "text-destructive" : ""}>{bad.length}</b> com problema
          </p>
          {bad.length > 0 && (
            <ul className="panel max-h-64 space-y-1 overflow-auto p-4 text-sm">
              {bad.map((l) => (
                <li key={l.line}>
                  <b>Linha {l.line}:</b> {l.errors.join(", ")}
                </li>
              ))}
            </ul>
          )}
          {ok.length > 0 && (
            <div className="panel overflow-x-auto p-2">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">Linha</th>
                    <th className="p-2">Brinco</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Raça</th>
                    <th className="p-2">Nascimento</th>
                    <th className="p-2">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {ok.slice(0, 100).map((l) => (
                    <tr key={l.line} className="border-t">
                      <td className="p-2 text-muted-foreground">{l.line}</td>
                      <td className="p-2 font-semibold">{l.row!.ear_tag}</td>
                      <td className="p-2">{l.row!.name ?? "—"}</td>
                      <td className="p-2">{l.row!.breed ?? "—"}</td>
                      <td className="p-2">{l.row!.birth_date ?? "—"}</td>
                      <td className="p-2">{l.row!.weight_kg ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ok.length > 100 && (
                <p className="p-2 text-xs text-muted-foreground">Mostrando 100 de {ok.length}.</p>
              )}
            </div>
          )}
          <Button
            className="h-12"
            disabled={busy || !ok.length || bad.length > 0}
            onClick={() => void save()}
          >
            <Upload className="mr-1 h-4 w-4" />
            {bad.length
              ? "Corrija as linhas com problema e envie de novo"
              : busy
                ? "Gravando…"
                : `Gravar ${ok.length} matriz(es)`}
          </Button>
        </div>
      )}
    </div>
  );
}
