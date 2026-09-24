ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (lower(email));