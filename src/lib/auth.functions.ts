import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const signupSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72),
  team: z.string().trim().min(2).max(100),
  role: z.enum(["director", "master", "representative", "supervisor"]),
});

const roleTitles = {
  director: "Presidente/Diretor",
  master: "Master",
  representative: "Representante",
  supervisor: "Supervisor",
} as const;

export const createAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
      job_title: roleTitles[data.role],
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
      .insert({ user_id: userId, role: data.role });
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
