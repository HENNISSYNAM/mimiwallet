-- Prompt 4B (26/09/2026): khép vòng giải quyết việc — hồ sơ việc chuẩn, bằng chứng, theo dõi, lịch.
--
-- NGUỒN SỰ THẬT. `ho_so_viec` là MỘT việc (tạm ngừng, phân loại doanh thu chưa rõ…). Trạng thái của nó
-- là trạng thái duy nhất mà Tổng quan, Trợ lý, Pet và Lịch đọc. `hanh_trinh` + `buoc_hanh_trinh` chỉ là
-- bộ máy các bước bên trong một việc; trạng thái của hành trình là trạng thái NỘI BỘ, không hiển thị.
--
-- "BẠN NÓI ĐÃ XONG" ≠ "MIMI XÁC MINH ĐÃ XONG". Hai trạng thái giải quyết riêng, và CSDL chặn:
--   - resolved_user_confirmed chỉ khi có bằng chứng người dùng xác nhận (trở lên);
--   - resolved_system_verified chỉ khi có bằng chứng HỆ THỐNG xác minh — mà bằng chứng đó chỉ máy chủ
--     ghi được với nguồn 'mimi_he_thong' (CHECK), người dùng không tự khai được.
--
-- Chỉ máy chủ ghi. Trình duyệt chỉ đọc việc của công ty mình (RLS), và bị thu hồi quyền ghi thẳng.

-- ── 1. Trạng thái hồ sơ việc ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.ho_so_viec DROP CONSTRAINT IF EXISTS ho_so_viec_trang_thai_check;
ALTER TABLE public.ho_so_viec DROP CONSTRAINT IF EXISTS ho_so_viec_check;
DROP INDEX IF EXISTS public.ho_so_viec_mot_dang_mo;

-- Chưa có dòng nào trên production (các function Prompt 4 chưa deploy); vẫn chuyển cho CSDL thử.
UPDATE public.ho_so_viec SET trang_thai = CASE trang_thai
  WHEN 'mo' THEN 'ready_to_act'
  WHEN 'dang_xu_ly' THEN 'in_progress'
  WHEN 'cho_ben_ngoai' THEN 'waiting_external'
  WHEN 'da_giai_quyet' THEN 'resolved_user_confirmed'
  WHEN 'da_huy' THEN 'cancelled'
  ELSE trang_thai END;

ALTER TABLE public.ho_so_viec ALTER COLUMN trang_thai SET DEFAULT 'needs_information';
ALTER TABLE public.ho_so_viec ADD CONSTRAINT ho_so_viec_trang_thai_check CHECK (trang_thai IN (
  'needs_information', 'ready_to_act', 'in_progress', 'waiting_external', 'needs_review',
  'resolved_user_confirmed', 'resolved_system_verified', 'cancelled'
));
ALTER TABLE public.ho_so_viec ADD CONSTRAINT ho_so_viec_giai_quyet_co_ket_qua CHECK (
  trang_thai NOT IN ('resolved_user_confirmed', 'resolved_system_verified')
  OR (giai_quyet_luc IS NOT NULL AND ket_qua IS NOT NULL)
);

-- Một việc (cùng dấu vân tay ngữ nghĩa) chỉ có MỘT hồ sơ đang mở — chặn trùng từ trợ lý, pet, cron,
-- hai tab, bấm hai lần. Dấu vân tay dựng từ loại + kỳ + đối tượng, không từ tiêu đề.
CREATE UNIQUE INDEX IF NOT EXISTS ho_so_viec_mot_dang_mo ON public.ho_so_viec (company_id, dau_van_tay)
  WHERE trang_thai NOT IN ('resolved_user_confirmed', 'resolved_system_verified', 'cancelled');

