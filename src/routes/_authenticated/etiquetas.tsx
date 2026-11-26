import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Field, selectCls } from "@/components/farm/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pensQuery, sowsQuery } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/etiquetas")({
  head: () => ({
    meta: [
      { title: "Etiquetas com QR Code | Fazenda Santo Antônio" },
      { name: "description", content: "Etiquetas imprimíveis com QR Code para baias e matrizes." },
    ],
  }),
  component: Etiquetas,
});

type Label = { key: string; title: string; subtitle: string; url: string };

function Etiquetas() {
  const pens = useQuery(pensQuery),
    sows = useQuery(sowsQuery);
  const [kind, setKind] = useState<"baias" | "matrizes">("baias");
  const [filter, setFilter] = useState("");
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const labels: Label[] = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const all: Label[] =
      kind === "baias"
        ? (pens.data ?? []).map((p) => ({
            key: p.id,
            title: p.code,
            subtitle: p.sector,
            url: `${origin}/baias?baia=${encodeURIComponent(p.code)}`,
          }))
        : (sows.data ?? []).map((s) => ({
            key: s.id,
            title: s.ear_tag,
            subtitle: s.name ?? "Matriz",
            url: `${origin}/matrizes/${s.id}`,
          }));
    return all
      .filter((l) => !f || `${l.title} ${l.subtitle}`.toLowerCase().includes(f))
      .slice(0, 200);
  }, [kind, filter, pens.data, sows.data, origin]);

  useEffect(() => {
    let alive = true;
    void Promise.all(
      labels.map(
        async (l) =>
          [
            l.key,
            await QRCode.toString(l.url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
          ] as const,
      ),
    ).then((pairs) => {
      if (alive) setSvgs(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [labels]);

  const loading = kind === "baias" ? pens.isLoading : sows.isLoading;
  return (
    <div className="space-y-6">
      <div className="no-print space-y-4">
        <SectionTitle kicker="Identificação" title="Etiquetas com QR Code" />
        <p className="max-w-2xl text-sm text-muted-foreground">
          Imprima e fixe na baia ou no cartão da matriz. Ao ler o código com o celular, o sistema
          abre direto a baia ou o prontuário (é preciso estar logado).
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Tipo">
            <select
              className={selectCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as "baias" | "matrizes")}
            >
              <option value="baias">Baias</option>
              <option value="matrizes">Matrizes</option>
            </select>
          </Field>
          <Field label="Filtrar">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={kind === "baias" ? "Setor ou código" : "Brinco ou nome"}
            />
          </Field>
          <Button className="h-11" onClick={() => window.print()} disabled={!labels.length}>
            <Printer className="mr-1 h-4 w-4" />
            Imprimir {labels.length}
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !labels.length ? (
        <Empty>{kind === "baias" ? "Nenhuma baia cadastrada." : "Nenhuma matriz ativa."}</Empty>
      ) : (
        <div className="print-area grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {labels.map((l) => (
            <figure
              key={l.key}
              className="label-card flex flex-col items-center gap-1 rounded-xl border bg-white p-3 text-center text-black"
            >
              {/* SVG gerado localmente pela biblioteca a partir do endereço interno. */}
              {svgs[l.key] ? (
                <div
                  className="w-full max-w-[9rem] [&>svg]:h-auto [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svgs[l.key]! }}
                />
              ) : (
                <div className="aspect-square w-full max-w-[9rem] animate-pulse rounded bg-neutral-200" />
              )}
              <figcaption>
                <p className="text-lg font-black leading-tight">{l.title}</p>
                <p className="text-xs">{l.subtitle}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
