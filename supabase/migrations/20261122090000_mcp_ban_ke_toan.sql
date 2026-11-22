-- MCP cho bàn kế toán (22/11/2026).
--
-- Kế toán nối Claude / Cursor / ChatGPT vào MIMI bằng một KHOÁ MCP của riêng họ. Agent bên ngoài được:
--   * ĐỌC danh mục khách và hàng duyệt — đúng những gì kế toán thấy ở /dashboard/van-phong;
--   * ĐỀ XUẤT phân loại một khoản tiền vào. Đề xuất chỉ hiện trong hàng duyệt; sổ chỉ đổi khi KẾ TOÁN bấm duyệt
--     (đường ghi cũ: edge function `to-khai`, hành động `xac_nhan_tien_vao`).
--
-- Cả hai bảng chỉ edge function (service role) đọc ghi; không mở chính sách RLS nào cho trình duyệt.

CREATE TABLE IF NOT EXISTS public.khoa_mcp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ten text NOT NULL CHECK (char_length(ten) BETWEEN 1 AND 60),
  -- Chỉ lưu SHA-256 của khoá; khoá hiện cho người tạo đúng một lần.
  khoa_bam text NOT NULL UNIQUE CHECK (khoa_bam ~ '^[0-9a-f]{64}$'),
  hien text NOT NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  dung_lan_cuoi timestamptz,
  thu_hoi_luc timestamptz
);
CREATE INDEX IF NOT EXISTS khoa_mcp_user_idx ON public.khoa_mcp (user_id, tao_luc DESC);
ALTER TABLE public.khoa_mcp ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.khoa_mcp FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.de_xuat_agent_ngoai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai IN (
    'business_revenue', 'internal_transfer', 'loan', 'capital_contribution', 'family_transfer',
    'personal', 'refund', 'deposit', 'collection_on_behalf', 'other', 'unknown'
  )),
  ly_do text NOT NULL CHECK (char_length(ly_do) BETWEEN 5 AND 300),
  -- Agent ngoài (MCP) có khoá; agent của MIMI trong Agentic AI Space thì không (nguon = 'agent_mimi').
  khoa_mcp_id uuid REFERENCES public.khoa_mcp(id) ON DELETE CASCADE,
  nguon text NOT NULL DEFAULT 'mcp' CHECK (nguon IN ('mcp', 'agent_mimi')),
  ten_agent text CHECK (ten_agent IS NULL OR char_length(ten_agent) <= 60),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  CHECK ((nguon = 'mcp') = (khoa_mcp_id IS NOT NULL)),
  -- Một agent một ý kiến cho mỗi khoản: gửi lại thì thay ý kiến cũ.
  UNIQUE (company_id, transaction_id, khoa_mcp_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS de_xuat_agent_mimi_uq ON public.de_xuat_agent_ngoai (company_id, transaction_id, ten_agent)
  WHERE nguon = 'agent_mimi';
CREATE INDEX IF NOT EXISTS de_xuat_agent_ngoai_cty_idx ON public.de_xuat_agent_ngoai (company_id, tao_luc DESC);
ALTER TABLE public.de_xuat_agent_ngoai ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.de_xuat_agent_ngoai FROM anon, authenticated;
