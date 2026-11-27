import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bookmark, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectCls } from "@/components/farm/FormDialog";
import {
  EMPTY_FILTER,
  activeFilterCount,
  parseSaved,
  saveFilter,
  type SavedFilter,
  type SowFilter,
} from "@/lib/farm/sow-filters";

const KEY = "fsa-filtros-matrizes";
const n = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.floor(Number(v))) || 0);

/** Filtros extras (ordem de parto, raça, parto próximo) e filtros salvos neste aparelho. */
export function AdvancedFilters({
  filter,
  onChange,
  breeds,
}: {
  filter: SowFilter;
  onChange: (f: SowFilter) => void;
  breeds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  useEffect(() => {
    setSaved(parseSaved(localStorage.getItem(KEY)));
  }, []);
  const persist = (l: SavedFilter[]) => {
    setSaved(l);
    localStorage.setItem(KEY, JSON.stringify(l));
  };
  const count = activeFilterCount(filter);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={open ? "default" : "outline"} size="sm" onClick={() => setOpen(!open)}>
          <SlidersHorizontal className="mr-1 h-4 w-4" />
          Mais filtros{count > 0 ? ` (${count})` : ""}
        </Button>
        {saved.map((v) => (
          <span
            key={v.name}
            className="inline-flex items-center rounded-full border bg-card text-sm"
          >
            <button className="py-1.5 pl-3 pr-1 font-semibold" onClick={() => onChange(v.filter)}>
              {v.name}
            </button>
            <button
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
              aria-label={`Apagar filtro ${v.name}`}
              onClick={() => persist(saved.filter((x) => x.name !== v.name))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {count > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTER)}>
            Limpar filtros
          </Button>
        )}
      </div>
      {open && (
        <div className="panel grid gap-3 p-4 sm:grid-cols-4">
          <Field label="Ordem de parto mín.">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={filter.parityMin ?? ""}
              onChange={(e) => onChange({ ...filter, parityMin: n(e.target.value) })}
            />
          </Field>
          <Field label="Ordem de parto máx.">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={filter.parityMax ?? ""}
              onChange={(e) => onChange({ ...filter, parityMax: n(e.target.value) })}
            />
          </Field>
          <Field label="Parto previsto em até">
            <select
              className={selectCls}
              value={filter.farrowWithin ?? ""}
              onChange={(e) =>
                onChange({
                  ...filter,
                  farrowWithin: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Qualquer data</option>
              {[3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} dias
                </option>
              ))}
            </select>
          </Field>
          <Field label="Raça">
            <select
              className={selectCls}
              value={filter.breed}
              onChange={(e) => onChange({ ...filter, breed: e.target.value })}
            >
              <option value="">Todas</option>
              {breeds.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-4">
            <Button
              variant="outline"
              size="sm"
              disabled={count === 0}
              onClick={() => {
                const name = window.prompt("Nome do filtro (ex.: Partos da semana)");
                if (!name?.trim()) return;
                persist(saveFilter(saved, name, filter));
                toast.success("Filtro salvo neste aparelho.");
              }}
            >
              <Bookmark className="mr-1 h-4 w-4" />
              Salvar este filtro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
