import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const saleSchema = z.object({
  seller: z.string().trim().min(1).max(120),
  supervisor: z.string().trim().min(1).max(120),
  representative: z.string().trim().min(1).max(120),
  master: z.string().trim().min(1).max(120),
  team: z.string().trim().min(1).max(120),
  value: z.number().positive().max(999999999999),
  status: z.enum(["Confirmada", "Pendente"]),
});

const deviceSchema = z.object({
  token: z.string().min(20).max(4096),
  deviceLabel: z.string().trim().min(1).max(160),
});

export const registerPushDevice = createServerFn({ method: "POST" })
  .inputValidator((input) => deviceSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_devices").upsert(
      { token: data.token, device_label: data.deviceLabel, active: true, last_seen_at: new Date().toISOString() },
      { onConflict: "token" },
    );
    if (error) throw new Error("Não foi possível cadastrar este aparelho.");
    return { ok: true };
  });

export const createSaleAndNotify = createServerFn({ method: "POST" })
  .inputValidator((input) => saleSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const saleDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
    const saleTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const { data: sale, error } = await supabaseAdmin.from("sales").insert({
      seller: data.seller,
      supervisor: data.supervisor,
      representative: data.representative,
      master: data.master,
      team: data.team,
      value: data.value,
      sale_date: saleDate,
      sale_time: saleTime,
      status: data.status,
    }).select().single();
    if (error || !sale) throw new Error("Não foi possível registrar a venda.");

    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const firebaseApiKey = process.env["FIREBASE_MESSAGING_API_KEY_1"] ?? process.env["FIREBASE_MESSAGING_API_KEY"];
    if (lovableApiKey && firebaseApiKey && data.status === "Confirmada") {
      const { data: devices } = await supabaseAdmin.from("push_devices").select("token").eq("active", true);
      await Promise.allSettled((devices ?? []).map(async ({ token }) => {
        const response = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": firebaseApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: "Nova venda confirmada", body: `${data.seller} vendeu ${data.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} • ${data.team}` },
              data: { path: "/", saleId: sale.id },
              webpush: { fcm_options: { link: "/" } },
            },
          }),
        });
        if (response.ok) return;
        const body = await response.text();
        console.error(`FCM send failed [${response.status}]: ${body}`);
        if ((response.status === 404 && body.includes("UNREGISTERED")) || (response.status === 400 && body.includes("INVALID_ARGUMENT"))) {
          await supabaseAdmin.from("push_devices").delete().eq("token", token);
        }
      }));
    }

    return sale;
  });