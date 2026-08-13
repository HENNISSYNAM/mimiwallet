-- The two fields that tie an incoming payment to the QR that asked for it.
--
-- Cas gives every QR its own virtual account number and echoes the merchant's
-- `referenceNumber` back on the TRANSACTIONS webhook. Both were being dropped
-- by the mapper, which left reconciliation with nothing but the free-text
-- description — the exact guessing game the QR flow exists to end.
--
-- Stored on the transaction rather than read from the webhook body on the fly,
-- because a payment can reach us two ways: pushed by Cas, or found by the next
-- poll. Matching has to work identically on both, and it only can if both write
-- the same columns.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS virtual_account_number text,
  ADD COLUMN IF NOT EXISTS payment_reference text;

-- Reconciliation looks up recent unmatched payments for one company.
CREATE INDEX IF NOT EXISTS transactions_payment_reference_idx
  ON public.transactions (company_id, payment_reference)
  WHERE payment_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_virtual_account_idx
  ON public.transactions (company_id, virtual_account_number)
  WHERE virtual_account_number IS NOT NULL;

COMMENT ON COLUMN public.transactions.payment_reference IS
  'Merchant reference echoed back by Cas (paymentMeta.referenceNumber). Links this payment to a row in qr_payments.';
COMMENT ON COLUMN public.transactions.virtual_account_number IS
  'The per-QR virtual account the payer transferred to. Second way to match a payment to its QR.';
