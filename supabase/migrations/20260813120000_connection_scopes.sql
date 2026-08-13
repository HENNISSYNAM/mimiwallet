-- Which product a bank connection was linked for.
--
-- Cas issues a separate grant per product: the QR Pay flow asks for
-- `scopes: "qrpay"` and verifies an account number and holder name, while the
-- statement flow asks for `transaction` and verifies a banking login. They are
-- different consents over different data, and one grant cannot stand in for the
-- other.
--
-- Without recording it, `create-qr` had no way to tell them apart and simply
-- took the oldest connection — so a customer who linked a QR-capable bank as
-- their second account would still be told their bank does not support QR Pay,
-- naming the wrong bank.
ALTER TABLE public.bank_connections
  ADD COLUMN IF NOT EXISTS scopes text NOT NULL DEFAULT 'transaction';

CREATE INDEX IF NOT EXISTS bank_connections_company_scopes_idx
  ON public.bank_connections (company_id, scopes);

COMMENT ON COLUMN public.bank_connections.scopes IS
  'Comma-separated Cas scopes this grant was issued with, e.g. "transaction" or "qrpay". Decides which product the connection can serve.';
