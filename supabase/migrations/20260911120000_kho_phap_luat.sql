-- Kho văn bản pháp luật thuế – tài chính, để agent của MIMI tra cứu và trích dẫn.
--
-- KHÔNG PHẢI HUẤN LUYỆN LẠI MÔ HÌNH. MIMI gọi mô hình qua một cổng, không tinh
-- chỉnh được trọng số. Cách đúng cho luật là TRA CỨU CÓ TRÍCH DẪN: trước khi trả
-- lời, agent tìm đúng Điều trong kho này, đưa nguyên văn cho mô hình, và câu trả
-- lời phải chỉ ra số hiệu + Điều + đường dẫn Công báo. Luật đổi thì nạp văn bản
-- mới là xong — không phải huấn luyện lại, và không có "trí nhớ cũ" nói ngưỡng
-- 500 triệu khi Nghị định 141 đã nâng lên 01 tỷ.
--
-- NGUỒN: congbao.chinhphu.vn — văn bản quy phạm pháp luật không phải đối tượng
-- bảo hộ quyền tác giả (Luật Sở hữu trí tuệ, Điều 15). Bộ cào ở
-- scripts/kho-van-ban/.
--
-- CHƯA CÓ TÌNH TRẠNG HIỆU LỰC. Công báo cho ngày hiệu lực, không cho biết văn
-- bản đã bị thay thế hay chưa. Agent phải nói điều đó khi trích văn bản cũ,
-- thay vì coi mọi văn bản trong kho là đang áp dụng.

CREATE TABLE IF NOT EXISTS public.van_ban_phap_luat (
  ma_cong_bao text PRIMARY KEY,
  so_hieu text,
  loai text,
  co_quan text,
  ngay_ban_hanh date,
  ngay_hieu_luc date,
  ten text NOT NULL,
  trich_yeu text,
  nguoi_ky text,
  url text NOT NULL CHECK (url LIKE 'https://congbao.chinhphu.vn/%'),
  nguon_toan_van text,
  so_doan integer NOT NULL DEFAULT 0,
  nap_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS van_ban_phap_luat_so_hieu_idx ON public.van_ban_phap_luat (so_hieu);
CREATE INDEX IF NOT EXISTS van_ban_phap_luat_ngay_idx ON public.van_ban_phap_luat (ngay_ban_hanh DESC);

CREATE TABLE IF NOT EXISTS public.doan_phap_luat (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ma_cong_bao text NOT NULL REFERENCES public.van_ban_phap_luat(ma_cong_bao) ON DELETE CASCADE,
  thu_tu integer NOT NULL,
  -- "Điều 5", "Điều 5 (tiếp)", "Căn cứ ban hành", hoặc NULL khi văn bản không chia Điều.
  nhan text,
  noi_dung text NOT NULL,
  -- Cấu hình 'simple': giữ nguyên dấu tiếng Việt. "thuế" và "thuê" là hai từ
  -- khác nhau, và bộ gốc từ tiếng Anh sẽ gộp sai chúng.
  tim tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(nhan, '') || ' ' || noi_dung)) STORED,
  UNIQUE (ma_cong_bao, thu_tu)
);

CREATE INDEX IF NOT EXISTS doan_phap_luat_tim_idx ON public.doan_phap_luat USING gin (tim);

ALTER TABLE public.van_ban_phap_luat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doan_phap_luat ENABLE ROW LEVEL SECURITY;

-- Văn bản luật là thông tin công khai: ai đăng nhập cũng đọc được. Chỉ service
-- role (bộ nạp) được ghi.
CREATE POLICY "Đọc kho văn bản pháp luật" ON public.van_ban_phap_luat FOR SELECT TO authenticated USING (true);
CREATE POLICY "Đọc đoạn văn bản pháp luật" ON public.doan_phap_luat FOR SELECT TO authenticated USING (true);

-- Tìm đoạn luật cho một câu hỏi tự nhiên.
--
-- Câu hỏi thật dài và lẫn từ thường ("hộ kinh doanh doanh thu 1 tỷ thì phải
-- nộp thuế gì"). Ghép mọi từ bằng AND gần như không bao giờ ra kết quả, còn OR
-- thì trả về cả kho. Nên: lọc bằng OR, xếp đoạn chứa ĐỦ mọi từ lên trước, rồi
-- theo độ khớp, rồi văn bản mới hơn trước — luật mới thường thay luật cũ.
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
  ORDER BY (d.tim @@ q_va) DESC, ts_rank_cd(d.tim, q_hoac) DESC, v.ngay_ban_hanh DESC NULLS LAST
  LIMIT least(greatest(coalesce(so_ket_qua, 8), 1), 20);
END;
$$;

COMMENT ON TABLE public.van_ban_phap_luat IS
  'Văn bản pháp luật thuế – tài chính từ Công báo. Chưa có tình trạng hiệu lực: không coi mọi văn bản là đang áp dụng.';
COMMENT ON FUNCTION public.tim_phap_luat IS
  'Tìm đoạn luật theo câu hỏi tự nhiên. Đoạn chứa đủ mọi từ xếp trước, rồi độ khớp, rồi văn bản mới hơn.';
