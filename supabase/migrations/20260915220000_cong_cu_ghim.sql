-- Công cụ lối vào người dùng tự chọn (15/09/2026).
--
-- Mỗi người ghim những công cụ tài chính họ dùng hằng ngày lên thanh bên và màn MIMI
-- Assistant. Danh mục công cụ nằm trong mã (`src/lib/congCu.ts`) — mỗi công cụ là một trang
-- thật hoặc một câu hỏi trợ lý hiểu được; bảng này chỉ nhớ người dùng ghim khoá nào.
--
-- Là tuỳ chọn của chính người dùng nên trình duyệt đọc/ghi thẳng qua RLS, chỉ dòng của mình.
-- Khoá theo khuôn chữ thường để không nhét được chuỗi lạ; tối đa 20 dòng mỗi người (giao
-- diện cho 12) để không ai dùng bảng này làm kho chứa.

CREATE TABLE IF NOT EXISTS public.cong_cu_ghim (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  khoa text NOT NULL CHECK (khoa ~ '^[a-z0-9_]{2,40}$'),
  thu_tu smallint NOT NULL DEFAULT 0 CHECK (thu_tu BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, khoa)
);

ALTER TABLE public.cong_cu_ghim ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Xem công cụ đã ghim của mình" ON public.cong_cu_ghim FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Ghim công cụ cho mình" ON public.cong_cu_ghim FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Đổi thứ tự công cụ của mình" ON public.cong_cu_ghim FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Bỏ ghim công cụ của mình" ON public.cong_cu_ghim FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.cong_cu_ghim_toi_da()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.cong_cu_ghim WHERE user_id = NEW.user_id) >= 20 THEN
    RAISE EXCEPTION 'Tối đa 20 công cụ ghim';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cong_cu_ghim_toi_da_trg ON public.cong_cu_ghim;
CREATE TRIGGER cong_cu_ghim_toi_da_trg
  BEFORE INSERT ON public.cong_cu_ghim
  FOR EACH ROW EXECUTE FUNCTION public.cong_cu_ghim_toi_da();

COMMENT ON TABLE public.cong_cu_ghim IS 'Công cụ lối vào mỗi người dùng ghim; danh mục ở src/lib/congCu.ts.';
