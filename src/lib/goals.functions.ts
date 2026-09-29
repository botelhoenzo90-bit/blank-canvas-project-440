import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const goalSchema = z.object({
  targetUserId: z.string().uuid(),
  amount: z.number().positive().max(999999999999),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
});

const updateGoalSchema = goalSchema.extend({ goalId: z.string().uuid() });
const deleteGoalSchema = z.object({ goalId: z.string().uuid() });

const allowedTargetRoles = {
  director: ["master", "representative", "supervisor"],
  master: ["representative", "supervisor"],
  representative: ["supervisor"],
  supervisor: [],
} as const;

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

export const updateGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateGoalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: actorRoleRow }, { data: targetRoleRow }, { data: visibleTarget }] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", data.targetUserId).maybeSingle(),
      context.supabase.from("profiles").select("user_id").eq("user_id", data.targetUserId).maybeSingle(),
    ]);
    const actorRole = actorRoleRow?.role;
    const targetRole = targetRoleRow?.role;
    if (!actorRole || !targetRole || !visibleTarget)
      throw new Error("Selecione uma pessoa da sua estrutura.");
    const allowed = allowedTargetRoles[actorRole as keyof typeof allowedTargetRoles] ?? [];
    if (!(allowed as readonly string[]).includes(targetRole))
      throw new Error("Você não pode definir uma meta para este cargo.");
    const { data: goal, error } = await context.supabase
      .from("goals")
      .update({
        target_user_id: data.targetUserId,
        target_role: targetRole,
        amount: data.amount,
        period_month: data.periodMonth,
      })
      .eq("id", data.goalId)
      .select("id")
      .maybeSingle();
    if (error || !goal) throw new Error("Você não pode editar esta meta.");
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteGoalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: goal, error } = await context.supabase
      .from("goals")
      .delete()
      .eq("id", data.goalId)
      .select("id")
      .maybeSingle();
    if (error || !goal) throw new Error("Você não pode cancelar esta meta.");
    return { ok: true };
  });