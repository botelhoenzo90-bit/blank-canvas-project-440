import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertLinkedProfileSelection } from "@/lib/linked-profile.rules";

export const switchProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ profileId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: profiles, error: listError } = await context.supabase.rpc("my_linked_profiles");
    if (listError) throw new Error("Não foi possível conferir seus perfis.");
    assertLinkedProfileSelection(data.profileId, profiles ?? []);
    const { error } = await context.supabase.rpc("switch_my_profile", { target_profile: data.profileId });
    if (error) throw new Error("Não foi possível trocar o perfil.");
    return { ok: true };
  });