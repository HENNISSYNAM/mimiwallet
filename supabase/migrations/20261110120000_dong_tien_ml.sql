-- Dự báo dòng tiền bằng học máy (10/11/2026) — supabase/functions/_shared/dong-tien/.
--
-- 1. Tham số mô hình phân loại học từ chính quyết định của chủ (Naive Bayes, riêng từng công ty). Mô hình CHỈ ĐỀ XUẤT;
--    bảng này không đổi doanh thu hay phân loại nào. Chỉ máy chủ (service role) ghi; thành viên công ty đọc được.
-- 2. Chỉ mục cho đọc theo trang con trỏ (company_id, transaction_date, id) — đủ cho 200.000+ giao dịch mỗi công ty —
--    và cho đọc nhãn theo công ty.
-- Không có hàm SECURITY DEFINER mới. Không sửa hay xoá dữ liệu.

CREATE TABLE IF NOT EXISTS public.dong_tien_mo_hinh (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Dấu vân tay dữ liệu nhãn lúc học (id sự kiện lớn nhất : số nhãn người) — đổi thì học lại.
  van_tay text NOT NULL,
  tham_so jsonb NOT NULL,
  so_nhan integer NOT NULL DEFAULT 0 CHECK (so_nhan >= 0),
  -- Id giao dịch đã có nhãn người (không đề xuất lại).
  da_co_nhan jsonb NOT NULL DEFAULT '[]'::jsonb,
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dong_tien_mo_hinh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Thành viên công ty đọc dong_tien_mo_hinh" ON public.dong_tien_mo_hinh;
CREATE POLICY "Thành viên công ty đọc dong_tien_mo_hinh" ON public.dong_tien_mo_hinh
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id));

REVOKE ALL ON public.dong_tien_mo_hinh FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.dong_tien_mo_hinh FROM authenticated;

COMMENT ON TABLE public.dong_tien_mo_hinh IS
  'Tham số mô hình phân loại học từ quyết định của chủ (chỉ đề xuất). Chỉ máy chủ ghi; thành viên đọc.';

CREATE INDEX IF NOT EXISTS transactions_company_date_id_idx
  ON public.transactions (company_id, transaction_date, id);
CREATE INDEX IF NOT EXISTS revenue_classification_events_cty_id_idx
  ON public.revenue_classification_events (company_id, id);
CREATE INDEX IF NOT EXISTS transaction_labels_cty_human_idx
  ON public.transaction_labels (company_id, id) WHERE source = 'human';
CREATE INDEX IF NOT EXISTS revenue_classifications_cty_gd_idx
  ON public.revenue_classifications (company_id, transaction_id);
