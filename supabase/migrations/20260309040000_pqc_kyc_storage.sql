-- Post-quantum encrypted storage for KYC PII, and a private bucket for the
-- real ID/document files that kyc-verify used to fake with mock:// URLs.

ALTER TABLE public.kyc_verifications
  ADD COLUMN ocr_data_encrypted JSONB,
  ADD COLUMN pqc_key_version TEXT NOT NULL DEFAULT 'v1';

-- Private bucket: never publicly readable, only via RLS-scoped signed access.
INSERT INTO storage.buckets (id, name, public)
VALUES ('secure-documents', 'secure-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {company_id}/kyc/{front|back}.{ext}
-- Only the owning company's user may read/write their own folder.
CREATE POLICY "Users can upload to own company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'secure-documents'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Users can read own company folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'secure-documents'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update own company folder"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'secure-documents'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.companies WHERE user_id = auth.uid())
);
