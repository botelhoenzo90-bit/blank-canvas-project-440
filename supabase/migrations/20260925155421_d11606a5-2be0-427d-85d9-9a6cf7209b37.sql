ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  target_role public.app_role NOT NULL,
  amount numeric NOT NULL,
  period_month date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_visible_in_structure"
ON public.goals FOR SELECT TO authenticated
USING (
  target_user_id = auth.uid()
  OR private.has_role(auth.uid(), 'director'::public.app_role)
  OR private.is_in_my_structure(auth.uid(), target_user_id)
);

CREATE POLICY "managers_create_goals_in_structure"
ON public.goals FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND target_role IN ('master'::public.app_role, 'representative'::public.app_role, 'supervisor'::public.app_role)
  AND (
    private.has_role(auth.uid(), 'director'::public.app_role)
    OR (
      private.current_role(auth.uid()) = 'master'::public.app_role
      AND target_role IN ('representative'::public.app_role, 'supervisor'::public.app_role)
      AND private.is_in_my_structure(auth.uid(), target_user_id)
    )
    OR (
      private.current_role(auth.uid()) = 'representative'::public.app_role
      AND target_role = 'supervisor'::public.app_role
      AND private.is_in_my_structure(auth.uid(), target_user_id)
    )
  )
);

CREATE POLICY "goal_creators_update"
ON public.goals FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR private.has_role(auth.uid(), 'director'::public.app_role))
WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(), 'director'::public.app_role));

CREATE POLICY "goal_creators_delete"
ON public.goals FOR DELETE TO authenticated
USING (created_by = auth.uid() OR private.has_role(auth.uid(), 'director'::public.app_role));

CREATE TRIGGER set_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;