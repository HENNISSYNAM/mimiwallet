-- Giới hạn tần suất gọi edge function theo người dùng (15/09/2026).
--
-- Edge function không giữ trạng thái giữa các lần chạy, nên bộ đếm nằm ở CSDL. Một phiên
-- đăng nhập bị chiếm có thể gọi `tro-ly` hàng nghìn lần để dò dữ liệu hoặc đốt hạn mức mô
-- hình; bộ đếm theo cửa sổ thời gian chặn việc đó mà người dùng thật không chạm tới.
--
-- Chỉ service role gọi được hàm; bảng không có policy nào nên trình duyệt không đọc, không
-- ghi, không tự xoá bộ đếm của mình được.

CREATE TABLE IF NOT EXISTS public.gioi_han_goi (
  user_id uuid NOT NULL,
  hanh_dong text NOT NULL CHECK (char_length(hanh_dong) BETWEEN 1 AND 40),
  cua_so timestamptz NOT NULL,
  so_lan integer NOT NULL DEFAULT 0 CHECK (so_lan >= 0),
  PRIMARY KEY (user_id, hanh_dong, cua_so)
);

ALTER TABLE public.gioi_han_goi ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tang_luot_goi(p_user uuid, p_hanh_dong text, p_cua_so_giay integer, p_toi_da integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cua_so timestamptz;
  v_so integer;
BEGIN
  IF p_cua_so_giay IS NULL OR p_cua_so_giay < 1 OR p_toi_da IS NULL OR p_toi_da < 1 THEN
    RAISE EXCEPTION 'tham số giới hạn không hợp lệ';
  END IF;
  v_cua_so := to_timestamp(floor(extract(epoch FROM now()) / p_cua_so_giay) * p_cua_so_giay);

  INSERT INTO public.gioi_han_goi AS g (user_id, hanh_dong, cua_so, so_lan)
  VALUES (p_user, p_hanh_dong, v_cua_so, 1)
  ON CONFLICT (user_id, hanh_dong, cua_so) DO UPDATE SET so_lan = g.so_lan + 1
  RETURNING so_lan INTO v_so;

  -- Dọn cửa sổ cũ của chính người này để bảng không phình.
  DELETE FROM public.gioi_han_goi WHERE user_id = p_user AND cua_so < now() - interval '1 day';

  RETURN v_so <= p_toi_da;
END;
$$;

REVOKE ALL ON FUNCTION public.tang_luot_goi(uuid, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tang_luot_goi(uuid, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tang_luot_goi(uuid, text, integer, integer) TO service_role;

COMMENT ON TABLE public.gioi_han_goi IS 'Bộ đếm lượt gọi edge function theo người dùng và cửa sổ thời gian. Chỉ service role.';
