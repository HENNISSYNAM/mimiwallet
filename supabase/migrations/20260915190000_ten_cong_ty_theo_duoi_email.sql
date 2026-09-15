-- Đăng ký chỉ bằng email (15/09/2026): công ty mới lấy tên theo đuôi email công ty.
--
-- Người dùng muốn đăng ký "chỉ cần email đuôi công ty là xong". Trang đăng ký không hỏi
-- tên công ty nữa, nên cái tên đầu tiên phải tự đoán được và nhận ra được. Với email
-- công ty, đuôi email ("thinhphat.vn") chỉ đúng công ty hơn tên riêng của người đăng ký
-- hay phần trước chữ @. Email cá nhân (gmail, yahoo…) không nói gì về công ty, nên giữ
-- thứ tự cũ: tên người, rồi phần trước @.
--
-- Chỉ đổi cách đặt tên cho công ty TẠO MỚI. Không sửa tên công ty đang có. Người dùng
-- đổi tên ở Cài đặt như trước.

CREATE OR REPLACE FUNCTION public.create_default_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback text;
  duoi text;
BEGIN
  duoi := lower(trim(split_part(COALESCE(NEW.email, ''), '@', 2)));
  IF duoi = ''
     OR position('.' IN duoi) = 0
     OR duoi = ANY (ARRAY[
       'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.com.vn', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
       'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'zoho.com', 'yandex.com', 'mail.ru'
     ]) THEN
    duoi := NULL;
  END IF;

  fallback := COALESCE(
    duoi,
    NULLIF(trim(NEW.full_name), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Doanh nghiệp của tôi'
  );

  -- Không tạo công ty thứ hai: ứng dụng coi công ty cũ nhất là công ty đang dùng.
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE user_id = NEW.user_id) THEN
    INSERT INTO public.companies (user_id, name) VALUES (NEW.user_id, fallback);
  END IF;

  RETURN NEW;
END;
$$;
