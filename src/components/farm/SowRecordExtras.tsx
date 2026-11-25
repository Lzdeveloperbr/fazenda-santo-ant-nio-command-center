import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Camera, History, QrCode, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { FormDialog, Field } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  diagnosesQuery,
  fmtDate,
  gestationEventsQuery,
  LITTER_EVENT_LABEL,
  SOW_EVENT_LABEL,
  type Litter,
  type LitterEvent,
  type Sow,
  type SowEvent,
  type Breeding,
} from "@/lib/farm";
import { buildSowTimeline, TIMELINE_KIND_LABEL, type TimelineKind } from "@/lib/farm/sow-profile";
import { usePermissions } from "@/lib/access";

const MAX_PHOTO = 5 * 1024 * 1024;

/** QR Code com o endereço da ficha: ao ler no celular, abre esta matriz. */
export function SowQrCode({ sow }: { sow: Sow }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    const url = `${window.location.origin}/matrizes/${sow.id}`;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(setSvg, () =>
      setSvg(null),
    );
  }, [sow.id]);
  if (!svg) return null;
  return (
    <figure className="w-28 shrink-0 text-center">
      {/* SVG gerado localmente pela biblioteca a partir do endereço da ficha. */}
      <div
        className="rounded-lg bg-white p-1.5"
        aria-label={`QR Code da matriz ${sow.ear_tag}`}
        role="img"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="mt-1 flex items-center justify-center gap-1 text-[.65rem] text-muted-foreground">
        <QrCode className="h-3 w-3" />
        Abre esta ficha
      </figcaption>
    </figure>
  );
}

