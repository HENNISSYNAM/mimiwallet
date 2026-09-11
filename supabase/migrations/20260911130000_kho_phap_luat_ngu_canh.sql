-- Đưa số hiệu và tên văn bản vào chỉ mục của từng đoạn, và ưu tiên đúng văn bản được hỏi.
--
-- VÌ SAO. Thử thật ngày 11/09/2026: hỏi "mức thu phí sử dụng đường bộ trạm thu
-- phí Hoàng Mai theo Thông tư 33/2015/TT-BTC", kho xếp Điều 5 của ba thông tư phí
-- KHÁC lên trước, và của đúng thông tư đó lại trả Điều 5 "Tổ chức thực hiện" chứ
-- không phải Điều 2 "Mức thu". Lý do: đoạn "Điều 2. Mức thu" không chứa chữ
-- "Hoàng Mai" hay "33/2015/TT-BTC" — những chữ đó chỉ nằm trong tên văn bản, mà
-- tên văn bản không có trong chỉ mục của đoạn.
--
-- SỬA:
--   1. Cột `ngu_canh` (số hiệu + tên văn bản) trên mỗi đoạn, đánh trọng số A
--      cùng với nhãn Điều; nội dung đoạn trọng số B.
--   2. Câu hỏi nêu đích danh số hiệu ("33/2015/TT-BTC") thì đoạn của văn bản đó
--      xếp trước mọi thứ khác.

ALTER TABLE public.doan_phap_luat ADD COLUMN IF NOT EXISTS ngu_canh text;

DROP INDEX IF EXISTS public.doan_phap_luat_tim_idx;
ALTER TABLE public.doan_phap_luat DROP COLUMN IF EXISTS tim;
ALTER TABLE public.doan_phap_luat ADD COLUMN tim tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(ngu_canh, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(nhan, '')), 'A') ||
  setweight(to_tsvector('simple', noi_dung), 'B')
) STORED;
CREATE INDEX doan_phap_luat_tim_idx ON public.doan_phap_luat USING gin (tim);

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
  q_va tsquery := plainto_tsquery('simple', cau_hoi);
  q_hoac tsquery;
  so_hieu_hoi text[] := ARRAY(
    SELECT upper(t.khop[1])
    FROM regexp_matches(cau_hoi, '(\d{1,4}/\d{4}/[A-Za-zĐđ0-9\-]+)', 'g') AS t(khop)
  );
BEGIN
  IF q_va IS NULL OR q_va::text = '' THEN
    RETURN;
  END IF;
  q_hoac := replace(q_va::text, '&', '|')::tsquery;

  RETURN QUERY
  SELECT d.ma_cong_bao, v.so_hieu, v.loai, v.ten, v.ngay_ban_hanh, v.ngay_hieu_luc, v.url,
         d.nhan, d.noi_dung, (d.tim @@ q_va) AS du_moi_tu, ts_rank_cd(d.tim, q_hoac) AS diem
  FROM public.doan_phap_luat d
  JOIN public.van_ban_phap_luat v ON v.ma_cong_bao = d.ma_cong_bao
  WHERE d.tim @@ q_hoac
  ORDER BY (upper(coalesce(v.so_hieu, '')) = ANY (so_hieu_hoi)) DESC,
           (d.tim @@ q_va) DESC,
           ts_rank_cd(d.tim, q_hoac) DESC,
           v.ngay_ban_hanh DESC NULLS LAST
  LIMIT least(greatest(coalesce(so_ket_qua, 8), 1), 20);
END;
$$;

COMMENT ON COLUMN public.doan_phap_luat.ngu_canh IS
  'Số hiệu + tên văn bản chứa đoạn này, để tìm được đoạn theo tên văn bản (trọng số A).';
