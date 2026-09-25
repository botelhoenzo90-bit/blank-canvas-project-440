import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const goalSchema = z.object({
  targetUserId: z.string().uuid(),
  amount: z.number().positive().max(999999999999),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
});

export const listGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("goals")
      .select("*")
      .order("period_month", { ascending: false });
    if (error) throw new Error("Não foi possível carregar as metas.");
    return data ?? [];
  });

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => goalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.targetUserId)
      .maybeSingle();
    if (!roleRow || !["master", "representative", "supervisor"].includes(roleRow.role))
      throw new Error("Selecione um Master, Representante ou Supervisor.");
    const { error } = await context.supabase.from("goals").insert({
      target_user_id: data.targetUserId,
      target_role: roleRow.role,
      amount: data.amount,
      period_month: data.periodMonth,
      created_by: context.userId,
    });
    if (error) throw new Error("Você não pode cadastrar esta meta.");
    return { ok: true };
  });