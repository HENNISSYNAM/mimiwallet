-- Nhập sao kê, và dữ liệu gốc thành bất biến với trình duyệt.
--
-- 1. `sao_ke_nhap`: mỗi lần tải sao kê lên là một đợt — tệp gì, tài khoản nào, bao nhiêu dòng
--    mới, bao nhiêu dòng trùng, từ ngày nào tới ngày nào. Trả lời được "số này lấy từ đâu".
-- 2. `transactions.source` + `import_id`: dòng nào từ Cas, SePay, hay từ tệp người dùng tải.
-- 3. Gỡ quyền INSERT / DELETE của trình duyệt trên `transactions` (docs/KIEM_TOAN_RA_MAT.md, mục H):
--    trước đây chủ công ty tự chèn được một dòng "tiền vào" và xoá được dòng sao kê — dữ liệu gốc
--    không bất biến. Không màn hình nào ghi thẳng bảng này; mọi đường ghi giờ qua máy chủ.

CREATE TABLE IF NOT EXISTS public.sao_ke_nhap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tao_boi uuid NOT NULL,
  ten_tep text CHECK (ten_tep IS NULL OR char_length(ten_tep) <= 200),
  tai_khoan text NOT NULL CHECK (char_length(tai_khoan) BETWEEN 1 AND 60),
  so_dong_doc integer NOT NULL DEFAULT 0,
  so_dong_moi integer NOT NULL DEFAULT 0,
  so_dong_trung integer NOT NULL DEFAULT 0,
  tu_ngay date,
  den_ngay date,
  tao_luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sao_ke_nhap_cty_idx ON public.sao_ke_nhap (company_id, tao_luc DESC);

ALTER TABLE public.sao_ke_nhap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thành viên công ty đọc sao_ke_nhap" ON public.sao_ke_nhap
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source text CHECK (source IS NULL OR source IN ('cas', 'sepay', 'import', 'manual', 'demo')),
  ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES public.sao_ke_nhap(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS transactions_import_idx ON public.transactions (import_id) WHERE import_id IS NOT NULL;

COMMENT ON COLUMN public.transactions.source IS
  'Nguồn dòng: cas | sepay | import (tệp sao kê) | manual | demo. NULL = dòng cũ trước 24/09/2026.';

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
