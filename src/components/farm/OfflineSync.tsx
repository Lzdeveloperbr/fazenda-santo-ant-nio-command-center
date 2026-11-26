import { useCallback, useEffect, useState } from "react";
import { useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CloudOff, CloudUpload, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  discard,
  QUEUE_EVENT,
  readQueue,
  retry,
  saveOrQueue,
  syncQueue,
  type OfflineTable,
  type QueuedOp,
  type Remote,
  type SaveOutcome,
} from "@/lib/offline/queue";

const remote: Remote = async (op) => {
  const table = supabase.from(op.table as never) as unknown as {
    insert: (v: unknown) => Promise<{ error: { code?: string; message: string } | null }>;
    update: (v: unknown) => {
      eq: (c: string, v: string) => Promise<{ error: { code?: string; message: string } | null }>;
    };
  };
  return op.kind === "insert" ? table.insert(op.payload) : table.update(op.payload).eq("id", op.id);
};

export function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function useQueue(userId: string) {
  const [list, setList] = useState<QueuedOp[]>(() =>
    typeof window === "undefined" ? [] : readQueue(localStorage, userId),
  );
  useEffect(() => {
    const update = () => setList(readQueue(localStorage, userId));
    update();
    window.addEventListener(QUEUE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(QUEUE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [userId]);
  return list;
}

/** Salvar um registro diário com suporte a falta de conexão. */
export function useOfflineSave() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  return useCallback(
    async (
      table: OfflineTable,
      payload: Record<string, unknown>,
      label: string,
      kind: "insert" | "update" = "insert",
      targetId?: string,
    ): Promise<SaveOutcome> => {
      const id = kind === "update" ? targetId! : String(payload["id"] ?? crypto.randomUUID());
      const outcome = await saveOrQueue(
        localStorage,
        {
          id,
          kind,
          table,
          payload: kind === "insert" ? { ...payload, id } : payload,
          label,
          userId: user.id,
        },
        remote,
        navigator.onLine,
      );
      if (outcome.state === "salvo") await qc.invalidateQueries();
      return outcome;
    },
    [user.id, qc],
  );
}

export const OUTCOME_MESSAGE = {
  salvo: "Salvo no servidor.",
  na_fila:
    "Sem conexão: salvo só neste aparelho. Será enviado automaticamente quando a internet voltar.",
} as const;

/** Indicador no topo: conexão, itens aguardando envio, erros e envio manual. */
export function SyncStatus() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const online = useOnline();
  const list = useQueue(user.id);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const pending = list.filter((o) => o.status === "pendente");
  const errors = list.filter((o) => o.status === "erro");

  const sync = useCallback(
    async (manual = false) => {
      if (!navigator.onLine || readQueue(localStorage, user.id).every((o) => o.status === "erro"))
        return;
      setBusy(true);
      const r = await syncQueue(localStorage, user.id, remote, navigator.onLine);
      setBusy(false);
      if (r.sent) {
        toast.success(`${r.sent} registro(s) feito(s) sem conexão foram salvos no servidor.`);
        await qc.invalidateQueries();
      }
      if (r.failed)
        toast.error(
          `${r.failed} registro(s) foram recusados pelo servidor. Revise no indicador de sincronização.`,
        );
      if (manual && !r.sent && !r.failed && r.stoppedOffline)
        toast.message("Ainda sem conexão com o servidor.");
    },
    [user.id, qc],
  );

  useEffect(() => {
    if (online) void sync();
  }, [online, sync]);
  useEffect(() => {
    if (!pending.length) return;
    const t = setInterval(() => void sync(), 30_000);
    return () => clearInterval(t);
  }, [pending.length, sync]);

  if (online && list.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold ${errors.length ? "border-destructive/40 bg-destructive/10 text-destructive" : !online ? "border-warn/50 bg-warn/10 text-warn" : "border-border bg-card text-muted-foreground"}`}
          aria-label="Sincronização"
        >
          {online ? <CloudUpload className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          <span className="hidden sm:inline">
            {!online ? "Sem conexão" : busy ? "Enviando…" : "Aguardando envio"}
          </span>
          {list.length > 0 && <span className="font-mono">{list.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">
            {online ? "Conectado" : "Sem conexão com a internet"}
          </p>
          <p className="text-xs text-muted-foreground">
            Registros abaixo estão <b>só neste aparelho</b> até o servidor confirmar.
          </p>
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto p-2 text-xs">
          {list.length === 0 && (
            <li className="p-2 text-muted-foreground">Nada aguardando envio.</li>
          )}
          {list.map((o) => (
            <li
              key={`${o.kind}-${o.id}`}
              className={`rounded-lg p-2 ${o.status === "erro" ? "bg-destructive/5" : "bg-muted/50"}`}
            >
              <p className="font-semibold">{o.label}</p>
              <p className="text-muted-foreground">
                Registrado em{" "}
                {new Date(o.createdAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
                {o.attempts ? ` · ${o.attempts} tentativa(s)` : ""}
              </p>
              {o.status === "erro" && (
                <>
                  <p className="mt-1 text-destructive">Recusado pelo servidor: {o.error}</p>
                  <div className="mt-1 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => retry(localStorage, user.id, o.id)}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Tentar de novo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        if (
                          confirm(
                            "Descartar este registro feito sem conexão? Ele não foi salvo no servidor.",
                          )
                        )
                          discard(localStorage, user.id, o.id);
                      }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Descartar
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        {pending.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              className="w-full"
              size="sm"
              disabled={!online || busy}
              onClick={() => void sync(true)}
            >
              {busy ? "Enviando…" : "Enviar agora"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
