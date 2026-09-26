-- Phòng thủ trước hacker và bot (25/09/2026). Bốn lỗ tìm thấy khi kiểm toán, đều có thật trên DB.
--
-- 1. HÀM NỘI BỘ AI CŨNG GỌI ĐƯỢC. Các migration cũ viết `REVOKE ... FROM PUBLIC` và tưởng đã khoá. Nhưng
--    Supabase cấp EXECUTE riêng cho `anon` và `authenticated` qua default privileges — REVOKE FROM PUBLIC
--    không gỡ được quyền đó. Hệ quả: người CHƯA ĐĂNG NHẬP gọi được qua API:
--      chay_quet_thong_bao(), chay_doi_soat_thue_bao()  → bot gọi liên tục để kích cron, đốt tài nguyên;
--      don_hoi_thoai_cu(so_ngay)                        → xoá hội thoại cũ của MỌI công ty.
--    Hàm cron chỉ chạy bằng pg_cron (chủ sở hữu), nên gỡ quyền không làm hỏng lịch chạy.
--
-- 2. DANH SÁCH CHỜ LỘ EMAIL. `waitlist` có policy cho MỌI người đăng nhập đọc toàn bộ — mà ai cũng tự
--    đăng ký được tài khoản. Và ai cũng ghi được, không ràng buộc gì: bot đổ rác tuỳ ý.
--
-- 3. KHO `secure-documents` cho tải lên tệp BẤT KỲ, dung lượng BẤT KỲ (HTML có script để lừa đảo, mã độc,
--    đổ đầy kho). Không đoạn mã nào dùng kho này; kho đang trống.
--
-- 4. Mặc định về sau: hàm mới trong `public` không tự cấp cho `anon`. Hàm nào cần cho người chưa đăng nhập
--    phải GRANT rõ ràng trong migration của nó.

-- ── 1. Gỡ quyền gọi hàm nội bộ ─────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.chay_quet_thong_bao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.chay_doi_soat_thue_bao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.don_hoi_thoai_cu(integer) FROM PUBLIC, anon, authenticated;

-- Hàm trigger: không ai cần gọi trực tiếp.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND pg_get_function_result(p.oid) IN ('trigger', 'event_trigger')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- Hàm dùng trong RLS: người đăng nhập cần, người chưa đăng nhập thì không.
REVOKE EXECUTE ON FUNCTION public.la_thanh_vien(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.la_thanh_vien(uuid) TO authenticated;
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('current_role', 'user_company_ids')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
  END LOOP;
END $$;

-- ── 4. Mặc định: hàm mới không tự mở cho anon ───────────────────────────────────────────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- ── 2. Danh sách chờ ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read waitlist" ON public.waitlist;
-- Không ai đọc từ trình duyệt; đội MIMI đọc bằng service role.

ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_email_hop_le CHECK (
    char_length(email) BETWEEN 6 AND 254 AND email ~ '^[^@\s<>"]+@[^@\s<>"]+\.[A-Za-z]{2,}$'
  ) NOT VALID,
  ADD CONSTRAINT waitlist_do_dai CHECK (
    coalesce(char_length(company_name), 0) <= 200 AND coalesce(char_length(utm_source), 0) <= 100
    AND coalesce(char_length(utm_medium), 0) <= 100 AND coalesce(char_length(utm_campaign), 0) <= 100
  ) NOT VALID;
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_mot_lan ON public.waitlist (lower(email));

/*
 * Chặn lũ: trình duyệt ghi thẳng bằng khoá anon nên không biết IP. Giới hạn TOÀN CỤC là lưới cuối:
 * hơn 30 đăng ký trong 10 phút là bất thường với một startup đang pilot 30 hộ — từ chối, ghi log.
 * `created_at` do máy chủ đặt: người gửi không lùi giờ để lách.
 */
CREATE OR REPLACE FUNCTION public.waitlist_chong_lu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  NEW.email := lower(btrim(NEW.email));
  IF (SELECT count(*) FROM public.waitlist WHERE created_at > now() - interval '10 minutes') >= 30 THEN
    RAISE EXCEPTION 'Quá nhiều đăng ký cùng lúc. Thử lại sau ít phút.' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.waitlist_chong_lu() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS waitlist_chong_lu ON public.waitlist;
CREATE TRIGGER waitlist_chong_lu BEFORE INSERT ON public.waitlist FOR EACH ROW EXECUTE FUNCTION public.waitlist_chong_lu();

-- ── 3. Kho secure-documents ────────────────────────────────────────────────────────────────────
UPDATE storage.buckets
   SET file_size_limit = 5242880, allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'secure-documents';
-- Không có đường ghi nào trong app: gỡ quyền tải lên và sửa từ trình duyệt. Đọc giữ nguyên.
DROP POLICY IF EXISTS "Users can upload to own company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own company folder" ON storage.objects;
