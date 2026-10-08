import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertDirectorView, structureIds } from "@/lib/view-scope";
import type { Database } from "@/integrations/supabase/types";

export const getManagementView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const [{ data: actorRole }, { data: actor }] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("profiles").select("active").eq("user_id", context.userId).maybeSingle(),
    ]);
    assertDirectorView(actorRole?.role, actor?.active === true);
    const profiles = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: rows, error } = await context.supabase.from("profiles").select("*").order("user_id").range(offset, offset + 999);
      if (error) throw new Error("Não foi possível carregar esta gestão.");
      profiles.push(...(rows ?? []));
      if ((rows?.length ?? 0) < 1000) break;
    }
    const roles: Array<{ user_id: string; role: Database["public"]["Enums"]["app_role"] }> = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: rows, error } = await context.supabase.from("user_roles").select("user_id, role").order("user_id").range(offset, offset + 999);
      if (error) throw new Error("Não foi possível carregar os cargos.");
      roles.push(...(rows ?? []));
      if ((rows?.length ?? 0) < 1000) break;
    }
    const target = profiles.find((item) => item.user_id === data.userId);
    const targetRole = roles.find((item) => item.user_id === data.userId)?.role;
    if (!target || !targetRole || !["director", "master", "representative", "supervisor"].includes(targetRole))
      throw new Error("Esta conta não foi encontrada.");
    const ids = targetRole === "director" ? new Set(profiles.map((p) => p.user_id)) : structureIds(target.user_id, profiles);
    const sales = [];
    const goals = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: rows, error } = await context.supabase.from("sales").select("*").order("id").range(offset, offset + 999);
      if (error) throw new Error("Não foi possível carregar as vendas desta gestão.");
      sales.push(...(rows ?? []).filter((sale) => targetRole === "director" || (sale.owner_id && ids.has(sale.owner_id))));
      if ((rows?.length ?? 0) < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const { data: rows, error } = await context.supabase.from("goals").select("*").order("id").range(offset, offset + 999);
      if (error) throw new Error("Não foi possível carregar as metas desta gestão.");
      goals.push(...(rows ?? []).filter((goal) => ids.has(goal.target_user_id)));
      if ((rows?.length ?? 0) < 1000) break;
    }
    const scopedProfiles = profiles.filter((person) => ids.has(person.user_id));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const people = [];
    for (let i = 0; i < scopedProfiles.length; i += 6) {
      people.push(...await Promise.all(scopedProfiles.slice(i, i + 6).map(async (person) => {
        const signed = person.company_logo_path
          ? await supabaseAdmin.storage.from("company-logos").createSignedUrl(person.company_logo_path, 3600)
          : null;
        return { ...person, role: roles.find((r) => r.user_id === person.user_id)?.role ?? null, company_logo_url: signed?.data?.signedUrl ?? null };
      })));
    }
    return { target: { user_id: target.user_id, full_name: target.full_name, role: targetRole }, people, sales, goals };
  });

export const getTvBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const [{ data: actor }, { data: role }] = await Promise.all([
      context.supabase.from("profiles").select("active").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle(),
    ]);
    if (!actor?.active || !role || !["director", "master", "representative", "supervisor"].includes(role.role))
      throw new Error("Seu acesso não permite abrir a Central TV.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin.rpc("tv_branding_profiles");
    if (error) throw new Error("Não foi possível carregar as empresas da TV.");
    const people = [];
    for (let i = 0; i < (profiles?.length ?? 0); i += 6) {
      people.push(...await Promise.all((profiles ?? []).slice(i, i + 6).map(async ({ company_logo_path, ...person }) => {
        const signed = company_logo_path
          ? await supabaseAdmin.storage.from("company-logos").createSignedUrl(company_logo_path, 3600)
          : null;
        return { ...person, email: "", phone: "", job_title: "", company_logo_url: signed?.data?.signedUrl ?? null };
      })));
    }
    return people;
  });