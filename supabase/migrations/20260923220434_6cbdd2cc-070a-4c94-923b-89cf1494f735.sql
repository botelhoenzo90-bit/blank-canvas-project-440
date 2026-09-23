CREATE POLICY "Push devices are server managed" ON public.push_devices FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;