export function SowPhoto({ sow }: { sow: Sow }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const photo = useQuery({
    queryKey: ["sow-photo", sow.photo_path],
    enabled: !!sow.photo_path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("sow-photos")
        .createSignedUrl(sow.photo_path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  async function upload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use foto JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_PHOTO) {
      toast.error("A foto deve ter no máximo 5 MB.");
      return;
    }
    setBusy(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${sow.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage
      .from("sow-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) {
      setBusy(false);
      {
        toast.error(`Foto não enviada: ${up.error.message}`);
        return;
      }
    }
    const { error } = await supabase.from("sows").update({ photo_path: path }).eq("id", sow.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Foto salva no servidor.");
    await qc.invalidateQueries({ queryKey: ["sows"] });
  }

  async function removeLink() {
    setBusy(true);
    const { error } = await supabase.from("sows").update({ photo_path: null }).eq("id", sow.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Foto desvinculada da ficha (o arquivo anterior fica guardado).");
    await qc.invalidateQueries({ queryKey: ["sows"] });
  }

  return (
    <div className="w-28 shrink-0">
      <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border bg-muted/50">
        {photo.data ? (
          <img
            src={photo.data}
            alt={`Foto da matriz ${sow.ear_tag}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Camera className="h-8 w-8 text-muted-foreground" aria-hidden />
        )}
      </div>
      {perms?.canWrite && (
        <div className="no-print mt-1 flex gap-1">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1 px-2 text-xs"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? "Enviando…" : sow.photo_path ? "Trocar" : "Foto"}
          </Button>
          {sow.photo_path && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              disabled={busy}
              onClick={removeLink}
              aria-label="Desvincular foto"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Exclusão lógica: some de listas e indicadores, mas a ficha e o histórico continuam. */
export function ArchiveSowButton({ sow }: { sow: Sow }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!perms?.canDelete) return null;

  if (sow.archived_at)
    return (
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const { error } = await supabase
            .from("sows")
            .update({ archived_at: null })
            .eq("id", sow.id);
          setBusy(false);
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("Cadastro reativado.");
          await qc.invalidateQueries({ queryKey: ["sows"] });
        }}
      >
        <ArchiveRestore className="mr-2 h-4 w-4" />
        Reativar cadastro
      </Button>
    );

  return (
    <FormDialog
      title={`Arquivar cadastro · ${sow.ear_tag}`}
      trigger={
        <Button variant="outline">
          <Archive className="mr-2 h-4 w-4" />
          Arquivar
        </Button>
      }
    >
      {(close) => (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (reason.trim().length < 3) {
              toast.error("Informe o motivo.");
              return;
            }
            setBusy(true);
            const { error } = await supabase
              .from("sows")
              .update({ archived_at: new Date().toISOString(), archived_reason: reason.trim() })
              .eq("id", sow.id);
            setBusy(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success(
              "Cadastro arquivado. A ficha continua acessível em Matrizes › Cadastros arquivados.",
            );
            await qc.invalidateQueries({ queryKey: ["sows"] });
            close();
          }}
        >
          <p className="text-sm text-muted-foreground">
            Use para cadastro duplicado ou feito por engano. A matriz sai das listas e dos
            indicadores do plantel, mas nada é apagado. Se ela saiu do plantel de verdade, registre
            descarte, morte ou transferência.
          </p>
          <Field label="Motivo *">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </Field>
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy ? "Arquivando…" : "Arquivar cadastro"}
          </Button>
        </form>
      )}
    </FormDialog>
  );
}

const KIND_TONE: Record<TimelineKind, string> = {
  cobertura: "bg-info/15 text-info",
  diagnostico: "bg-info/15 text-info",
  gestacao: "bg-warn/15 text-warn",
  parto: "bg-primary/15 text-primary",
  leitegada: "bg-muted text-muted-foreground",
  desmame: "bg-primary/15 text-primary",
  evento: "bg-muted text-muted-foreground",
  vacina: "bg-accent text-accent-foreground",
  medicamento: "bg-accent text-accent-foreground",
  sanidade: "bg-accent text-accent-foreground",
};

export function SowTimeline({
  sow,
  breedings,
  litters,
  litterEvents,
  sowEvents,
}: {
  sow: Sow;
  breedings: Breeding[];
  litters: Litter[];
  litterEvents: LitterEvent[];
  sowEvents: SowEvent[];
}) {
  const diagnoses = useQuery(diagnosesQuery);
  const gestation = useQuery(gestationEventsQuery);
  // Mesmas chaves da seção sanitária da ficha: reaproveita o cache.
  const vaccines = useQuery({
    queryKey: ["vaccination_records", "sow", sow.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_records")
        .select("*")
        .eq("sow_id", sow.id)
        .order("vaccination_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const meds = useQuery({
    queryKey: ["medication_records", "sow", sow.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_records")
        .select("*")
        .eq("sow_id", sow.id)
        .order("administration_start", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [filter, setFilter] = useState<TimelineKind | "">("");
  const litterIds = new Set(litters.map((l) => l.id));
  const items = buildSowTimeline({
    breedings,
    diagnoses: (diagnoses.data ?? []).filter((d) => d.sow_id === sow.id),
    gestationEvents: (gestation.data ?? []).filter((g) => g.sow_id === sow.id),
    litters,
    litterEvents: litterEvents.filter((e) => litterIds.has(e.litter_id)),
    sowEvents,
    vaccines: vaccines.data ?? [],
    medications: meds.data ?? [],
    labels: { sowEvent: SOW_EVENT_LABEL, litterEvent: LITTER_EVENT_LABEL },
  });
  const kinds = Array.from(new Set(items.map((i) => i.kind)));
  const shown = filter ? items.filter((i) => i.kind === filter) : items;
  const loading =
    diagnoses.isLoading || gestation.isLoading || vaccines.isLoading || meds.isLoading;

  return (
    <section className="panel p-4 sm:p-5">
      <SectionTitle kicker="Prontuário" title="Linha do tempo completa" />
      {kinds.length > 1 && (
        <div className="no-print mb-3 flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={filter === "" ? "default" : "outline"}
            onClick={() => setFilter("")}
          >
            Tudo ({items.length})
          </Button>
          {kinds.map((k) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? "default" : "outline"}
              onClick={() => setFilter(k)}
            >
              {TIMELINE_KIND_LABEL[k]} ({items.filter((i) => i.kind === k).length})
            </Button>
          ))}
        </div>
      )}
      {loading && <p className="mb-2 text-xs text-muted-foreground">Carregando registros…</p>}
      {shown.length === 0 ? (
        <Empty>Nenhum registro na linha do tempo.</Empty>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-5">
          {shown.map((i, n) => (
            <li key={`${i.kind}-${i.date}-${n}`} className="relative">
              <span
                className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary"
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{fmtDate(i.date)}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[.68rem] font-semibold ${KIND_TONE[i.kind]}`}
                >
                  {TIMELINE_KIND_LABEL[i.kind]}
                </span>
                <strong>{i.title}</strong>
              </div>
              {i.detail && <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        Mostra só o que foi registrado. Quem alterou cada registro aparece em Gestão › Histórico de
        alterações.
      </p>
    </section>
  );
}
