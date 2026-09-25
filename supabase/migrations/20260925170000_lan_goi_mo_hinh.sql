-- Đo từng lần gọi mô hình — Prompt 4 mục 36–37 (25/09/2026).
-- Để chọn mô hình theo số đo (độ trễ, token, tỷ lệ lỗi theo từng loại việc), không theo cảm tính.
-- KHÔNG lưu nội dung câu hỏi hay câu trả lời ở đây: chỉ số đo. Chỉ máy chủ ghi, chỉ máy chủ đọc.
CREATE TABLE IF NOT EXISTS public.lan_goi_mo_hinh (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  nha_cung_cap text NOT NULL CHECK (char_length(nha_cung_cap) BETWEEN 1 AND 40),
  mo_hinh text NOT NULL CHECK (char_length(mo_hinh) BETWEEN 1 AND 120),
  muc_dich text NOT NULL CHECK (muc_dich IN ('y_dinh', 'trich_xuat', 'phan_loai', 'dien_dat', 'phan_tich', 'tong_hop_phap_ly', 'doc_anh')),
  do_tre_ms integer NOT NULL CHECK (do_tre_ms >= 0),
  token_vao integer CHECK (token_vao IS NULL OR token_vao >= 0),
  token_ra integer CHECK (token_ra IS NULL OR token_ra >= 0),
  thanh_cong boolean NOT NULL,
  ma_loi integer,
  luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lan_goi_mo_hinh_luc_idx ON public.lan_goi_mo_hinh (muc_dich, mo_hinh, luc DESC);
ALTER TABLE public.lan_goi_mo_hinh ENABLE ROW LEVEL SECURITY;
-- Không có policy nào cho authenticated: trình duyệt không đọc, không ghi.
COMMENT ON TABLE public.lan_goi_mo_hinh IS 'Số đo mỗi lần gọi mô hình (không có nội dung). Dùng để chọn mô hình theo eval và chi phí.';
