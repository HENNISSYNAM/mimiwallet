-- Tài nguyên: bài viết do admin đăng — Sự kiện & Webinar, Blog, Góc nhìn, Báo cáo, Tin tức, Tuyển dụng.
--
-- Ai cũng đọc được bài đã xuất bản; chỉ tài khoản có profiles.role = 'admin' được đọc bản nháp và
-- ghi. Quyền nằm ở RLS, không nằm ở giao diện: trang Admin chỉ quyết định hiện gì.
-- Không có dữ liệu mẫu: trang công khai nói thật là "chưa có bài" cho tới khi admin đăng.

CREATE TABLE IF NOT EXISTS public.tai_nguyen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loai text NOT NULL CHECK (loai IN ('su_kien', 'blog', 'goc_nhin', 'bao_cao', 'tin_tuc', 'tuyen_dung')),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120),
  tieu_de text NOT NULL CHECK (char_length(btrim(tieu_de)) BETWEEN 3 AND 200),
  tom_tat text NOT NULL DEFAULT '' CHECK (char_length(tom_tat) <= 500),
  noi_dung text NOT NULL DEFAULT '' CHECK (char_length(noi_dung) <= 100000),
  -- Ảnh bìa và đường dẫn ngoài chỉ nhận https, chặn javascript:, data: …
  anh_bia text CHECK (anh_bia IS NULL OR (anh_bia ~ '^https://[^\s]+$' AND char_length(anh_bia) <= 1000)),
  duong_dan_ngoai text CHECK (duong_dan_ngoai IS NULL OR (duong_dan_ngoai ~ '^https://[^\s]+$' AND char_length(duong_dan_ngoai) <= 1000)),
  -- Sự kiện: thời gian, địa điểm. Tuyển dụng: địa điểm, hình thức làm việc.
  bat_dau timestamptz,
  ket_thuc timestamptz CHECK (ket_thuc IS NULL OR bat_dau IS NULL OR ket_thuc >= bat_dau),
  dia_diem text CHECK (dia_diem IS NULL OR char_length(dia_diem) <= 300),
  hinh_thuc text CHECK (hinh_thuc IS NULL OR char_length(hinh_thuc) <= 100),
  trang_thai text NOT NULL DEFAULT 'nhap' CHECK (trang_thai IN ('nhap', 'xuat_ban')),
  xuat_ban_luc timestamptz,
  tac_gia uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tai_nguyen_cong_khai_idx
  ON public.tai_nguyen (loai, xuat_ban_luc DESC) WHERE trang_thai = 'xuat_ban';

CREATE OR REPLACE FUNCTION public.tai_nguyen_truoc_ghi()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.sua_luc := now();
  IF NEW.trang_thai = 'xuat_ban' AND NEW.xuat_ban_luc IS NULL THEN
    NEW.xuat_ban_luc := now();
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Người tạo và lúc tạo không đổi được qua UPDATE.
    NEW.tac_gia := OLD.tac_gia;
    NEW.tao_luc := OLD.tao_luc;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tai_nguyen_truoc_ghi ON public.tai_nguyen;
CREATE TRIGGER tai_nguyen_truoc_ghi
  BEFORE INSERT OR UPDATE ON public.tai_nguyen
  FOR EACH ROW EXECUTE FUNCTION public.tai_nguyen_truoc_ghi();

ALTER TABLE public.tai_nguyen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ai cũng đọc bài đã xuất bản" ON public.tai_nguyen;
CREATE POLICY "Ai cũng đọc bài đã xuất bản" ON public.tai_nguyen
  FOR SELECT TO anon, authenticated
  USING (trang_thai = 'xuat_ban' AND xuat_ban_luc <= now());

DROP POLICY IF EXISTS "Admin đọc mọi bài" ON public.tai_nguyen;
CREATE POLICY "Admin đọc mọi bài" ON public.tai_nguyen
  FOR SELECT TO authenticated
  USING (public.current_role() = 'admin');

DROP POLICY IF EXISTS "Admin thêm bài" ON public.tai_nguyen;
CREATE POLICY "Admin thêm bài" ON public.tai_nguyen
  FOR INSERT TO authenticated
  WITH CHECK (public.current_role() = 'admin');

DROP POLICY IF EXISTS "Admin sửa bài" ON public.tai_nguyen;
CREATE POLICY "Admin sửa bài" ON public.tai_nguyen
  FOR UPDATE TO authenticated
  USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

DROP POLICY IF EXISTS "Admin xoá bài" ON public.tai_nguyen;
CREATE POLICY "Admin xoá bài" ON public.tai_nguyen
  FOR DELETE TO authenticated
  USING (public.current_role() = 'admin');

REVOKE ALL ON public.tai_nguyen FROM anon, authenticated;
GRANT SELECT ON public.tai_nguyen TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tai_nguyen TO authenticated;