-- ── 2. Kỳ, đối tượng, ba loại ngày, phiên bản ────────────────────────────────────────────────────
ALTER TABLE public.ho_so_viec
  ADD COLUMN IF NOT EXISTS ky text CHECK (ky IS NULL OR char_length(ky) <= 20),
  ADD COLUMN IF NOT EXISTS doi_tuong text CHECK (doi_tuong IS NULL OR char_length(doi_tuong) <= 120),
  -- Hạn PHÁP LÝ (từ lịch thuế đã đối chiếu, hoặc hạn ghi trên thông báo của cơ quan). Không phải lời khuyên.
  ADD COLUMN IF NOT EXISTS han_luat date,
  ADD COLUMN IF NOT EXISTS han_luat_nguon text CHECK (han_luat_nguon IS NULL OR char_length(han_luat_nguon) <= 300),
  -- Ngày MIMI KHUYÊN làm trước — không bao giờ hiện như hạn luật.
  ADD COLUMN IF NOT EXISTS ngay_nen_lam date,
  ADD COLUMN IF NOT EXISTS ngay_nen_lam_ly_do text CHECK (ngay_nen_lam_ly_do IS NULL OR char_length(ngay_nen_lam_ly_do) <= 300),
  -- Ngày HẸN KIỂM LẠI khi đang chờ bên ngoài — để "chờ" không thành ngõ cụt.
  ADD COLUMN IF NOT EXISTS hen_kiem_lai date,
  ADD COLUMN IF NOT EXISTS so_lan_nhac smallint NOT NULL DEFAULT 0 CHECK (so_lan_nhac BETWEEN 0 AND 100),
  -- Tăng mỗi lần sửa: máy chủ ghi có điều kiện theo phiên bản đã đọc (chống ghi đè khi hai nơi cùng sửa).
  ADD COLUMN IF NOT EXISTS phien_ban integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS ho_so_viec_hen_kiem_lai_idx ON public.ho_so_viec (hen_kiem_lai)
  WHERE trang_thai = 'waiting_external';

-- Một hành trình đang chạy cho mỗi hồ sơ việc.
CREATE UNIQUE INDEX IF NOT EXISTS hanh_trinh_mot_moi_ho_so ON public.hanh_trinh (ho_so_viec_id)
  WHERE ho_so_viec_id IS NOT NULL AND trang_thai NOT IN ('hoan_tat', 'da_huy');

-- ── 3. Bằng chứng ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bang_chung_viec (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ho_so_viec_id uuid NOT NULL REFERENCES public.ho_so_viec(id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai IN (
    'user_confirmation', 'uploaded_document', 'reference_number', 'official_response',
    'transaction_reference', 'system_verified_event'
  )),
  nguon text NOT NULL CHECK (nguon IN ('nguoi_dung', 'mimi_he_thong')),
  gia_tri text CHECK (gia_tri IS NULL OR char_length(gia_tri) <= 1000),
  tai_lieu_id uuid REFERENCES public.tai_lieu(id),
  trang_thai_xac_minh text NOT NULL CHECK (trang_thai_xac_minh IN ('unverified', 'user_confirmed', 'system_verified', 'needs_review')),
  -- Khoá chống trùng: bấm "Đã nộp" hai lần, gửi lại yêu cầu, hai tab → một bằng chứng.
  khoa_trung text NOT NULL CHECK (char_length(khoa_trung) BETWEEN 3 AND 200),
  tao_boi uuid,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ho_so_viec_id, khoa_trung),
  -- Người dùng không tự khai "hệ thống đã xác minh".
  CONSTRAINT bang_chung_xac_minh_he_thong CHECK (trang_thai_xac_minh <> 'system_verified' OR nguon = 'mimi_he_thong'),
  CONSTRAINT bang_chung_su_kien_he_thong CHECK (loai <> 'system_verified_event' OR (nguon = 'mimi_he_thong' AND trang_thai_xac_minh = 'system_verified'))
);
CREATE INDEX IF NOT EXISTS bang_chung_viec_hs_idx ON public.bang_chung_viec (ho_so_viec_id, tao_luc);

