-- Chạy đối soát thu phí theo lịch.
--
-- VÌ SAO CRON NẰM TRONG DATABASE CHỨ KHÔNG PHẢI DỊCH VỤ NGOÀI:
--
-- `subscription-billing?action=reconcile` là thứ biến "tiền đã vào tài khoản"
-- thành "thuê bao đã kích hoạt". Không có gì gọi nó thì khách trả tiền xong vẫn
-- không dùng được — lỗi tệ nhất mà một kênh thu tiền có thể mắc.
--
-- Đặt lịch bằng pg_cron thay vì một scheduler bên ngoài vì bí mật gọi hàm khi đó
-- KHÔNG PHẢI RỜI KHỎI HỆ THỐNG. Dịch vụ ngoài thì phải dán chuỗi bí mật vào ô
-- cấu hình của họ, tức là nó tồn tại thêm ở một nơi nữa, do một bên khác giữ.
-- Ở đây nó nằm trong Vault, chỉ hàm dưới đây đọc được, và không con người nào
-- cần biết giá trị.
--
-- Lưu ý về Supabase Dashboard: cột giá trị ở trang Edge Functions → Secrets là
-- **digest băm**, không phải giá trị gốc. Không khôi phục được secret từ đó.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

/*
 * Gọi endpoint đối soát.
 *
 * SECURITY DEFINER vì nó đọc `vault.decrypted_secrets`, thứ vai trò gọi cron
 * không có quyền chạm tới. `search_path` cố định để không bị chiếm quyền bằng
 * cách tạo hàm trùng tên ở schema khác — với hàm SECURITY DEFINER thì đó là lỗ
 * hổng thật, không phải hình thức.
 */
CREATE OR REPLACE FUNCTION public.chay_doi_soat_thue_bao()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net, extensions
AS $$
DECLARE
  bi_mat text;
  duong_dan text;
BEGIN
  SELECT decrypted_secret INTO bi_mat
  FROM vault.decrypted_secrets
  WHERE name = 'billing_cron_secret';

  SELECT decrypted_secret INTO duong_dan
  FROM vault.decrypted_secrets
  WHERE name = 'billing_reconcile_url';

  -- Thiếu cấu hình thì báo rõ rồi dừng, thay vì gọi một URL rỗng mỗi 10 phút
  -- và để lại hàng nghìn dòng lỗi không ai đọc.
  IF bi_mat IS NULL OR duong_dan IS NULL THEN
    RAISE WARNING 'Chưa cấu hình billing_cron_secret hoặc billing_reconcile_url trong Vault';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := duong_dan,
    body := '{"action":"reconcile"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', bi_mat
    ),
    timeout_milliseconds := 20000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.chay_doi_soat_thue_bao() FROM PUBLIC;

/*
 * Mười phút một lần.
 *
 * Đủ nhanh để khách vừa chuyển khoản xong, ngồi nhìn màn hình, thấy nó tự
 * chuyển sang đã kích hoạt — màn hình thanh toán hỏi lại trạng thái mỗi 15 giây
 * nên độ trễ thực tế do vòng cron này quyết định.
 *
 * Đủ chậm để không gọi vô ích: đối soát chỉ quét hoá đơn đang `pending`, và
 * phần lớn thời gian danh sách đó rỗng, khi ấy hàm thoát ngay ở truy vấn đầu.
 */
SELECT cron.schedule(
  'doi-soat-thue-bao',
  '*/10 * * * *',
  $$SELECT public.chay_doi_soat_thue_bao();$$
);

COMMENT ON FUNCTION public.chay_doi_soat_thue_bao() IS
  'Gọi subscription-billing?action=reconcile. Bí mật đọc từ Vault nên không rời khỏi hệ thống.';
