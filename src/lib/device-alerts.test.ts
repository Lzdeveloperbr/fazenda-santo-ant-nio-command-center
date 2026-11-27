import { describe, expect, it } from "vitest";
import { notificationText, shouldNotify } from "./device-alerts";

const base = {
  permission: "granted",
  enabled: true,
  lastDay: null,
  today: "2026-11-27",
  late: 1,
  dueToday: 0,
};
describe("aviso do aparelho", () => {
  it("uma vez por dia, só com pendência e permissão", () => {
    expect(shouldNotify(base)).toBe(true);
    expect(shouldNotify({ ...base, lastDay: "2026-11-27" })).toBe(false);
    expect(shouldNotify({ ...base, late: 0 })).toBe(false);
    expect(shouldNotify({ ...base, permission: "default" })).toBe(false);
    expect(shouldNotify({ ...base, enabled: false })).toBe(false);
  });
  it("texto", () => {
    expect(notificationText(2, 1)).toBe(
      "Manejos: 2 atrasados e 1 para hoje. Toque para abrir a agenda.",
    );
    expect(notificationText(0, 3)).toBe("Manejos: 3 para hoje. Toque para abrir a agenda.");
  });
});
