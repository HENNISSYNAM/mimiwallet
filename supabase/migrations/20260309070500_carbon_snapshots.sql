-- Stored results of the spend-based carbon estimate, so the footprint page can
-- show a trend over time rather than only whatever the latest run computed.
--
-- Figures are ESTIMATES from the GHG Protocol Scope 3 spend-based method
-- (spend x emission factor per category), not metered readings. The factor set
-- used for a row is stored alongside it so an older snapshot stays reproducible
-- after the factors are revised.

CREATE TABLE public.carbon_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- kg CO2e over the analysed window
  total_emissions NUMERIC NOT NULL,
  total_spend BIGINT NOT NULL,
  total_revenue BIGINT NOT NULL,
  -- kg CO2e per million VND of revenue; the only figure comparable across companies
  intensity_per_revenue NUMERIC NOT NULL,
  by_category JSONB NOT NULL DEFAULT '[]'::jsonb,
  by_month JSONB NOT NULL DEFAULT '[]'::jsonb,
  factor_version TEXT NOT NULL DEFAULT 'eeio-v1',
  months_analysed INT NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX carbon_snapshots_company_idx
  ON public.carbon_snapshots (company_id, created_at DESC);

ALTER TABLE public.carbon_snapshots ENABLE ROW LEVEL SECURITY;

-- Same company-scoping helper the credit-scoring and learning tables use.
CREATE POLICY "Users can view own carbon snapshots" ON public.carbon_snapshots
  FOR SELECT USING (company_id IN (SELECT public.user_company_ids(auth.uid())));
CREATE POLICY "Users can insert own carbon snapshots" ON public.carbon_snapshots
  FOR INSERT WITH CHECK (company_id IN (SELECT public.user_company_ids(auth.uid())));
