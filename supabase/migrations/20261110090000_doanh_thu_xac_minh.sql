-- DOANH THU ĐÃ XÁC MINH (10/11/2026): báo cáo doanh thu chủ hộ lập từ sổ sách MIMI, băm SHA-256, neo mã băm lên
-- OpenTimestamps, và chia sẻ CÓ ĐỒNG Ý cho một người nhận qua đường dẫn có hạn (≤ 30 ngày), thu hồi được.
--
-- Ghi: CHỈ edge function `doanh-thu-xac-minh` (service role) ghi. Không có policy INSERT/UPDATE/DELETE nào cho trình
-- duyệt. Quyền tạo/thu hồi (chủ sở hữu, quản trị) và từ chối thành viên bị giới hạn một cơ sở kiểm ở edge function
-- (`_shared/xac-minh/chia-se.ts`, `_shared/da-co-so/pham-vi.ts`).
-- Đọc: thành viên công ty không bị giới hạn cơ sở đọc báo cáo; chỉ chủ sở hữu / quản trị đọc danh sách chia sẻ và
-- nhật ký mở. Mã chia sẻ chỉ lưu dạng băm.

CREATE TABLE IF NOT EXISTS public.bao_cao_xac_minh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ky_loai text NOT NULL CHECK (ky_loai IN ('nam', '12_thang')),
  tu_ngay date NOT NULL,
  den_ngay date NOT NULL,
  report_json jsonb NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  -- Dấu thời gian OpenTimestamps (base64, phần sau digest trong tệp .ots) và từng nhánh lịch để nâng cấp.
  ots_proof text,
  ots_nhanh jsonb NOT NULL DEFAULT '[]'::jsonb,
  anchor_status text NOT NULL DEFAULT 'not_anchored' CHECK (anchor_status IN ('not_anchored', 'pending', 'confirmed', 'failed')),
  anchor_error text,
  anchor_tries integer NOT NULL DEFAULT 0,
  anchored_at timestamptz,
  confirmed_at timestamptz,
  bitcoin_block integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bao_cao_xac_minh_ky CHECK (den_ngay >= tu_ngay),
  CONSTRAINT bao_cao_xac_minh_mot_ma UNIQUE (company_id, sha256)
);
CREATE INDEX IF NOT EXISTS bao_cao_xac_minh_cong_ty_idx ON public.bao_cao_xac_minh (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bao_cao_xac_minh_neo_idx ON public.bao_cao_xac_minh (anchor_status, updated_at) WHERE anchor_status IN ('not_anchored', 'pending');

CREATE TABLE IF NOT EXISTS public.chia_se_xac_minh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.bao_cao_xac_minh(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_name text NOT NULL CHECK (char_length(recipient_name) BETWEEN 1 AND 120),
  purpose text NOT NULL CHECK (char_length(purpose) BETWEEN 1 AND 200),
  -- SHA-256 của mã ngẫu nhiên 256 bit. Mã gốc chỉ trả cho chủ hộ một lần, không lưu.
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chia_se_xac_minh_han CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 days')
);
CREATE INDEX IF NOT EXISTS chia_se_xac_minh_bao_cao_idx ON public.chia_se_xac_minh (report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chia_se_xac_minh_cong_ty_idx ON public.chia_se_xac_minh (company_id);

CREATE TABLE IF NOT EXISTS public.nhat_ky_xem_xac_minh (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  share_id uuid NOT NULL REFERENCES public.chia_se_xac_minh(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.bao_cao_xac_minh(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ket_qua text NOT NULL CHECK (ket_qua IN ('xem', 'het_han', 'da_thu_hoi')),
  -- IP đã băm có muối (_shared/an-ninh/gioi-han.ts idTuIp), không lưu IP thô.
  ip_bam text,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nhat_ky_xem_xac_minh_share_idx ON public.nhat_ky_xem_xac_minh (share_id, at DESC);
CREATE INDEX IF NOT EXISTS nhat_ky_xem_xac_minh_cong_ty_idx ON public.nhat_ky_xem_xac_minh (company_id, at DESC);

ALTER TABLE public.bao_cao_xac_minh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chia_se_xac_minh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhat_ky_xem_xac_minh ENABLE ROW LEVEL SECURITY;

-- Người đang đăng nhập có phải chủ sở hữu / quản trị của công ty này không.
CREATE OR REPLACE FUNCTION public.la_quan_ly_xac_minh(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thanh_vien_cong_ty t
    WHERE t.company_id = p_company AND t.user_id = auth.uid() AND t.vai_tro IN ('chu_so_huu', 'quan_tri')
  );
$$;
REVOKE ALL ON FUNCTION public.la_quan_ly_xac_minh(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.la_quan_ly_xac_minh(uuid) TO authenticated;

DROP POLICY IF EXISTS "Thành viên đọc báo cáo xác minh" ON public.bao_cao_xac_minh;
CREATE POLICY "Thành viên đọc báo cáo xác minh" ON public.bao_cao_xac_minh
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND public.co_so_gioi_han(company_id) IS NULL);

DROP POLICY IF EXISTS "Chủ và quản trị đọc chia sẻ xác minh" ON public.chia_se_xac_minh;
CREATE POLICY "Chủ và quản trị đọc chia sẻ xác minh" ON public.chia_se_xac_minh
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND public.la_quan_ly_xac_minh(company_id));

DROP POLICY IF EXISTS "Chủ và quản trị đọc nhật ký xem xác minh" ON public.nhat_ky_xem_xac_minh;
CREATE POLICY "Chủ và quản trị đọc nhật ký xem xác minh" ON public.nhat_ky_xem_xac_minh
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND public.la_quan_ly_xac_minh(company_id));

REVOKE ALL ON public.bao_cao_xac_minh, public.chia_se_xac_minh, public.nhat_ky_xem_xac_minh FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.bao_cao_xac_minh, public.chia_se_xac_minh, public.nhat_ky_xem_xac_minh FROM authenticated;
GRANT SELECT ON public.bao_cao_xac_minh, public.chia_se_xac_minh, public.nhat_ky_xem_xac_minh TO authenticated;

-- ── Neo lại / nâng cấp bằng chứng mỗi giờ (cùng khuôn goi_dau_thoi_gian) ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'doanh_thu_xac_minh_url') THEN
    PERFORM vault.create_secret(
      'https://xzymxgdavepvygdcmfup.supabase.co/functions/v1/doanh-thu-xac-minh',
      'doanh_thu_xac_minh_url',
      'Địa chỉ edge function báo cáo doanh thu đã xác minh'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.goi_doanh_thu_xac_minh(p_hanh_dong text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, net, extensions AS $$
DECLARE
  bi_mat text;
  duong_dan text;
  anon_key text;
BEGIN
  IF p_hanh_dong NOT IN ('neo_lai') THEN
    RAISE EXCEPTION 'hành động không hợp lệ';
  END IF;
  SELECT decrypted_secret INTO bi_mat FROM vault.decrypted_secrets WHERE name = 'billing_cron_secret';
  SELECT decrypted_secret INTO duong_dan FROM vault.decrypted_secrets WHERE name = 'doanh_thu_xac_minh_url';
  SELECT decrypted_secret INTO anon_key FROM vault.decrypted_secrets WHERE name = 'billing_anon_key';
  IF bi_mat IS NULL OR duong_dan IS NULL OR anon_key IS NULL THEN
    RAISE WARNING 'Thiếu cấu hình trong Vault cho doanh thu đã xác minh';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := duong_dan,
    body := jsonb_build_object('hanh_dong', p_hanh_dong),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-cron-secret', bi_mat
    ),
    timeout_milliseconds := 120000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.goi_doanh_thu_xac_minh(text) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mimi-xac-minh-neo-lai';
END $$;
SELECT cron.schedule('mimi-xac-minh-neo-lai', '41 * * * *', $$SELECT public.goi_doanh_thu_xac_minh('neo_lai')$$);

COMMENT ON TABLE public.bao_cao_xac_minh IS 'Báo cáo doanh thu đã xác minh: JSON chuẩn hoá, SHA-256, bằng chứng OpenTimestamps.';
COMMENT ON TABLE public.chia_se_xac_minh IS 'Chia sẻ có đồng ý: một người nhận, một mục đích, hạn ≤ 30 ngày, mã chỉ lưu dạng băm.';
COMMENT ON TABLE public.nhat_ky_xem_xac_minh IS 'Mỗi lần người nhận mở đường dẫn chia sẻ (IP đã băm).';
