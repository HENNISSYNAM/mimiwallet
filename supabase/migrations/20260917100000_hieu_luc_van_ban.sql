-- MIMI-P0-003 — quan hệ hiệu lực giữa các văn bản trong kho Công báo.
--
-- Kho có ngày ban hành và ngày có hiệu lực, không có ngày hết hiệu lực. Bảng này ghi các câu
-- "văn bản X hết hiệu lực kể từ …" mà chính văn bản mới nói nguyên văn, tách bằng
-- `_shared/luat/hieu-luc.ts` (script `scripts/tach-hieu-luc.ts`, dữ liệu ở migration kế tiếp).
--
-- Mỗi dòng giữ câu trích để người đọc kiểm lại. `do_tin_cay = 'can_xem_lai'` chỉ dùng để cảnh báo,
-- không được dùng để tự loại văn bản khỏi câu trả lời.
--
-- Chỉ đọc cho người dùng đăng nhập (giống kho văn bản); chỉ service role ghi.

CREATE TABLE IF NOT EXISTS public.quan_he_hieu_luc (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  so_hieu_nguon text NOT NULL,
  so_hieu_dich text NOT NULL,
  loai text NOT NULL CHECK (loai IN ('bai_bo', 'bai_bo_mot_phan')),
  hieu_luc_tu date NOT NULL,
  do_tin_cay text NOT NULL CHECK (do_tin_cay IN ('chac_chan', 'can_xem_lai')),
  co_ngoai_le boolean NOT NULL DEFAULT false,
  ma_cong_bao_nguon text,
  trich text NOT NULL CHECK (char_length(trich) BETWEEN 10 AND 1300),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (so_hieu_nguon, so_hieu_dich, loai)
);

CREATE INDEX IF NOT EXISTS quan_he_hieu_luc_dich_idx ON public.quan_he_hieu_luc (upper(so_hieu_dich));

ALTER TABLE public.quan_he_hieu_luc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Đọc quan hệ hiệu lực văn bản" ON public.quan_he_hieu_luc;
CREATE POLICY "Đọc quan hệ hiệu lực văn bản" ON public.quan_he_hieu_luc
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.quan_he_hieu_luc FROM anon, authenticated;
GRANT SELECT ON public.quan_he_hieu_luc TO authenticated;

COMMENT ON TABLE public.quan_he_hieu_luc IS
  'MIMI-P0-003: văn bản nào bãi bỏ văn bản nào, từ ngày nào, kèm câu trích nguyên văn. Không có dòng nào nghĩa là kho chưa ghi nhận — không phải "còn hiệu lực".';
