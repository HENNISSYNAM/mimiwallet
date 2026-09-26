-- Lớp thực thi có kiểm soát — Prompt 5 (26/09/2026).
--
-- Một bảng cho mọi việc gửi ra ngoài (nộp hồ sơ, ký, tra trạng thái…). Mỗi dòng gắn với ĐÚNG một phiên
-- bản tài liệu và mã băm của nó; lời xác nhận gắn với cùng gói đó. CSDL tự bảo vệ ba điều, kể cả trước
-- service role:
--   1. chỉ chuyển trạng thái theo luật (không draft → accepted);
--   2. sau khi đã gửi, không đổi được tài liệu / phiên bản / mã băm của gói;
--   3. "đã gửi" phải có mã tham chiếu, "chấp nhận/từ chối" phải có kết quả của cơ quan.
-- Trình duyệt chỉ ĐỌC; mọi ghi qua edge function `tro-ly` sau khi kiểm vai trò.

CREATE TABLE IF NOT EXISTS public.yeu_cau_thuc_thi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai IN ('tax_submission', 'document_signature', 'invoice_sync', 'invoice_status_check', 'authority_status_check', 'payment_reference_check')),
  ho_so_viec_id uuid REFERENCES public.ho_so_viec(id) ON DELETE SET NULL,
  hanh_trinh_id uuid REFERENCES public.hanh_trinh(id) ON DELETE SET NULL,
  tai_lieu_id uuid REFERENCES public.tai_lieu(id) ON DELETE SET NULL,
  phien_ban smallint,
  ma_bam_noi_dung text CHECK (ma_bam_noi_dung IS NULL OR ma_bam_noi_dung ~ '^[0-9a-f]{64}$'),
  ma_bam_du_lieu text CHECK (ma_bam_du_lieu IS NULL OR ma_bam_du_lieu ~ '^[0-9a-f]{64}$'),
  nha_cung_cap text NOT NULL CHECK (nha_cung_cap IN ('nguoi_dung', 'cas')),
  nang_luc text NOT NULL CHECK (char_length(nang_luc) BETWEEN 3 AND 40),
  trang_thai text NOT NULL DEFAULT 'draft' CHECK (trang_thai IN (
    'draft', 'needs_validation', 'needs_confirmation', 'ready', 'submitting', 'submitted', 'waiting_external',
    'accepted', 'rejected', 'failed', 'cancelled', 'resolved')),
  khoa_chong_trung text NOT NULL CHECK (char_length(khoa_chong_trung) BETWEEN 10 AND 400),
  ky text CHECK (ky IS NULL OR char_length(ky) <= 40),
  han date,
  -- Điều người dùng đã thấy khi xác nhận (mục 4): gì sẽ xảy ra, gửi ai, dữ liệu nào, gì không hoàn tác được.
  xem_truoc jsonb NOT NULL DEFAULT '{}'::jsonb,
  loi_kiem text[] NOT NULL DEFAULT '{}',
  yeu_cau_boi uuid,
  xac_nhan_boi uuid,
  xac_nhan_luc timestamptz,
  -- Bản chụp gói lúc xác nhận: đổi tài liệu sau đó là xác nhận mất hiệu lực.
  xac_nhan_phien_ban smallint,
  xac_nhan_ma_bam text,
  tham_chieu_ngoai text CHECK (tham_chieu_ngoai IS NULL OR char_length(tham_chieu_ngoai) BETWEEN 1 AND 200),
  nguon_tham_chieu text CHECK (nguon_tham_chieu IS NULL OR nguon_tham_chieu IN ('nha_cung_cap', 'nguoi_dung_khai')),
  ngay_nop date,
  trang_thai_nha_cung_cap text CHECK (trang_thai_nha_cung_cap IS NULL OR char_length(trang_thai_nha_cung_cap) <= 60),
  trang_thai_co_quan text CHECK (trang_thai_co_quan IS NULL OR char_length(trang_thai_co_quan) <= 60),
  tham_chieu_co_quan text CHECK (tham_chieu_co_quan IS NULL OR char_length(tham_chieu_co_quan) <= 200),
  ket_qua_co_quan text CHECK (ket_qua_co_quan IS NULL OR char_length(ket_qua_co_quan) <= 1000),
  nguon_ket_qua text CHECK (nguon_ket_qua IS NULL OR nguon_ket_qua IN ('nha_cung_cap', 'co_quan', 'nguoi_dung_khai')),
  bien_nhan_tai_lieu_id uuid REFERENCES public.tai_lieu(id) ON DELETE SET NULL,
  so_lan_thu smallint NOT NULL DEFAULT 0 CHECK (so_lan_thu BETWEEN 0 AND 20),
  lan_thu_cuoi timestamptz,
  ma_loi text CHECK (ma_loi IS NULL OR char_length(ma_loi) <= 40),
  loi_an_toan text CHECK (loi_an_toan IS NULL OR char_length(loi_an_toan) <= 500),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  gui_luc timestamptz,
  kiem_luc timestamptz,
  xong_luc timestamptz,
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);
-- Mục 24: bấm hai lần không thành hai lần nộp — một yêu cầu còn sống cho mỗi khoá.
CREATE UNIQUE INDEX IF NOT EXISTS yeu_cau_thuc_thi_chong_trung
  ON public.yeu_cau_thuc_thi (company_id, khoa_chong_trung) WHERE trang_thai NOT IN ('cancelled', 'failed', 'rejected', 'resolved');
