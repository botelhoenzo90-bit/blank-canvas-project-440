ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS management_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.profiles.management_name IS 'Nome livre da gestão vinculada ao representante';