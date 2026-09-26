import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImagePlus, ShieldCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { createPerson, listPeople, updatePerson } from "@/lib/people.functions";

export type AppRole =
  "director" | "master" | "representative" | "supervisor";
export type Person = {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  team: string;
  manager_id: string | null;
  active: boolean;
  role: AppRole | null;
  company_logo_url: string | null;
};

const readLogo = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/) || file.size > 2_000_000) {
      reject(new Error("Use uma imagem PNG, JPG ou WEBP de até 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

const labels: Record<AppRole, string> = {
  director: "Presidente/Diretor",
  master: "Master",
  representative: "Representante",
  supervisor: "Supervisor",
};
const allowedRoles: Record<AppRole, AppRole[]> = {
  director: ["director", "master", "representative", "supervisor"],
  master: ["representative", "supervisor"],
  representative: ["supervisor"],
  supervisor: [],
};

export function PeoplePanel({ role }: { role: AppRole }) {
  const load = useServerFn(listPeople);
  const create = useServerFn(createPerson);
  const update = useServerFn(updatePerson);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = async () => setPeople((await load()) as Person[]);
  useEffect(() => {
    void refresh().catch(() => toast.error("Não foi possível carregar a equipe."));
  }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const logoFile = fd.get("companyLogo");
      const companyLogoDataUrl = logoFile instanceof File && logoFile.size > 0
        ? await readLogo(logoFile)
        : null;
      await create({
        data: {
          email: String(fd.get("email")),
          password: String(fd.get("password")),
          fullName: String(fd.get("fullName")),
          phone: String(fd.get("phone")),
          role: String(fd.get("role")) as AppRole,
          jobTitle: "",
          team: String(fd.get("team")),
          managerId: String(fd.get("managerId") || "") || null,
          companyLogoDataUrl,
        },
      });
      toast.success("Acesso criado com sucesso");
      setOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o acesso.");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (person: Person) => {
    if (!person.role) return;
    try {
      await update({
        data: {
          userId: person.user_id,
          fullName: person.full_name,
          phone: person.phone,
          role: person.role,
          jobTitle: person.job_title,
          team: person.team,
          managerId: person.manager_id,
          active: !person.active,
        },
      });
      toast.success(person.active ? "Acesso desativado" : "Acesso reativado");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o acesso.");
    }
  };
  const choices = allowedRoles[role];

  return (
    <section className="panel full-panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">HIERARQUIA</span>
          <h3>Equipe e acessos</h3>
          <p className="subhead">Pessoas, contatos e permissões da sua estrutura.</p>
        </div>
        {choices.length > 0 && (
          <div className="panel-actions">
            <button className="primary-btn" onClick={() => setOpen(true)}>
              <UserPlus size={16} /> Adicionar pessoa
            </button>
          </div>
        )}
      </div>
      <div className="role-cards">
        {Object.entries(labels).map(([key, label]) => (
          <div className="role-card" key={key}>
            <ShieldCheck size={18} />
            <strong>{label}</strong>
            <small>
              {key === "director" ? "Administração total" : "Visão da própria estrutura"}
            </small>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PESSOA</th>
              <th>CONTATO</th>
              <th>FUNÇÃO</th>
              <th>EQUIPE</th>
              <th>ACESSO</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.user_id}>
                <td>
                  <span className="person-cell">
                    {p.company_logo_url ? <img className="company-logo-thumb" src={p.company_logo_url} alt={`Logo de ${p.full_name}`} /> : <span className="company-logo-fallback">{p.full_name.charAt(0)}</span>}
                    <strong>{p.full_name}</strong>
                  </span>
                </td>
                <td>
                  <span className="contact-cell">
                    {p.email || "—"}
                    <small>{p.phone || "—"}</small>
                  </span>
                </td>
                <td>{p.role ? labels[p.role] : "—"}</td>
                <td>{p.team || "Sem equipe"}</td>
                <td>
                  <span className={`access-tag ${p.active ? "" : "inactive"}`}>
                    <Check size={13} /> {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  {p.role && choices.includes(p.role) && (
                    <button className="ghost-btn" onClick={() => void toggle(p)}>
                      {p.active ? "Desativar" : "Ativar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="modal-backdrop">
          <form className="sale-modal" onSubmit={submit}>
            <div className="modal-head">
              <div>
                <span className="panel-kicker">NOVO ACESSO</span>
                <h3>Adicionar pessoa</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <div className="form-grid">
              <label>
                Nome
                <input name="fullName" required minLength={3} />
              </label>
              <label>
                Telefone
                <input name="phone" type="tel" required minLength={10} maxLength={20} />
              </label>
              <label>
                E-mail
                <input name="email" type="email" required />
              </label>
              <label>
                Senha inicial
                <input name="password" type="password" minLength={8} required />
              </label>
              <label>
                Função
                <select name="role">
                  {choices.map((key) => (
                    <option value={key} key={key}>
                      {labels[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Equipe
                <input name="team" required placeholder="Nome da equipe" />
              </label>
              <label className="company-logo-field">
                Logomarca da empresa (opcional)
                <span className="file-picker"><ImagePlus size={18} /> Escolher imagem</span>
                <input name="companyLogo" type="file" accept="image/png,image/jpeg,image/webp" />
                <small>PNG, JPG ou WEBP · máximo 2 MB</small>
              </label>
              <label>
                Superior
                <select name="managerId">
                  <option value="">Vincular a mim</option>
                  {people
                    .filter((p) => p.active)
                    .map((p) => (
                      <option value={p.user_id} key={p.user_id}>
                        {p.full_name} · {p.role ? labels[p.role] : "Sem função"}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="outline-btn" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="primary-btn" disabled={busy}>
                {busy ? "Criando..." : "Criar acesso"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
