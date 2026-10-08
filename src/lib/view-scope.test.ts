import { describe, it } from "node:test";
import { deepEqual, doesNotThrow, throws } from "node:assert/strict";
import { assertDirectorView, structureIds } from "./view-scope";

describe("Visualizar conta", () => {
  it("somente Diretor ativo pode visualizar outras contas", () => {
    doesNotThrow(() => assertDirectorView("director", true));
    for (const role of ["master", "representative", "supervisor", null])
      throws(() => assertDirectorView(role, true));
    throws(() => assertDirectorView("director", false));
  });
  it("inclui a pessoa e subordinados, nunca outra gestão ou superiores", () => {
    deepEqual([...structureIds("rep", [
      { user_id: "director", manager_id: null },
      { user_id: "rep", manager_id: "director" },
      { user_id: "supervisor", manager_id: "rep" },
      { user_id: "other", manager_id: "director" },
    ])].sort(), ["rep", "supervisor"]);
  });
  it("termina mesmo com vínculos circulares", () => {
    deepEqual([...structureIds("a", [{ user_id: "a", manager_id: "b" }, { user_id: "b", manager_id: "a" }])], ["a", "b"]);
  });
});