import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.enum(["director", "master", "representative", "supervisor", "seller"]);
const personSchema = z.object({
  email: z.string().email().max(200), password: z.string().min(8).max(72), fullName: z.string().trim().min(3).max(120),
  role: roleSchema, jobTitle: z.string().trim().max(100), team: z.string().trim().max(100), managerId: z.string().uuid().nullable(),
});
const updateSchema = z.object({ userId: z.string().uuid(), fullName: z.string().trim().min(3).max(120), role: roleSchema, jobTitle: z.string().trim().max(100), team: z.string().trim().max(100), managerId: z.string().uuid().nullable(), active: z.boolean() });

async function assertDirector(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
  if (data?.role !== "director") throw new Error("Apenas o Director pode administrar pessoas.");
}

export const listPeople = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [{ data: profiles, error }, { data: roles }] = await Promise.all([
    context.supabase.from("profiles").select("*").order("full_name"), context.supabase.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw new Error("Não foi possível carregar a equipe.");
  const roleMap = new Map((roles ?? []).map((item) => [item.user_id, item.role]));
  return (profiles ?? []).map((profile) => ({ ...profile, role: roleMap.get(profile.user_id) ?? null }));
});

export const createPerson = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => personSchema.parse(input)).handler(async ({ data, context }) => {
  await assertDirector(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.fullName } });
  if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar o acesso.");
  const userId = created.user.id;
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({ user_id: userId, full_name: data.fullName, job_title: data.jobTitle, team: data.team, manager_id: data.managerId, active: true, created_by: context.userId, updated_by: context.userId });
  if (profileError) { await supabaseAdmin.auth.admin.deleteUser(userId); throw new Error("Não foi possível salvar o perfil."); }
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role, assigned_by: context.userId });
  await supabaseAdmin.from("access_audit").insert({ actor_id: context.userId, target_user_id: userId, action: "USER_CREATED", details: { role: data.role } });
  return { ok: true };
});

export const updatePerson = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => updateSchema.parse(input)).handler(async ({ data, context }) => {
  await assertDirector(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("profiles").update({ full_name: data.fullName, job_title: data.jobTitle, team: data.team, manager_id: data.managerId, active: data.active, updated_by: context.userId }).eq("user_id", data.userId);
  if (error) throw new Error("Não foi possível atualizar esta pessoa.");
  await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role, assigned_by: context.userId }, { onConflict: "user_id,role" });
  if (!data.active) await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "876000h" });
  else await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
  await supabaseAdmin.from("access_audit").insert({ actor_id: context.userId, target_user_id: data.userId, action: "USER_UPDATED", details: { role: data.role, active: data.active } });
  return { ok: true };
});