-- Bằng chứng chỉ ghi thêm (dùng lại hàm của nhật ký thay đổi).
DROP TRIGGER IF EXISTS bang_chung_viec_chi_ghi_them ON public.bang_chung_viec;
CREATE TRIGGER bang_chung_viec_chi_ghi_them BEFORE UPDATE OR DELETE ON public.bang_chung_viec
  FOR EACH ROW EXECUTE FUNCTION public.chi_ghi_them();

-- Bằng chứng phải cùng công ty với hồ sơ việc nó thuộc về.
CREATE OR REPLACE FUNCTION public.bang_chung_viec_cung_cong_ty()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ho_so_viec h WHERE h.id = NEW.ho_so_viec_id AND h.company_id = NEW.company_id) THEN
    RAISE EXCEPTION 'Bằng chứng khác công ty với hồ sơ việc' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bang_chung_viec_cung_cong_ty ON public.bang_chung_viec;
CREATE TRIGGER bang_chung_viec_cung_cong_ty BEFORE INSERT ON public.bang_chung_viec
  FOR EACH ROW EXECUTE FUNCTION public.bang_chung_viec_cung_cong_ty();

-- ── 4. Máy trạng thái ở CSDL ─────────────────────────────────────────────────────────────────────
/*
 * Chuyển hợp lệ:
 *   đang mở (needs_information, ready_to_act, in_progress, waiting_external, needs_review) ↔ đang mở;
 *   đang mở → cancelled;
 *   đang mở → resolved_user_confirmed     (cần bằng chứng user_confirmed hoặc system_verified);
 *   đang mở / resolved_user_confirmed → resolved_system_verified (cần bằng chứng system_verified).
 * Mọi chuyển khác bị từ chối — kể cả từ service role. Đã huỷ / đã xác minh là trạng thái cuối.
 * Danh tính (công ty, loại, dấu vân tay) không đổi được. Mỗi lần sửa tăng phien_ban.
 */
