import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const accessRequestSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
});

export const requestAccess = createServerFn({ method: "POST" })
  .inputValidator((input) => accessRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
      job_title: "",
      team: "",
      active: false,
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
      action: "ACCESS_REQUESTED",
      details: { email: data.email },
    });
    return { ok: true };
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle(),
    ]);
    return { profile, role: roleRow?.role ?? null, pending: Boolean(!profile || !profile.active || !roleRow) };
  });
