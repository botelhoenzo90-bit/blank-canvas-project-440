import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requireActiveProfile = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const { data, error } = await context.supabase.rpc("active_profile_id");
    if (error || !data) throw new Error("Seu perfil está inativo ou não está autorizado.");
    return next({ context: { loginId: context.userId, userId: data } });
  });