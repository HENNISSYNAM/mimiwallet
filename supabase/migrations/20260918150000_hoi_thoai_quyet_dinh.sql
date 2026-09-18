-- MIMI-P1-002 — lưu vết hội thoại và quyết định.
--
-- Hai bảng, cố ý tách đôi:
--
--   `hoi_thoai_tro_ly` — NỘI DUNG chat: câu hỏi, câu trả lời, năng lực đã chạy, nguồn dữ liệu, độ
--     đầy đủ, chế độ và phiên bản mô hình. Đây là dữ liệu cá nhân của người dùng: có hạn lưu và
--     xoá được (xoá tài khoản, hoặc dọn theo hạn).
--
--   `nhat_ky_quyet_dinh` — QUYẾT ĐỊNH: ai xác nhận việc gì, với vai trò nào, tham số nào, và
--     backend trả kết quả gì. Chỉ thêm, không sửa (trigger chặn UPDATE, kể cả service role), vì
--     đây là dấu vết để sau này đối chiếu "hôm đó ai cho phép trả khoản này".
--
-- Truy được từ một hành động về tới câu hỏi: nhat_ky_quyet_dinh.hoi_thoai_id → hoi_thoai_tro_ly.
-- Hội thoại bị xoá theo hạn lưu thì dòng quyết định vẫn còn (ON DELETE SET NULL) và vẫn giữ bản
-- sao tóm tắt câu hỏi trong `cau_hoi_luc_do` — quyết định không được mất chỉ vì chat bị dọn.

CREATE TABLE IF NOT EXISTS public.hoi_thoai_tro_ly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cau_hoi text NOT NULL CHECK (char_length(cau_hoi) BETWEEN 1 AND 1000),
  cau_tra_loi text NOT NULL DEFAULT '',
  che_do text NOT NULL CHECK (che_do IN ('mo_hinh', 'co_dinh')),
  /** Model và phiên bản prompt khi có mô hình; null khi chạy bằng bộ luật cố định. */
  mo_hinh text,
  nang_luc text[] NOT NULL DEFAULT '{}',
  /** Nguồn dữ liệu đã đọc + độ đầy đủ (MIMI-P0-002) + bằng chứng (MIMI-P1-001). */
  nguon jsonb NOT NULL DEFAULT '{}'::jsonb,
  do_day text NOT NULL DEFAULT 'complete' CHECK (do_day IN ('complete', 'partial', 'stale', 'unavailable')),
  /** Đề xuất MIMI đưa ra trong câu trả lời này — để đối chiếu với quyết định người dùng xác nhận. */
  de_xuat jsonb NOT NULL DEFAULT '[]'::jsonb,
  tao_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hoi_thoai_tro_ly_cty_luc_idx ON public.hoi_thoai_tro_ly (company_id, tao_luc DESC);
CREATE INDEX IF NOT EXISTS hoi_thoai_tro_ly_don_idx ON public.hoi_thoai_tro_ly (tao_luc);

COMMENT ON TABLE public.hoi_thoai_tro_ly IS
  'MIMI-P1-002: nội dung hội thoại với MIMI Assistant. Hạn lưu 180 ngày (public.don_hoi_thoai_cu).';

CREATE TABLE IF NOT EXISTS public.nhat_ky_quyet_dinh (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vai_tro text NOT NULL CHECK (vai_tro IN ('chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan', 'nguoi_xem')),
  hoi_thoai_id uuid REFERENCES public.hoi_thoai_tro_ly(id) ON DELETE SET NULL,
  /** Bản sao câu hỏi lúc đó: hội thoại có thể bị dọn theo hạn lưu, quyết định thì không. */
  cau_hoi_luc_do text NOT NULL DEFAULT '',
  de_xuat_khoa text NOT NULL,
  loai text NOT NULL,
  tham_so jsonb NOT NULL DEFAULT '{}'::jsonb,
  /** Người dùng đã thấy đúng câu mô tả nào trong hộp xác nhận. */
  mo_ta_da_xac_nhan text NOT NULL DEFAULT '',
  ket_qua text NOT NULL CHECK (ket_qua IN ('cho_chay', 'thanh_cong', 'loi')),
  ket_qua_cau text NOT NULL DEFAULT '',
  ma_loi text,
  xac_nhan_luc timestamptz NOT NULL DEFAULT now(),
  xong_luc timestamptz
);

