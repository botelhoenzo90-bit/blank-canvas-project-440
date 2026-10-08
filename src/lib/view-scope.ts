export function assertDirectorView(role: string | null | undefined, active: boolean) {
  if (role !== "director" || !active) throw new Error("Apenas Presidente/Diretor pode visualizar outras contas.");
}

export function structureIds(targetId: string, people: { user_id: string; manager_id: string | null }[]) {
  const ids = new Set([targetId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const person of people) {
      if (person.manager_id && ids.has(person.manager_id) && !ids.has(person.user_id)) {
        ids.add(person.user_id);
        changed = true;
      }
    }
  }
  return ids;
}