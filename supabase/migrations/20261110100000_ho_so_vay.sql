-- HỒ SƠ VAY + ĐÁNH GIÁ SẴN SÀNG VAY (10/11/2026).
--
-- Đánh giá sẵn sàng vay của MIMI — KHÔNG phải điểm tín dụng của tổ chức có giấy phép (NĐ 58/2021/NĐ-CP). MIMI không
-- cho vay, không gửi hồ sơ cho bên cho vay nào: chủ doanh nghiệp tự tải / in và tự mang đi.
--
-- 1. credit_score_snapshots / credit_score_factors (có từ 03/2026, chưa có ai ghi): thêm cột để lưu mỗi lần đánh giá có
--    phiên bản, mã băm đầu vào (tái lập được), mức, lý do và gợi ý từng yếu tố. probability_of_default và score bỏ NOT NULL:
--    MIMI KHÔNG ước xác suất vỡ nợ (không có dữ liệu trả nợ thật để ước) và không chấm khi chưa đủ 3 tháng — ghi NULL
--    thay vì một con số bịa.
-- 2. ho_so_vay: hồ sơ đã lập. Chỉ edge function `ho-so-vay` (service role) ghi. Đọc từ trình duyệt: chỉ chủ sở hữu / quản
--    trị CÒN là thành viên; kế toán cơ sở và các vai trò khác không đọc được.

ALTER TABLE public.credit_score_snapshots ALTER COLUMN probability_of_default DROP NOT NULL;
ALTER TABLE public.credit_score_snapshots ALTER COLUMN score DROP NOT NULL;
ALTER TABLE public.credit_score_snapshots
  ADD COLUMN IF NOT EXISTS phien_ban text,
  ADD COLUMN IF NOT EXISTS co_diem boolean,
  ADD COLUMN IF NOT EXISTS muc text CHECK (muc IS NULL OR muc IN ('vung', 'kha', 'can_cai_thien', 'chua_nen')),
  ADD COLUMN IF NOT EXISTS so_tien_de_nghi bigint CHECK (so_tien_de_nghi IS NULL OR so_tien_de_nghi > 0),
  ADD COLUMN IF NOT EXISTS ky_han_thang smallint CHECK (ky_han_thang IS NULL OR ky_han_thang BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS ma_bam_dau_vao text CHECK (ma_bam_dau_vao IS NULL OR ma_bam_dau_vao ~ '^[0-9a-f]{64}$'),
  ADD COLUMN IF NOT EXISTS ket_qua jsonb,
  ADD COLUMN IF NOT EXISTS tao_boi uuid;

ALTER TABLE public.credit_score_factors
  ADD COLUMN IF NOT EXISTS khoa text,
  ADD COLUMN IF NOT EXISTS diem integer,
  ADD COLUMN IF NOT EXISTS toi_da integer,
  ADD COLUMN IF NOT EXISTS muc text,
  ADD COLUMN IF NOT EXISTS ma_ly_do text,
  ADD COLUMN IF NOT EXISTS ly_do text,
  ADD COLUMN IF NOT EXISTS goi_y text,
  ADD COLUMN IF NOT EXISTS gia_tri_chu text;

-- Chủ sở hữu HOẶC quản trị, còn là thành viên. SECURITY DEFINER để policy không đọc lại bảng thành viên qua RLS của nó.
CREATE OR REPLACE FUNCTION public.la_chu_hoac_quan_tri(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thanh_vien_cong_ty t
    WHERE t.company_id = p_company AND t.user_id = auth.uid() AND t.vai_tro IN ('chu_so_huu', 'quan_tri')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.la_chu_hoac_quan_tri(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.la_chu_hoac_quan_tri(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.ho_so_vay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  so_tien bigint NOT NULL CHECK (so_tien BETWEEN 1000000 AND 100000000000),
  ky_han_thang smallint NOT NULL CHECK (ky_han_thang BETWEEN 1 AND 120),
  muc_dich text NOT NULL CHECK (char_length(muc_dich) BETWEEN 3 AND 500),
  snapshot_id uuid REFERENCES public.credit_score_snapshots(id) ON DELETE SET NULL,
  -- Bản hồ sơ ĐÚNG như lúc lập (số liệu không tự đổi theo dữ liệu mới); ma_bam để nhận ra nếu bị sửa.
  file_json jsonb NOT NULL CHECK (octet_length(file_json::text) < 1000000),
  ma_bam text NOT NULL CHECK (ma_bam ~ '^[0-9a-f]{64}$'),
  phien_ban text NOT NULL,
  hoan_chinh boolean NOT NULL DEFAULT false,
  trang_thai text NOT NULL DEFAULT 'draft' CHECK (trang_thai IN ('draft', 'ready', 'shared')),
  -- Lời đồng ý của người lập: tự gửi, MIMI không gửi, không cho vay.
  dong_y_luc timestamptz NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  xuat_luc timestamptz,
  so_lan_xuat integer NOT NULL DEFAULT 0 CHECK (so_lan_xuat >= 0)
);

CREATE INDEX IF NOT EXISTS ho_so_vay_company_idx ON public.ho_so_vay (company_id, created_at DESC);

ALTER TABLE public.ho_so_vay ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ho_so_vay FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ho_so_vay TO authenticated;
GRANT ALL ON public.ho_so_vay TO service_role;

DROP POLICY IF EXISTS "Chủ hoặc quản trị đọc hồ sơ vay" ON public.ho_so_vay;
CREATE POLICY "Chủ hoặc quản trị đọc hồ sơ vay" ON public.ho_so_vay
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND public.la_chu_hoac_quan_tri(company_id));

-- Không policy INSERT/UPDATE/DELETE: trình duyệt không ghi thẳng; chỉ edge function (service role) ghi.
