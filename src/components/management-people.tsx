import type { Person } from "@/components/people-panel";

export function ManagementPeople({ people }: { people: Person[] }) {
  const labels = { director: "Presidente/Diretor", master: "Master", representative: "Representante", supervisor: "Supervisor" };
  return <section className="panel full-panel"><div className="panel-head"><h3>Equipe da gestão</h3></div><div className="table-wrap"><table><thead><tr><th>PESSOA</th><th>FUNÇÃO</th><th>EMPRESA / EQUIPE</th><th>ACESSO</th></tr></thead><tbody>{people.map((p) => <tr key={p.user_id}><td><strong>{p.full_name}</strong></td><td>{p.role ? labels[p.role] : "—"}</td><td>{p.company_name || p.management_name || p.team || "—"}</td><td>{p.active ? "Ativo" : "Inativo"}</td></tr>)}</tbody></table></div></section>;
}