CREATE INDEX IF NOT EXISTS nhat_ky_quyet_dinh_cty_luc_idx ON public.nhat_ky_quyet_dinh (company_id, xac_nhan_luc DESC);
CREATE INDEX IF NOT EXISTS nhat_ky_quyet_dinh_hoi_thoai_idx ON public.nhat_ky_quyet_dinh (hoi_thoai_id);

-- Chỉ thêm. Cho phép cập nhật đúng một lần: từ `cho_chay` sang kết quả cuối, và chỉ các cột kết quả.
CREATE OR REPLACE FUNCTION public.nhat_ky_quyet_dinh_chi_them()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.ket_qua <> 'cho_chay' THEN
    RAISE EXCEPTION 'nhat_ky_quyet_dinh: dòng đã có kết quả thì không sửa được';
  END IF;
  IF NEW.company_id <> OLD.company_id OR NEW.user_id <> OLD.user_id OR NEW.vai_tro <> OLD.vai_tro
     OR NEW.de_xuat_khoa <> OLD.de_xuat_khoa OR NEW.loai <> OLD.loai OR NEW.tham_so <> OLD.tham_so
     OR NEW.mo_ta_da_xac_nhan <> OLD.mo_ta_da_xac_nhan OR NEW.cau_hoi_luc_do <> OLD.cau_hoi_luc_do
     OR NEW.xac_nhan_luc <> OLD.xac_nhan_luc THEN
    RAISE EXCEPTION 'nhat_ky_quyet_dinh: chỉ được ghi kết quả, không được sửa nội dung quyết định';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nhat_ky_quyet_dinh_khong_sua ON public.nhat_ky_quyet_dinh;
CREATE TRIGGER nhat_ky_quyet_dinh_khong_sua
  BEFORE UPDATE ON public.nhat_ky_quyet_dinh
  FOR EACH ROW EXECUTE FUNCTION public.nhat_ky_quyet_dinh_chi_them();

COMMENT ON TABLE public.nhat_ky_quyet_dinh IS
  'MIMI-P1-002: ai xác nhận việc gì qua MIMI Assistant, với vai trò nào, và backend trả gì. Chỉ thêm; sửa chỉ để ghi kết quả một lần.';

-- Dọn hội thoại quá hạn lưu. Chạy bằng cron của Supabase hoặc gọi tay; quyết định không bị xoá.
CREATE OR REPLACE FUNCTION public.don_hoi_thoai_cu(so_ngay integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  DELETE FROM public.hoi_thoai_tro_ly
  WHERE tao_luc < now() - make_interval(days => greatest(so_ngay, 30));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.don_hoi_thoai_cu(integer) FROM public;

ALTER TABLE public.hoi_thoai_tro_ly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhat_ky_quyet_dinh ENABLE ROW LEVEL SECURITY;

-- Hội thoại là của riêng người hỏi: chỉ người đó đọc và xoá được (kể cả chủ công ty không đọc chat
-- của kế toán). Quyết định thì cả công ty đọc được, vì nó là dấu vết tiền của công ty.
DROP POLICY IF EXISTS "Đọc hội thoại của chính mình" ON public.hoi_thoai_tro_ly;
CREATE POLICY "Đọc hội thoại của chính mình" ON public.hoi_thoai_tro_ly
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Xoá hội thoại của chính mình" ON public.hoi_thoai_tro_ly;
CREATE POLICY "Xoá hội thoại của chính mình" ON public.hoi_thoai_tro_ly
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Thành viên đọc nhật ký quyết định" ON public.nhat_ky_quyet_dinh;
CREATE POLICY "Thành viên đọc nhật ký quyết định" ON public.nhat_ky_quyet_dinh
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

REVOKE ALL ON public.hoi_thoai_tro_ly FROM anon, authenticated;
REVOKE ALL ON public.nhat_ky_quyet_dinh FROM anon, authenticated;
GRANT SELECT, DELETE ON public.hoi_thoai_tro_ly TO authenticated;
GRANT SELECT ON public.nhat_ky_quyet_dinh TO authenticated;

-- Chính sách lưu trữ tự chạy: mỗi ngày dọn hội thoại quá 180 ngày. Nhật ký quyết định không bị dọn.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mimi-don-hoi-thoai';
END $$;
SELECT cron.schedule('mimi-don-hoi-thoai', '40 18 * * *', $$SELECT public.don_hoi_thoai_cu(180)$$);

COMMENT ON COLUMN public.nhat_ky_quyet_dinh.ket_qua_cau IS
  'Câu kết quả do giao diện báo lại sau khi gọi backend. Quyết định (ai, việc gì, vai trò, tham số) là do máy chủ ghi.';
