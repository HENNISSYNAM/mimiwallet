-- Go-Live (26/09/2026): lớp bảo vệ thứ hai cho người CHƯA ĐĂNG NHẬP (role anon).
--
-- Kiểm trên CSDL thật: mọi bảng public đều bật RLS, và mọi chính sách ghi áp cho anon/public đều đòi
-- auth.uid() — nên anon hiện KHÔNG ghi được gì ngoài waitlist. Nhưng anon vẫn giữ quyền bảng mặc định của
-- Supabase (INSERT/UPDATE/DELETE trên 72 bảng): chỉ cần một chính sách viết sai sau này là mở. Thu hồi ở
-- tầng quyền để lỗi đó không thành lỗ. Giữ INSERT cho waitlist (form đăng ký chờ, đã có trigger chống lũ).
DO $$
DECLARE b record;
BEGIN
  FOR b IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon', b.relname);
  END LOOP;
END $$;

GRANT INSERT ON public.waitlist TO anon;

-- Bảng tạo về sau cũng không tự cho anon ghi.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;
