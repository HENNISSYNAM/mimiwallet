-- MIMI-P1-006 — chi phí AI theo quy trình, không chỉ theo token.
--
-- Nhà cung cấp AI báo chi phí theo model và theo project/workspace (`chi_phi_ai.du_an`). Chủ doanh
-- nghiệp biết project nào phục vụ việc gì. Hai bảng dưới đây ghi đúng hai điều đó:
--
--   quy_trinh_ai        — một việc AI làm cho công ty ("Chatbot chăm sóc khách", "Đọc hoá đơn"),
--                         kèm các project/workspace thuộc về nó và đơn vị kết quả ("cuộc trò chuyện
--                         giải quyết xong", "hoá đơn đọc đúng").
--   ket_qua_quy_trinh   — mỗi tháng quy trình làm xong bao nhiêu việc, hỏng bao nhiêu. Người dùng
--                         nhập (nguồn 'nhap_tay'); sau này agent báo qua API.
--
-- Từ đó: chi phí mỗi việc thành công = chi phí các project của quy trình / số việc thành công.
--
-- Ghi chỉ qua edge function `chi-phi-ai` (service role, có kiểm vai trò). Thành viên công ty đọc.

CREATE TABLE IF NOT EXISTS public.quy_trinh_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ten text NOT NULL CHECK (char_length(btrim(ten)) BETWEEN 2 AND 120),
  don_vi_ket_qua text NOT NULL DEFAULT 'việc' CHECK (char_length(btrim(don_vi_ket_qua)) BETWEEN 1 AND 60),
  -- Tên project/workspace đúng như trong chi_phi_ai.du_an. Một project chỉ thuộc một quy trình
  -- (edge function kiểm), để một đồng chi phí không bị tính hai lần.
  khop_du_an text[] NOT NULL DEFAULT '{}' CHECK (cardinality(khop_du_an) <= 50),
  tao_boi uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, ten)
);

CREATE TABLE IF NOT EXISTS public.ket_qua_quy_trinh (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quy_trinh_id uuid NOT NULL REFERENCES public.quy_trinh_ai(id) ON DELETE CASCADE,
  ky text NOT NULL CHECK (ky ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  so_thanh_cong integer NOT NULL CHECK (so_thanh_cong BETWEEN 0 AND 100000000),
  so_that_bai integer NOT NULL DEFAULT 0 CHECK (so_that_bai BETWEEN 0 AND 100000000),
  nguon text NOT NULL DEFAULT 'nhap_tay' CHECK (nguon IN ('nhap_tay', 'api')),
  ghi_boi uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sua_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quy_trinh_id, ky)
);

CREATE INDEX IF NOT EXISTS quy_trinh_ai_cty_idx ON public.quy_trinh_ai (company_id);
CREATE INDEX IF NOT EXISTS ket_qua_quy_trinh_cty_ky_idx ON public.ket_qua_quy_trinh (company_id, ky);

ALTER TABLE public.quy_trinh_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ket_qua_quy_trinh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Thành viên đọc quy trình AI" ON public.quy_trinh_ai;
CREATE POLICY "Thành viên đọc quy trình AI" ON public.quy_trinh_ai
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Thành viên đọc kết quả quy trình" ON public.ket_qua_quy_trinh;
CREATE POLICY "Thành viên đọc kết quả quy trình" ON public.ket_qua_quy_trinh
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

REVOKE ALL ON public.quy_trinh_ai FROM anon, authenticated;
REVOKE ALL ON public.ket_qua_quy_trinh FROM anon, authenticated;
GRANT SELECT ON public.quy_trinh_ai TO authenticated;
GRANT SELECT ON public.ket_qua_quy_trinh TO authenticated;
