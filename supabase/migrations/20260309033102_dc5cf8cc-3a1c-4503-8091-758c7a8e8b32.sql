
-- Device Wallets
CREATE TABLE public.device_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.loan_applications(id),
  device_did TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'other' CHECK (device_type IN ('vehicle','robot','iot_sensor','pos_terminal','drone','other')),
  balance BIGINT DEFAULT 0,
  initial_balance BIGINT DEFAULT 0,
  currency TEXT DEFAULT 'VND',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Device Rules
CREATE TABLE public.device_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.device_wallets(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  trigger_condition JSONB NOT NULL DEFAULT '[]'::jsonb,
  trigger_logic TEXT DEFAULT 'AND' CHECK (trigger_logic IN ('AND','OR')),
  action_type TEXT NOT NULL CHECK (action_type IN ('AUTO_PAY','TRANSFER','ALERT','BLOCK')),
  action_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  limit_per_tx BIGINT,
  limit_per_day BIGINT,
  limit_per_month BIGINT,
  is_active BOOLEAN DEFAULT true,
  execution_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- M2M Transactions
CREATE TABLE public.m2m_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.device_wallets(id),
  rule_id UUID REFERENCES public.device_rules(id),
  tx_type TEXT NOT NULL CHECK (tx_type IN ('auto_pay','manual','repayment','top_up','fee')),
  amount BIGINT NOT NULL,
  currency TEXT DEFAULT 'VND',
  recipient_id TEXT,
  recipient_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','reversed')),
  stripe_payment_intent_id TEXT,
  settlement_ms INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.device_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m2m_transactions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check company ownership
CREATE OR REPLACE FUNCTION public.user_company_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.companies WHERE user_id = uid;
$$;

-- device_wallets RLS
CREATE POLICY "Users can view own devices" ON public.device_wallets
  FOR SELECT USING (company_id IN (SELECT public.user_company_ids(auth.uid())));
CREATE POLICY "Users can insert own devices" ON public.device_wallets
  FOR INSERT WITH CHECK (company_id IN (SELECT public.user_company_ids(auth.uid())));
CREATE POLICY "Users can update own devices" ON public.device_wallets
  FOR UPDATE USING (company_id IN (SELECT public.user_company_ids(auth.uid())));
CREATE POLICY "Users can delete own devices" ON public.device_wallets
  FOR DELETE USING (company_id IN (SELECT public.user_company_ids(auth.uid())));

-- device_rules RLS
CREATE POLICY "Users can view own rules" ON public.device_rules
  FOR SELECT USING (device_id IN (SELECT id FROM public.device_wallets WHERE company_id IN (SELECT public.user_company_ids(auth.uid()))));
CREATE POLICY "Users can insert own rules" ON public.device_rules
  FOR INSERT WITH CHECK (device_id IN (SELECT id FROM public.device_wallets WHERE company_id IN (SELECT public.user_company_ids(auth.uid()))));
CREATE POLICY "Users can update own rules" ON public.device_rules
  FOR UPDATE USING (device_id IN (SELECT id FROM public.device_wallets WHERE company_id IN (SELECT public.user_company_ids(auth.uid()))));
CREATE POLICY "Users can delete own rules" ON public.device_rules
  FOR DELETE USING (device_id IN (SELECT id FROM public.device_wallets WHERE company_id IN (SELECT public.user_company_ids(auth.uid()))));

-- m2m_transactions RLS
CREATE POLICY "Users can view own m2m txs" ON public.m2m_transactions
  FOR SELECT USING (device_id IN (SELECT id FROM public.device_wallets WHERE company_id IN (SELECT public.user_company_ids(auth.uid()))));
CREATE POLICY "Users can insert own m2m txs" ON public.m2m_transactions
  FOR INSERT WITH CHECK (device_id IN (SELECT id FROM public.device_wallets WHERE company_id IN (SELECT public.user_company_ids(auth.uid()))));

-- Enable realtime for m2m_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.m2m_transactions;

-- Triggers for updated_at
CREATE TRIGGER update_device_wallets_updated_at BEFORE UPDATE ON public.device_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_device_rules_updated_at BEFORE UPDATE ON public.device_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