CREATE INDEX IF NOT EXISTS yeu_cau_thuc_thi_cty_idx ON public.yeu_cau_thuc_thi (company_id, cap_nhat_luc DESC);

CREATE OR REPLACE FUNCTION public.thuc_thi_bao_ve()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE duoc text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.trang_thai NOT IN ('draft', 'needs_validation', 'needs_confirmation') THEN
      RAISE EXCEPTION 'Yêu cầu mới phải bắt đầu từ bước chuẩn bị' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    duoc := CASE OLD.trang_thai
      WHEN 'draft' THEN ARRAY['needs_validation', 'cancelled']
      WHEN 'needs_validation' THEN ARRAY['needs_confirmation', 'draft', 'cancelled']
      WHEN 'needs_confirmation' THEN ARRAY['ready', 'needs_validation', 'cancelled']
      WHEN 'ready' THEN ARRAY['submitting', 'needs_validation', 'cancelled']
      WHEN 'submitting' THEN ARRAY['submitted', 'failed']
      WHEN 'submitted' THEN ARRAY['waiting_external', 'accepted', 'rejected', 'failed']
      WHEN 'waiting_external' THEN ARRAY['accepted', 'rejected', 'failed', 'waiting_external']
      WHEN 'accepted' THEN ARRAY['resolved']
      WHEN 'rejected' THEN ARRAY['resolved', 'draft']
      WHEN 'failed' THEN ARRAY['ready', 'cancelled']
      ELSE ARRAY[]::text[] END;
    IF NOT NEW.trang_thai = ANY (duoc) THEN
      RAISE EXCEPTION 'Không chuyển được từ % sang %', OLD.trang_thai, NEW.trang_thai USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai = 'ready' AND (NEW.xac_nhan_boi IS NULL OR NEW.xac_nhan_ma_bam IS NULL) THEN
      RAISE EXCEPTION 'Chưa có xác nhận' USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai = 'submitted' AND NEW.tham_chieu_ngoai IS NULL THEN
      RAISE EXCEPTION 'Đã gửi phải có mã tham chiếu' USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai IN ('accepted', 'rejected') AND NEW.ket_qua_co_quan IS NULL THEN
      RAISE EXCEPTION 'Kết quả phải có thông báo của cơ quan' USING ERRCODE = '23514';
    END IF;
  END IF;
  -- Gói đã gửi là bất biến.
  IF OLD.trang_thai IN ('submitting', 'submitted', 'waiting_external', 'accepted', 'rejected', 'resolved')
     AND (NEW.tai_lieu_id IS DISTINCT FROM OLD.tai_lieu_id OR NEW.phien_ban IS DISTINCT FROM OLD.phien_ban
          OR NEW.ma_bam_noi_dung IS DISTINCT FROM OLD.ma_bam_noi_dung OR NEW.ma_bam_du_lieu IS DISTINCT FROM OLD.ma_bam_du_lieu
          OR NEW.company_id IS DISTINCT FROM OLD.company_id) THEN
    RAISE EXCEPTION 'Gói đã gửi không sửa được — tạo yêu cầu mới' USING ERRCODE = '42501';
  END IF;
  NEW.cap_nhat_luc := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS thuc_thi_bao_ve ON public.yeu_cau_thuc_thi;
CREATE TRIGGER thuc_thi_bao_ve BEFORE INSERT OR UPDATE ON public.yeu_cau_thuc_thi FOR EACH ROW EXECUTE FUNCTION public.thuc_thi_bao_ve();

-- Mục 11: hoá đơn trong MIMI khác trạng thái bên ngoài → ghi xung đột, không ghi đè.
CREATE TABLE IF NOT EXISTS public.xung_dot_hoa_don (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  hoa_don_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  ma_ngoai text CHECK (ma_ngoai IS NULL OR char_length(ma_ngoai) <= 200),
  trang_thai_trong text NOT NULL,
  trang_thai_ngoai text NOT NULL,
  nguon text NOT NULL CHECK (char_length(nguon) <= 60),
  kiem_luc timestamptz NOT NULL DEFAULT now(),
  goi_y text CHECK (goi_y IS NULL OR char_length(goi_y) <= 500),
  da_xu_ly_luc timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS xung_dot_hoa_don_mot_mo ON public.xung_dot_hoa_don (company_id, hoa_don_id, trang_thai_ngoai) WHERE da_xu_ly_luc IS NULL;

-- Dấu vết: thêm hai loại đối tượng vào nhật ký thay đổi.
ALTER TABLE public.nhat_ky_thay_doi DROP CONSTRAINT IF EXISTS nhat_ky_thay_doi_doi_tuong_check;
ALTER TABLE public.nhat_ky_thay_doi ADD CONSTRAINT nhat_ky_thay_doi_doi_tuong_check CHECK (doi_tuong IN (
  'ho_so_viec', 'hanh_trinh', 'buoc_hanh_trinh', 'tai_lieu', 'phien_ban_tai_lieu', 'duyet_tai_lieu', 'yeu_cau_thuc_thi', 'xung_dot_hoa_don'));

DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['yeu_cau_thuc_thi', 'xung_dot_hoa_don'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Thành viên công ty đọc ' || b, b);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))', 'Thành viên công ty đọc ' || b, b);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.thuc_thi_bao_ve() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.yeu_cau_thuc_thi IS 'Việc gửi ra ngoài (nộp, ký, tra trạng thái). Gắn phiên bản + mã băm tài liệu; xác nhận gắn cùng gói; CSDL chặn chuyển trạng thái sai.';
