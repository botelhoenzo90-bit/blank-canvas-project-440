DROP POLICY IF EXISTS users_register_own_sales ON public.sales;
CREATE POLICY "managers_register_structure_sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id IS NOT NULL
  AND private."current_role"(auth.uid()) IN ('director'::public.app_role, 'super_master'::public.app_role, 'master'::public.app_role, 'representative'::public.app_role, 'supervisor'::public.app_role)
  AND (
    owner_id = auth.uid()
    OR private.is_in_my_structure(auth.uid(), owner_id)
  )
);