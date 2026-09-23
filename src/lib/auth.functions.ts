import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const setupSchema = z.object({ fullName: z.string().trim().min(3).max(120) });
const accessRequestSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
});

export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true });
  return { needsSetup: (count ?? 0) === 0 };
});

export const requestAccess = createServerFn({ method: "POST" })
  .inputValidator((input) => accessRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true });
    const firstAccess = (count ?? 0) === 0;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) {
      if (error?.message.toLowerCase().includes("already")) throw new Error("Este e-mail já possui cadastro.");
      throw new Error("Não foi possível solicitar o acesso.");
    }
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: created.user.id,
      full_name: data.fullName,
      job_title: firstAccess ? "Director" : "",
      team: "",
      active: firstAccess,
      created_by: created.user.id,
      updated_by: created.user.id,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Não foi possível salvar a solicitação.");
    }
    await supabaseAdmin.from("access_audit").insert({
      actor_id: created.user.id,
      target_user_id: created.user.id,
      action: firstAccess ? "FIRST_DIRECTOR_REQUESTED" : "ACCESS_REQUESTED",
      details: { email: data.email },
    });
    return { ok: true, firstAccess };
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roleRow }, { count }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("id", { count: "exact", head: true }),
    ]);
    const needsSetup = (count ?? 0) === 0;
    return { profile, role: roleRow?.role ?? null, pending: Boolean(profile && (!profile.active || (!roleRow && !needsSetup))) };
  });

export const claimFirstDirector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("A configuração inicial já foi concluída. Peça acesso ao Director.");
    const now = new Date().toISOString();
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      user_id: context.userId, full_name: data.fullName, job_title: "Director", active: true,
      created_by: context.userId, updated_by: context.userId, updated_at: now,
    });
    if (profileError) throw new Error("Não foi possível criar o perfil inicial.");
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "director", assigned_by: context.userId });
    if (roleError) throw new Error("Não foi possível concluir a configuração inicial.");
    await supabaseAdmin.from("access_audit").insert({ actor_id: context.userId, target_user_id: context.userId, action: "FIRST_DIRECTOR_CLAIMED", details: { role: "director" } });
    return { ok: true };
  });