CREATE OR REPLACE FUNCTION public.ho_so_viec_kiem_chuyen()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  dang_mo constant text[] := ARRAY['needs_information', 'ready_to_act', 'in_progress', 'waiting_external', 'needs_review'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT (NEW.trang_thai = ANY (dang_mo)) THEN
      RAISE EXCEPTION 'Hồ sơ việc mới phải ở trạng thái đang mở (không phải %)', NEW.trang_thai USING ERRCODE = '23514';
    END IF;
    NEW.phien_ban := 1;
    RETURN NEW;
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.loai IS DISTINCT FROM OLD.loai
     OR NEW.dau_van_tay IS DISTINCT FROM OLD.dau_van_tay THEN
    RAISE EXCEPTION 'Không đổi danh tính hồ sơ việc' USING ERRCODE = '42501';
  END IF;

  IF OLD.trang_thai IN ('cancelled', 'resolved_system_verified') THEN
    RAISE EXCEPTION 'Hồ sơ việc đã đóng (%): không sửa được', OLD.trang_thai USING ERRCODE = '42501';
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    IF OLD.trang_thai = 'resolved_user_confirmed' AND NEW.trang_thai <> 'resolved_system_verified' THEN
      RAISE EXCEPTION 'Hồ sơ đã giải quyết theo xác nhận của người dùng chỉ lên được "hệ thống đã xác minh"' USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai = 'resolved_system_verified' AND NOT EXISTS (
      SELECT 1 FROM public.bang_chung_viec b WHERE b.ho_so_viec_id = NEW.id AND b.trang_thai_xac_minh = 'system_verified'
    ) THEN
      RAISE EXCEPTION 'Chưa có bằng chứng hệ thống xác minh' USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai = 'resolved_user_confirmed' AND NOT EXISTS (
      SELECT 1 FROM public.bang_chung_viec b WHERE b.ho_so_viec_id = NEW.id AND b.trang_thai_xac_minh IN ('user_confirmed', 'system_verified')
    ) THEN
      RAISE EXCEPTION 'Chưa có bằng chứng xác nhận' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD.trang_thai = 'resolved_user_confirmed' THEN
    RAISE EXCEPTION 'Hồ sơ việc đã giải quyết: không sửa được' USING ERRCODE = '42501';
  END IF;

  NEW.phien_ban := OLD.phien_ban + 1;
  NEW.cap_nhat_luc := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ho_so_viec_kiem_chuyen ON public.ho_so_viec;
CREATE TRIGGER ho_so_viec_kiem_chuyen BEFORE INSERT OR UPDATE ON public.ho_so_viec
  FOR EACH ROW EXECUTE FUNCTION public.ho_so_viec_kiem_chuyen();

-- ── 5. Nhật ký ghi được đối tượng mới ─────────────────────────────────────────────────────────────
ALTER TABLE public.nhat_ky_thay_doi DROP CONSTRAINT IF EXISTS nhat_ky_thay_doi_doi_tuong_check;
ALTER TABLE public.nhat_ky_thay_doi ADD CONSTRAINT nhat_ky_thay_doi_doi_tuong_check CHECK (doi_tuong IN (
  'ho_so_viec', 'hanh_trinh', 'buoc_hanh_trinh', 'tai_lieu', 'phien_ban_tai_lieu', 'duyet_tai_lieu',
  'yeu_cau_thuc_thi', 'xung_dot_hoa_don', 'bang_chung_viec'
));

-- ── 6. RLS: thành viên đọc; trình duyệt không ghi thẳng ───────────────────────────────────────────
ALTER TABLE public.bang_chung_viec ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Thành viên công ty đọc bang_chung_viec" ON public.bang_chung_viec;
CREATE POLICY "Thành viên công ty đọc bang_chung_viec" ON public.bang_chung_viec FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- RLS không có policy ghi đã chặn; thu hồi luôn quyền bảng để lớp thứ hai cũng chặn.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ho_so_viec, public.hanh_trinh, public.buoc_hanh_trinh,
  public.bang_chung_viec, public.nhat_ky_thay_doi FROM anon, authenticated;
REVOKE ALL ON public.ho_so_viec, public.hanh_trinh, public.buoc_hanh_trinh, public.bang_chung_viec,
  public.nhat_ky_thay_doi FROM anon;
REVOKE EXECUTE ON FUNCTION public.ho_so_viec_kiem_chuyen(), public.bang_chung_viec_cung_cong_ty() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.bang_chung_viec IS 'Bằng chứng của một hồ sơ việc. Chỉ ghi thêm. user_confirmed ≠ system_verified; chỉ máy chủ ghi system_verified.';
COMMENT ON COLUMN public.ho_so_viec.han_luat IS 'Hạn pháp lý — từ lịch thuế đã đối chiếu hoặc thông báo của cơ quan. Không dùng cho lời khuyên.';
COMMENT ON COLUMN public.ho_so_viec.ngay_nen_lam IS 'Ngày MIMI khuyên làm trước. Không phải hạn luật.';
COMMENT ON COLUMN public.ho_so_viec.hen_kiem_lai IS 'Ngày hẹn kiểm lại khi đang chờ bên ngoài.';

-- ── 7. Thông báo "việc": nhắc kiểm phản hồi khi đang chờ bên ngoài ──────────────────────────────
ALTER TABLE public.thong_bao DROP CONSTRAINT IF EXISTS thong_bao_loai_check;
ALTER TABLE public.thong_bao ADD CONSTRAINT thong_bao_loai_check
  CHECK (loai IN ('han_thue', 'luat_moi', 'tien_vao', 'goi', 'thanh_toan', 'viec', 'khac'));
ALTER TABLE public.cai_dat_thong_bao DROP CONSTRAINT IF EXISTS cai_dat_thong_bao_loai_tat_check;
ALTER TABLE public.cai_dat_thong_bao ADD CONSTRAINT cai_dat_thong_bao_loai_tat_check
  CHECK (loai_tat <@ ARRAY['han_thue', 'luat_moi', 'tien_vao', 'goi', 'thanh_toan', 'viec', 'khac']::text[]);
