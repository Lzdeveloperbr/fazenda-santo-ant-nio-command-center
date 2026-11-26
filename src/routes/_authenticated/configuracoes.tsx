import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DatabaseBackup, FileCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Field } from "@/components/farm/FormDialog";
import { FarmSettingsForm } from "@/components/farm/FarmSettingsForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { farmQuery, type Farm } from "@/lib/farm";
import { usePermissions } from "@/lib/access";
import { download } from "@/lib/export";
import { BACKUP_TABLES, buildBackup, verifyBackup } from "@/lib/backup";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da granja | Fazenda Santo Antônio" },
      {
        name: "description",
        content: "Dados da granja, parâmetros de manejo e cópia de segurança.",
      },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const perms = usePermissions();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SectionTitle kicker="Gestão" title="Configurações da granja" />
      <Tabs defaultValue="granja">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="granja">Dados da granja</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros de manejo</TabsTrigger>
          {perms?.canViewAudit && <TabsTrigger value="backup">Cópia de segurança</TabsTrigger>}
        </TabsList>
        <TabsContent value="granja" className="mt-4">
          <FarmData canEdit={!!perms?.canManageUsers} />
        </TabsContent>
        <TabsContent value="parametros" className="mt-4">
          <FarmSettingsForm />
        </TabsContent>
        {perms?.canViewAudit && (
          <TabsContent value="backup" className="mt-4">
            <Backup />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function FarmData({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const farm = useQuery(farmQuery);
  const [busy, setBusy] = useState(false);
  if (farm.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!farm.data) return <Empty>Granja não encontrada para o seu usuário.</Empty>;
  const f = farm.data;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: keyof Farm) => String(fd.get(k) ?? "").trim() || null;
    const name = get("name");
    if (!name || name.length < 3) {
      toast.error("Nome da granja com pelo menos 3 letras.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("farms")
      .update({
        name,
        legal_name: get("legal_name"),
        document: get("document"),
        city: get("city"),
        state: get("state")?.toUpperCase() ?? null,
        phone: get("phone"),
        notes: get("notes"),
      })
      .eq("id", f.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dados da granja salvos.");
    void qc.invalidateQueries({ queryKey: ["farm"] });
  }
  return (
    <form className="panel grid gap-3 p-4 sm:grid-cols-2 sm:p-6" onSubmit={(e) => void save(e)}>
      {!canEdit && (
        <p className="sm:col-span-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          Somente o administrador altera os dados da granja.
        </p>
      )}
      <fieldset disabled={!canEdit || busy} className="contents">
        <Field label="Nome da granja *">
          <Input name="name" defaultValue={f.name} required minLength={3} />
        </Field>
        <Field label="Razão social / produtor">
          <Input name="legal_name" defaultValue={f.legal_name ?? ""} />
        </Field>
        <Field label="CPF / CNPJ / inscrição">
          <Input name="document" defaultValue={f.document ?? ""} />
        </Field>
        <Field label="Telefone">
          <Input name="phone" type="tel" defaultValue={f.phone ?? ""} />
        </Field>
        <Field label="Cidade">
          <Input name="city" defaultValue={f.city ?? ""} />
        </Field>
        <Field label="UF">
          <Input name="state" maxLength={2} defaultValue={f.state ?? ""} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <Textarea name="notes" rows={3} defaultValue={f.notes ?? ""} />
          </Field>
        </div>
        {canEdit && (
          <div className="sm:col-span-2">
            <Button type="submit" className="h-11">
              {busy ? "Salvando…" : "Salvar dados da granja"}
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

async function readAll(table: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table as any)
      .select("*")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

function Backup() {
  const farm = useQuery(farmQuery);
  const [progress, setProgress] = useState<string | null>(null);
  const [check, setCheck] = useState<string | null>(null);
  async function run() {
    const tables: Record<string, unknown[]> = {};
    const errors: Record<string, string> = {};
    for (const [i, t] of BACKUP_TABLES.entries()) {
      setProgress(`Lendo ${i + 1} de ${BACKUP_TABLES.length}: ${t}`);
      try {
        tables[t] = await readAll(t);
      } catch (e) {
        errors[t] =
          e instanceof Error ? e.message : String((e as { message?: string }).message ?? e);
      }
    }
    const b = buildBackup(tables, errors, {
      id: farm.data?.id ?? null,
      name: farm.data?.name ?? null,
    });
    download(
      `copia-seguranca-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(b),
      "application/json",
    );
    setProgress(null);
    const total = Object.values(b.counts).reduce((a, n) => a + n, 0);
    if (Object.keys(errors).length)
      toast.warning(
        `Cópia gerada com ${total} registros, mas ${Object.keys(errors).length} tabela(s) não puderam ser lidas.`,
      );
    else toast.success(`Cópia gerada: ${total} registros.`);
  }
  async function verify(file: File | undefined) {
    if (!file) return;
    try {
      const r = verifyBackup(JSON.parse(await file.text()));
      setCheck(r.ok ? `Arquivo íntegro: ${r.total} registros conferidos.` : `Problema: ${r.error}`);
    } catch {
      setCheck("Problema: o arquivo não é um JSON válido.");
    }
  }
  return (
    <div className="space-y-4">
      <div className="panel space-y-3 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <DatabaseBackup className="h-5 w-5 text-primary" />
          Baixar cópia de segurança
        </h2>
        <p className="text-sm text-muted-foreground">
          Gera um arquivo com todos os registros da sua granja ({BACKUP_TABLES.length} tabelas).
          Guarde fora do celular (computador, pen drive ou nuvem). Códigos de acesso e senhas não
          entram na cópia.
        </p>
        <Button className="h-11" disabled={!!progress} onClick={() => void run()}>
          {progress ?? "Gerar e baixar cópia"}
        </Button>
      </div>
      <div className="panel space-y-3 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <FileCheck2 className="h-5 w-5 text-primary" />
          Conferir uma cópia
        </h2>
        <p className="text-sm text-muted-foreground">
          Confere se o arquivo está completo antes de guardá-lo ou de pedir uma restauração. A
          restauração não é automática: é feita pelo responsável técnico seguindo o procedimento do
          manual, para nunca apagar dados atuais.
        </p>
        <Input
          type="file"
          accept="application/json,.json"
          onChange={(e) => void verify(e.target.files?.[0])}
        />
        {check && (
          <p role="status" className="rounded-lg bg-muted/60 p-3 text-sm">
            {check}
          </p>
        )}
      </div>
    </div>
  );
}
