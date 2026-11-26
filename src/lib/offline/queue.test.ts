import { describe, expect, it } from "vitest";
import {
  discard,
  enqueue,
  isNetworkError,
  readQueue,
  retry,
  saveOrQueue,
  syncQueue,
  type QueuedOp,
  type Remote,
  type Storage,
} from "./queue";

const mem = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const op = (id: string, over: Partial<QueuedOp> = {}) => ({
  id,
  kind: "insert" as const,
  table: "litter_events" as const,
  payload: { id, quantity: 1 },
  label: `Morte ${id}`,
  userId: "u1",
  ...over,
});

describe("fila offline", () => {
  it("guarda por usuário e não duplica o mesmo registro", () => {
    const s = mem();
    enqueue(s, op("a"));
    enqueue(s, op("a"));
    enqueue(s, op("b", { userId: "u2" }));
    expect(readQueue(s, "u1").map((o) => o.id)).toEqual(["a"]);
    expect(readQueue(s, "u2").map((o) => o.id)).toEqual(["b"]);
  });
  it("sem conexão vai para a fila; com conexão só diz salvo após confirmação", async () => {
    const s = mem();
    const ok: Remote = async () => ({ error: null });
    expect(await saveOrQueue(s, op("a"), ok, false)).toEqual({ state: "na_fila" });
    expect(await saveOrQueue(s, op("b"), ok, true)).toEqual({ state: "salvo" });
    const down: Remote = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await saveOrQueue(s, op("c"), down, true)).toEqual({ state: "na_fila" });
    const refused: Remote = async () => ({
      error: { code: "P0001", message: "Quantidade maior que os leitões vivos" },
    });
    expect(await saveOrQueue(s, op("d"), refused, true)).toEqual({
      state: "erro",
      message: "Quantidade maior que os leitões vivos",
    });
    expect(readQueue(s, "u1").map((o) => o.id)).toEqual(["a", "c"]);
  });
  it("sincroniza em ordem, trata id duplicado como já salvo e marca recusas", async () => {
    const s = mem();
    enqueue(s, op("a"));
    enqueue(s, op("b"));
    enqueue(s, op("c"));
    const seen: string[] = [];
    const remote: Remote = async (o) => {
      seen.push(o.id);
      if (o.id === "a") return { error: { code: "23505", message: "duplicate key" } };
      if (o.id === "b") return { error: { message: "Saldo insuficiente" } };
      return { error: null };
    };
    const r = await syncQueue(s, "u1", remote);
    expect(seen).toEqual(["a", "b", "c"]);
    expect(r).toMatchObject({ sent: 2, failed: 1, remaining: 1 });
    expect(readQueue(s, "u1")[0]).toMatchObject({
      id: "b",
      status: "erro",
      error: "Saldo insuficiente",
    });
    retry(s, "u1", "b");
    expect(readQueue(s, "u1")[0]?.status).toBe("pendente");
    discard(s, "u1", "b");
    expect(readQueue(s, "u1")).toEqual([]);
  });
  it("para no primeiro erro de rede sem perder nada", async () => {
    const s = mem();
    enqueue(s, op("a"));
    enqueue(s, op("b"));
    const r = await syncQueue(s, "u1", async () => ({
      error: { message: "TypeError: Failed to fetch" },
    }));
    expect(r).toMatchObject({ sent: 0, stoppedOffline: true, remaining: 2 });
    expect(readQueue(s, "u1")[0]?.attempts).toBe(1);
    expect(isNetworkError({ message: "permission denied" })).toBe(false);
    expect(isNetworkError(null, false)).toBe(true);
  });
});
