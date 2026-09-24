import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const accessRequestSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(10).max(20).regex(/^[0-9()+\-\s]+$/),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(72),
  role: z.enum(["director", "master", "representative", "supervisor", "seller"]),
  inviteCode: z.string().trim().max(128).optional(),
});

async function hashInviteCode(code: string) {
  const bytes = new TextEncoder().encode(code.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const requestAccess = createServerFn({ method: "POST" })
  .inputValidator((input) => accessRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const privileged = data.role === "director" || data.role === "master";
    let invite: { id: string; role: "director" | "master" } | null = null;
    if (privileged) {
      if (!data.inviteCode) throw new Error("Informe o código de convite para esta função.");
      const codeHash = await hashInviteCode(data.inviteCode);
      const { data: inviteRow } = await supabaseAdmin.from("admin_invites").select("id, role").eq("code_hash", codeHash).eq("role", data.role).is("used_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (!inviteRow) throw new Error("Este código de convite é inválido ou expirou.");
      invite = inviteRow as { id: string; role: "director" | "master" };
    }
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });
    if (error || !created.user) {
      if (error?.message.toLowerCase().includes("already")) throw new Error("Este e-mail já possui uma conta.");
      throw new Error("Não foi possível criar sua conta.");
    }
    if (invite) {
      const { data: claimed } = await supabaseAdmin.from("admin_invites").update({ used_at: new Date().toISOString(), used_by: created.user.id }).eq("id", invite.id).is("used_at", null).select("id").maybeSingle();
      if (!claimed) {
        await supabaseAdmin.auth.admin.deleteUser(created.user.id);
        throw new Error("Este convite já foi utilizado.");
      }
    }
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: created.user.id,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      job_title: "",
      team: "",
      active: true,
      created_by: created.user.id,
      updated_by: created.user.id,
    });
    if (profileError) {
      if (invite) await supabaseAdmin.from("admin_invites").update({ used_at: null, used_by: null }).eq("id", invite.id).eq("used_by", created.user.id);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Não foi possível salvar seu perfil.");
    }
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: data.role,
      assigned_by: created.user.id,
    });
    if (roleError) {
      await supabaseAdmin.from("profiles").delete().eq("user_id", created.user.id);
      if (invite) await supabaseAdmin.from("admin_invites").update({ used_at: null, used_by: null }).eq("id", invite.id).eq("used_by", created.user.id);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Não foi possível salvar sua função.");
    }
    await supabaseAdmin.from("access_audit").insert({
      actor_id: created.user.id,
      target_user_id: created.user.id,
      action: "ACCOUNT_CREATED",
      details: { role: data.role },
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
