ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_logo_path text;

CREATE POLICY "authenticated_view_company_logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id::text = (storage.foldername(name))[1]
      AND (
        p.user_id = auth.uid()
        OR private.has_role(auth.uid(), 'director'::app_role)
        OR private.is_in_my_structure(auth.uid(), p.user_id)
      )
  )
);

CREATE POLICY "managers_upload_company_logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
);

CREATE POLICY "service_role_manage_company_logos"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');