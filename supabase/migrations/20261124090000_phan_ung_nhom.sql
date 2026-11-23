-- PHẢN ỨNG TRONG NHÓM CHAT WORKFLOW (24/11/2026): mỗi tin có thể kèm cảm xúc do mèo thả (ví dụ 👍 của mèo kế tiếp).
-- Dạng [{"meo":"thue","emoji":"👍"}]; chỉ edge function `agentic-space` (service role) ghi.
ALTER TABLE public.tin_quy_trinh
  ADD COLUMN IF NOT EXISTS phan_ung jsonb NOT NULL DEFAULT '[]'::jsonb;
