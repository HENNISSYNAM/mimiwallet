-- Real credit scoring platform: persisted score snapshots + explainable
-- factor breakdowns, computed by the credit-scoring edge function from real
-- transactions/invoices/loan_applications rows (replaces the previously
-- hardcoded numbers in CreditScoring.tsx).

CREATE TABLE public.credit_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score INT NOT NULL,
  credit_limit BIGINT NOT NULL DEFAULT 0,
  probability_of_default NUMERIC NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'v1',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_score_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.credit_score_snapshots(id) ON DELETE CASCADE,
  factor_name TEXT NOT NULL,
  raw_value NUMERIC,
  normalized_score NUMERIC NOT NULL,
  weight NUMERIC NOT NULL,
  trend NUMERIC
);

CREATE INDEX credit_score_snapshots_company_computed_idx
  ON public.credit_score_snapshots (company_id, computed_at DESC);
CREATE INDEX credit_score_factors_snapshot_idx
  ON public.credit_score_factors (snapshot_id);

ALTER TABLE public.credit_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_score_factors ENABLE ROW LEVEL SECURITY;

-- Read-only for the owning company; only the edge function (service-role key,
-- bypasses RLS) writes new snapshots/factors.
CREATE POLICY "Users can view own credit score snapshots" ON public.credit_score_snapshots
  FOR SELECT USING (company_id IN (SELECT public.user_company_ids(auth.uid())));

CREATE POLICY "Users can view own credit score factors" ON public.credit_score_factors
  FOR SELECT USING (
    snapshot_id IN (
      SELECT id FROM public.credit_score_snapshots
      WHERE company_id IN (SELECT public.user_company_ids(auth.uid()))
    )
  );
