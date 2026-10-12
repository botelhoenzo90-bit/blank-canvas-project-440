export function assertCanLinkProfile(actorRole: string, targetRole: string) {
  if (actorRole !== "director") throw new Error("Apenas Presidente/Diretor pode vincular perfis.");
  if (!["master", "representative", "supervisor"].includes(targetRole))
    throw new Error("Selecione Master, Representante ou Supervisor para o perfil adicional.");
}

export function assertLinkedProfileSelection(profileId: string, profiles: { profile_id: string; active: boolean }[]) {
  if (!profiles.some((p) => p.profile_id === profileId && p.active))
    throw new Error("Perfil não autorizado ou inativo.");
}