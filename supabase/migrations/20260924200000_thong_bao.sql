-- MIMI chủ động báo người dùng — trên web và điện thoại.
--
-- Trước đây nút chuông ở đầu trang chỉ hiện một câu "chưa có thông báo". Việc cần báo thì có
-- sẵn: hạn nộp tờ khai (đã tính ở Nhắc thuế), văn bản luật mới (kho Công báo nạp hằng ngày),
-- khoản tiền vào có vẻ không phải doanh thu (bộ đọc nội dung chuyển khoản), gói sắp hết hạn,
-- tiền thanh toán đã về. Không có chỗ nào đưa chúng tới người dùng khi họ không mở app.
--
-- Bộ lọc chạy NGẦM trên máy chủ (edge function `thong-bao`, cron mỗi giờ). Thông báo lưu mỗi
-- người nhận một dòng, có khoá chống trùng — cron chạy lại bao nhiêu lần cũng không báo hai lần.
-- Đẩy qua Web Push: chạy trên Android, trong app Google Play (TWA), và iPhone khi đã thêm vào
-- màn hình chính. Người dùng bật trong trang Nhắc thuế.

CREATE TABLE IF NOT EXISTS public.thong_bao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  loai text NOT NULL CHECK (loai IN ('han_thue', 'luat_moi', 'tien_vao', 'goi', 'thanh_toan', 'khac')),
  muc_do text NOT NULL DEFAULT 'thong_tin' CHECK (muc_do IN ('thong_tin', 'can_chu_y', 'gap')),
  tieu_de text NOT NULL CHECK (char_length(tieu_de) <= 200),
  noi_dung text NOT NULL CHECK (char_length(noi_dung) <= 1000),
  -- Chỉ đường trong app: không bao giờ là một liên kết ra ngoài do dữ liệu tạo nên.
  duong_dan text CHECK (duong_dan IS NULL OR duong_dan ~ '^/dashboard(/[a-z0-9-]*)*(\?[a-z0-9=&_-]*)?$'),
  -- Nút xử lý một chạm, ví dụ xác nhận một khoản tiền vào. Máy chủ kiểm quyền khi bấm.
  hanh_dong jsonb NOT NULL DEFAULT '[]'::jsonb,
  khoa text NOT NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  da_doc_luc timestamptz,
  da_xu_ly_luc timestamptz,
  da_day_luc timestamptz,
  UNIQUE (user_id, company_id, khoa)
);

CREATE INDEX IF NOT EXISTS thong_bao_nguoi_nhan_idx ON public.thong_bao (user_id, tao_luc DESC);
CREATE INDEX IF NOT EXISTS thong_bao_cho_day_idx ON public.thong_bao (tao_luc) WHERE da_day_luc IS NULL;

ALTER TABLE public.thong_bao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Người nhận đọc thông báo của mình" ON public.thong_bao
  FOR SELECT TO authenticated USING (user_id = auth.uid());

/* Đánh dấu đã đọc / đã xử lý — chỉ thông báo của chính mình, chỉ hai cột đó. */
CREATE OR REPLACE FUNCTION public.danh_dau_thong_bao(p_ids uuid[], p_da_xu_ly boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.thong_bao
  SET da_doc_luc = coalesce(da_doc_luc, now()),
      da_xu_ly_luc = CASE WHEN p_da_xu_ly THEN coalesce(da_xu_ly_luc, now()) ELSE da_xu_ly_luc END
  WHERE id = ANY (p_ids) AND user_id = auth.uid();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.danh_dau_thong_bao(uuid[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.danh_dau_thong_bao(uuid[], boolean) TO authenticated;

-- ── Đăng ký nhận đẩy (mỗi trình duyệt / điện thoại một dòng) ─────────────────
CREATE TABLE IF NOT EXISTS public.dang_ky_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^https://'),
  p256dh text NOT NULL,
  auth text NOT NULL,
  thiet_bi text,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  day_luc timestamptz
);
CREATE INDEX IF NOT EXISTS dang_ky_day_user_idx ON public.dang_ky_day (user_id);

-- Ghi qua edge function (kiểm hình dạng); người dùng chỉ xem và gỡ thiết bị của mình.
ALTER TABLE public.dang_ky_day ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Xem thiết bị nhận đẩy của mình" ON public.dang_ky_day
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Gỡ thiết bị nhận đẩy của mình" ON public.dang_ky_day
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── Loại thông báo người dùng đã tắt ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cai_dat_thong_bao (
  user_id uuid PRIMARY KEY,
  loai_tat text[] NOT NULL DEFAULT '{}'
    CHECK (loai_tat <@ ARRAY['han_thue', 'luat_moi', 'tien_vao', 'goi', 'thanh_toan', 'khac']::text[]),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cai_dat_thong_bao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Đọc cài đặt thông báo của mình" ON public.cai_dat_thong_bao
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Tạo cài đặt thông báo của mình" ON public.cai_dat_thong_bao
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Sửa cài đặt thông báo của mình" ON public.cai_dat_thong_bao
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Cron: bộ lọc ngầm mỗi giờ ────────────────────────────────────────────────
-- Dùng lại bí mật cron và anon key đã có trong Vault (xem 20260820150000_billing_cron_auth.sql).
CREATE OR REPLACE FUNCTION public.chay_quet_thong_bao()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net, extensions
AS $$
DECLARE
  bi_mat text;
  duong_dan text;
  anon_key text;
BEGIN
  SELECT decrypted_secret INTO bi_mat FROM vault.decrypted_secrets WHERE name = 'billing_cron_secret';
  SELECT replace(decrypted_secret, '/subscription-billing', '/thong-bao') INTO duong_dan
    FROM vault.decrypted_secrets WHERE name = 'billing_reconcile_url';
  SELECT decrypted_secret INTO anon_key FROM vault.decrypted_secrets WHERE name = 'billing_anon_key';
  IF bi_mat IS NULL OR duong_dan IS NULL OR anon_key IS NULL THEN
    RAISE WARNING 'Thiếu cấu hình trong Vault cho quét thông báo';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := duong_dan,
    body := '{"hanh_dong":"quet"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-cron-secret', bi_mat
    ),
    timeout_milliseconds := 60000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.chay_quet_thong_bao() FROM PUBLIC;

-- Phút 7 mỗi giờ: lệch khỏi các cron khác. Hạn thuế được báo vào lần quét đầu tiên sau 07:00
-- giờ Việt Nam (máy chủ tự chặn giờ đêm), không báo lúc nửa đêm.
SELECT cron.schedule('mimi-quet-thong-bao', '7 * * * *', $$SELECT public.chay_quet_thong_bao();$$);
