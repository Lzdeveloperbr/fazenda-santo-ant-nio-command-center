/** Aviso do aparelho: no máximo um por dia, só quando há pendências e o usuário autorizou. */
export function shouldNotify(o: {
  permission: string;
  enabled: boolean;
  lastDay: string | null;
  today: string;
  late: number;
  dueToday: number;
}) {
  return (
    o.permission === "granted" && o.enabled && o.lastDay !== o.today && o.late + o.dueToday > 0
  );
}

export function notificationText(late: number, dueToday: number) {
  const parts: string[] = [];
  if (late) parts.push(`${late} atrasado${late > 1 ? "s" : ""}`);
  if (dueToday) parts.push(`${dueToday} para hoje`);
  return `Manejos: ${parts.join(" e ")}. Toque para abrir a agenda.`;
}
