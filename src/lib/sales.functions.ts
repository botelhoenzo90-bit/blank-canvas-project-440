import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const saleSchema = z.object({
  sellerId: z.string().uuid(),
  city: z.string().trim().min(2).max(120),
  value: z.number().positive().max(999999999999),
  status: z.enum(["Confirmada", "Pendente"]),
  saleType: z.enum(["Veículos", "Imóveis", "Pesados", "Outro"]),
  sellerCompany: z.string().trim().min(2).max(160),
  buyerName: z.string().trim().min(2).max(160),
});

const cancelSchema = z.object({ saleId: z.string().uuid() });

const deviceSchema = z.object({
  token: z.string().min(20).max(4096),
  deviceLabel: z.string().trim().min(1).max(160),
});

export const registerPushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deviceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_devices").upsert(
      {
        token: data.token,
        user_id: context.userId,
        device_label: data.deviceLabel,
        active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error("Não foi possível cadastrar este aparelho.");
    return { ok: true };
  });

export const createSaleAndNotify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: actorRoleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!actorRoleRow || !["director", "master", "representative", "supervisor"].includes(actorRoleRow.role))
      throw new Error("Seu cargo não pode registrar vendas.");
    const { data: visibleSeller } = await context.supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", data.sellerId)
      .maybeSingle();
    if (!visibleSeller) throw new Error("Este vendedor não pertence à sua estrutura.");
    const { data: sellerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.sellerId)
      .maybeSingle();
    if (!sellerRole || !["director", "master", "representative", "supervisor"].includes(sellerRole.role))
      throw new Error("Selecione uma pessoa com acesso ativo.");
    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("full_name, team, manager_id, active")
      .eq("user_id", data.sellerId)
      .single();
    if (!owner?.active) throw new Error("O acesso deste vendedor está inativo.");
    const chain: Array<{
      user_id: string;
      full_name: string;
      manager_id: string | null;
      role?: string;
    }> = [];
    let managerId = owner.manager_id;
    for (let depth = 0; managerId && depth < 6; depth += 1) {
      const { data: manager } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, manager_id")
        .eq("user_id", managerId)
        .maybeSingle();
      if (!manager) break;
      const { data: managerRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", manager.user_id)
        .maybeSingle();
      chain.push({ ...manager, ...(managerRole?.role ? { role: managerRole.role } : {}) });
      managerId = manager.manager_id;
    }
    const byRole = (wanted: string) => chain.find((item) => item.role === wanted)?.full_name ?? "—";
    const now = new Date();
    const saleDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
      now,
    );
    const saleTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const { data: sale, error } = await supabaseAdmin
      .from("sales")
      .insert({
        seller: owner.full_name,
        supervisor: sellerRole.role === "supervisor" ? owner.full_name : byRole("supervisor"),
        representative: byRole("representative"),
        master: byRole("master"),
        super_master: "",
        team: owner.team || "—",
        city: data.city,
        value: data.value,
        sale_type: data.saleType,
        group_number: "",
        quota_number: "",
        seller_company: data.sellerCompany,
        buyer_name: data.buyerName,
        administrator: "",
        credit_value: null,
        payment_method: "",
        lead_source: "",
        notes: "",
        sale_date: saleDate,
        sale_time: saleTime,
        status: data.status,
        owner_id: data.sellerId,
      })
      .select()
      .single();
    if (error || !sale) throw new Error("Não foi possível registrar a venda.");

    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const firebaseApiKey =
      process.env["FIREBASE_MESSAGING_API_KEY_1"] ?? process.env["FIREBASE_MESSAGING_API_KEY"];
    if (lovableApiKey && firebaseApiKey && data.status === "Confirmada") {
      const { data: devices } = await supabaseAdmin
        .from("push_devices")
        .select("token")
        .eq("active", true);
      await Promise.allSettled(
        (devices ?? []).map(async ({ token }) => {
          const response = await fetch(
            "https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "X-Connection-Api-Key": firebaseApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: {
                    title: `Venda Aprovada! (${data.sellerCompany})`,
                    body: `${owner.full_name}\nEquipe: ${owner.team || "Sem equipe"}`,
                    image:
                      "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/65a63a54-4b3e-43cf-81f8-43435e23fa78/dabliu-notification-logo.png",
                  },
                  data: { path: "/", saleId: sale.id },
                  webpush: {
                    notification: {
                      icon: "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/65a63a54-4b3e-43cf-81f8-43435e23fa78/dabliu-notification-logo.png",
                      badge:
                        "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/65a63a54-4b3e-43cf-81f8-43435e23fa78/dabliu-notification-logo.png",
                    },
                    fcm_options: { link: "/" },
                  },
                },
              }),
            },
          );
          if (response.ok) return;
          const body = await response.text();
          console.error(`FCM send failed [${response.status}]: ${body}`);
          if (
            (response.status === 404 && body.includes("UNREGISTERED")) ||
            (response.status === 400 && body.includes("INVALID_ARGUMENT"))
          ) {
            await supabaseAdmin.from("push_devices").delete().eq("token", token);
          }
        }),
      );
    }

    return sale;
  });

export const cancelSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cancelSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: sale, error } = await context.supabase
      .from("sales")
      .update({ status: "Cancelada" })
      .eq("id", data.saleId)
      .neq("status", "Cancelada")
      .select("id")
      .maybeSingle();
    if (error || !sale) throw new Error("Não foi possível cancelar esta venda.");
    return { ok: true };
  });
