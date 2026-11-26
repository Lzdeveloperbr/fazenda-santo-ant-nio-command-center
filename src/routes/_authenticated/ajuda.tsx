import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, LifeBuoy, Search } from "lucide-react";
import { Empty, SectionTitle } from "@/components/farm/Kpi";
import { Input } from "@/components/ui/input";
import { searchHelp } from "@/lib/help";

export const Route = createFileRoute("/_authenticated/ajuda")({
  head: () => ({
    meta: [
      { title: "Central de ajuda | Fazenda Santo Antônio" },
      {
        name: "description",
        content:
          "Manual de uso: cadastro, manejo, maternidade, rotina, relatórios e cópia de segurança.",
      },
    ],
  }),
  component: Ajuda,
});

function Ajuda() {
  const [q, setQ] = useState("");
  const topics = useMemo(() => searchHelp(q), [q]);
  const areas = [...new Set(topics.map((t) => t.area))];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionTitle kicker="Suporte" title="Central de ajuda" />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex.: parto, desmame, sem internet, cópia…"
          className="h-12 pl-10"
        />
      </div>
      {!topics.length ? (
        <Empty>
          Nada encontrado. Tente outra palavra ou{" "}
          <Link to="/rotina" className="underline">
            relate um problema
          </Link>
          .
        </Empty>
      ) : (
        areas.map((area) => (
          <section key={area} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {area}
            </h2>
            {topics
              .filter((t) => t.area === area)
              .map((t) => (
                <details key={t.id} className="panel group p-4" open={!!q}>
                  <summary className="cursor-pointer list-none font-semibold">{t.title}</summary>
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                    {t.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  {t.link && (
                    <Link
                      to={t.link}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                    >
                      Abrir a tela <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </details>
              ))}
          </section>
        ))
      )}
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LifeBuoy className="h-4 w-4" />
        Não resolveu?{" "}
        <Link to="/rotina" className="font-semibold text-primary">
          Relate o problema
        </Link>{" "}
        para o administrador.
      </p>
    </div>
  );
}
