-- Consent to pulling tax-authority data is not the same consent as bank data.
--
-- `consents.kind` allowed 'tos', 'privacy' and 'bank_data'. Connecting the
-- General Department of Taxation was about to be recorded as 'bank_data',
-- because that was the only value that fit — which would have made the record
-- say something untrue about what the person agreed to.
--
-- The whole reason to keep a consent row is to be able to answer "what did they
-- agree to, and to which text". A row that names the wrong data source answers
-- that question wrongly, and does it in the one place designed to be trusted.
ALTER TABLE public.consents DROP CONSTRAINT IF EXISTS consents_kind_check;
ALTER TABLE public.consents
  ADD CONSTRAINT consents_kind_check
  CHECK (kind IN ('tos', 'privacy', 'bank_data', 'tax_data'));

COMMENT ON COLUMN public.consents.kind IS
  'What was agreed to. bank_data = reading bank statements via Cas; tax_data = reading e-invoices from the tax authority. Separate because they are separate decisions.';
