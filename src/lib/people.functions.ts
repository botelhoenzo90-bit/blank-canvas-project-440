import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const roleSchema = z.enum([
  "director",
  "super_master",
  "master",
  "representative",
  "supervisor",
  "seller",
]);
const personSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(10).max(20),
  role: roleSchema,
  jobTitle: z.string().trim().max(100),
  team: z.string().trim().max(100),
  managerId: z.string().uuid().nullable(),
});
const updateSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().max(20),
  role: roleSchema,
  jobTitle: z.string().trim().max(100),
  team: z.string().trim().max(100),
  managerId: z.string().uuid().nullable(),
  active: z.boolean(),
});
const inviteSchema = z.object({
  role: z.enum(["director", "super_master"]),
  validDays: z.number().int().min(1).max(30),
});

type AppRole = z.infer<typeof roleSchema>;
const canCreate: Record<AppRole, AppRole[]> = {
  director: ["director", "super_master", "master", "representative", "supervisor", "seller"],
  super_master: ["master", "representative", "supervisor", "seller"],
  master: ["representative", "supervisor", "seller"],
  representative: ["supervisor", "seller"],
  supervisor: ["seller"],
  seller: [],
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
    return (profiles ?? []).map((profile) => ({
      ...profile,
      role: roleMap.get(profile.user_id) ?? null,
    }));
  });

export const createPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => personSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context, data.role);
    if (data.managerId) {
      const { data: manager } = await context.supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", data.managerId)
        .maybeSingle();
      if (!manager) throw new Error("Selecione um superior da sua estrutura.");
    }
    const managerId = data.managerId ?? context.userId;
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
      manager_id: managerId,
      active: true,
      created_by: context.userId,
      updated_by: context.userId,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não foi possível salvar o perfil.");
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
        manager_id: data.managerId,
        active: data.active,
        updated_by: context.userId,
      })
      .eq("user_id", data.userId);
    if (error) throw new Error("Não foi possível atualizar esta pessoa.");
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
