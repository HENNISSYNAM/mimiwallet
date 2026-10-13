-- NHIỆM VỤ AGENT CLOUD (13/10/2026). Hợp đồng: docs/CLOUD_AGENT_RUNTIME.md.
--
-- `nhiem_vu_agent`: một việc người dùng giao cho agent (thue / tai_chinh / tai_lieu / trinh_duyet) chạy trên trình duyệt
-- cloud. Kế hoạch (`ke_hoach`) đã được Orchestrator kiểm (mẫu tất định hoặc mô hình lập rồi kiểm chặt); `mien_cho_phep`
-- chỉ đến từ sổ đăng ký agent và URL người dùng tự gõ — mô hình không thêm được.
-- `nhat_ky_nhiem_vu_agent`: từng bước runtime đã chạy, ai duyệt gì, lúc nào. KHÔNG lưu giá trị ô điền, không lưu ảnh chụp,
-- không lưu cookie/mật khẩu/OTP. Giữ 90 ngày.
--
-- Chỉ máy chủ ghi (service role, edge function `agent-dieu-phoi`). Thành viên công ty chỉ ĐỌC việc của công ty mình.

CREATE TABLE IF NOT EXISTS public.nhiem_vu_agent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent text NOT NULL CHECK (agent IN ('thue', 'tai_chinh', 'tai_lieu', 'trinh_duyet')),
  muc_tieu text NOT NULL CHECK (char_length(muc_tieu) BETWEEN 1 AND 1000),
  ke_hoach jsonb NOT NULL CHECK (jsonb_typeof(ke_hoach) = 'array' AND jsonb_array_length(ke_hoach) BETWEEN 1 AND 30
                                 AND pg_column_size(ke_hoach) < 65536),
  mien_cho_phep text[] NOT NULL DEFAULT '{}' CHECK (cardinality(mien_cho_phep) <= 20),
  trang_thai text NOT NULL DEFAULT 'cho' CHECK (trang_thai IN (
    'cho', 'dang_chay', 'cho_duyet', 'ban_giao', 'xong', 'loi', 'huy', 'het_han')),
  buoc_tiep integer NOT NULL DEFAULT 0 CHECK (buoc_tiep BETWEEN 0 AND 30),
  url_hien_tai text CHECK (url_hien_tai IS NULL OR char_length(url_hien_tai) <= 2000),
  -- Chỉ số các bước tác động bên ngoài người dùng đã duyệt.
  da_duyet integer[] NOT NULL DEFAULT '{}',
  -- Tóm tắt, nguồn (URL + tiêu đề), các bước 'ngoai' đã thử (không bao giờ chạy lại).
  ket_qua jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(ket_qua) < 65536),
  loi text CHECK (loi IS NULL OR char_length(loi) <= 500),
  khoa_chong_trung text NOT NULL CHECK (char_length(khoa_chong_trung) BETWEEN 10 AND 200),
  het_han timestamptz NOT NULL,
  so_luot integer NOT NULL DEFAULT 0 CHECK (so_luot >= 0),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, khoa_chong_trung)
);
CREATE INDEX IF NOT EXISTS nhiem_vu_agent_cty_idx ON public.nhiem_vu_agent (company_id, tao_luc DESC);
CREATE INDEX IF NOT EXISTS nhiem_vu_agent_het_han_idx ON public.nhiem_vu_agent (het_han)
  WHERE trang_thai IN ('cho', 'dang_chay', 'cho_duyet', 'ban_giao');

CREATE TABLE IF NOT EXISTS public.nhat_ky_nhiem_vu_agent (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nhiem_vu_id uuid NOT NULL REFERENCES public.nhiem_vu_agent(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tac_nhan text NOT NULL CHECK (tac_nhan IN ('nguoi_dung', 'runtime', 'may_chu')),
  hanh_dong text NOT NULL CHECK (hanh_dong ~ '^[a-z_]{2,40}$'),
  luot integer,
  buoc integer CHECK (buoc IS NULL OR buoc BETWEEN 0 AND 29),
  cong_cu text CHECK (cong_cu IS NULL OR cong_cu ~ '^[a-z_]{2,30}$'),
  tac_dong text CHECK (tac_dong IS NULL OR tac_dong IN ('doc', 'ngoai')),
  ok boolean,
  ms integer,
  tom_tat text CHECK (tom_tat IS NULL OR char_length(tom_tat) <= 600),
  loi text CHECK (loi IS NULL OR char_length(loi) <= 300),
  luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nhat_ky_nhiem_vu_agent_nv_idx ON public.nhat_ky_nhiem_vu_agent (nhiem_vu_id, luc);
CREATE INDEX IF NOT EXISTS nhat_ky_nhiem_vu_agent_luc_idx ON public.nhat_ky_nhiem_vu_agent (luc);

ALTER TABLE public.nhiem_vu_agent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhat_ky_nhiem_vu_agent ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.nhiem_vu_agent FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.nhat_ky_nhiem_vu_agent FROM anon, authenticated;

DROP POLICY IF EXISTS "Thành viên đọc nhiệm vụ agent" ON public.nhiem_vu_agent;
CREATE POLICY "Thành viên đọc nhiệm vụ agent" ON public.nhiem_vu_agent
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));
DROP POLICY IF EXISTS "Thành viên đọc nhật ký nhiệm vụ agent" ON public.nhat_ky_nhiem_vu_agent;
CREATE POLICY "Thành viên đọc nhật ký nhiệm vụ agent" ON public.nhat_ky_nhiem_vu_agent
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

-- Dọn theo hạn (lịch đêm, như mimi-don-dien-cong): việc dở quá hạn → het_han; nhật ký 90 ngày; nhiệm vụ 180 ngày.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mimi-don-nhiem-vu-agent';
END $$;
SELECT cron.schedule('mimi-don-nhiem-vu-agent', '40 18 * * *', $$
  UPDATE public.nhiem_vu_agent SET trang_thai = 'het_han', cap_nhat_luc = now()
   WHERE trang_thai IN ('cho', 'dang_chay', 'cho_duyet', 'ban_giao') AND het_han < now();
  DELETE FROM public.nhat_ky_nhiem_vu_agent WHERE luc < now() - interval '90 days';
  DELETE FROM public.nhiem_vu_agent WHERE tao_luc < now() - interval '180 days';
$$);
