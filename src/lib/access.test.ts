import { describe, expect, it } from "vitest";
import { auditDiff, isRole, permissionsFor } from "./access";

describe("permissionsFor", () => {
  it("espelha as regras do banco", () => {
    expect(permissionsFor("admin")).toMatchObject({
      canWrite: true,
      canDelete: true,
      canViewAudit: true,
      canManageUsers: true,
    });
    expect(permissionsFor("gerente")).toMatchObject({
      canWrite: true,
      canDelete: true,
      canViewAudit: true,
      canManageUsers: false,
    });
    expect(permissionsFor("veterinario")).toMatchObject({
      canWrite: true,
      canDelete: false,
      canViewAudit: false,
    });
    expect(permissionsFor("funcionario")).toMatchObject({
      canWrite: true,
      canDelete: false,
      canViewAudit: false,
    });
    expect(permissionsFor("consulta")).toMatchObject({ canWrite: false, canDelete: false });
  });
  it("sem perfil não tem permissão", () => {
    expect(permissionsFor(null)).toMatchObject({
      canWrite: false,
      canDelete: false,
      canViewAudit: false,
      canManageUsers: false,
    });
  });
  it("valida nomes de perfil", () => {
    expect(isRole("gerente")).toBe(true);
    expect(isRole("member")).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});

describe("auditDiff", () => {
  it("mostra apenas os campos alterados", () => {
    expect(
      auditDiff({ notes: null, ear_tag: "M1" }, { notes: "ok", ear_tag: "M1" }, ["notes"]),
    ).toEqual([{ field: "notes", before: "—", after: "ok" }]);
  });
  it("em exclusões lista os valores anteriores sem created_at", () => {
    expect(auditDiff({ ear_tag: "M1", created_at: "x" }, null, null)).toEqual([
      { field: "ear_tag", before: "M1", after: "—" },
    ]);
  });
});
