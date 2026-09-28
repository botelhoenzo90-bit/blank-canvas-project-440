CREATE OR REPLACE FUNCTION public.prevent_additional_director()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'director'::public.app_role
     AND EXISTS (
       SELECT 1
       FROM public.user_roles
       WHERE role = 'director'::public.app_role
         AND id <> NEW.id
     ) THEN
    RAISE EXCEPTION 'A President/Director already exists.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_additional_director_trigger ON public.user_roles;
CREATE TRIGGER prevent_additional_director_trigger
BEFORE INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_additional_director();