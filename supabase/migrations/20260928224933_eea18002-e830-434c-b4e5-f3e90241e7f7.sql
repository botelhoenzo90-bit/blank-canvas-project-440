ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.profiles.company_name IS 'Nome da empresa vinculada ao representante';