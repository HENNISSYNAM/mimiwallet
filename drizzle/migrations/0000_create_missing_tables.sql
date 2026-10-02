CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL, tax_code text, address text, phone text, email text, note text,
  status text NOT NULL DEFAULT 'active', tax_status text, tax_status_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL, version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE TABLE public.gdt_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  gdt_id text NOT NULL, direction text NOT NULL, invoice_serial text, invoice_number text,
  invoice_form_code text, invoice_form_name text, counterparty_tax_code text, counterparty_name text,
  currency text NOT NULL DEFAULT 'VND', subtotal_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0, total_amount numeric NOT NULL DEFAULT 0,
  tax_rate_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb, issued_at timestamptz, issuance_period integer,
  invoice_lookup_code text, invoice_auth_code text, invoice_status integer,
  synced_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, gdt_id)
);
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_hieu text NOT NULL, ten text NOT NULL, loai text NOT NULL, co_quan_ban_hanh text NOT NULL,
  ngay_hieu_luc date, tom_tat_de_hieu text NOT NULL, tom_tat_chinh_thuc text,
  doi_tuong_ap_dung text[] NOT NULL DEFAULT '{}', con_so_moc numeric, don_vi_moc text,
  url_nguon text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.macro_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, summary text, url text NOT NULL UNIQUE, source text NOT NULL,
  topic text, impact text, published_at timestamptz, fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, props jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.qr_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  reference_number text NOT NULL, amount numeric NOT NULL, description text,
  account_number text NOT NULL, virtual_account_number text, bin text, qr_code text,
  status text NOT NULL DEFAULT 'pending',
  paid_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  plan text NOT NULL, current_period_end date, last_invoice_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reference_code text NOT NULL UNIQUE, plan text NOT NULL, amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overpaid','underpaid')),
  received_amount numeric,
  matched_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  period_start date, period_end date, paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_last_invoice_id_fkey
  FOREIGN KEY (last_invoice_id) REFERENCES public.subscription_invoices(id) ON DELETE SET NULL;
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, event_type text, event_code text, grant_id text, payload jsonb,
  outcome text NOT NULL DEFAULT 'received', note text, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL, role text NOT NULL DEFAULT 'member',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.thanh_vien_cong_ty (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vai_tro text NOT NULL DEFAULT 'ke_toan',
  moi_boi uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(), sua_luc timestamptz,
  PRIMARY KEY (company_id, user_id)
);
CREATE TABLE public.tac_tu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ten text NOT NULL, mo_ta text, khoa_bam text NOT NULL UNIQUE, khoa_hien text NOT NULL,
  trang_thai text NOT NULL DEFAULT 'hoat_dong' CHECK (trang_thai IN ('hoat_dong','tam_dung','thu_hoi')),
  dung_lan_cuoi timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.chinh_sach_chi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tac_tu_id uuid NOT NULL UNIQUE REFERENCES public.tac_tu(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  han_muc_moi_lan bigint NOT NULL DEFAULT 2000000, han_muc_ngay bigint NOT NULL DEFAULT 5000000,
  han_muc_thang bigint NOT NULL DEFAULT 50000000, nguong_can_duyet bigint NOT NULL DEFAULT 0,
  nhom_chi_duoc_phep text[], chi_tra_nguoi_nhan_da_duyet boolean NOT NULL DEFAULT true,
  het_han timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.nguoi_nhan_duoc_phep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ngan_hang_bin text NOT NULL, so_tai_khoan text NOT NULL, ten_chu_tai_khoan text NOT NULL, ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, ngan_hang_bin, so_tai_khoan)
);
CREATE TABLE public.yeu_cau_chi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tac_tu_id uuid NOT NULL REFERENCES public.tac_tu(id) ON DELETE CASCADE,
  ma_yeu_cau text, ma_tham_chieu text UNIQUE,
  so_tien bigint NOT NULL CHECK (so_tien > 0), so_tien_thuc_chi bigint,
  ngan_hang_bin text NOT NULL, so_tai_khoan text NOT NULL, ten_nguoi_nhan text, muc_dich text,
  nhom_chi text NOT NULL, so_hoa_don text,
  trang_thai text NOT NULL DEFAULT 'dang_xet' CHECK (trang_thai IN ('dang_xet','cho_duyet','da_duyet','tu_choi','da_chi','huy')),
  cach_quyet text CHECK (cach_quyet IN ('tu_dong','nguoi_duyet')),
  nguoi_quyet uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quyet_luc timestamptz, het_han_luc timestamptz, ly_do jsonb,
  giao_dich_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL, da_chi_luc timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tac_tu_id, ma_yeu_cau)
);
CREATE TABLE public.nhat_ky_tac_tu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tac_tu_id uuid REFERENCES public.tac_tu(id) ON DELETE SET NULL,
  yeu_cau_id uuid REFERENCES public.yeu_cau_chi(id) ON DELETE SET NULL,
  su_kien text NOT NULL, nguoi text NOT NULL CHECK (nguoi IN ('nguoi_dung','tac_tu','he_thong')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, chi_tiet jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.consents, public.gdt_invoices, public.product_events, public.qr_payments, public.subscriptions, public.subscription_invoices, public.invites, public.thanh_vien_cong_ty, public.tac_tu, public.chinh_sach_chi, public.nguoi_nhan_duoc_phep, public.yeu_cau_chi, public.nhat_ky_tac_tu TO authenticated;
GRANT SELECT ON public.legal_documents, public.macro_news TO anon, authenticated;
GRANT ALL ON public.clients, public.consents, public.gdt_invoices, public.legal_documents, public.macro_news, public.product_events, public.qr_payments, public.subscriptions, public.subscription_invoices, public.webhook_events, public.invites, public.thanh_vien_cong_ty, public.tac_tu, public.chinh_sach_chi, public.nguoi_nhan_duoc_phep, public.yeu_cau_chi, public.nhat_ky_tac_tu TO service_role;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['clients','consents','gdt_invoices','legal_documents','macro_news','product_events','qr_payments','subscriptions','subscription_invoices','webhook_events','invites','thanh_vien_cong_ty','tac_tu','chinh_sach_chi','nguoi_nhan_duoc_phep','yeu_cau_chi','nhat_ky_tac_tu'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['clients','gdt_invoices','qr_payments','subscriptions','subscription_invoices','tac_tu','chinh_sach_chi','nguoi_nhan_duoc_phep','yeu_cau_chi','nhat_ky_tac_tu'] LOOP
    EXECUTE format('CREATE POLICY "owner access" ON public.%I FOR ALL TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))', t);
  END LOOP;
END $$;

CREATE POLICY "own rows" ON public.consents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own rows" ON public.product_events FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "public read" ON public.legal_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON public.macro_news FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner access" ON public.invites FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()) OR invited_by = auth.uid() OR accepted_by = auth.uid())
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "member reads own" ON public.thanh_vien_cong_ty FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "owner manages" ON public.thanh_vien_cong_ty FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS virtual_account_number text,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS counter_account_number text,
  ADD COLUMN IF NOT EXISTS counter_account_name text,
  ADD COLUMN IF NOT EXISTS merchant_name text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS transaction_date date;
ALTER TABLE public.bank_connections
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS scopes text,
  ADD COLUMN IF NOT EXISTS grant_id text,
  ADD COLUMN IF NOT EXISTS access_token_enc jsonb,
  ADD COLUMN IF NOT EXISTS last_reference text,
  ADD COLUMN IF NOT EXISTS direction_convention text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS onboarding_done_at timestamptz,
  ADD COLUMN IF NOT EXISTS la_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS vat_rate numeric,
  ADD COLUMN IF NOT EXISTS issued_date date;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb;