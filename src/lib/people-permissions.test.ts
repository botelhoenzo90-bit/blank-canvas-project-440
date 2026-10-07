import { describe, expect, test } from "bun:test";
import { assertPersonDeletionAllowed, type ManagedRole } from "./people-permissions";

const input = {
  actorId: "actor", actorRole: "director" as ManagedRole,
  targetId: "target", targetRole: "supervisor" as ManagedRole,
  visible: true, hasSubordinates: false,
};

describe("Apagar pessoa", () => {
  test("Diretor pode apagar os três cargos inferiores", () => {
    for (const targetRole of ["master", "representative", "supervisor"] as const)
      expect(() => assertPersonDeletionAllowed({ ...input, targetRole })).not.toThrow();
  });
  test("Master só pode apagar Representante e Supervisor", () => {
    for (const targetRole of ["representative", "supervisor"] as const)
      expect(() => assertPersonDeletionAllowed({ ...input, actorRole: "master", targetRole })).not.toThrow();
    expect(() => assertPersonDeletionAllowed({ ...input, actorRole: "master", targetRole: "master" })).toThrow();
  });
  test("Representante só pode apagar Supervisor", () => {
    expect(() => assertPersonDeletionAllowed({ ...input, actorRole: "representative" })).not.toThrow();
    expect(() => assertPersonDeletionAllowed({ ...input, actorRole: "representative", targetRole: "representative" })).toThrow();
  });
  test("Supervisor não pode apagar pessoas", () => {
    expect(() => assertPersonDeletionAllowed({ ...input, actorRole: "supervisor" })).toThrow();
  });
  test("não permite apagar Presidente/Diretor", () => {
    expect(() => assertPersonDeletionAllowed({ ...input, targetRole: "director" })).toThrow();
  });
  test("não permite apagar o próprio acesso", () => {
    expect(() => assertPersonDeletionAllowed({ ...input, targetId: input.actorId })).toThrow();
  });
  test("não permite apagar pessoa fora da estrutura visível", () => {
    expect(() => assertPersonDeletionAllowed({ ...input, visible: false })).toThrow();
  });
  test("exige transferir subordinados antes da exclusão", () => {
    expect(() => assertPersonDeletionAllowed({ ...input, hasSubordinates: true })).toThrow();
  });
});