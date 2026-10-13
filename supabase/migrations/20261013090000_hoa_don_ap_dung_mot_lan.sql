-- THU TIỀN: KHÔNG MẤT QUYỀN LỢI, KHÔNG HOÁ ĐƠN TREO (13/10/2026).
--
-- 1. `ap_dung_luc`: thời điểm quyền lợi của hoá đơn đã trả THẬT SỰ được cấp (gói / lượt / xu). Trước đây hoá đơn
--    chuyển `paid` rồi mới cấp quyền lợi; lỗi giữa hai bước làm hoá đơn kẹt ở `paid` mà khách không có gì, và vòng
--    đối soát sau không bao giờ thử lại (chỉ quét `pending`). Giờ vòng đối soát cấp lại mọi hoá đơn `paid` chưa có
--    `ap_dung_luc`; các bước cấp đều chạy lại được mà không cấp trùng (lượt/xu theo `hoa_don_id` duy nhất, gói theo
--    `subscriptions.last_invoice_id`).
-- 2. Một hoá đơn `pending` cho mỗi (công ty, loại hàng, số lượt, số xu): hai lần bấm "thanh toán" cùng lúc không còn
--    sinh hai mã. Lần thứ hai gặp lỗi trùng khoá và đọc lại hoá đơn của lần thứ nhất.

ALTER TABLE public.subscription_invoices ADD COLUMN IF NOT EXISTS ap_dung_luc timestamptz;

-- Hoá đơn đã trả từ trước ngày này: coi như đã cấp (đã cấp theo luồng cũ) — không cấp lại.
UPDATE public.subscription_invoices SET ap_dung_luc = COALESCE(paid_at, updated_at, now())
WHERE status = 'paid' AND ap_dung_luc IS NULL;

-- Dọn hoá đơn chờ trùng (nếu có) trước khi đặt khoá duy nhất: giữ cái mới nhất, huỷ cái cũ.
UPDATE public.subscription_invoices s SET status = 'cancelled', updated_at = now()
WHERE s.status = 'pending' AND EXISTS (
  SELECT 1 FROM public.subscription_invoices t
  WHERE t.status = 'pending' AND t.company_id = s.company_id AND t.plan = s.plan
    AND COALESCE(t.so_luot, 0) = COALESCE(s.so_luot, 0) AND COALESCE(t.so_xu, 0) = COALESCE(s.so_xu, 0)
    AND (t.created_at, t.id) > (s.created_at, s.id)
);

CREATE UNIQUE INDEX IF NOT EXISTS hoa_don_cho_mot_moi_mat_hang
  ON public.subscription_invoices (company_id, plan, COALESCE(so_luot, 0), COALESCE(so_xu, 0))
  WHERE status = 'pending';

-- 3. BẢN DEMO DÙNG CHUNG (13/10/2026): RLS theo user_id không tách được các khách demo — ai cũng đọc được câu hỏi của
--    nhau qua API. Máy chủ thôi lưu chữ của bản demo (tro-ly `CHU_THAY_DEMO`); xoá chữ các lượt demo đã lưu trước đó.
UPDATE public.hoi_thoai_tro_ly h
SET cau_hoi = '(bản demo — nội dung chỉ giữ trên trình duyệt của người hỏi)', cau_tra_loi = ''
FROM public.companies c
WHERE h.company_id = c.id AND c.la_demo = true
  AND h.cau_hoi <> '(bản demo — nội dung chỉ giữ trên trình duyệt của người hỏi)';
