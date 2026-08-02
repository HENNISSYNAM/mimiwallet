
-- ===== Missing tables used by the app =====
CREATE TABLE public.credit_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score integer NOT NULL,
  credit_limit bigint NOT NULL DEFAULT 0,
  probability_of_default numeric,
  model_version text NOT NULL DEFAULT 'v1',
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_score_snapshots TO authenticated;
GRANT ALL ON public.credit_score_snapshots TO service_role;
ALTER TABLE public.credit_score_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own snapshots" ON public.credit_score_snapshots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own snapshots" ON public.credit_score_snapshots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own snapshots" ON public.credit_score_snapshots FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));

CREATE TABLE public.credit_score_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.credit_score_snapshots(id) ON DELETE CASCADE,
  factor_name text NOT NULL,
  raw_value numeric,
  normalized_score numeric NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  trend numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_score_factors TO authenticated;
GRANT ALL ON public.credit_score_factors TO service_role;
ALTER TABLE public.credit_score_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own factors" ON public.credit_score_factors FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.credit_score_snapshots s JOIN public.companies c ON c.id = s.company_id
                 WHERE s.id = snapshot_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own factors" ON public.credit_score_factors FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.credit_score_snapshots s JOIN public.companies c ON c.id = s.company_id
                 WHERE s.id = snapshot_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own factors" ON public.credit_score_factors FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.credit_score_snapshots s JOIN public.companies c ON c.id = s.company_id
                 WHERE s.id = snapshot_id AND c.user_id = auth.uid()));

CREATE TABLE public.learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  quiz_score integer,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON public.learning_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own progress" ON public.learning_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update own progress" ON public.learning_progress FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own progress" ON public.learning_progress FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ===== Owner-scoped DELETE policies =====
CREATE POLICY "Users can delete own companies" ON public.companies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own KYC" ON public.kyc_verifications FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own bank connections" ON public.bank_connections FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own loans" ON public.loan_applications FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));

-- ===== Waitlist hardening =====
DROP POLICY IF EXISTS "Authenticated users can read waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Anyone can submit to waitlist" ON public.waitlist;
REVOKE SELECT, UPDATE, DELETE ON public.waitlist FROM anon, authenticated;
GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT ALL ON public.waitlist TO service_role;
CREATE POLICY "Anyone can submit to waitlist" ON public.waitlist FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(email) BETWEEN 5 AND 255
    AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(company_name) BETWEEN 1 AND 200
    AND (utm_source IS NULL OR length(utm_source) <= 100)
    AND (utm_medium IS NULL OR length(utm_medium) <= 100)
    AND (utm_campaign IS NULL OR length(utm_campaign) <= 100)
  );

-- ===== Remove directly-callable SECURITY DEFINER functions from the API =====
DROP POLICY IF EXISTS "Users can view own devices" ON public.device_wallets;
DROP POLICY IF EXISTS "Users can insert own devices" ON public.device_wallets;
DROP POLICY IF EXISTS "Users can update own devices" ON public.device_wallets;
DROP POLICY IF EXISTS "Users can delete own devices" ON public.device_wallets;
CREATE POLICY "Users can view own devices" ON public.device_wallets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own devices" ON public.device_wallets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update own devices" ON public.device_wallets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own devices" ON public.device_wallets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own rules" ON public.device_rules;
DROP POLICY IF EXISTS "Users can insert own rules" ON public.device_rules;
DROP POLICY IF EXISTS "Users can update own rules" ON public.device_rules;
DROP POLICY IF EXISTS "Users can delete own rules" ON public.device_rules;
CREATE POLICY "Users can view own rules" ON public.device_rules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.device_wallets d JOIN public.companies c ON c.id = d.company_id
                 WHERE d.id = device_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own rules" ON public.device_rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.device_wallets d JOIN public.companies c ON c.id = d.company_id
                 WHERE d.id = device_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update own rules" ON public.device_rules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.device_wallets d JOIN public.companies c ON c.id = d.company_id
                 WHERE d.id = device_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.device_wallets d JOIN public.companies c ON c.id = d.company_id
                 WHERE d.id = device_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own rules" ON public.device_rules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.device_wallets d JOIN public.companies c ON c.id = d.company_id
                 WHERE d.id = device_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own m2m txs" ON public.m2m_transactions;
DROP POLICY IF EXISTS "Users can insert own m2m txs" ON public.m2m_transactions;
CREATE POLICY "Users can view own m2m txs" ON public.m2m_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.device_wallets d JOIN public.companies c ON c.id = d.company_id
                 WHERE d.id = device_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own m2m txs" ON public.m2m_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.device_wallets d JOIN public.companies c ON c.id = d.company_id
                 WHERE d.id = device_id AND c.user_id = auth.uid()));

DROP FUNCTION IF EXISTS public.user_company_ids(uuid);
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- profiles policies scoped to authenticated
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
