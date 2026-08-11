-- BankHub / Cas as a real data provider, alongside the existing mock and sepay.
--
-- Cas is an aggregator with a token-grant flow rather than a webhook-only feed:
-- the customer authorises us inside Cas Link, we exchange a short-lived
-- publicToken for a long-lived accessToken + grantId, and then *pull* history
-- with GET /transactions?fromDate=&toDate=. That difference matters for this
-- product specifically — the scoring model reads 12 months of data, so a pull
-- API means a new customer can be scored on the day they connect instead of
-- twelve months after.

ALTER TABLE public.bank_connections
  DROP CONSTRAINT IF EXISTS bank_connections_provider_check;
ALTER TABLE public.bank_connections
  ADD CONSTRAINT bank_connections_provider_check
  CHECK (provider IN ('mock', 'sepay', 'bankhub'));

ALTER TABLE public.bank_connections
  -- Cas's own identifier for the authorisation. Webhooks (notably
  -- USER_PERMISSION_REVOKED) arrive keyed by this and nothing else, so it is
  -- the only way to find out which connection a revocation refers to.
  ADD COLUMN IF NOT EXISTS grant_id text,
  -- The accessToken is a bearer credential for somebody's bank account and it
  -- does not expire. Cas's own launch checklist calls it a core identifier tied
  -- directly to the customer's financial account. Storing it as plaintext in a
  -- table that several service-role functions can read is not defensible, so it
  -- goes in as an ML-KEM-768 + AES-256-GCM blob from _shared/pqcCrypto.ts —
  -- the same envelope already used for KYC documents.
  ADD COLUMN IF NOT EXISTS access_token_enc jsonb,
  ADD COLUMN IF NOT EXISTS account_name text,
  -- GET /transactions accepts fromReference to resume from the last transaction
  -- already seen. Cheaper and less lossy than re-pulling a date window, because
  -- a window can silently miss a transaction the bank posted late.
  ADD COLUMN IF NOT EXISTS last_reference text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE public.bank_connections
  -- Whether a positive `amount` from Cas means money in ('signed') or money out
  -- ('inverted'), as measured against runningBalance on the first sync that had
  -- enough rows to tell. Pinning it means a later sync that returns a single
  -- transaction cannot quietly fall back to the default and file it backwards.
  ADD COLUMN IF NOT EXISTS direction_convention text;

ALTER TABLE public.bank_connections
  DROP CONSTRAINT IF EXISTS bank_connections_direction_convention_check;
ALTER TABLE public.bank_connections
  ADD CONSTRAINT bank_connections_direction_convention_check
  CHECK (direction_convention IS NULL OR direction_convention IN ('signed', 'inverted'));

CREATE INDEX IF NOT EXISTS bank_connections_grant_idx
  ON public.bank_connections (grant_id)
  WHERE grant_id IS NOT NULL;

-- ── Uniqueness for a provider that returns several accounts per grant ───────
-- A company holds one *connection* per bank under the mock provider, but one
-- per *account* under Cas, and a business commonly has a current account and a
-- savings account at the same bank.
--
-- The obvious fix — making the existing (company_id, bank_code) index partial —
-- is wrong, and quietly so. Postgres will not use a partial unique index to
-- resolve ON CONFLICT unless the statement repeats the index predicate, and
-- PostgREST's `onConflict` parameter can only carry column names. The upsert in
-- open-banking's "connect" action would therefore stop matching any index and
-- fall through to its slow read-then-write fallback on every demo connection.
--
-- So both indexes stay total. Uniqueness for Cas rows comes from
-- (company_id, provider, account_number) instead, which is safe as a total
-- index because Postgres treats NULLs as distinct: the mock and sepay rows,
-- which have no account_number, are unaffected no matter how many there are.
CREATE UNIQUE INDEX IF NOT EXISTS bank_connections_company_account_idx
  ON public.bank_connections (company_id, provider, account_number);

-- Same trap, already live. 20260810160000 created the transactions dedupe index
-- as a partial one, which means the ON CONFLICT in bank-webhook and in the Cas
-- sync cannot infer it — and an upsert that cannot find its arbiter index does
-- not silently skip the duplicate, it raises. The NULLs-are-distinct rule makes
-- the predicate unnecessary here too.
DROP INDEX IF EXISTS public.transactions_company_reference_idx;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_company_reference_idx
  ON public.transactions (company_id, reference_id);

COMMENT ON COLUMN public.bank_connections.access_token_enc IS
  'PQC-encrypted Cas accessToken (EncryptedBlob from _shared/pqcCrypto.ts). Never return this to the client.';
COMMENT ON COLUMN public.bank_connections.bank_code IS
  'Bank short code for mock/sepay rows. For Cas rows this is "<code>:<accountNumber>" so that two accounts at the same bank do not collide on the (company_id, bank_code) index; the display name lives in bank_name.';
