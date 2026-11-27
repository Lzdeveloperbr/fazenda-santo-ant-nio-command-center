import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { notificationText, shouldNotify } from "@/lib/device-alerts";
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
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [perm, setPerm] = useState(supported ? Notification.permission : "unsupported");
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(localStorage.getItem("fsa-avisos") === "1");
  }, []);
  useEffect(() => {
    if (!supported) return;
    const lastDay = localStorage.getItem("fsa-avisos-dia");
    if (
      !shouldNotify({
        permission: Notification.permission,
        enabled,
        lastDay,
        today,
        late: late.length,
        dueToday: now.length,
      })
    )
      return;
    localStorage.setItem("fsa-avisos-dia", today);
    const body = notificationText(late.length, now.length);
    const opts = {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "fsa-agenda",
      data: { url: "/agenda" },
    };
    void navigator.serviceWorker
      ?.getRegistration()
      .then(async (r) => {
        if (r) await r.showNotification("Fazenda Santo Antônio", opts);
        else new Notification("Fazenda Santo Antônio", opts);
      })
      .catch(() => undefined);
  }, [supported, enabled, today, late.length, now.length]);
  async function enable() {
    if (!supported) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") {
      localStorage.setItem("fsa-avisos", "1");
      localStorage.removeItem("fsa-avisos-dia");
      setEnabled(true);
    }
  }
  function disable() {
    localStorage.setItem("fsa-avisos", "0");
    setEnabled(false);
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`${className} relative inline-flex`} aria-label={`Lembretes: ${count}`}>
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[.65rem] font-bold text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Lembretes</p>
          <p className="text-xs text-muted-foreground">
            Calculados dos registros. O aviso no aparelho aparece quando o app é aberto.
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {count === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Nada atrasado nem para hoje.</p>
          ) : (
            <ul className="space-y-1">
              {late.map((i) => (
                <li key={i.id} className="rounded-lg bg-destructive/5 p-2 text-xs">
                  <span className="font-semibold text-destructive">
                    Atrasado · {fmtDate(i.date)}
                  </span>{" "}
                  · {AGENDA_KIND_LABEL[i.kind]}
                  <p className="font-medium text-foreground">{i.title}</p>
                </li>
              ))}
              {now.map((i) => (
                <li key={i.id} className="rounded-lg p-2 text-xs hover:bg-muted">
                  <span className="font-semibold text-primary">Hoje</span> ·{" "}
                  {AGENDA_KIND_LABEL[i.kind]}
                  {i.estimated ? " (previsão)" : ""}
                  <p className="font-medium text-foreground">{i.title}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {supported && (
          <div className="border-t border-border px-4 py-2 text-xs">
            {perm === "denied" ? (
              <p className="text-muted-foreground">
                Avisos bloqueados nas configurações do navegador.
              </p>
            ) : enabled && perm === "granted" ? (
              <button
                onClick={disable}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <BellRing className="h-3.5 w-3.5 text-primary" />
                Avisos no aparelho ligados · desligar
              </button>
            ) : (
              <button
                onClick={() => void enable()}
                className="flex items-center gap-1.5 font-semibold text-primary"
              >
                <BellRing className="h-3.5 w-3.5" />
                Avisar no aparelho uma vez por dia
              </button>
            )}
          </div>
        )}
        <div className="border-t border-border p-2">
          <Link
            to="/agenda"
            className="block rounded-lg px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-muted"
          >
            Abrir agenda
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
