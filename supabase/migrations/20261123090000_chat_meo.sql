-- TRÒ CHUYỆN KIỂU ZALO GIỮA NGƯỜI VÀ MÈO AGENT (23/11/2026).
--  * chat_meo: chat riêng (DM) giữa MỘT người và MỘT mèo trong MỘT công ty.
--  * tin_quy_trinh.meo: trong nhóm workflow, tin do mèo nào nói (vai = 'mimi' + meo).
-- Chỉ edge function `agentic-space` (service role) đọc ghi; kiểm thành viên công ty ở máy chủ.

CREATE TABLE IF NOT EXISTS public.chat_meo (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meo text NOT NULL CHECK (meo IN ('phan_loai', 'thue', 'dong_tien', 'ho_so', 'bao_ve', 'doi_soat', 'cong_no', 'mua_hang', 'luong', 'tuan_thu', 'bao_cao', 'thu_ky')),
  vai text NOT NULL CHECK (vai IN ('nguoi', 'meo')),
  noi_dung text NOT NULL CHECK (char_length(noi_dung) BETWEEN 1 AND 1200),
  luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_meo_idx ON public.chat_meo (company_id, user_id, meo, id DESC);
ALTER TABLE public.chat_meo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_meo FROM anon, authenticated;

ALTER TABLE public.tin_quy_trinh
  ADD COLUMN IF NOT EXISTS meo text CHECK (meo IS NULL OR meo IN ('phan_loai', 'thue', 'dong_tien', 'ho_so', 'bao_ve', 'doi_soat', 'cong_no', 'mua_hang', 'luong', 'tuan_thu', 'bao_cao', 'thu_ky'));
