-- Chứng từ người dùng chụp và nhờ MIMI Assistant đọc (15/09/2026).
--
-- MIMI chỉ lưu CÁC TRƯỜNG người dùng đã xem lại và bấm xác nhận — không lưu ảnh. Ảnh
-- hoá đơn giấy thường có số điện thoại, địa chỉ, chữ ký; không thứ nào cần cho việc
-- đối chiếu một khoản chi.
--
-- Đây không phải hoá đơn điện tử của cơ quan thuế và MIMI không coi nó là vậy: bảng
-- `gdt_invoices` vẫn là nguồn duy nhất cho số liệu thuế. Dòng ở đây giúp trả lời "khoản
-- chi này có giấy tờ gì chưa", và màn hình phải gọi đúng tên nó là chứng từ quét.
--
-- Mọi ghi đi qua edge function `tro-ly`. Người dùng chỉ đọc qua RLS.

CREATE TABLE IF NOT EXISTS public.chung_tu_quet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai IN ('hoa_don', 'bien_lai', 'khac')),
  so_hoa_don text CHECK (so_hoa_don IS NULL OR char_length(so_hoa_don) BETWEEN 1 AND 60),
  ky_hieu text CHECK (ky_hieu IS NULL OR char_length(ky_hieu) BETWEEN 1 AND 30),
  ngay date,
  ben_ban text CHECK (ben_ban IS NULL OR char_length(ben_ban) BETWEEN 1 AND 200),
  ma_so_thue_ben_ban text CHECK (ma_so_thue_ben_ban IS NULL OR ma_so_thue_ben_ban ~ '^\d{10}(-\d{3})?$'),
  tien_truoc_thue bigint CHECK (tien_truoc_thue IS NULL OR tien_truoc_thue >= 0),
  tien_thue bigint CHECK (tien_thue IS NULL OR tien_thue >= 0),
  tong_tien bigint NOT NULL CHECK (tong_tien > 0),
  -- Khoản chi trong sao kê mà chứng từ này đi kèm. Không khoá ngoại: dòng sao kê có thể
  -- được nạp lại, như `yeu_cau_chi.giao_dich_id`.
  giao_dich_id uuid,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chung_tu_quet_company_ngay_idx ON public.chung_tu_quet (company_id, ngay);

ALTER TABLE public.chung_tu_quet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Xem chứng từ quét của công ty mình" ON public.chung_tu_quet FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.chung_tu_quet IS
  'Trường đọc từ ảnh chứng từ, người dùng đã xác nhận. Không lưu ảnh. Không phải hoá đơn điện tử của cơ quan thuế.';
