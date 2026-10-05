ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS ten_theo_mst text,
  ADD COLUMN IF NOT EXISTS dia_chi_theo_mst text,
  ADD COLUMN IF NOT EXISTS co_quan_thue text,
  ADD COLUMN IF NOT EXISTS loai_theo_mst text,
  ADD COLUMN IF NOT EXISTS trang_thai_mst text,
  ADD COLUMN IF NOT EXISTS mst_tra_luc timestamptz;
ALTER TABLE public.chinh_sach_chi ADD COLUMN IF NOT EXISTS so_yeu_cau_moi_gio integer DEFAULT 30
  CHECK (so_yeu_cau_moi_gio IS NULL OR so_yeu_cau_moi_gio BETWEEN 1 AND 1000);

CREATE TABLE public.transaction_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
  category text,
  is_internal_transfer boolean NOT NULL DEFAULT false,
  is_personal boolean NOT NULL DEFAULT false,
  source text NOT NULL CHECK (source IN ('rule','llm','human')),
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  paired_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  needs_review boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.luot_to_khai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thay_doi integer NOT NULL CHECK (thay_doi <> 0),
  ly_do text NOT NULL CHECK (ly_do IN ('mua','xuat')),
  hoa_don_id uuid UNIQUE REFERENCES public.subscription_invoices(id) ON DELETE SET NULL,
  ky_khoa text,
  to_khai_nhap_id uuid,
  tao_luc timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.thong_bao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  loai text NOT NULL CHECK (loai IN ('han_thue','luat_moi','tien_vao','goi','thanh_toan','khac')),
  muc_do text NOT NULL DEFAULT 'thong_tin' CHECK (muc_do IN ('thong_tin','can_chu_y','gap')),
  tieu_de text NOT NULL CHECK (char_length(tieu_de) <= 200),
  noi_dung text NOT NULL CHECK (char_length(noi_dung) <= 1000),
  duong_dan text,
  hanh_dong jsonb NOT NULL DEFAULT '[]'::jsonb,
  khoa text NOT NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  da_doc_luc timestamptz, da_xu_ly_luc timestamptz, da_day_luc timestamptz, loi_thoi_luc timestamptz,
  UNIQUE (user_id, company_id, khoa)
);
CREATE TABLE public.cai_dat_thong_bao (
  user_id uuid PRIMARY KEY,
  loai_tat text[] NOT NULL DEFAULT '{}',
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_labels TO authenticated;
GRANT SELECT ON public.luot_to_khai TO authenticated;
GRANT SELECT, UPDATE ON public.thong_bao TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cai_dat_thong_bao TO authenticated;
GRANT ALL ON public.transaction_labels, public.luot_to_khai, public.thong_bao, public.cai_dat_thong_bao TO service_role;

ALTER TABLE public.transaction_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.luot_to_khai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thong_bao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cai_dat_thong_bao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner access" ON public.transaction_labels FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "owner reads" ON public.luot_to_khai FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "recipient reads" ON public.thong_bao FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "recipient marks" ON public.thong_bao FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own settings read" ON public.cai_dat_thong_bao FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own settings insert" ON public.cai_dat_thong_bao FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own settings update" ON public.cai_dat_thong_bao FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.danh_dau_thong_bao(p_ids uuid[], p_da_xu_ly boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.thong_bao
  SET da_doc_luc = coalesce(da_doc_luc, now()),
      da_xu_ly_luc = CASE WHEN p_da_xu_ly THEN coalesce(da_xu_ly_luc, now()) ELSE da_xu_ly_luc END
  WHERE id = ANY (p_ids) AND user_id = auth.uid();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.danh_dau_thong_bao(uuid[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.danh_dau_thong_bao(uuid[], boolean) TO authenticated;