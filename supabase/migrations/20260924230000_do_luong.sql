-- Đo lường cho pilot 30 hộ (docs/KIEM_TOAN_RA_MAT.md, mục 28 bản chỉ đạo và P-6).
--
-- DÙNG LẠI `product_events` có từ 13/08 (migration 20260813190000, hàm `track()` ở trình duyệt) —
-- không dựng hệ đo lường thứ hai. Thêm:
--   1. `company_id`: hành trình kích hoạt tính theo công ty, không chỉ theo người.
--   2. Sự kiện "lần đầu" ghi đúng một lần mỗi công ty (chỉ mục duy nhất một phần).
--   3. View `chi_so_pilot`: chỉ số chính là % GIÁ TRỊ tiền vào đã được giải thích (P-6 — "số case
--      đã giải quyết" dễ làm đẹp bằng cách đẻ case vặt; % tiền đã giải thích thì không).
-- Giữ quy ước của bảng: không tiền, không số tài khoản, không mã số thuế trong `props`.

ALTER TABLE public.product_events
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS product_events_lan_dau
  ON public.product_events (company_id, name)
  WHERE company_id IS NOT NULL AND name IN (
    'business_identified', 'financial_source_connected', 'first_scan_completed', 'first_exception_detected',
    'first_classification_confirmed', 'first_reconciliation_completed', 'calendar_generated',
    'first_case_created', 'first_case_resolved', 'first_paid_action', 'week2_return'
  );
CREATE INDEX IF NOT EXISTS product_events_cty_idx ON public.product_events (company_id, created_at DESC) WHERE company_id IS NOT NULL;

/*
 * % giá trị tiền vào năm nay đã được giải thích: đã có người phân loại (trừ "Tôi chưa chắc").
 * Công ty demo và dữ liệu minh hoạ đứng ngoài. Chỉ máy chủ đọc.
 */
CREATE OR REPLACE VIEW public.chi_so_pilot
WITH (security_invoker = true) AS
SELECT
  c.id AS company_id,
  count(t.id) AS so_khoan_vao,
  coalesce(sum(abs(t.amount)), 0) AS tong_vao,
  coalesce(sum(abs(t.amount)) FILTER (WHERE rc.revenue_effect IN ('include', 'exclude')), 0) AS da_giai_thich,
  CASE WHEN coalesce(sum(abs(t.amount)), 0) = 0 THEN NULL
       ELSE round(100.0 * coalesce(sum(abs(t.amount)) FILTER (WHERE rc.revenue_effect IN ('include', 'exclude')), 0)
                  / sum(abs(t.amount)), 1) END AS phan_tram_da_giai_thich
FROM public.companies c
JOIN public.transactions t ON t.company_id = c.id
  AND NOT t.is_synthetic
  AND t.type = 'income'
  AND t.transaction_date >= date_trunc('year', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
LEFT JOIN public.revenue_classifications rc ON rc.transaction_id = t.id
WHERE NOT c.la_demo
GROUP BY c.id;

REVOKE ALL ON public.chi_so_pilot FROM PUBLIC, anon, authenticated;
