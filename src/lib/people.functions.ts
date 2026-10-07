import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { assertPersonDeletionAllowed, managedRoles } from "@/lib/people-permissions";

const roleSchema = z.enum([
  "director",
  "master",
  "representative",
  "supervisor",
]);
const logoSchema = z.string().max(70_000_000).nullable();
const profileFields = {
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(10).max(20),
  role: roleSchema,
  jobTitle: z.string().trim().max(100),
  team: z.string().trim().max(100),
  companyName: z.string().trim().max(160),
  managementName: z.string().trim().max(160),
  managerId: z.string().uuid().nullable(),
};
const validateRoleFields = (data: { role: AppRole; team: string; companyName: string; managementName: string }, ctx: z.RefinementCtx) => {
  if (data.role === "supervisor" && data.team.length < 2)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["team"], message: "Informe o nome da equipe." });
  if (data.role === "representative" && data.companyName.length < 2)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyName"], message: "Informe o nome da empresa." });
  if (data.role === "master" && data.managementName.length < 2)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["managementName"], message: "Informe o nome da gestão." });
};
const personSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(10).max(72)
    .regex(/[a-z]/, "A senha precisa ter letra minúscula.")
    .regex(/[A-Z]/, "A senha precisa ter letra maiúscula.")
    .regex(/[0-9]/, "A senha precisa ter número.")
    .regex(/[^A-Za-z0-9]/, "A senha precisa ter símbolo."),
  ...profileFields,
  companyLogoDataUrl: logoSchema,
}).superRefine(validateRoleFields);
const updateSchema = z.object({
  userId: z.string().uuid(),
  ...profileFields,
  active: z.boolean(),
  companyLogoDataUrl: logoSchema,
  removeCompanyLogo: z.boolean(),
}).superRefine(validateRoleFields);
const inviteSchema = z.object({
  role: z.enum(["director"]),
  validDays: z.number().int().min(1).max(30),
});

type AppRole = z.infer<typeof roleSchema>;
type LogoPayload = { companyLogoDataUrl: string | null };
const canCreate = managedRoles;
const allowedManagerRoles: Record<AppRole, AppRole[]> = {
  director: [],
  master: ["director"],
  representative: ["director", "master"],
  supervisor: ["director", "master", "representative"],
};

type AuthContext = { supabase: SupabaseClient<Database>; userId: string };

async function getActorRole(context: AuthContext): Promise<AppRole> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .maybeSingle();
  const role = roleSchema.safeParse(data?.role);
  if (!role.success) throw new Error("Seu acesso não permite administrar pessoas.");
  return role.data;
}

async function assertCanManage(context: AuthContext, targetRole: AppRole) {
  const actorRole = await getActorRole(context);
  if (!canCreate[actorRole].includes(targetRole))
    throw new Error("Seu cargo não pode criar ou alterar este nível de acesso.");
}

async function resolveManagerId(context: AuthContext, targetRole: AppRole, requestedManagerId: string | null) {
  const managerId = requestedManagerId ?? context.userId;
  const [{ data: manager }, { data: managerRoleRow }] = await Promise.all([
    context.supabase
      .from("profiles")
      .select("user_id, active")
      .eq("user_id", managerId)
      .maybeSingle(),
    context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", managerId)
      .maybeSingle(),
  ]);
  const managerRole = roleSchema.safeParse(managerRoleRow?.role);
  if (!manager?.active || !managerRole.success)
    throw new Error("Selecione um superior ativo da sua estrutura.");
  if (!allowedManagerRoles[targetRole].includes(managerRole.data))
    throw new Error("O superior escolhido precisa estar acima deste cargo na hierarquia.");
  return managerId;
}

