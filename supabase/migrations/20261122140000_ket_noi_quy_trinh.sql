-- Kết nối công cụ ngay tại bước workflow (22/11/2026): endpoint + API key (mã hoá ML-KEM-768 + AES-GCM) hoặc MCP server.
-- Chỉ edge function `agentic-space` (service role) đọc ghi; trình duyệt chỉ thấy 4 ký tự cuối của khoá.
CREATE TABLE IF NOT EXISTS public.ket_noi_quy_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cong_cu text NOT NULL CHECK (cong_cu ~ '^[a-z0-9_]{2,40}$'),
  kieu text NOT NULL CHECK (kieu IN ('api', 'mcp')),
  url text NOT NULL CHECK (url ~ '^https://' AND char_length(url) <= 500),
  khoa jsonb,
  khoa_hien text CHECK (khoa_hien IS NULL OR char_length(khoa_hien) <= 12),
  cong_cu_mcp text CHECK (cong_cu_mcp IS NULL OR char_length(cong_cu_mcp) <= 80),
  tao_boi uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, cong_cu)
);
ALTER TABLE public.ket_noi_quy_trinh ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ket_noi_quy_trinh FROM anon, authenticated;
