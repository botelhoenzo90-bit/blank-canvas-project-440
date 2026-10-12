import { describe, it } from "node:test";
import { doesNotThrow, throws } from "node:assert/strict";
import { assertCanLinkProfile, assertLinkedProfileSelection } from "./linked-profile.rules";

describe("Perfis vinculados", () => {
  it("Diretor pode adicionar perfil Master e Representante", () => {
    doesNotThrow(() => assertCanLinkProfile("director", "master"));
    doesNotThrow(() => assertCanLinkProfile("director", "representative"));
  });
  it("outros cargos não podem conceder perfis", () => {
    for (const role of ["master", "representative", "supervisor"]) throws(() => assertCanLinkProfile(role, "master"));
  });
  it("não permite criar outro Diretor por vinculação", () => {
    throws(() => assertCanLinkProfile("director", "director"));
  });
  it("um login alterna entre seus perfis Master e Representante", () => {
    const profiles = [{ profile_id: "master", active: true }, { profile_id: "rep", active: true }];
    doesNotThrow(() => assertLinkedProfileSelection("master", profiles));
    doesNotThrow(() => assertLinkedProfileSelection("rep", profiles));
  });
  it("bloqueia perfil de outra pessoa ou inativo", () => {
    const profiles = [{ profile_id: "disabled", active: false }];
    throws(() => assertLinkedProfileSelection("someone-else", profiles));
    throws(() => assertLinkedProfileSelection("disabled", profiles));
  });
});