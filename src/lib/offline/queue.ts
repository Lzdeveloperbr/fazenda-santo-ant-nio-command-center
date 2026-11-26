/**
 * Fila de registros feitos sem conexão.
 *
 * - Cada registro recebe um id (uuid) no aparelho. Ao reenviar, se o servidor
 *   responder "id duplicado", o registro já estava salvo: sai da fila sem
 *   duplicar (idempotência).
 * - A fila é por usuário: só sincroniza com o mesmo usuário logado.
 * - Nada aqui afirma que o dado está no servidor antes da resposta dele.
 * - Se o servidor RECUSAR (regra de negócio), o item fica marcado com o erro
 *   para a pessoa revisar; nunca é descartado sozinho.
 */
export const OFFLINE_TABLES = ["litter_events", "pen_records", "sow_events", "tasks"] as const;
export type OfflineTable = (typeof OFFLINE_TABLES)[number];

export type QueuedOp = {
  id: string; // id do registro (insert) ou do alvo (update)
  kind: "insert" | "update";
  table: OfflineTable;
  payload: Record<string, unknown>;
  label: string;
  userId: string;
  createdAt: string;
  attempts: number;
  status: "pendente" | "erro";
  error?: string;
};

export type Storage = { getItem(k: string): string | null; setItem(k: string, v: string): void };
export type Remote = (
  op: QueuedOp,
) => Promise<{ error: { code?: string; message: string } | null }>;

const key = (userId: string) => `fsa-offline-queue:${userId}`;
export const QUEUE_EVENT = "fsa-queue-change";

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
}

export function readQueue(storage: Storage, userId: string): QueuedOp[] {
  try {
    const raw = storage.getItem(key(userId));
    const list = raw ? (JSON.parse(raw) as QueuedOp[]) : [];
    return Array.isArray(list)
      ? list.filter(
          (o) =>
            o && o.userId === userId && (OFFLINE_TABLES as readonly string[]).includes(o.table),
        )
      : [];
  } catch {
    return [];
  }
}

function writeQueue(storage: Storage, userId: string, list: QueuedOp[]) {
  storage.setItem(key(userId), JSON.stringify(list));
  notify();
}

export function enqueue(
  storage: Storage,
  op: Omit<QueuedOp, "attempts" | "status" | "createdAt"> & { createdAt?: string },
) {
  const list = readQueue(storage, op.userId);
  if (list.some((o) => o.id === op.id && o.kind === op.kind)) return; // já na fila
  list.push({
    ...op,
    createdAt: op.createdAt ?? new Date().toISOString(),
    attempts: 0,
    status: "pendente",
  });
  writeQueue(storage, op.userId, list);
}

export function discard(storage: Storage, userId: string, id: string) {
  writeQueue(
    storage,
    userId,
    readQueue(storage, userId).filter((o) => o.id !== id),
  );
}

/** Erros de rede (sem resposta do servidor), diferentes de recusas do banco. */
export function isNetworkError(err: { message?: string } | null | undefined, online = true) {
  if (!online) return true;
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("network request failed") ||
    m.includes("fetch failed")
  );
}

export type SyncResult = {
  sent: number;
  failed: number;
  remaining: number;
  stoppedOffline: boolean;
};

let syncing = false;
/** Envia a fila em ordem. Para no primeiro erro de rede; registra recusas do servidor. */
export async function syncQueue(
  storage: Storage,
  userId: string,
  remote: Remote,
  online = true,
): Promise<SyncResult> {
  if (syncing)
    return {
      sent: 0,
      failed: 0,
      remaining: readQueue(storage, userId).length,
      stoppedOffline: false,
    };
  syncing = true;
  let sent = 0,
    failed = 0,
    stoppedOffline = false;
  try {
    for (const op of readQueue(storage, userId)) {
      if (op.status === "erro") continue;
      if (!online) {
        stoppedOffline = true;
        break;
      }
      let error: { code?: string; message: string } | null;
      try {
        ({ error } = await remote(op));
      } catch (e) {
        error = { message: e instanceof Error ? e.message : String(e) };
      }
      const list = readQueue(storage, userId);
      const idx = list.findIndex((o) => o.id === op.id && o.kind === op.kind);
      if (idx < 0) continue;
      if (!error || (op.kind === "insert" && error.code === "23505")) {
        list.splice(idx, 1);
        sent++;
      } else if (isNetworkError(error)) {
        list[idx] = { ...list[idx]!, attempts: list[idx]!.attempts + 1 };
        writeQueue(storage, userId, list);
        stoppedOffline = true;
        break;
      } else {
        list[idx] = {
          ...list[idx]!,
          attempts: list[idx]!.attempts + 1,
          status: "erro",
          error: error.message,
        };
        failed++;
      }
      writeQueue(storage, userId, list);
    }
  } finally {
    syncing = false;
  }
  return { sent, failed, remaining: readQueue(storage, userId).length, stoppedOffline };
}

export function retry(storage: Storage, userId: string, id: string) {
  writeQueue(
    storage,
    userId,
    readQueue(storage, userId).map((o) =>
      o.id === id ? { ...o, status: "pendente" as const, error: undefined } : o,
    ) as QueuedOp[],
  );
}

export type SaveOutcome =
  { state: "salvo" } | { state: "na_fila" } | { state: "erro"; message: string };

/**
 * Tenta gravar no servidor; sem conexão, guarda no aparelho.
 * `state: "salvo"` só quando o servidor confirmou.
 */
export async function saveOrQueue(
  storage: Storage,
  op: Omit<QueuedOp, "attempts" | "status" | "createdAt">,
  remote: Remote,
  online: boolean,
): Promise<SaveOutcome> {
  if (!online) {
    enqueue(storage, op);
    return { state: "na_fila" };
  }
  let error: { code?: string; message: string } | null;
  try {
    ({ error } = await remote({
      ...op,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: "pendente",
    }));
  } catch (e) {
    error = { message: e instanceof Error ? e.message : String(e) };
  }
  if (!error) return { state: "salvo" };
  if (isNetworkError(error)) {
    enqueue(storage, op);
    return { state: "na_fila" };
  }
  return { state: "erro", message: error.message };
}
