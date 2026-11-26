import { describe, expect, it } from "vitest";
import { BACKUP_TABLES, buildBackup, verifyBackup } from "./backup";

describe("cópia de segurança", () => {
  it("não inclui códigos de acesso nem papéis internos", () => {
    expect(BACKUP_TABLES).not.toContain("farm_access_codes");
    expect(BACKUP_TABLES).not.toContain("user_roles");
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length);
  });
  it("gera e confere a cópia (ida e volta pelo JSON)", () => {
    const b = buildBackup(
      { sows: [{ id: 1 }, { id: 2 }], tasks: [] },
      {},
      { id: "f", name: "Granja" },
      new Date("2026-11-26T10:00:00Z"),
    );
    expect(b.counts).toEqual({ sows: 2, tasks: 0 });
    expect(verifyBackup(JSON.parse(JSON.stringify(b)))).toEqual({ ok: true, total: 2 });
  });
  it("recusa arquivo adulterado ou estranho", () => {
    const b = buildBackup({ sows: [{ id: 1 }] }, {}, { id: null, name: null });
    b.tables["sows"] = [];
    expect(verifyBackup(b)).toMatchObject({ ok: false });
    expect(verifyBackup({ format: "x" })).toMatchObject({ ok: false });
    expect(verifyBackup(null)).toMatchObject({ ok: false });
  });
});
