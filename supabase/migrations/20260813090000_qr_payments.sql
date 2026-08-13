-- QR payment requests, and the thread that ties an incoming payment to an invoice.
--
-- Vietnamese small businesses get paid by QR transfer. Until now MIMI could
-- only watch money arrive and guess what it was for, because a bank statement
-- description is free text — "CK DEN TU NGUYEN VAN A" does not say which
-- invoice it settles.
--
-- Cas issues a virtual account number per QR and echoes our own
-- `referenceNumber` back on the TRANSACTIONS webhook as
-- `paymentMeta.referenceNumber`. That reference is the thread: it turns
-- reconciliation from a guess into a lookup.
--
-- A separate table rather than columns on `invoices` because the two have
-- different lifecycles. One invoice can be re-issued a QR after the first
-- expires, and each attempt is worth keeping — an invoice marked paid should be
-- able to name the exact payment request that settled it.

CREATE TABLE IF NOT EXISTS public.qr_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Nullable: a shop can raise a QR for a walk-in sale with no invoice behind it.
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,

  -- What we sent Cas. `reference_number` is ours to choose and must never be
  -- reused, so it is unique per company.
  reference_number text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  description text NOT NULL,

  -- What Cas sent back.
  account_number text,
  virtual_account_number text,
  bin text,
  qr_code text,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  -- Set when the TRANSACTIONS webhook matches. Points at the row in
  -- `transactions` so the money and the claim it settles stay connected.
  paid_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  paid_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Total, not partial: the webhook handler looks a payment up by reference and
-- an upsert has to be able to infer this index. A partial one cannot be
-- inferred through PostgREST and raises instead of skipping.
CREATE UNIQUE INDEX IF NOT EXISTS qr_payments_company_reference_idx
  ON public.qr_payments (company_id, reference_number);

-- The webhook arrives with a reference and nothing else, so it has to find the
-- row without knowing the company yet.
CREATE INDEX IF NOT EXISTS qr_payments_reference_idx
  ON public.qr_payments (reference_number);
CREATE INDEX IF NOT EXISTS qr_payments_company_status_idx
  ON public.qr_payments (company_id, status);

ALTER TABLE public.qr_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their QR payments"
  ON public.qr_payments FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- No INSERT/UPDATE/DELETE policy for `authenticated` on purpose. A QR is only
-- valid because Cas issued it, so it must be created by the edge function that
-- called Cas — a row the browser wrote itself would be a QR nobody can pay,
-- and a status the browser could set would let anyone mark an invoice paid.

COMMENT ON TABLE public.qr_payments IS
  'QR payment requests issued through Cas. reference_number is echoed on the TRANSACTIONS webhook and is what links an incoming payment to an invoice.';
