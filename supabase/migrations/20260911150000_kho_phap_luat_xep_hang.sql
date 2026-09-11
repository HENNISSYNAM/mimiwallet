-- Xếp hạng kho luật: bỏ từ để hỏi khỏi bộ lọc, ưu tiên tiêu đề Điều.
--
-- Đo sau migration từ hiếm (11/09/2026), mỗi câu 0,2–0,5 giây thay vì hết giờ.
-- Còn hai lỗi xếp hạng, thấy trên câu hỏi thật:
--
--   1. "Mức thu phí … theo Thông tư 33/2015/TT-BTC là bao nhiêu?" — đúng văn
--      bản, nhưng "Điều 2. Biểu mức thu" đứng thứ 5, sau "Điều 5. Tổ chức thực
--      hiện". Mọi đoạn của văn bản có cùng tên văn bản (trọng số A), nên điểm
--      chỉ còn phụ thuộc số lần một từ lặp lại trong thân đoạn.
--      → Xếp trước đoạn có TIÊU ĐỀ ĐIỀU (dòng đầu) khớp câu hỏi.
--
--   2. "Hộ kinh doanh doanh thu bao nhiêu thì không phải nộp thuế" ra một thông
--      tư về phân tích giá. "bao", "nhiêu", "thì" là từ để hỏi — hiếm trong văn
--      bản luật nên bị chọn làm từ lọc, dù chẳng nói gì về nội dung.
--      → Không lọc bằng từ để hỏi, đại từ, từ nối; chỉ lọc bằng từ có ở ít nhất
--        2 đoạn. Những từ đó vẫn góp điểm, chỉ không được quyết định đoạn nào lọt.

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
  -- Từ không mang nội dung: để hỏi, đại từ, từ nối, trợ từ.
  tu_dung text[] := ARRAY[
    'bao', 'nhiêu', 'gì', 'nào', 'sao', 'thế', 'vậy', 'đâu', 'không', 'có', 'phải', 'thì', 'là', 'mà',
    'của', 'và', 'hoặc', 'hay', 'với', 'về', 'cho', 'được', 'bị', 'để', 'theo', 'trong', 'khi', 'nếu',
    'này', 'đó', 'kia', 'các', 'những', 'một', 'đã', 'sẽ', 'đang', 'rồi', 'còn', 'nữa', 'như', 'thì',
    'tôi', 'mình', 'bạn', 'em', 'anh', 'chị', 'ạ', 'nhé', 'nha', 'ơi', 'giúp', 'hỏi', 'muốn', 'cần',
    'nên', 'làm', 'ra', 'vào', 'lên', 'xuống', 'ở', 'tại', 'từ', 'đến', 'tới', 'thể'
  ];
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

  -- 0. Hỏi đích danh số hiệu văn bản có trong kho: tìm trong văn bản đó,
  --    đoạn có tiêu đề Điều khớp câu hỏi trước.
  IF array_length(so_hieu_hoi, 1) IS NOT NULL THEN
    RETURN QUERY
    SELECT d.ma_cong_bao, v.so_hieu, v.loai, v.ten, v.ngay_ban_hanh, v.ngay_hieu_luc, v.url,
           d.nhan, d.noi_dung, (d.tim @@ q_va), ts_rank_cd(d.tim, q_hoac)
    FROM public.van_ban_phap_luat v
    JOIN public.doan_phap_luat d ON d.ma_cong_bao = v.ma_cong_bao
    WHERE upper(coalesce(v.so_hieu, '')) = ANY (so_hieu_hoi)
    ORDER BY ts_rank(to_tsvector('simple', split_part(d.noi_dung, E'\n', 1)), q_hoac) DESC,
             ts_rank_cd(d.tim, q_hoac) DESC,
             d.thu_tu
    LIMIT gioi_han;
    GET DIAGNOSTICS dem = ROW_COUNT;
    IF dem > 0 THEN
      RETURN;
    END IF;
  END IF;

  -- Từ hiếm nhất có nội dung, có ở ít nhất 2 đoạn.
  hiem := ARRAY(
    SELECT p.tu
    FROM unnest(cac_tu) AS t(tu)
    JOIN public.tu_pho_bien p ON p.tu = t.tu
    WHERE p.so_doan >= 2 AND NOT (t.tu = ANY (tu_dung))
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
    ORDER BY ts_rank_cd(d.tim, q_hoac) DESC,
             ts_rank(to_tsvector('simple', split_part(d.noi_dung, E'\n', 1)), q_hoac) DESC,
             v.ngay_ban_hanh DESC NULLS LAST
    LIMIT gioi_han;

    GET DIAGNOSTICS dem = ROW_COUNT;
    IF dem > 0 THEN
      RETURN;
    END IF;
  END LOOP;
END;
$$;
