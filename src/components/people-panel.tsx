import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImagePlus, MoreHorizontal, Pencil, Power, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { createPerson, deletePerson, listPeople, updatePerson } from "@/lib/people.functions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type AppRole =
  "director" | "master" | "representative" | "supervisor";
export type Person = {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  team: string;
  company_name: string;
  management_name: string;
  manager_id: string | null;
  active: boolean;
  role: AppRole | null;
  company_logo_url: string | null;
};

const readLogo = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/) || file.size > 50_000_000) {
      reject(new Error("Use uma imagem PNG, JPG ou WEBP de até 50 MB."));
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
  director: ["master", "representative", "supervisor"],
  master: ["representative", "supervisor"],
  representative: ["supervisor"],
  supervisor: [],
};
const allowedManagerRoles: Record<AppRole, AppRole[]> = {
  director: [],
  master: ["director"],
  representative: ["director", "master"],
  supervisor: ["director", "master", "representative"],
};

export function PeoplePanel({ role }: { role: AppRole }) {
  const load = useServerFn(listPeople);
  const create = useServerFn(createPerson);
  const update = useServerFn(updatePerson);
  const remove = useServerFn(deletePerson);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>(allowedRoles[role][0] ?? "supervisor");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = async () => setPeople((await load()) as Person[]);
  useEffect(() => {
    void refresh().catch(() => toast.error("Não foi possível carregar a equipe."));
  }, []);
  const openCreate = () => {
    setEditing(null);
    setSelectedRole(choices[0] ?? "supervisor");
    setSelectedManagerId("");
    setRemoveLogo(false);
    setOpen(true);
  };
  const openEdit = (person: Person) => {
    if (!person.role) return;
    setEditing(person);
    setSelectedRole(person.role);
    setSelectedManagerId(person.manager_id ?? "");
    setRemoveLogo(false);
    setOpen(true);
  };
  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    setSelectedManagerId("");
    setRemoveLogo(false);
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const logoFile = fd.get("companyLogo");
      const companyLogoDataUrl = logoFile instanceof File && logoFile.size > 0
        ? await readLogo(logoFile)
        : null;
      const shared = {
        fullName: String(fd.get("fullName")),
        phone: String(fd.get("phone")),
        role: String(fd.get("role")) as AppRole,
        jobTitle: "",
        team: selectedRole === "supervisor" ? String(fd.get("team")) : "",
        companyName: selectedRole === "representative" ? String(fd.get("companyName")) : "",
        managementName: selectedRole === "master" ? String(fd.get("managementName")) : "",
        managerId: selectedManagerId || null,
      };
      if (editing) {
        await update({ data: { ...shared, userId: editing.user_id, active: editing.active, companyLogoDataUrl, removeCompanyLogo: removeLogo } });
        toast.success("Perfil atualizado com sucesso");
      } else {
        await create({ data: {
          email: String(fd.get("email")),
          password: String(fd.get("password")),
          ...shared,
          companyLogoDataUrl,
        } });
        toast.success("Acesso criado com sucesso");
      }
      closeModal();
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
          companyName: person.company_name,
          managementName: person.management_name,
          companyLogoDataUrl: null,
          removeCompanyLogo: false,
        },
      });
      toast.success(person.active ? "Acesso desativado" : "Acesso reativado");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o acesso.");
    }
  };
  const erase = async (person: Person) => {
    if (!window.confirm(`Apagar permanentemente ${person.full_name}? O login, perfil, logo e metas dessa pessoa serão removidos. As vendas já registradas serão preservadas. Esta ação não pode ser desfeita.`)) return;
    setDeletingId(person.user_id);
    try {
      await remove({ data: { userId: person.user_id } });
      toast.success("Pessoa e acesso apagados");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível apagar esta pessoa.");
    } finally {
      setDeletingId(null);
    }
  };
  const choices = allowedRoles[role];
  const managerChoices = people.filter(
    (person) =>
      person.active &&
      person.role !== null &&
      person.user_id !== editing?.user_id &&
      allowedManagerRoles[selectedRole].includes(person.role),
  );

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
            <Button className="primary-btn" onClick={openCreate}>
              <UserPlus size={16} /> Adicionar pessoa
            </Button>
          </div>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PESSOA</th>
              <th>CONTATO</th>
              <th>FUNÇÃO</th>
              <th>EMPRESA / EQUIPE</th>
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
                <td>{p.role === "representative" ? p.company_name || "Sem empresa" : p.role === "master" ? p.management_name || "Sem gestão" : p.role === "supervisor" ? p.team || "Sem equipe" : "—"}</td>
                <td>
                  <span className={`access-tag ${p.active ? "" : "inactive"}`}>
                    <Check size={13} /> {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  {p.role && choices.includes(p.role) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="people-menu-trigger" disabled={deletingId !== null} aria-label={`Opções de ${p.full_name}`}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="people-menu-content">
                        <DropdownMenuItem onSelect={() => openEdit(p)}><Pencil /> Editar perfil</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className={p.active ? "people-menu-danger" : ""} onSelect={() => void toggle(p)}><Power /> {p.active ? "Desativar acesso" : "Ativar acesso"}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="people-menu-danger" onSelect={() => void erase(p)}><Trash2 /> Apagar pessoa</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="modal-backdrop">
          <form className="sale-modal" onSubmit={submit} key={editing?.user_id ?? "new"}>
            <div className="modal-head">
              <div>
                <span className="panel-kicker">{editing ? "EDITAR PERFIL" : "NOVO ACESSO"}</span>
                <h3>{editing ? editing.full_name : "Adicionar pessoa"}</h3>
              </div>
              <Button variant="ghost" size="icon" type="button" onClick={closeModal}>
                <X />
              </Button>
            </div>
            <div className="form-grid">
              <label>
                Nome
                <input name="fullName" required minLength={3} defaultValue={editing?.full_name} />
              </label>
              <label>
                Telefone
                <input name="phone" type="tel" required minLength={10} maxLength={20} defaultValue={editing?.phone} />
              </label>
              {!editing && <label>
                E-mail
                <input name="email" type="email" required />
              </label>}
              {editing && <label>E-mail<input value={editing.email} disabled /></label>}
              {!editing && <label>
                Senha inicial
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={72}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,72}"
                  title="Use ao menos 10 caracteres, com maiúscula, minúscula, número e símbolo."
                  required
                />
              </label>}
              <label>
                Função
                <select name="role" value={selectedRole} onChange={(event) => {
                  const nextRole = event.target.value as AppRole;
                  setSelectedRole(nextRole);
                  const selectedManager = people.find((person) => person.user_id === selectedManagerId);
                  if (selectedManager?.role && !allowedManagerRoles[nextRole].includes(selectedManager.role))
                    setSelectedManagerId("");
                }}>
                  {choices.map((key) => (
                    <option value={key} key={key}>
                      {labels[key]}
                    </option>
                  ))}
                </select>
              </label>
              {selectedRole === "supervisor" && <label>
                Equipe
                <input name="team" required placeholder="Nome da equipe" defaultValue={editing?.team} />
              </label>}
              {selectedRole === "representative" && <label>
                Nome da empresa
                <input name="companyName" required placeholder="Nome da empresa" defaultValue={editing?.company_name} />
              </label>}
              {selectedRole === "master" && <label>
                Gestão
                <input name="managementName" required placeholder="Nome da gestão" defaultValue={editing?.management_name} />
              </label>}
              {selectedRole === "representative" && <label className="company-logo-field">
                Logomarca da empresa (opcional)
                <span className="file-picker"><ImagePlus size={18} /> Escolher imagem</span>
                <input name="companyLogo" type="file" accept="image/png,image/jpeg,image/webp" />
                <small>PNG, JPG ou WEBP · máximo 50 MB</small>
              </label>}
              {editing?.company_logo_url && selectedRole === "representative" && <div className="logo-edit-preview"><img src={editing.company_logo_url} alt={`Logo atual de ${editing.full_name}`} /><Button type="button" variant="outline" size="sm" onClick={() => setRemoveLogo((value) => !value)}><Trash2 /> {removeLogo ? "Manter logo atual" : "Remover logo"}</Button></div>}
              <label>
                Superior
                 <select name="managerId" value={selectedManagerId} onChange={(event) => setSelectedManagerId(event.target.value)}>
                  <option value="">Vincular a mim</option>
                   {managerChoices.map((p) => (
                      <option value={p.user_id} key={p.user_id}>
                        {p.full_name} · {p.role ? labels[p.role] : "Sem função"}
                      </option>
                     ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <Button type="button" variant="outline" className="outline-btn" onClick={closeModal}>
                Cancelar
              </Button>
              <Button className="primary-btn" disabled={busy}>
                {busy ? "Salvando..." : editing ? "Salvar alterações" : "Criar acesso"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
