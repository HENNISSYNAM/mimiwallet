-- Phản hồi của khách tại điểm chạm (29/09/2026) — học cơ chế Voice of Customer của Filum:
-- hỏi ĐÚNG LÚC (một câu mỗi lần), gom MỘT CHỖ, ĐÓNG VÒNG có thời hạn (docs/DONG_VONG_PHAN_HOI.md).
--
-- First-party: không SDK bên thứ ba. Người dùng chỉ GHI được phản hồi của chính mình (và công ty mình là
-- thành viên). KHÔNG có policy đọc: phản hồi của khách không lộ qua API cho ai; đội đọc bằng service role
-- (SQL editor / CLI). Cột đóng vòng do đội cập nhật.

CREATE TABLE IF NOT EXISTS public.phan_hoi_khach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  cau_hoi text NOT NULL CHECK (cau_hoi IN ('sao_ke_khop', 'doanh_thu_dung', 'doi_soat_de_kho', 'sean_ellis')),
  tra_loi text NOT NULL CHECK (char_length(tra_loi) BETWEEN 1 AND 40),
  diem smallint CHECK (diem IS NULL OR diem BETWEEN 1 AND 5),
  ghi_chu text CHECK (ghi_chu IS NULL OR char_length(ghi_chu) <= 500),
  trang text CHECK (trang IS NULL OR char_length(trang) <= 120),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  -- Đóng vòng (đội cập nhật): đã đọc, đã xử lý, đã báo lại khách.
  da_doc_luc timestamptz,
  xu_ly text CHECK (xu_ly IS NULL OR char_length(xu_ly) <= 500),
  dong_vong_luc timestamptz
);

CREATE INDEX IF NOT EXISTS phan_hoi_khach_moi ON public.phan_hoi_khach (tao_luc DESC);
CREATE INDEX IF NOT EXISTS phan_hoi_khach_chua_doc ON public.phan_hoi_khach (tao_luc) WHERE da_doc_luc IS NULL;

ALTER TABLE public.phan_hoi_khach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Người dùng gửi phản hồi của mình" ON public.phan_hoi_khach;
CREATE POLICY "Người dùng gửi phản hồi của mình" ON public.phan_hoi_khach FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (company_id IS NULL OR public.la_thanh_vien(company_id))
    AND da_doc_luc IS NULL AND xu_ly IS NULL AND dong_vong_luc IS NULL
  );
-- Không có policy SELECT / UPDATE / DELETE cho người dùng.

COMMENT ON TABLE public.phan_hoi_khach IS
  'Phản hồi một câu tại điểm chạm (sao kê khớp, doanh thu đúng, đối soát dễ/khó, Sean Ellis). Người dùng chỉ ghi; đội đọc bằng service role và đóng vòng trong 24 giờ — docs/DONG_VONG_PHAN_HOI.md.';
