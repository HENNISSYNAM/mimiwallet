-- Give transactions an identity on both sides, and a place to record what we
-- think each one means.

-- ── Which account, and whose money on the other side ────────────────────────
-- Without these, detecting a transfer between the owner's own accounts is
-- impossible: every row looks like money appearing from nowhere. Cas returns
-- both fields on every transaction and we were discarding them.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS counter_account_number text,
  ADD COLUMN IF NOT EXISTS counter_account_name text;

CREATE INDEX IF NOT EXISTS transactions_company_account_idx
  ON public.transactions (company_id, account_number)
  WHERE account_number IS NOT NULL;

-- ── Labels live apart from the transactions they describe ───────────────────
-- A transaction is what the bank reported; a label is what we concluded. Those
-- are different kinds of fact and they age differently — the bank row never
-- changes, while a classification gets re-run whenever the rules or the model
-- improve. Writing labels onto `transactions` would destroy the original each
-- time, and would leave no way to answer "why was this counted as revenue".
CREATE TABLE IF NOT EXISTS public.transaction_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  category text,
  is_internal_transfer boolean NOT NULL DEFAULT false,
  is_personal boolean NOT NULL DEFAULT false,
  /** 'rule' | 'llm' | 'human' — a human label is never overwritten by a machine. */
  source text NOT NULL CHECK (source IN ('rule', 'llm', 'human')),
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  /** The paired leg, when this row was marked as one half of a transfer. */
  paired_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  needs_review boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One current label per transaction; re-running classification upserts.
CREATE UNIQUE INDEX IF NOT EXISTS transaction_labels_tx_idx
  ON public.transaction_labels (transaction_id);

-- The review queue is read on every visit to the bookkeeping screen.
CREATE INDEX IF NOT EXISTS transaction_labels_review_idx
  ON public.transaction_labels (company_id, needs_review)
  WHERE needs_review = true;

ALTER TABLE public.transaction_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own labels" ON public.transaction_labels
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own labels" ON public.transaction_labels
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own labels" ON public.transaction_labels
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE TRIGGER update_transaction_labels_updated_at
  BEFORE UPDATE ON public.transaction_labels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.transaction_labels IS
  'Our interpretation of a bank transaction. Never merged into transactions: the bank row is evidence, this is inference, and inference gets re-run.';
