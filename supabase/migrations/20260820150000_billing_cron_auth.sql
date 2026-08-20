-- Sửa lỗi: cron gọi endpoint bị cổng Supabase chặn trước khi mã hàm chạy.
--
-- Bản đầu của `chay_doi_soat_thue_bao()` chỉ gửi `x-cron-secret`. Chạy thử một
-- vòng thật và đọc `net._http_response` cho ra:
--
--     401 {"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}
--
-- Tức là cổng xác thực của Supabase từ chối **trước khi** mã trong edge function
-- được gọi, nên `x-cron-secret` không bao giờ tới nơi để được kiểm. Nhìn mã hàm
-- thì không thấy được điều này — chỉ chạy thật rồi đọc phản hồi mới thấy.
--
-- Hai cách sửa, và lý do chọn cách này:
--
--   a) Đặt `verify_jwt = false` cho hàm trong config.toml, như `cas-webhook` và
--      `bank-webhook` đang làm.
--   b) Gửi kèm `Authorization` bằng anon key.
--
-- Chọn (b). Hai webhook kia CHỈ có một nhánh và tự xác thực hoàn toàn, nên tắt
-- cổng là hợp lý. `subscription-billing` thì khác: nó còn nhánh `create` cần JWT
-- thật của người dùng để biết hoá đơn thuộc công ty nào. Tắt `verify_jwt` sẽ nới
-- lỏng cả nhánh đó, đổi lấy tiện lợi cho nhánh cron — không đáng.
--
-- Anon key là khoá công khai (`sb_publishable_…`), đã nằm sẵn trong gói
-- JavaScript gửi tới mọi trình duyệt. Nó không phải bí mật; thứ thật sự chặn
-- người lạ gọi vòng đối soát vẫn là `billing_cron_secret` trong Vault.

SELECT vault.create_secret(
  'sb_publishable_r4reA2kLO6rzvF5EgkaYfg_Fz3UQBBt',
  'billing_anon_key',
  'Anon key công khai, chỉ để qua cổng xác thực của Supabase'
);

CREATE OR REPLACE FUNCTION public.chay_doi_soat_thue_bao()
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
  SELECT decrypted_secret INTO bi_mat
  FROM vault.decrypted_secrets WHERE name = 'billing_cron_secret';

  SELECT decrypted_secret INTO duong_dan
  FROM vault.decrypted_secrets WHERE name = 'billing_reconcile_url';

  SELECT decrypted_secret INTO anon_key
  FROM vault.decrypted_secrets WHERE name = 'billing_anon_key';

  IF bi_mat IS NULL OR duong_dan IS NULL OR anon_key IS NULL THEN
    RAISE WARNING 'Thiếu cấu hình trong Vault cho đối soát thu phí';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := duong_dan,
    body := '{"action":"reconcile"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Qua cổng Supabase…
      'Authorization', 'Bearer ' || anon_key,
      -- …rồi mã hàm tự kiểm cái này. Đây mới là thứ chặn người lạ.
      'x-cron-secret', bi_mat
    ),
    timeout_milliseconds := 20000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.chay_doi_soat_thue_bao() FROM PUBLIC;
