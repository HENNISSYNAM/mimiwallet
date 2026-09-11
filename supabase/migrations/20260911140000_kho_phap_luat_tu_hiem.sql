-- Tìm kiếm kho luật theo TỪ HIẾM, để nhanh và đúng trên 66 nghìn đoạn.
--
-- VÌ SAO. Nạp đủ kho ngày 11/09/2026 (2.749 văn bản, 66.031 đoạn) thì câu hỏi
-- "mức thu phí sử dụng đường bộ trạm thu phí Hoàng Mai theo Thông tư
-- 33/2015/TT-BTC" không ra gì. Bộ lọc cũ là OR của mọi từ: "thu", "phí", "theo",
-- "là" khớp gần như cả kho, nên phải chấm điểm hàng chục nghìn đoạn cho mỗi câu
-- hỏi — chậm tới mức hết giờ, và function chat coi lỗi đó là "không tìm thấy".
--
-- CÁCH MỚI:
--   0. Câu hỏi nêu số hiệu văn bản mà kho có → chỉ tìm trong văn bản đó.
--   1. Lọc bằng AND của những từ HIẾM NHẤT trong câu (tối đa 4), đo bằng số đoạn
--      chứa từ đó. Từ hiếm như "hoàng", "mai", "33/2015/tt-btc" chọn ra rất ít đoạn.
--   2. Không có đoạn nào chứa đủ 4 → nới dần xuống 3, 2, 1 từ.
--   3. Trong nhóm đã lọc, xếp theo độ khớp với MỌI từ của câu hỏi.
-- Từ thông dụng ("thu", "là", "theo") không bao giờ lọc, chỉ góp điểm — không cần
-- danh sách từ dừng viết tay.

CREATE TABLE IF NOT EXISTS public.tu_pho_bien (
  tu text PRIMARY KEY,
  so_doan integer NOT NULL
);

ALTER TABLE public.tu_pho_bien ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Đọc tần suất từ của kho luật" ON public.tu_pho_bien FOR SELECT TO authenticated USING (true);

-- Tính lại tần suất sau mỗi lần nạp kho. Chỉ service role gọi (bộ nạp).
CREATE OR REPLACE FUNCTION public.lam_moi_tu_pho_bien()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  TRUNCATE public.tu_pho_bien;
  INSERT INTO public.tu_pho_bien (tu, so_doan)
  SELECT word, ndoc FROM ts_stat('SELECT tim FROM public.doan_phap_luat');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.lam_moi_tu_pho_bien() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tim_phap_luat(cau_hoi text, so_ket_qua integer DEFAULT 8)
RETURNS TABLE (
  ma_cong_bao text,
  so_hieu text,
  loai text,
  ten text,
  ngay_ban_hanh date,
  ngay_hieu_luc date,
  url text,
  nhan text,
  noi_dung text,
  du_moi_tu boolean,
  diem real
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  gioi_han integer := least(greatest(coalesce(so_ket_qua, 8), 1), 20);
  cac_tu text[] := tsvector_to_array(to_tsvector('simple', coalesce(cau_hoi, '')));
  q_va tsquery;
  q_hoac tsquery;
  q_loc tsquery;
  hiem text[];
  so_hieu_hoi text[] := ARRAY(
    SELECT upper(t.khop[1])
    FROM regexp_matches(coalesce(cau_hoi, ''), '(\d{1,4}/\d{4}/[A-Za-zĐđ0-9\-]+)', 'g') AS t(khop)
  );
  n integer;
  dem integer;
BEGIN
  IF cac_tu IS NULL OR array_length(cac_tu, 1) IS NULL THEN
    RETURN;
  END IF;

  q_va := to_tsquery('simple', array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(cac_tu) AS x), ' & '));
  q_hoac := to_tsquery('simple', array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(cac_tu) AS x), ' | '));

  -- 0. Hỏi đích danh số hiệu văn bản có trong kho: tìm trong văn bản đó.
  IF array_length(so_hieu_hoi, 1) IS NOT NULL THEN
    RETURN QUERY
    SELECT d.ma_cong_bao, v.so_hieu, v.loai, v.ten, v.ngay_ban_hanh, v.ngay_hieu_luc, v.url,
           d.nhan, d.noi_dung, (d.tim @@ q_va), ts_rank_cd(d.tim, q_hoac)
    FROM public.van_ban_phap_luat v
    JOIN public.doan_phap_luat d ON d.ma_cong_bao = v.ma_cong_bao
    WHERE upper(coalesce(v.so_hieu, '')) = ANY (so_hieu_hoi)
    ORDER BY ts_rank_cd(d.tim, q_hoac) DESC, d.thu_tu
    LIMIT gioi_han;
    GET DIAGNOSTICS dem = ROW_COUNT;
    IF dem > 0 THEN
      RETURN;
    END IF;
  END IF;

  -- Từ hiếm nhất trước. Từ không có trong kho bị bỏ (lọc bằng nó thì chắc chắn rỗng).
  hiem := ARRAY(
    SELECT p.tu
    FROM unnest(cac_tu) AS t(tu)
    JOIN public.tu_pho_bien p ON p.tu = t.tu
    ORDER BY p.so_doan ASC
    LIMIT 4
  );
  IF array_length(hiem, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR n IN REVERSE array_length(hiem, 1)..1 LOOP
    q_loc := to_tsquery('simple', array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(hiem[1:n]) AS x), ' & '));

    RETURN QUERY
    SELECT d.ma_cong_bao, v.so_hieu, v.loai, v.ten, v.ngay_ban_hanh, v.ngay_hieu_luc, v.url,
           d.nhan, d.noi_dung, (d.tim @@ q_va), ts_rank_cd(d.tim, q_hoac)
    FROM public.doan_phap_luat d
    JOIN public.van_ban_phap_luat v ON v.ma_cong_bao = d.ma_cong_bao
    WHERE d.tim @@ q_loc
    ORDER BY (d.tim @@ q_va) DESC, ts_rank_cd(d.tim, q_hoac) DESC, v.ngay_ban_hanh DESC NULLS LAST
    LIMIT gioi_han;

    GET DIAGNOSTICS dem = ROW_COUNT;
    IF dem > 0 THEN
      RETURN;
    END IF;
  END LOOP;
END;
$$;

SELECT public.lam_moi_tu_pho_bien();

COMMENT ON TABLE public.tu_pho_bien IS
  'Mỗi từ trong kho luật xuất hiện ở bao nhiêu đoạn. tim_phap_luat lọc bằng từ hiếm nhất. Làm mới bằng lam_moi_tu_pho_bien() sau mỗi lần nạp.';
