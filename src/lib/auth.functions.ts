import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const signupSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(72)
    .regex(/[a-z]/, "A senha precisa ter letra minúscula.")
    .regex(/[A-Z]/, "A senha precisa ter letra maiúscula.")
    .regex(/[0-9]/, "A senha precisa ter número.")
    .regex(/[^A-Za-z0-9]/, "A senha precisa ter símbolo."),
  team: z.string().trim().min(2).max(100),
});

export const getInitialSignupAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "director");
  if (error) return { available: false };
  return { available: count === 0 };
});

export const createAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: accessCheckError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "director");
    if (accessCheckError || count !== 0)
      return { ok: false as const, reason: "signup_closed" as const };
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });
    if (error || !created.user) {
      if (error?.message.toLowerCase().includes("already"))
        return { ok: false as const, reason: "email_exists" as const };
      return { ok: false as const, reason: "create_failed" as const };
    }
    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      job_title: "Presidente/Diretor",
      team: data.team,
      manager_id: null,
      active: true,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, reason: "profile_failed" as const };
    }
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "director" });
    if (roleError) {
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, reason: "role_failed" as const };
    }
    return { ok: true as const };
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    return {
      profile,
      role: roleRow?.role ?? null,
      pending: Boolean(!profile || !profile.active || !roleRow),
    };
  });
