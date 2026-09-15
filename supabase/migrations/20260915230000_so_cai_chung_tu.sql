-- Chống sửa và truy lại hoá đơn, chứng từ (15/09/2026).
--
-- Người dùng muốn "đưa lên blockchain, NFT hoá để mất cũng truy lại được" và chọn hướng
-- dấu thời gian + sao lưu. Lý do không NFT: NFT không giữ dữ liệu (mất tệp là mất), và đưa
-- hoá đơn lên chuỗi công khai là công bố dữ liệu thuế của khách.
--
-- Ba lớp:
--   1. SỔ CÁI BĂM NỐI CHUỖI. Mỗi lần một hoá đơn điện tử hay chứng từ quét được ghi hoặc sửa,
--      trigger ghi một mắt xích: mã băm nội dung chuẩn hoá, nối với mắt xích trước của cùng
--      công ty. Sửa thẳng một dòng cũ (kể cả người có quyền quản trị CSDL) làm lệch mã băm;
--      xoá hay chèn mắt xích làm đứt chuỗi — `kiem_so_cai` chỉ ra được.
--   2. NEO LÊN BITCOIN. Mỗi đêm, edge function `dau-thoi-gian` gom mã băm chưa neo của từng
--      công ty thành cây Merkle và gửi MÃ GỐC (32 byte) tới máy chủ lịch OpenTimestamps.
--      Chỉ mã gốc rời MIMI; không tên, không số tiền. Vài giờ sau, lịch đưa mã gốc vào một
--      giao dịch Bitcoin; mỗi giờ hàm lấy bằng chứng đã nâng cấp và đối chiếu merkle root
--      của khối. Người dùng tải tệp .ots và tự kiểm ở bất kỳ công cụ OpenTimestamps nào.
--   3. SAO LƯU MÃ HOÁ (ở trình duyệt, mật khẩu người dùng giữ) — không cần bảng.

ALTER TABLE public.chung_tu_quet
  ADD COLUMN IF NOT EXISTS anh_sha256 text CHECK (anh_sha256 IS NULL OR anh_sha256 ~ '^[0-9a-f]{64}$');

-- ── Nội dung chuẩn hoá ─────────────────────────────────────────────────────────
-- Bản TypeScript phải cho đúng cùng chuỗi: `src/lib/chuanHoaChungTu.ts`. Đổi một bên là đổi
-- mã băm của mọi chứng từ về sau — nên có tiền tố phiên bản "v1|".

