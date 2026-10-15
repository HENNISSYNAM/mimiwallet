-- Đăng ký tài khoản MỚI chỉ qua Google (15/10/2026, theo chủ sản phẩm: "cho đăng nhập tự do, nhưng phải đăng ký qua Google").
--
-- VÌ SAO CẦN Ở MÁY CHỦ. Cài đặt "Allow new users to sign up" của Supabase là công tắc CHUNG cho mọi cách đăng nhập: bật
-- lên để Google tự mở tài khoản thì email (link đăng nhập, mật khẩu) cũng tự mở được. Ẩn nút ở giao diện không chặn được
-- ai gọi thẳng API xác thực, nên luật nằm ngay tại bảng `auth.users`: bản ghi mới chỉ được tạo khi
--   - nhà cung cấp là Google; hoặc
--   - người quản trị mời (invited_at có giá trị); hoặc
--   - người quản trị tạo sẵn và đã xác nhận email (email_confirmed_at có giá trị lúc tạo).
-- Đăng ký tự do bằng email có email_confirmed_at rỗng lúc tạo (mailer_autoconfirm đang tắt) nên bị từ chối.
--
-- Không ảnh hưởng người đã có tài khoản: trigger chỉ chạy khi TẠO bản ghi. Gỡ luật: DROP TRIGGER chi_dang_ky_google ON auth.users.

CREATE OR REPLACE FUNCTION public.chi_cho_dang_ky_google()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(NEW.raw_app_meta_data ->> 'provider', '') = 'google' THEN
    RETURN NEW;
  END IF;
  IF NEW.invited_at IS NOT NULL OR NEW.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Tài khoản mới chỉ đăng ký bằng Google' USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.chi_cho_dang_ky_google() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS chi_dang_ky_google ON auth.users;
-- BEFORE INSERT: bị từ chối thì không có bản ghi, nên trigger tạo hồ sơ/công ty (AFTER INSERT) không chạy.
CREATE TRIGGER chi_dang_ky_google
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.chi_cho_dang_ky_google();
