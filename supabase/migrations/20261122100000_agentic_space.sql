-- AGENTIC AI SPACE (22/11/2026): bảng việc kiểu ClickUp — người giao việc là con người, người nhận việc là agent.
--
-- viec_space     : một việc giao cho một agent ở một khách (công ty), kèm kế hoạch, trạng thái, việc cha (agent giao
--                  việc con cho agent khác).
-- tin_viec_space : luồng tin của việc — agent ↔ agent ↔ người. Chỉ ghi thêm.
--
-- Chỉ edge function `agentic-space` (service role) ghi; người dùng đọc qua function đó (kiểm thành viên văn phòng).

CREATE TABLE IF NOT EXISTS public.viec_space (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nguoi_giao uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent text NOT NULL CHECK (agent IN ('phan_loai', 'thue')),
  tieu_de text NOT NULL CHECK (char_length(tieu_de) BETWEEN 1 AND 200),
  han date,
  trang_thai text NOT NULL DEFAULT 'cho' CHECK (trang_thai IN ('cho', 'dang_lam', 'cho_agent', 'can_ban', 'xong', 'huy')),
  ke_hoach jsonb NOT NULL CHECK (jsonb_typeof(ke_hoach) = 'array' AND jsonb_array_length(ke_hoach) BETWEEN 1 AND 12),
  viec_cha_id uuid REFERENCES public.viec_space(id) ON DELETE SET NULL,
  ket_qua jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(ket_qua) < 16384),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS viec_space_cty_idx ON public.viec_space (company_id, cap_nhat_luc DESC);
CREATE INDEX IF NOT EXISTS viec_space_cha_idx ON public.viec_space (viec_cha_id) WHERE viec_cha_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tin_viec_space (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viec_id uuid NOT NULL REFERENCES public.viec_space(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tu text NOT NULL CHECK (tu IN ('phan_loai', 'thue', 'nguoi')),
  den text CHECK (den IS NULL OR den IN ('phan_loai', 'thue', 'nguoi')),
  loai text NOT NULL CHECK (loai IN ('giao_viec', 'ke_hoach', 'tien_do', 'ban_giao', 'hoi', 'xong')),
  noi_dung text NOT NULL CHECK (char_length(noi_dung) BETWEEN 1 AND 600),
  lien_ket text CHECK (lien_ket IS NULL OR lien_ket ~ '^/dashboard/[a-z0-9/-]{1,80}$'),
  luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tin_viec_space_viec_idx ON public.tin_viec_space (viec_id, id);

ALTER TABLE public.viec_space ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tin_viec_space ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.viec_space FROM anon, authenticated;
REVOKE ALL ON public.tin_viec_space FROM anon, authenticated;