async function decodeLogo(data: LogoPayload) {
  if (!data.companyLogoDataUrl) return null;
  const logoMatch = data.companyLogoDataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  const imageType = logoMatch?.[1];
  const encodedImage = logoMatch?.[2];
  if (!imageType || !encodedImage) throw new Error("Use uma imagem PNG, JPG ou WEBP.");
  const bytes = Uint8Array.from(atob(encodedImage), (character) => character.charCodeAt(0));
  if (bytes.byteLength > 50_000_000) throw new Error("A logomarca deve ter no máximo 50 MB.");
  return { bytes, imageType, extension: imageType === "jpeg" ? "jpg" : imageType };
}

export const createAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const actorRole = await getActorRole(context);
    if (actorRole !== "director")
      throw new Error("Apenas Presidente/Diretor pode criar convites administrativos.");
    const code = `${crypto.randomUUID()}${crypto.randomUUID()}`
      .replaceAll("-", "")
      .slice(0, 24)
      .toUpperCase();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
    const codeHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const expiresAt = new Date(Date.now() + data.validDays * 86400000).toISOString();
    const { error } = await context.supabase.from("admin_invites").insert({
      code_hash: codeHash,
      role: data.role,
      created_by: context.userId,
      expires_at: expiresAt,
    });
    if (error) throw new Error("Não foi possível criar o convite.");
    return { code, expiresAt };
  });

export const listPeople = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").order("full_name"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error("Não foi possível carregar a equipe.");
    const roleMap = new Map((roles ?? []).map((item) => [item.user_id, item.role]));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return Promise.all((profiles ?? []).map(async (profile) => {
      const signed = profile.company_logo_path
        ? await supabaseAdmin.storage.from("company-logos").createSignedUrl(profile.company_logo_path, 86400)
        : null;
      return {
        ...profile,
        company_logo_url: signed?.data?.signedUrl ?? null,
        role: roleMap.get(profile.user_id) ?? null,
      };
    }));
  });

export const createPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => personSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context, data.role);
    const managerId = await resolveManagerId(context, data.role, data.managerId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });
    if (error || !created.user)
      throw new Error(error?.message ?? "Não foi possível criar o acesso.");
    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      job_title: data.jobTitle,
      team: data.team,
       company_name: data.companyName,
       management_name: data.managementName,
      manager_id: managerId,
      company_logo_path: null,
      active: true,
      created_by: context.userId,
      updated_by: context.userId,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não foi possível salvar o perfil.");
    }
    if (data.companyLogoDataUrl) {
      const decodedLogo = await decodeLogo(data);
      if (!decodedLogo) throw new Error("Não foi possível ler a logomarca.");
      const { bytes, imageType, extension } = decodedLogo;
      const logoPath = `${userId}/logo.${extension}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("company-logos")
        .upload(logoPath, bytes, { contentType: `image/${imageType}`, upsert: true });
      if (uploadError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error("Não foi possível salvar a logomarca.");
      }
      const { error: logoProfileError } = await supabaseAdmin
        .from("profiles")
        .update({ company_logo_path: logoPath })
        .eq("user_id", userId);
      if (logoProfileError) {
        await supabaseAdmin.storage.from("company-logos").remove([logoPath]);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error("Não foi possível vincular a logomarca.");
      }
    }
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role, assigned_by: context.userId });
    await supabaseAdmin.from("access_audit").insert({
      actor_id: context.userId,
      target_user_id: userId,
      action: "USER_CREATED",
      details: { role: data.role },
    });
    return { ok: true };
  });

export const updatePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context, data.role);
    const { data: visibleTarget } = await context.supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!visibleTarget || data.userId === context.userId)
      throw new Error("Você não pode alterar este acesso.");
    const managerId = await resolveManagerId(context, data.role, data.managerId);
    if (managerId === data.userId)
      throw new Error("Uma pessoa não pode ser superior dela mesma.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.userId)
      .maybeSingle();
    const roleResult = existingRole
      ? await supabaseAdmin
          .from("user_roles")
          .update({ role: data.role, assigned_by: context.userId })
          .eq("user_id", data.userId)
      : await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: data.userId, role: data.role, assigned_by: context.userId });
    if (roleResult.error) throw new Error("Não foi possível definir a permissão desta pessoa.");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        job_title: data.jobTitle,
        team: data.team,
         company_name: data.companyName,
         management_name: data.managementName,
         manager_id: managerId,
        active: data.active,
        updated_by: context.userId,
      })
      .eq("user_id", data.userId);
    if (error) throw new Error("Não foi possível atualizar esta pessoa.");
    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_logo_path")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (data.removeCompanyLogo && currentProfile?.company_logo_path) {
      await supabaseAdmin.storage.from("company-logos").remove([currentProfile.company_logo_path]);
      await supabaseAdmin.from("profiles").update({ company_logo_path: null }).eq("user_id", data.userId);
    } else if (data.companyLogoDataUrl) {
      const decodedLogo = await decodeLogo(data);
      if (!decodedLogo) throw new Error("Não foi possível ler a logomarca.");
      const logoPath = `${data.userId}/logo.${decodedLogo.extension}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("company-logos")
        .upload(logoPath, decodedLogo.bytes, { contentType: `image/${decodedLogo.imageType}`, upsert: true });
      if (uploadError) throw new Error("Não foi possível trocar a logomarca.");
      if (currentProfile?.company_logo_path && currentProfile.company_logo_path !== logoPath)
        await supabaseAdmin.storage.from("company-logos").remove([currentProfile.company_logo_path]);
      await supabaseAdmin.from("profiles").update({ company_logo_path: logoPath }).eq("user_id", data.userId);
    }
    if (!data.active)
      await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "876000h" });
    else await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
    await supabaseAdmin.from("access_audit").insert({
      actor_id: context.userId,
      target_user_id: data.userId,
      action: "USER_UPDATED",
      details: { role: data.role, active: data.active },
    });
    return { ok: true };
  });

