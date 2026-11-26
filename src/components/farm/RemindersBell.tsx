import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAgenda } from "@/components/farm/useAgenda";
import { addDaysISO, fmtDate, todayISO } from "@/lib/farm";
import { AGENDA_KIND_LABEL, overdue } from "@/lib/farm/agenda";

/** Lembretes dentro do aplicativo: atrasados e itens de hoje, calculados dos registros. */
export function RemindersBell({ className }: { className: string }) {
  const today = todayISO();
  const { items } = useAgenda(addDaysISO(today, -60), today, today);
  const late = overdue(items, today);
  const now = items.filter((i) => i.date === today && !i.done);
  const count = late.length + now.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`${className} relative inline-flex`} aria-label={`Lembretes: ${count}`}>
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[.65rem] font-bold text-destructive-foreground">{count > 99 ? "99+" : count}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3"><p className="text-sm font-semibold">Lembretes</p><p className="text-xs text-muted-foreground">Calculados dos registros; não são enviados por e-mail.</p></div>
        <div className="max-h-80 overflow-y-auto p-2">
          {count === 0 ? <p className="p-3 text-sm text-muted-foreground">Nada atrasado nem para hoje.</p> : (
            <ul className="space-y-1">
              {late.map((i) => <li key={i.id} className="rounded-lg bg-destructive/5 p-2 text-xs"><span className="font-semibold text-destructive">Atrasado · {fmtDate(i.date)}</span> · {AGENDA_KIND_LABEL[i.kind]}<p className="font-medium text-foreground">{i.title}</p></li>)}
              {now.map((i) => <li key={i.id} className="rounded-lg p-2 text-xs hover:bg-muted"><span className="font-semibold text-primary">Hoje</span> · {AGENDA_KIND_LABEL[i.kind]}{i.estimated ? " (previsão)" : ""}<p className="font-medium text-foreground">{i.title}</p></li>)}
            </ul>
          )}
        </div>
        <div className="border-t border-border p-2"><Link to="/agenda" className="block rounded-lg px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-muted">Abrir agenda</Link></div>
      </PopoverContent>
    </Popover>
  );
}
