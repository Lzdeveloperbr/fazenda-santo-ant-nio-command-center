import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Star, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { favoritesQuery } from "@/lib/farm";
import { usePermissions } from "@/lib/access";
import { quickActionsFor } from "@/lib/quick-actions";

/** Estrela no topo: marca/desmarca a tela atual como favorita do usuário. */
export function FavoriteButton({
  path,
  label,
  className,
  kind = "pagina",
}: {
  path: string;
  label: string;
  className: string;
  kind?: "pagina" | "matriz";
}) {
  const qc = useQueryClient();
  const favs = useQuery(favoritesQuery);
  const [busy, setBusy] = useState(false);
  const fav = (favs.data ?? []).find((f) => f.kind === kind && f.ref === path);
  async function toggle() {
    setBusy(true);
    const { error } = fav
      ? await supabase.from("user_favorites").delete().eq("id", fav.id)
      : await supabase.from("user_favorites").insert({ kind, ref: path, label });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível atualizar os favoritos.");
      return;
    }
    toast.success(fav ? "Removido dos favoritos." : "Adicionado aos favoritos do painel.");
    void qc.invalidateQueries({ queryKey: ["user_favorites"] });
  }
  return (
    <button
      type="button"
      disabled={busy || favs.isLoading}
      onClick={() => void toggle()}
      className={`${className} inline-flex`}
      aria-pressed={!!fav}
      aria-label={fav ? `Tirar ${label} dos favoritos` : `Favoritar ${label}`}
    >
      <Star className={`h-[18px] w-[18px] ${fav ? "fill-amber-400 text-amber-500" : ""}`} />
    </button>
  );
}

/** Painel: favoritos do usuário e ações rápidas do perfil. */
export function QuickPanel() {
  const perms = usePermissions();
  const favs = useQuery(favoritesQuery);
  const actions = quickActionsFor(perms?.role ?? null);
  const pages = (favs.data ?? []).filter((f) => f.kind === "pagina");
  const sows = (favs.data ?? []).filter((f) => f.kind === "matriz");
  if (!actions.length && !pages.length && !sows.length) return null;
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Zap className="h-4 w-4 text-primary" />
          Ações rápidas
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {actions.map((a) => (
            <Link
              key={a.to + a.label}
              to={a.to}
              className="flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 transition hover:bg-muted"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block text-xs text-muted-foreground">{a.detail}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          Meus favoritos
        </h2>
        {pages.length || sows.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {pages.map((f) => (
              <Link
                key={f.id}
                to={f.ref}
                className="rounded-full border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
              >
                {f.label}
              </Link>
            ))}
            {sows.map((f) => (
              <Link
                key={f.id}
                to="/matrizes/$sowId"
                params={{ sowId: f.ref }}
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold transition hover:bg-primary/10"
              >
                Matriz {f.label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Toque na estrela no topo de uma tela ou na ficha de uma matriz para fixá-la aqui.
          </p>
        )}
      </div>
    </section>
  );
}
