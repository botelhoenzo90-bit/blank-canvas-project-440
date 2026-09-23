CREATE TYPE public.app_role AS ENUM ('director', 'master', 'representative', 'supervisor', 'seller');

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  job_title text NOT NULL DEFAULT '',
  team text NOT NULL DEFAULT '',
  manager_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_audit TO authenticated;
GRANT ALL ON public.access_audit TO service_role;
ALTER TABLE public.access_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;
GRANT EXECUTE ON FUNCTION public.current_role(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_in_my_structure(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE descendants AS (
    SELECT p.user_id FROM public.profiles p WHERE p.user_id = _viewer
    UNION ALL
    SELECT p.user_id FROM public.profiles p JOIN descendants d ON p.manager_id = d.user_id
  )
  SELECT EXISTS (SELECT 1 FROM descendants WHERE user_id = _target)
$$;
GRANT EXECUTE ON FUNCTION public.is_in_my_structure(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_first_director(_full_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  PERFORM pg_advisory_xact_lock(8217301);
  INSERT INTO public.profiles (user_id, full_name, job_title, created_by, updated_by)
  VALUES (auth.uid(), trim(_full_name), 'Director', auth.uid(), auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_by = auth.uid(), updated_at = now();
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by) VALUES (auth.uid(), 'director', auth.uid());
    INSERT INTO public.access_audit (actor_id, target_user_id, action, details)
    VALUES (auth.uid(), auth.uid(), 'FIRST_DIRECTOR_CLAIMED', jsonb_build_object('role','director'));
    claimed := true;
  END IF;
  RETURN claimed;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_first_director(text) TO authenticated;

CREATE POLICY "profiles_visible_in_structure" ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'director') OR public.is_in_my_structure(auth.uid(), user_id));
CREATE POLICY "profiles_insert_self_before_role" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.user_roles));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "directors_manage_profiles" ON public.profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'director')) WITH CHECK (public.has_role(auth.uid(), 'director'));

CREATE POLICY "roles_visible_in_structure" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'director') OR public.is_in_my_structure(auth.uid(), user_id));
CREATE POLICY "directors_view_audit" ON public.access_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'director'));

ALTER TABLE public.sales ADD COLUMN owner_id uuid;
CREATE INDEX sales_owner_id_idx ON public.sales(owner_id);
DROP POLICY IF EXISTS "Public can register sales" ON public.sales;
DROP POLICY IF EXISTS "Public can view sales" ON public.sales;
REVOKE ALL ON public.sales FROM anon;
GRANT SELECT, INSERT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
CREATE POLICY "sales_visible_in_structure" ON public.sales FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'director') OR owner_id = auth.uid() OR (owner_id IS NOT NULL AND public.is_in_my_structure(auth.uid(), owner_id)));
CREATE POLICY "users_register_own_sales" ON public.sales FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND public.current_role(auth.uid()) IS NOT NULL);

ALTER TABLE public.push_devices ADD COLUMN user_id uuid;
CREATE INDEX push_devices_user_id_idx ON public.push_devices(user_id);
DROP POLICY IF EXISTS "Push devices are server managed" ON public.push_devices;
REVOKE ALL ON public.push_devices FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT ALL ON public.push_devices TO service_role;
CREATE POLICY "users_manage_own_devices" ON public.push_devices FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();