CREATE OR REPLACE FUNCTION public.chuan_truong(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(coalesce(t, ''), '\', '\\'), '|', '\|')
$$;

CREATE OR REPLACE FUNCTION public.noi_dung_chuan_hoa_don(g public.gdt_invoices)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT concat_ws('|',
    'v1', 'hddt', g.company_id::text, public.chuan_truong(g.gdt_id), g.direction,
    public.chuan_truong(g.invoice_serial), public.chuan_truong(g.invoice_number),
    public.chuan_truong(g.counterparty_tax_code), g.total_amount::text, g.tax_amount::text,
    coalesce(to_char(g.issued_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
    coalesce(g.invoice_status::text, '')
  )
$$;

CREATE OR REPLACE FUNCTION public.noi_dung_chuan_chung_tu(c public.chung_tu_quet)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT concat_ws('|',
    'v1', 'ctq', c.id::text, c.company_id::text, c.loai,
    public.chuan_truong(c.so_hoa_don), public.chuan_truong(c.ky_hieu), coalesce(c.ngay::text, ''),
    public.chuan_truong(c.ben_ban), public.chuan_truong(c.ma_so_thue_ben_ban),
    coalesce(c.tien_truoc_thue::text, ''), coalesce(c.tien_thue::text, ''), c.tong_tien::text,
    coalesce(c.giao_dich_id::text, ''), coalesce(c.anh_sha256, '')
  )
$$;

-- ── Sổ cái ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.neo_thoi_gian (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  goc_merkle text NOT NULL CHECK (goc_merkle ~ '^[0-9a-f]{64}$'),
  so_la integer NOT NULL CHECK (so_la > 0),
  lich text NOT NULL CHECK (lich ~ '^https://'),
  -- Phản hồi nhị phân của máy chủ lịch (base64): bằng chứng đang chờ Bitcoin.
  bang_chung_cho text NOT NULL,
  -- Bằng chứng tính từ cam kết đang chờ tới khối Bitcoin (base64), khi đã có.
  bang_chung_bitcoin text,
  khoi_bitcoin integer CHECK (khoi_bitcoin IS NULL OR khoi_bitcoin > 0),
  trang_thai text NOT NULL DEFAULT 'cho_bitcoin' CHECK (trang_thai IN ('cho_bitcoin', 'da_vao_bitcoin', 'loi')),
  loi_cuoi text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS neo_thoi_gian_company_idx ON public.neo_thoi_gian (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS neo_thoi_gian_cho_idx ON public.neo_thoi_gian (trang_thai, created_at) WHERE trang_thai = 'cho_bitcoin';

CREATE TABLE IF NOT EXISTS public.so_cai_chung_tu (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai IN ('hoa_don_dien_tu', 'chung_tu_quet')),
  -- Không khoá ngoại: chứng từ bị xoá thì dấu vết của nó vẫn phải còn.
  ban_ghi_id uuid NOT NULL,
  ma_bam text NOT NULL CHECK (ma_bam ~ '^[0-9a-f]{64}$'),
  bam_truoc text NOT NULL CHECK (bam_truoc ~ '^[0-9a-f]{64}$'),
  bam_chuoi text NOT NULL CHECK (bam_chuoi ~ '^[0-9a-f]{64}$'),
  neo_id bigint REFERENCES public.neo_thoi_gian(id),
  thu_tu_la integer CHECK (thu_tu_la IS NULL OR thu_tu_la >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS so_cai_chung_tu_company_idx ON public.so_cai_chung_tu (company_id, id);
CREATE INDEX IF NOT EXISTS so_cai_chung_tu_ban_ghi_idx ON public.so_cai_chung_tu (loai, ban_ghi_id, id DESC);
CREATE INDEX IF NOT EXISTS so_cai_chung_tu_chua_neo_idx ON public.so_cai_chung_tu (company_id, id) WHERE neo_id IS NULL;

-- Mắt xích không sửa được. Chỉ được gắn neo một lần.
CREATE OR REPLACE FUNCTION public.so_cai_chung_tu_khong_sua()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.neo_id IS NULL AND NEW.neo_id IS NOT NULL
     AND NEW.company_id = OLD.company_id AND NEW.loai = OLD.loai AND NEW.ban_ghi_id = OLD.ban_ghi_id
     AND NEW.ma_bam = OLD.ma_bam AND NEW.bam_truoc = OLD.bam_truoc AND NEW.bam_chuoi = OLD.bam_chuoi
     AND NEW.created_at = OLD.created_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'so_cai_chung_tu chỉ được thêm, không được sửa';
END;
$$;
DROP TRIGGER IF EXISTS so_cai_chung_tu_khong_sua_trg ON public.so_cai_chung_tu;
CREATE TRIGGER so_cai_chung_tu_khong_sua_trg BEFORE UPDATE ON public.so_cai_chung_tu
  FOR EACH ROW EXECUTE FUNCTION public.so_cai_chung_tu_khong_sua();

CREATE OR REPLACE FUNCTION public.ghi_so_cai(p_company uuid, p_loai text, p_id uuid, p_noi_dung text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_bam text := encode(extensions.digest(convert_to(p_noi_dung, 'UTF8'), 'sha256'), 'hex');
  v_truoc text;
BEGIN
  -- Đồng bộ lại cùng nội dung (chỉ đổi synced_at) thì không thêm mắt xích.
  IF (SELECT ma_bam FROM public.so_cai_chung_tu WHERE loai = p_loai AND ban_ghi_id = p_id ORDER BY id DESC LIMIT 1) = v_bam THEN
    RETURN;
  END IF;
  -- Một công ty một chuỗi: khoá theo công ty để hai lần ghi đồng thời không cùng nối vào một mắt.
  PERFORM pg_advisory_xact_lock(hashtextextended('so_cai:' || p_company::text, 0));
  SELECT bam_chuoi INTO v_truoc FROM public.so_cai_chung_tu WHERE company_id = p_company ORDER BY id DESC LIMIT 1;
  v_truoc := coalesce(v_truoc, repeat('0', 64));
  INSERT INTO public.so_cai_chung_tu (company_id, loai, ban_ghi_id, ma_bam, bam_truoc, bam_chuoi)
  VALUES (p_company, p_loai, p_id, v_bam, v_truoc,
          encode(extensions.digest(decode(v_truoc, 'hex') || decode(v_bam, 'hex'), 'sha256'), 'hex'));
END;
$$;
REVOKE ALL ON FUNCTION public.ghi_so_cai(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ghi_so_cai_hoa_don()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ghi_so_cai(NEW.company_id, 'hoa_don_dien_tu', NEW.id, public.noi_dung_chuan_hoa_don(NEW));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ghi_so_cai_chung_tu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ghi_so_cai(NEW.company_id, 'chung_tu_quet', NEW.id, public.noi_dung_chuan_chung_tu(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gdt_invoices_so_cai_trg ON public.gdt_invoices;
CREATE TRIGGER gdt_invoices_so_cai_trg AFTER INSERT OR UPDATE ON public.gdt_invoices
  FOR EACH ROW EXECUTE FUNCTION public.ghi_so_cai_hoa_don();
DROP TRIGGER IF EXISTS chung_tu_quet_so_cai_trg ON public.chung_tu_quet;
CREATE TRIGGER chung_tu_quet_so_cai_trg AFTER INSERT OR UPDATE ON public.chung_tu_quet
  FOR EACH ROW EXECUTE FUNCTION public.ghi_so_cai_chung_tu();

-- Ghi sổ cho chứng từ đã có, theo thứ tự tạo.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT company_id, 'hoa_don_dien_tu'::text AS loai, id, public.noi_dung_chuan_hoa_don(g) AS nd, created_at FROM public.gdt_invoices g
    UNION ALL
    SELECT company_id, 'chung_tu_quet'::text, id, public.noi_dung_chuan_chung_tu(c), created_at FROM public.chung_tu_quet c
    ORDER BY created_at, id
  LOOP
    PERFORM public.ghi_so_cai(r.company_id, r.loai, r.id, r.nd);
  END LOOP;
END $$;

-- Gắn một lần neo cho các mắt xích (thứ tự lá = thứ tự trong mảng). Chỉ service role.
CREATE OR REPLACE FUNCTION public.gan_neo_so_cai(p_neo bigint, p_ids bigint[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_so integer;
BEGIN
  UPDATE public.so_cai_chung_tu s SET neo_id = p_neo, thu_tu_la = x.ord - 1
  FROM unnest(p_ids) WITH ORDINALITY AS x(id, ord)
  WHERE s.id = x.id AND s.neo_id IS NULL;
  GET DIAGNOSTICS v_so = ROW_COUNT;
  RETURN v_so;
END;
$$;
REVOKE ALL ON FUNCTION public.gan_neo_so_cai(bigint, bigint[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gan_neo_so_cai(bigint, bigint[]) TO service_role;

-- Kiểm toàn vẹn: mắt xích hỏng, và chứng từ hiện tại lệch với mắt xích mới nhất của nó.
CREATE OR REPLACE FUNCTION public.kiem_so_cai(p_company uuid)
RETURNS TABLE (so_mat_xich bigint, so_chung_tu bigint, so_chung_tu_lech bigint, so_mat_xich_hong bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH chuoi AS (
    SELECT id, ma_bam, bam_truoc, bam_chuoi, lag(bam_chuoi) OVER (ORDER BY id) AS chuoi_truoc
    FROM public.so_cai_chung_tu WHERE company_id = p_company
  ), moi_nhat AS (
    SELECT DISTINCT ON (loai, ban_ghi_id) loai, ban_ghi_id, ma_bam
    FROM public.so_cai_chung_tu WHERE company_id = p_company ORDER BY loai, ban_ghi_id, id DESC
  ), hien_tai AS (
    SELECT 'hoa_don_dien_tu'::text AS loai, g.id, encode(extensions.digest(convert_to(public.noi_dung_chuan_hoa_don(g), 'UTF8'), 'sha256'), 'hex') AS bam
    FROM public.gdt_invoices g WHERE g.company_id = p_company
    UNION ALL
    SELECT 'chung_tu_quet', c.id, encode(extensions.digest(convert_to(public.noi_dung_chuan_chung_tu(c), 'UTF8'), 'sha256'), 'hex')
    FROM public.chung_tu_quet c WHERE c.company_id = p_company
  )
  SELECT
    (SELECT count(*) FROM chuoi),
    (SELECT count(*) FROM hien_tai),
    (SELECT count(*) FROM hien_tai h LEFT JOIN moi_nhat m ON m.loai = h.loai AND m.ban_ghi_id = h.id WHERE m.ma_bam IS DISTINCT FROM h.bam),
    (SELECT count(*) FROM chuoi
      WHERE bam_truoc <> coalesce(chuoi_truoc, repeat('0', 64))
         OR bam_chuoi <> encode(extensions.digest(decode(bam_truoc, 'hex') || decode(ma_bam, 'hex'), 'sha256'), 'hex'))
$$;
REVOKE ALL ON FUNCTION public.kiem_so_cai(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kiem_so_cai(uuid) TO service_role;

ALTER TABLE public.so_cai_chung_tu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neo_thoi_gian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Xem sổ cái chứng từ của công ty mình" ON public.so_cai_chung_tu FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Xem dấu thời gian của công ty mình" ON public.neo_thoi_gian FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- ── Lịch chạy ──────────────────────────────────────────────────────────────────
-- Cùng cách `chay_doi_soat_thue_bao`: anon key qua cổng Supabase, `x-cron-secret` (Vault) để
-- hàm tự kiểm. Neo 00:05 giờ Việt Nam; nâng cấp bằng chứng mỗi giờ.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'dau_thoi_gian_url') THEN
    PERFORM vault.create_secret(
      'https://xzymxgdavepvygdcmfup.supabase.co/functions/v1/dau-thoi-gian',
      'dau_thoi_gian_url',
      'Địa chỉ edge function neo dấu thời gian chứng từ'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.goi_dau_thoi_gian(p_hanh_dong text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, net, extensions AS $$
DECLARE
  bi_mat text;
  duong_dan text;
  anon_key text;
BEGIN
  IF p_hanh_dong NOT IN ('neo', 'nang_cap') THEN
    RAISE EXCEPTION 'hành động không hợp lệ';
  END IF;
  SELECT decrypted_secret INTO bi_mat FROM vault.decrypted_secrets WHERE name = 'billing_cron_secret';
  SELECT decrypted_secret INTO duong_dan FROM vault.decrypted_secrets WHERE name = 'dau_thoi_gian_url';
  SELECT decrypted_secret INTO anon_key FROM vault.decrypted_secrets WHERE name = 'billing_anon_key';
  IF bi_mat IS NULL OR duong_dan IS NULL OR anon_key IS NULL THEN
    RAISE WARNING 'Thiếu cấu hình trong Vault cho dấu thời gian chứng từ';
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
REVOKE ALL ON FUNCTION public.goi_dau_thoi_gian(text) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('mimi-neo-thoi-gian', 'mimi-nang-cap-thoi-gian');
END $$;
SELECT cron.schedule('mimi-neo-thoi-gian', '5 17 * * *', $$SELECT public.goi_dau_thoi_gian('neo')$$);
SELECT cron.schedule('mimi-nang-cap-thoi-gian', '23 * * * *', $$SELECT public.goi_dau_thoi_gian('nang_cap')$$);

COMMENT ON TABLE public.so_cai_chung_tu IS 'Sổ cái băm nối chuỗi của hoá đơn điện tử và chứng từ quét; chỉ thêm.';
COMMENT ON TABLE public.neo_thoi_gian IS 'Mã gốc Merkle đã gửi OpenTimestamps và bằng chứng Bitcoin tương ứng.';
