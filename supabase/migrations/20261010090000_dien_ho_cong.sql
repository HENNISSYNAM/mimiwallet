-- ĐIỀN HỘ TRÊN CỔNG NGOÀI — phiên bản đầu (10/10/2026). Xem docs/DIEN_HO_CONG_V1.md.
--
-- `phien_dien_cong`: TRẠNG THÁI VẬN HÀNH của một lần điền (đã điền và đối chiếu, lệch, bàn giao…). Đây KHÔNG phải trạng
-- thái hồ sơ: "người dùng báo đã nộp", "có biên nhận", "cơ quan đã xác nhận" vẫn ở chuỗi `yeu_cau_thuc_thi` hiện có.
-- `nhat_ky_dien_cong`: ai làm gì, lúc nào, bộ chuyển phiên bản nào, kiểm chứng bằng cách nào. KHÔNG lưu giá trị ô
-- (chỉ khoá ô, khớp/không khớp và mã băm giá trị), không lưu cookie, mật khẩu, OTP. Giữ 90 ngày rồi tự xoá.
--
-- Chỉ máy chủ ghi (service role, qua edge function `to-khai`). Thành viên công ty đọc được phiên của công ty mình.

CREATE TABLE IF NOT EXISTS public.phien_dien_cong (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nhap_id uuid NOT NULL REFERENCES public.to_khai_nhap(id) ON DELETE CASCADE,
  ma_bam_nhap text NOT NULL CHECK (ma_bam_nhap ~ '^[0-9a-f]{64}$'),
  ma_bam_ke_hoach text NOT NULL CHECK (ma_bam_ke_hoach ~ '^[0-9a-f]{64}$'),
  bo_chuyen text NOT NULL CHECK (bo_chuyen ~ '^[a-z0-9-]{3,40}$'),
  phien_ban_bo_chuyen text NOT NULL CHECK (phien_ban_bo_chuyen ~ '^\d+\.\d+\.\d+$'),
  khoa_chong_trung text NOT NULL CHECK (char_length(khoa_chong_trung) BETWEEN 10 AND 200),
  trang_thai text NOT NULL DEFAULT 'tao' CHECK (trang_thai IN (
    'tao', 'dang_dien', 'tam_dung', 'da_doi_chieu', 'lech', 'ban_giao', 'dung', 'loi', 'het_han', 'huy')),
  het_han timestamptz NOT NULL,
  ket_qua jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(ket_qua) < 16384),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, khoa_chong_trung)
);
CREATE INDEX IF NOT EXISTS phien_dien_cong_cty_idx ON public.phien_dien_cong (company_id, tao_luc DESC);

CREATE TABLE IF NOT EXISTS public.nhat_ky_dien_cong (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phien_id uuid NOT NULL REFERENCES public.phien_dien_cong(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- 'nguoi_dung' bấm trên MIMI, 'bo_chay' là helper tại máy.
  tac_nhan text NOT NULL CHECK (tac_nhan IN ('nguoi_dung', 'bo_chay', 'may_chu')),
  hanh_dong text NOT NULL CHECK (hanh_dong ~ '^[a-z_]{3,40}$'),
  khoa_truong text CHECK (khoa_truong IS NULL OR khoa_truong ~ '^[a-z][a-z0-9_]{1,39}$'),
  ket_qua text NOT NULL CHECK (ket_qua IN ('ok', 'chan', 'lech', 'loi', 'khong_ro')),
  -- Mã băm (SHA-256) của giá trị đọc lại — đủ để đối chiếu sau, không lộ số liệu.
  ma_bam_gia_tri text CHECK (ma_bam_gia_tri IS NULL OR ma_bam_gia_tri ~ '^[0-9a-f]{64}$'),
  ghi_chu text CHECK (ghi_chu IS NULL OR char_length(ghi_chu) <= 300),
  ma_bam_nhap text NOT NULL CHECK (ma_bam_nhap ~ '^[0-9a-f]{64}$'),
  phien_ban_bo_chuyen text NOT NULL,
  phuong_phap text NOT NULL DEFAULT 'doc_lai_tung_o_so_voi_anh_chup_may_chu',
  luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nhat_ky_dien_cong_phien_idx ON public.nhat_ky_dien_cong (phien_id, luc);
CREATE INDEX IF NOT EXISTS nhat_ky_dien_cong_luc_idx ON public.nhat_ky_dien_cong (luc);

ALTER TABLE public.phien_dien_cong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhat_ky_dien_cong ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.phien_dien_cong FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.nhat_ky_dien_cong FROM anon, authenticated;

DROP POLICY IF EXISTS "Thành viên đọc phiên điền hộ" ON public.phien_dien_cong;
CREATE POLICY "Thành viên đọc phiên điền hộ" ON public.phien_dien_cong
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));
DROP POLICY IF EXISTS "Thành viên đọc nhật ký điền hộ" ON public.nhat_ky_dien_cong;
CREATE POLICY "Thành viên đọc nhật ký điền hộ" ON public.nhat_ky_dien_cong
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

-- Giữ nhật ký 90 ngày, phiên 180 ngày (lịch đêm).
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mimi-don-dien-cong';
END $$;
SELECT cron.schedule('mimi-don-dien-cong', '35 18 * * *', $$
  DELETE FROM public.nhat_ky_dien_cong WHERE luc < now() - interval '90 days';
  DELETE FROM public.phien_dien_cong WHERE tao_luc < now() - interval '180 days';
  UPDATE public.phien_dien_cong SET trang_thai = 'het_han', cap_nhat_luc = now()
   WHERE trang_thai IN ('tao', 'dang_dien', 'tam_dung') AND het_han < now();
$$);
