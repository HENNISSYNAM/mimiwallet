-- WORKFLOW CỦA AGENTIC AI SPACE (22/11/2026): gõ một câu ở chat chính → MIMI dựng workflow (người + agent), sửa bằng
-- chat ở cột phải, chốt rồi chạy; mỗi lần chạy lưu số đo hiệu suất thật để so ba phương án.
-- Chỉ edge function `agentic-space` (service role) đọc ghi; kiểm thành viên công ty ở máy chủ.

CREATE TABLE IF NOT EXISTS public.quy_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nguoi_tao uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tieu_de text NOT NULL CHECK (char_length(tieu_de) BETWEEN 1 AND 120),
  linh_vuc text NOT NULL CHECK (linh_vuc IN ('tai_chinh', 'thanh_toan', 'bao_mat', 'ho_so', 'nhan_su', 'cong_viec')),
  cau_goc text NOT NULL CHECK (char_length(cau_goc) BETWEEN 1 AND 1000),
  nguon text NOT NULL CHECK (nguon IN ('ai', 'mau')),
  do_thi jsonb NOT NULL CHECK (jsonb_typeof(do_thi) = 'object' AND pg_column_size(do_thi) < 32768),
  phuong_an text NOT NULL DEFAULT 'nguoi_ai' CHECK (phuong_an IN ('nguoi', 'nguoi_ai', 'ai')),
  -- Gán tài nguyên theo bước: { "<nut_id>": { "email": "…" } }.
  tai_nguyen jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(tai_nguyen) < 16384),
  trang_thai text NOT NULL DEFAULT 'nhap' CHECK (trang_thai IN ('nhap', 'dang_chay', 'xong', 'dung')),
  lan_chay jsonb CHECK (lan_chay IS NULL OR pg_column_size(lan_chay) < 65536),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quy_trinh_cty_idx ON public.quy_trinh (company_id, cap_nhat_luc DESC);

CREATE TABLE IF NOT EXISTS public.tin_quy_trinh (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quy_trinh_id uuid NOT NULL REFERENCES public.quy_trinh(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vai text NOT NULL CHECK (vai IN ('nguoi', 'mimi')),
  noi_dung text NOT NULL CHECK (char_length(noi_dung) BETWEEN 1 AND 1200),
  luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tin_quy_trinh_qt_idx ON public.tin_quy_trinh (quy_trinh_id, id);

CREATE TABLE IF NOT EXISTS public.lan_chay_quy_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quy_trinh_id uuid NOT NULL REFERENCES public.quy_trinh(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phuong_an text NOT NULL CHECK (phuong_an IN ('nguoi', 'nguoi_ai', 'ai')),
  trang_thai text NOT NULL CHECK (trang_thai IN ('xong', 'dung')),
  bat_dau timestamptz NOT NULL,
  ket_thuc timestamptz NOT NULL,
  hieu_suat jsonb NOT NULL CHECK (pg_column_size(hieu_suat) < 4096)
);
CREATE INDEX IF NOT EXISTS lan_chay_quy_trinh_idx ON public.lan_chay_quy_trinh (quy_trinh_id, ket_thuc DESC);

ALTER TABLE public.quy_trinh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tin_quy_trinh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lan_chay_quy_trinh ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quy_trinh FROM anon, authenticated;
REVOKE ALL ON public.tin_quy_trinh FROM anon, authenticated;
REVOKE ALL ON public.lan_chay_quy_trinh FROM anon, authenticated;
