import { describe, it as test } from "node:test";
import { doesNotThrow, throws } from "node:assert/strict";
import { assertPersonDeletionAllowed, type ManagedRole } from "./people-permissions";

const input = {
  actorId: "actor", actorRole: "director" as ManagedRole,
  targetId: "target", targetRole: "supervisor" as ManagedRole,
  visible: true, hasSubordinates: false,
};

describe("Apagar pessoa", () => {
  test("Diretor pode apagar os três cargos inferiores", () => {
    for (const targetRole of ["master", "representative", "supervisor"] as const)
      doesNotThrow(() => assertPersonDeletionAllowed({ ...input, targetRole }));
  });
  test("Master só pode apagar Representante e Supervisor", () => {
    for (const targetRole of ["representative", "supervisor"] as const)
      doesNotThrow(() => assertPersonDeletionAllowed({ ...input, actorRole: "master", targetRole }));
    throws(() => assertPersonDeletionAllowed({ ...input, actorRole: "master", targetRole: "master" }));
  });
  test("Representante só pode apagar Supervisor", () => {
    doesNotThrow(() => assertPersonDeletionAllowed({ ...input, actorRole: "representative" }));
    throws(() => assertPersonDeletionAllowed({ ...input, actorRole: "representative", targetRole: "representative" }));
  });
  test("Supervisor não pode apagar pessoas", () => {
    throws(() => assertPersonDeletionAllowed({ ...input, actorRole: "supervisor" }));
  });
  test("não permite apagar Presidente/Diretor", () => {
    throws(() => assertPersonDeletionAllowed({ ...input, targetRole: "director" }));
  });
  test("não permite apagar o próprio acesso", () => {
    throws(() => assertPersonDeletionAllowed({ ...input, targetId: input.actorId }));
  });
  test("não permite apagar pessoa fora da estrutura visível", () => {
    throws(() => assertPersonDeletionAllowed({ ...input, visible: false }));
  });
  test("exige transferir subordinados antes da exclusão", () => {
    throws(() => assertPersonDeletionAllowed({ ...input, hasSubordinates: true }));
  });
});