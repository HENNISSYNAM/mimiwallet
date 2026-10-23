-- ĐA CƠ SỞ (22/10/2026): một doanh nghiệp, nhiều cơ sở — mỗi cơ sở một tài khoản, một kế toán, một nguồn thu.
-- Xem supabase/functions/_shared/da-co-so/hop-nhat.ts.
--
-- Ghi chỉ qua edge function `cong-ty` (service role, kiểm vai trò quản lý thành viên). Thành viên công ty đọc được.
-- CHƯA làm: giới hạn kế toán của một cơ sở chỉ thấy giao dịch của cơ sở đó bằng RLS — `thanh_vien_cong_ty.co_so_id`
-- hôm nay chỉ ghi nhận người đó phụ trách cơ sở nào.

CREATE TABLE IF NOT EXISTS public.co_so (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ten text NOT NULL CHECK (char_length(btrim(ten)) BETWEEN 1 AND 120),
  -- MST 10 số (trụ sở) hoặc 10 số + "-xxx" (đơn vị trực thuộc).
  ma_so_thue text NULL CHECK (ma_so_thue IS NULL OR ma_so_thue ~ '^[0-9]{10}(-[0-9]{3})?$'),
  tinh text NULL CHECK (tinh IS NULL OR char_length(tinh) <= 80),
  khai_thue text NOT NULL DEFAULT 'chua_ro' CHECK (khai_thue IN ('tap_trung', 'rieng', 'chua_ro')),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, ten)
);
CREATE INDEX IF NOT EXISTS co_so_company_idx ON public.co_so (company_id);

CREATE TABLE IF NOT EXISTS public.co_so_tai_khoan (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  so_tai_khoan text NOT NULL CHECK (so_tai_khoan ~ '^[0-9]{6,19}$'),
  co_so_id uuid NOT NULL REFERENCES public.co_so(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, so_tai_khoan)
);
CREATE INDEX IF NOT EXISTS co_so_tai_khoan_co_so_idx ON public.co_so_tai_khoan (co_so_id);

ALTER TABLE public.thanh_vien_cong_ty ADD COLUMN IF NOT EXISTS co_so_id uuid NULL REFERENCES public.co_so(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS co_so_id uuid NULL REFERENCES public.co_so(id) ON DELETE SET NULL;

ALTER TABLE public.co_so ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_so_tai_khoan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thành viên đọc cơ sở của công ty mình" ON public.co_so
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));
CREATE POLICY "Thành viên đọc tài khoản của cơ sở" ON public.co_so_tai_khoan
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

-- Không có policy ghi cho authenticated/anon: mọi ghi đi qua edge function bằng service role.
REVOKE INSERT, UPDATE, DELETE ON public.co_so, public.co_so_tai_khoan FROM anon, authenticated;
