export type ManagedRole = "director" | "master" | "representative" | "supervisor";

export const managedRoles: Record<ManagedRole, ManagedRole[]> = {
  director: ["master", "representative", "supervisor"],
  master: ["representative", "supervisor"],
  representative: ["supervisor"],
  supervisor: [],
};

export function assertPersonDeletionAllowed(input: {
  actorId: string;
  actorRole: ManagedRole;
  targetId: string;
  targetRole: ManagedRole | null;
  visible: boolean;
  hasSubordinates: boolean;
}) {
  if (!input.visible || input.actorId === input.targetId ||
      !input.targetRole || !managedRoles[input.actorRole].includes(input.targetRole))
    throw new Error("Você não pode apagar este acesso.");
  if (input.hasSubordinates)
    throw new Error("Transfira as pessoas vinculadas a este superior antes de apagá-lo.");
}