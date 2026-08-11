-- Real bank data: provider column, account routing key, and duplicate protection.

-- A company can hold both a demo connection and a real one at the same time, so
-- the provider travels on the connection rather than on a global env var. Every
-- row that exists today came from the mock generator, hence the default.
ALTER TABLE public.bank_connections
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS account_number text;

ALTER TABLE public.bank_connections
  DROP CONSTRAINT IF EXISTS bank_connections_provider_check;
ALTER TABLE public.bank_connections
  ADD CONSTRAINT bank_connections_provider_check
  CHECK (provider IN ('mock', 'sepay'));

-- The webhook arrives with an account number and nothing else identifying the
-- owner, so this lookup is on the hot path of every incoming transaction.
CREATE INDEX IF NOT EXISTS bank_connections_provider_account_idx
  ON public.bank_connections (provider, account_number);

-- The upsert in open-banking's "connect" action targets this pair; without a
-- real unique constraint that upsert silently fell into a fallback path.
CREATE UNIQUE INDEX IF NOT EXISTS bank_connections_company_bank_idx
  ON public.bank_connections (company_id, bank_code);

-- ── Duplicate protection ────────────────────────────────────────────────────
-- SePay retries a webhook up to 7 times over 5 hours whenever it does not get
-- HTTP 200 + {"success": true} back within 30 seconds. A slow cold start is
-- enough to trigger that. Without this constraint one 5,000,000đ transfer can
-- land seven times and the scoring model reads revenue as seven times reality —
-- silently, because every row looks individually valid.
--
-- reference_id is NULL for rows created by the mock generator and by CSV import,
-- and Postgres treats NULLs as distinct in unique indexes, so a partial index
-- constrains only the rows that carry a provider reference.
DELETE FROM public.transactions t
  USING public.transactions dup
  WHERE t.reference_id IS NOT NULL
    AND t.company_id = dup.company_id
    AND t.reference_id = dup.reference_id
    AND t.ctid > dup.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_company_reference_idx
  ON public.transactions (company_id, reference_id)
  WHERE reference_id IS NOT NULL;
