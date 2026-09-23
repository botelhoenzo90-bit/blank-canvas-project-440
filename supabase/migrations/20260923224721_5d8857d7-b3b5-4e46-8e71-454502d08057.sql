CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION private.current_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;
CREATE OR REPLACE FUNCTION private.is_in_my_structure(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH RECURSIVE descendants AS (
    SELECT p.user_id FROM public.profiles p WHERE p.user_id = _viewer
    UNION ALL
    SELECT p.user_id FROM public.profiles p JOIN descendants d ON p.manager_id = d.user_id
  ) SELECT EXISTS (SELECT 1 FROM descendants WHERE user_id = _target)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_in_my_structure(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_in_my_structure(uuid, uuid) TO authenticated, service_role;

DROP POLICY "profiles_visible_in_structure" ON public.profiles;
DROP POLICY "directors_manage_profiles" ON public.profiles;
DROP POLICY "roles_visible_in_structure" ON public.user_roles;
DROP POLICY "directors_view_audit" ON public.access_audit;
DROP POLICY "sales_visible_in_structure" ON public.sales;
DROP POLICY "users_register_own_sales" ON public.sales;

CREATE POLICY "profiles_visible_in_structure" ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'director') OR private.is_in_my_structure(auth.uid(), user_id));
CREATE POLICY "directors_manage_profiles" ON public.profiles FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'director')) WITH CHECK (private.has_role(auth.uid(), 'director'));
CREATE POLICY "roles_visible_in_structure" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'director') OR private.is_in_my_structure(auth.uid(), user_id));
CREATE POLICY "directors_view_audit" ON public.access_audit FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'director'));
CREATE POLICY "sales_visible_in_structure" ON public.sales FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'director') OR owner_id = auth.uid() OR (owner_id IS NOT NULL AND private.is_in_my_structure(auth.uid(), owner_id)));
CREATE POLICY "users_register_own_sales" ON public.sales FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND private.current_role(auth.uid()) IS NOT NULL);

DROP FUNCTION public.claim_first_director(text);
DROP FUNCTION public.has_role(uuid, public.app_role);
DROP FUNCTION public.current_role(uuid);
DROP FUNCTION public.is_in_my_structure(uuid, uuid);