export const deletePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const actorRole = await getActorRole(context);
    const [{ data: target, error: targetError }, { data: targetRoleRow, error: roleError }] = await Promise.all([
      context.supabase.from("profiles").select("user_id, full_name, company_logo_path").eq("user_id", data.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", data.userId).maybeSingle(),
    ]);
    if (targetError || roleError) throw new Error("Não foi possível conferir este acesso.");
    const targetRole = roleSchema.safeParse(targetRoleRow?.role);
    const permission = {
      actorId: context.userId, actorRole, targetId: data.userId,
      targetRole: targetRole.success ? targetRole.data : null,
      visible: Boolean(target), hasSubordinates: false,
    };
    assertPersonDeletionAllowed(permission);
    if (!target) throw new Error("Este acesso não foi encontrado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: childrenError } = await supabaseAdmin.from("profiles")
      .select("user_id", { count: "exact", head: true }).eq("manager_id", target.user_id);
    if (childrenError) throw new Error("Não foi possível conferir os vínculos desta pessoa.");
    assertPersonDeletionAllowed({ ...permission, hasSubordinates: (count ?? 0) > 0 });
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(target.user_id);
    if (authError) throw new Error("Não foi possível apagar este acesso.");
    const cleanup = await Promise.all([
      supabaseAdmin.from("profiles").delete().eq("user_id", target.user_id),
      supabaseAdmin.from("user_roles").delete().eq("user_id", target.user_id),
      supabaseAdmin.from("push_devices").delete().eq("user_id", target.user_id),
    ]);
    if (cleanup.some((result) => result.error))
      throw new Error("O login foi removido, mas a exclusão do perfil precisa ser concluída. Tente novamente.");
    if (target.company_logo_path) {
      const { error } = await supabaseAdmin.storage.from("company-logos").remove([target.company_logo_path]);
      if (error) console.error("Could not remove deleted person's company logo", error.message);
    }
    const { error: auditError } = await supabaseAdmin.from("access_audit").insert({
      actor_id: context.userId, target_user_id: target.user_id,
      action: "USER_DELETED", details: { role: permission.targetRole, full_name: target.full_name },
    });
    if (auditError) console.error("Could not audit person deletion", auditError.message);
    return { ok: true };
  });
