-- Đọc bộ đếm giới hạn KHÔNG tăng nó (26/09/2026) — để chặn dò khoá: "sai khoá quá N lần trong cửa sổ thì
-- từ chối trước cả khi kiểm khoá". Chỉ service role gọi được, giống `tang_luot_goi`.
CREATE OR REPLACE FUNCTION public.so_luot_goi(p_user uuid, p_hanh_dong text, p_cua_so_giay integer)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((
    SELECT so_lan FROM public.gioi_han_goi
    WHERE user_id = p_user AND hanh_dong = p_hanh_dong
      AND cua_so = to_timestamp(floor(extract(epoch FROM now()) / greatest(p_cua_so_giay, 1)) * greatest(p_cua_so_giay, 1))
  ), 0);
$$;
REVOKE EXECUTE ON FUNCTION public.so_luot_goi(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.so_luot_goi(uuid, text, integer) TO service_role;
