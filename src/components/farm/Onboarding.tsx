import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Rocket, X } from "lucide-react";
import { allSowsQuery, breedingsQuery, farmQuery, pensQuery, profilesQuery } from "@/lib/farm";
import { farmSettingsQuery } from "@/lib/farm/farm-settings";
import { onboardingSteps, progress } from "@/lib/farm/onboarding";
import { usePermissions } from "@/lib/access";

const KEY = "fsa-primeiros-passos-oculto";

/** Guia de implantação para administrador/gerente; some sozinho quando tudo está feito. */
export function Onboarding() {
  const perms = usePermissions();
  const farm = useQuery(farmQuery),
    settings = useQuery(farmSettingsQuery),
    pens = useQuery(pensQuery);
  const sows = useQuery(allSowsQuery),
    profiles = useQuery(profilesQuery),
    breedings = useQuery(breedingsQuery);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(localStorage.getItem(KEY) === "1");
  }, []);
  if (!perms?.canViewAudit || hidden) return null;
  if ([farm, settings, pens, sows, profiles, breedings].some((q) => q.isLoading || q.isError))
    return null;
  const f = farm.data;
  const steps = onboardingSteps({
    farmFilled: !!(f?.city && f.state),
    settingsFilled: settings.data?.diagnosisDay != null && settings.data.weaningAgeDays != null,
    pens: pens.data?.length ?? 0,
    sows: sows.data?.length ?? 0,
    members: profiles.data?.length ?? 0,
    breedings: breedings.data?.length ?? 0,
  });
  const p = progress(steps);
  if (p.done === p.total) return null;
  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/[.04] p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Rocket className="h-5 w-5 text-primary" />
            Primeiros passos da granja
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.done} de {p.total} concluídos. Cada item é conferido pelos registros.
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setHidden(true);
          }}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label="Ocultar primeiros passos"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${p.pct}%` }}
        />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              to={s.to}
              className={`flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition hover:bg-muted ${s.done ? "opacity-70" : ""}`}
            >
              {s.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${s.done ? "line-through" : ""}`}>
                  {s.title}
                </span>
                <span className="block text-xs text-muted-foreground">{s.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
