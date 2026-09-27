-- Chỉ số kích hoạt cho Go-Live (mục 19/20 bản chỉ đạo), 27/09/2026.
--
-- VÌ SAO TÍNH TỪ DỮ LIỆU GỐC, KHÔNG TỪ SỰ KIỆN. `product_events` khai 11 sự kiện "lần đầu" nhưng
-- 7 cái chưa từng được ghi (financial_source_connected, first_scan_completed, …, week2_return), và
-- sự kiện gửi từ trình duyệt mất được (chặn quảng cáo, đóng tab). Còn việc một công ty đã nối ngân
-- hàng, đã có doanh thu được phân loại, đã tự tay bắt đầu một việc — những điều đó NẰM SẴN trong
-- bảng nghiệp vụ, không mất được, và tính lại được cho cả người dùng cũ. Sự kiện chỉ còn dùng cho
-- điều bảng nghiệp vụ không ghi: người dùng có QUAY LẠI hay không.
--
-- ĐỊNH NGHĨA (mỗi mốc là thời điểm SỚM NHẤT):
--   1. dang_ky            — công ty được tạo.
--   2. noi_nguon          — nối ngân hàng, hoặc có giao dịch thật đầu tiên (nhập sao kê cũng tính).
--   3. co_so_doanh_thu    — khoản tiền vào đầu tiên được xếp tính / không tính vào doanh thu
--                            (bởi người hay bởi MIMI tự phân loại — đều là "sự thật doanh thu" đã có).
--   4. tu_tay_bat_dau     — hành động đầu tiên CỦA NGƯỜI: tự xác nhận/sửa một phân loại, hoặc tự ghi
--                            một bằng chứng cho một việc. MIMI tự làm thì không tính.
--   5. xong_viec_dau      — việc đầu tiên được giải quyết.
--   6. quay_lai_7_ngay    — có hoạt động của thành viên công ty từ ngày thứ 7 sau đăng ký trở đi.
--
--   KÍCH HOẠT = có cả (2), (3) và (4). "Kích hoạt trong 7 ngày" = (4) xảy ra trong 7 ngày đầu.
--   Mốc (3) đứng một mình chưa đủ: MIMI tự phân loại ngay khi có sao kê, nên nó chỉ chứng minh
--   hệ thống chạy; (4) mới chứng minh người dùng thấy đáng để tự tay làm.
--
-- Công ty demo đứng ngoài; giao dịch minh hoạ (is_synthetic) không tính. Chỉ quản trị đọc
-- (SQL editor / service role) — như `chi_so_pilot`.

-- Ghi sự kiện kèm company_id thì phải là thành viên công ty đó. Chính sách cũ chỉ kiểm user_id, nên
-- một người gắn được sự kiện vào công ty người khác và làm lệch chỉ số "quay lại" của họ.
DROP POLICY IF EXISTS "Users log their own events" ON public.product_events;
CREATE POLICY "Users log their own events"
  ON public.product_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (company_id IS NULL OR public.la_thanh_vien(company_id)));

CREATE OR REPLACE VIEW public.hanh_trinh_kich_hoat
WITH (security_invoker = true) AS
WITH moc AS (
  SELECT
    c.id AS company_id,
    c.created_at AS dang_ky,
    LEAST(
      (SELECT min(b.created_at) FROM public.bank_connections b WHERE b.company_id = c.id),
      (SELECT min(t.created_at) FROM public.transactions t WHERE t.company_id = c.id AND NOT t.is_synthetic)
    ) AS noi_nguon,
    (SELECT min(rc.confirmed_at) FROM public.revenue_classifications rc
      WHERE rc.company_id = c.id AND rc.revenue_effect IN ('include', 'exclude')) AS co_so_doanh_thu,
    LEAST(
      (SELECT min(rc.confirmed_at) FROM public.revenue_classifications rc
        WHERE rc.company_id = c.id AND rc.confirmed_by <> '00000000-0000-0000-0000-000000000000'::uuid),
      (SELECT min(bc.tao_luc) FROM public.bang_chung_viec bc
        WHERE bc.company_id = c.id AND bc.nguon = 'nguoi_dung')
    ) AS tu_tay_bat_dau,
    (SELECT min(h.giai_quyet_luc) FROM public.ho_so_viec h
      WHERE h.company_id = c.id AND h.trang_thai IN ('resolved_user_confirmed', 'resolved_system_verified')) AS xong_viec_dau
  FROM public.companies c
  WHERE NOT c.la_demo
)
SELECT
  m.*,
  -- Sự kiện gắn đúng công ty; sự kiện cũ không có company_id (trước 27/09/2026) chỉ tính khi người đó
  -- thuộc ĐÚNG MỘT công ty — người nhiều công ty thì không biết họ quay lại công ty nào.
  EXISTS (
    SELECT 1 FROM public.product_events e
    WHERE e.created_at >= m.dang_ky + interval '7 days'
      AND (e.company_id = m.company_id
           OR (e.company_id IS NULL
               AND e.user_id IN (SELECT tv.user_id FROM public.thanh_vien_cong_ty tv WHERE tv.company_id = m.company_id)
               AND (SELECT count(*) FROM public.thanh_vien_cong_ty tv2 WHERE tv2.user_id = e.user_id) = 1))
  ) AS quay_lai_7_ngay,
  (m.noi_nguon IS NOT NULL AND m.co_so_doanh_thu IS NOT NULL AND m.tu_tay_bat_dau IS NOT NULL) AS da_kich_hoat,
  (m.noi_nguon IS NOT NULL AND m.co_so_doanh_thu IS NOT NULL
    AND m.tu_tay_bat_dau IS NOT NULL AND m.tu_tay_bat_dau < m.dang_ky + interval '7 days') AS kich_hoat_trong_7_ngay
FROM moc m;

REVOKE ALL ON public.hanh_trinh_kich_hoat FROM PUBLIC, anon, authenticated;

COMMENT ON VIEW public.hanh_trinh_kich_hoat IS
  'Hành trình kích hoạt theo công ty, tính từ bảng nghiệp vụ. Kích hoạt = nối nguồn + có sự thật doanh thu + tự tay bắt đầu một việc. Chỉ quản trị đọc.';

-- Phễu theo tuần đăng ký (giờ VN): mỗi bước bao nhiêu công ty tới được.
CREATE OR REPLACE VIEW public.pheu_kich_hoat
WITH (security_invoker = true) AS
SELECT
  date_trunc('week', dang_ky AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS tuan_dang_ky,
  count(*) AS dang_ky,
  count(*) FILTER (WHERE noi_nguon IS NOT NULL) AS noi_nguon,
  count(*) FILTER (WHERE co_so_doanh_thu IS NOT NULL) AS co_so_doanh_thu,
  count(*) FILTER (WHERE tu_tay_bat_dau IS NOT NULL) AS tu_tay_bat_dau,
  count(*) FILTER (WHERE da_kich_hoat) AS da_kich_hoat,
  count(*) FILTER (WHERE kich_hoat_trong_7_ngay) AS kich_hoat_trong_7_ngay,
  count(*) FILTER (WHERE xong_viec_dau IS NOT NULL) AS xong_viec_dau,
  count(*) FILTER (WHERE quay_lai_7_ngay) AS quay_lai_7_ngay
FROM public.hanh_trinh_kich_hoat
GROUP BY 1;

REVOKE ALL ON public.pheu_kich_hoat FROM PUBLIC, anon, authenticated;

COMMENT ON VIEW public.pheu_kich_hoat IS
  'Phễu kích hoạt theo tuần đăng ký (giờ VN), từ hanh_trinh_kich_hoat. Chỉ quản trị đọc.';
