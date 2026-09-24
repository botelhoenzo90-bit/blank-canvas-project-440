ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  created_by uuid NOT NULL,
  used_by uuid,
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_invites_privileged_role CHECK (role IN ('director'::public.app_role, 'master'::public.app_role))
);
GRANT SELECT, INSERT, UPDATE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "directors_view_admin_invites"
ON public.admin_invites FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'director'::public.app_role));
CREATE POLICY "directors_create_admin_invites"
ON public.admin_invites FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'director'::public.app_role) AND created_by = auth.uid());
CREATE POLICY "directors_update_admin_invites"
ON public.admin_invites FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'director'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'director'::public.app_role));