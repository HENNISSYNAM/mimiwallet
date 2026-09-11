-- Xếp hạng kho luật: văn bản mới hơn nặng hơn, tiêu đề Điều khớp thì được cộng.
--
-- Đo ngày 11/09/2026 sau migration xếp hạng: hỏi "hộ kinh doanh doanh thu bao
-- nhiêu thì không phải nộp thuế" ra đúng chủ đề, nhưng Thông tư 40/2021/TT-BTC
-- và văn bản hợp nhất năm 2022 đứng trên Nghị định 68/2026/NĐ-CP — văn bản đang
-- áp dụng. Ngày ban hành chỉ là tiêu chí phá hoà, nên một văn bản cũ lặp từ khoá
-- nhiều hơn luôn thắng.
--
-- Với câu hỏi pháp lý, văn bản mới gần như luôn là câu trả lời đúng hơn: luật
-- mới sửa hoặc thay luật cũ. Nên điểm gộp thành một:
--
--   điểm = độ khớp × hệ số năm × (1 + 0,5 × độ khớp tiêu đề Điều)
--   hệ số năm = 1 + 0,08 × số năm kể từ 2014 (tối đa 12) → 2015: 1,08 · 2026: 1,96
--
-- Không loại văn bản cũ: nó vẫn hiện nếu khớp hơn hẳn, và lời dặn mô hình vẫn gắn
-- cảnh báo "có thể đã bị sửa/thay thế" cho văn bản trước 2024.

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
  tu_dung text[] := ARRAY[
    'bao', 'nhiêu', 'gì', 'nào', 'sao', 'thế', 'vậy', 'đâu', 'không', 'có', 'phải', 'thì', 'là', 'mà',
    'của', 'và', 'hoặc', 'hay', 'với', 'về', 'cho', 'được', 'bị', 'để', 'theo', 'trong', 'khi', 'nếu',
    'này', 'đó', 'kia', 'các', 'những', 'một', 'đã', 'sẽ', 'đang', 'rồi', 'còn', 'nữa', 'như',
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

  -- 0. Hỏi đích danh số hiệu: trong văn bản đó, tiêu đề Điều khớp câu hỏi trước.
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
    SELECT c.ma_cong_bao, c.so_hieu, c.loai, c.ten, c.ngay_ban_hanh, c.ngay_hieu_luc, c.url,
           c.nhan, c.noi_dung, c.du_moi_tu, c.diem_gop
    FROM (
      SELECT d.ma_cong_bao, v.so_hieu, v.loai, v.ten, v.ngay_ban_hanh, v.ngay_hieu_luc, v.url,
             d.nhan, d.noi_dung, (d.tim @@ q_va) AS du_moi_tu,
             (
               ts_rank_cd(d.tim, q_hoac)
               * (1 + 0.08 * least(12, greatest(0, coalesce(extract(year FROM v.ngay_ban_hanh)::int, 2014) - 2014)))
               * (1 + 0.5 * ts_rank(to_tsvector('simple', split_part(d.noi_dung, E'\n', 1)), q_hoac))
             )::real AS diem_gop
      FROM public.doan_phap_luat d
      JOIN public.van_ban_phap_luat v ON v.ma_cong_bao = d.ma_cong_bao
      WHERE d.tim @@ q_loc
    ) c
    ORDER BY c.diem_gop DESC, c.ngay_ban_hanh DESC NULLS LAST
    LIMIT gioi_han;

    GET DIAGNOSTICS dem = ROW_COUNT;
    IF dem > 0 THEN
      RETURN;
    END IF;
  END LOOP;
END;
$$;
