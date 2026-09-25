CREATE POLICY "managers_cancel_structure_sales"
ON public.sales FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'director'::public.app_role)
  OR (owner_id = auth.uid())
  OR ((owner_id IS NOT NULL) AND private.is_in_my_structure(auth.uid(), owner_id))
)
WITH CHECK (
  status = 'Cancelada'
  AND (
    private.has_role(auth.uid(), 'director'::public.app_role)
    OR (owner_id = auth.uid())
    OR ((owner_id IS NOT NULL) AND private.is_in_my_structure(auth.uid(), owner_id))
  )
);