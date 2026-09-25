-- Hồ sơ việc, hành trình, thư viện tài liệu — nền của Prompt 3 Phase C và Prompt 4 (25/09/2026).
--
-- MỘT HỆ QUY TRÌNH, KHÔNG HAI. `ho_so_viec` là "chuyện gì đang xảy ra cần giải quyết" (bị yêu cầu
-- giải trình, hoá đơn sai MST, sắp tạm ngừng). `hanh_trinh` + `buoc_hanh_trinh` là "các bước để giải
-- quyết nó". Bước của hồ sơ việc CHÍNH LÀ bước hành trình — không có bảng case_steps riêng.
--
-- AI GHI: chỉ máy chủ (edge function `tro-ly`, sau khi kiểm vai trò). Trình duyệt chỉ ĐỌC, và chỉ đọc
-- công ty mình là thành viên. Không có policy INSERT/UPDATE/DELETE cho `authenticated`.
--
-- DẤU VẾT: mọi thay đổi có ý nghĩa ghi vào `nhat_ky_thay_doi` (ai, lúc nào, trước, sau, nguồn, bằng
-- chứng). Bảng đó và các phiên bản tài liệu CHỈ GHI THÊM — trigger chặn sửa và xoá, kể cả service role.

-- ── Hồ sơ việc ──────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ho_so_viec (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai ~ '^[a-z_]{3,40}$'),
  tieu_de text NOT NULL CHECK (char_length(btrim(tieu_de)) BETWEEN 3 AND 200),
  trang_thai text NOT NULL DEFAULT 'mo'
    CHECK (trang_thai IN ('mo', 'dang_xu_ly', 'cho_ben_ngoai', 'da_giai_quyet', 'da_huy')),
  muc_do text NOT NULL DEFAULT 'binh_thuong' CHECK (muc_do IN ('chan', 'gap', 'binh_thuong')),
  -- Cùng một chuyện không mở hai hồ sơ: dấu vân tay tất định từ loại + đối tượng + kỳ.
  dau_van_tay text NOT NULL CHECK (char_length(dau_van_tay) BETWEEN 3 AND 200),
  nguon jsonb NOT NULL DEFAULT '{}'::jsonb,
  tao_boi uuid,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  giai_quyet_luc timestamptz,
  giai_quyet_boi uuid,
  -- CloseCheck: vì sao coi là xong (bằng chứng kết quả), bắt buộc khi đóng.
  ket_qua text CHECK (ket_qua IS NULL OR char_length(ket_qua) <= 2000),
  CHECK (trang_thai <> 'da_giai_quyet' OR (giai_quyet_luc IS NOT NULL AND ket_qua IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS ho_so_viec_mot_dang_mo
  ON public.ho_so_viec (company_id, dau_van_tay) WHERE trang_thai NOT IN ('da_giai_quyet', 'da_huy');
CREATE INDEX IF NOT EXISTS ho_so_viec_cty_idx ON public.ho_so_viec (company_id, cap_nhat_luc DESC);

-- ── Hành trình và bước ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hanh_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai IN (
    'business_start', 'registration_change', 'tax_setup', 'tax_deadline_preparation', 'invoice_setup',
    'invoice_correction', 'authority_response', 'suspension', 'resumption', 'closure', 'dissolution',
    'historical_reconstruction'
  )),
  y_dinh text NOT NULL DEFAULT '' CHECK (char_length(y_dinh) <= 1000),
  tieu_de text NOT NULL CHECK (char_length(btrim(tieu_de)) BETWEEN 3 AND 200),
  trang_thai text NOT NULL DEFAULT 'dang_mo'
    CHECK (trang_thai IN ('dang_mo', 'bi_chan', 'cho_ben_ngoai', 'hoan_tat', 'da_huy')),
  loai_chu_the text CHECK (loai_chu_the IS NULL OR loai_chu_the IN ('ho_kinh_doanh', 'doanh_nghiep')),
  trang_thai_doanh_nghiep text CHECK (trang_thai_doanh_nghiep IS NULL OR char_length(trang_thai_doanh_nghiep) <= 40),
  buoc_hien_tai text CHECK (buoc_hien_tai IS NULL OR char_length(buoc_hien_tai) <= 60),
  ho_so_viec_id uuid REFERENCES public.ho_so_viec(id) ON DELETE SET NULL,
  nghia_vu_nguon text[] NOT NULL DEFAULT '{}',
  -- Dữ kiện người dùng đã trả lời: { khoa: { gia_tri, nguon, luc, boi } }. Chỉ máy chủ ghi.
  du_kien jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(du_kien) = 'object' AND pg_column_size(du_kien) < 32768),
  tao_boi uuid,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  hoan_tat_luc timestamptz
);
-- Một loại hành trình đang mở cho mỗi công ty: hỏi lại "tôi muốn tạm ngừng" thì mở tiếp cái cũ.
CREATE UNIQUE INDEX IF NOT EXISTS hanh_trinh_mot_dang_mo
  ON public.hanh_trinh (company_id, loai) WHERE trang_thai NOT IN ('hoan_tat', 'da_huy');
CREATE INDEX IF NOT EXISTS hanh_trinh_cty_idx ON public.hanh_trinh (company_id, cap_nhat_luc DESC);

CREATE TABLE IF NOT EXISTS public.buoc_hanh_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hanh_trinh_id uuid NOT NULL REFERENCES public.hanh_trinh(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thu_tu smallint NOT NULL CHECK (thu_tu BETWEEN 1 AND 50),
  khoa text NOT NULL CHECK (khoa ~ '^[a-z0-9_]{2,60}$'),
  tieu_de text NOT NULL CHECK (char_length(tieu_de) BETWEEN 2 AND 200),
  mo_ta text NOT NULL DEFAULT '' CHECK (char_length(mo_ta) <= 1000),
  trang_thai text NOT NULL DEFAULT 'not_started'
    CHECK (trang_thai IN ('not_started', 'blocked', 'ready', 'in_progress', 'waiting_external', 'completed', 'skipped')),
  uu_tien smallint NOT NULL DEFAULT 50 CHECK (uu_tien BETWEEN 0 AND 100),
  du_kien_can text[] NOT NULL DEFAULT '{}',
  giay_to_can text[] NOT NULL DEFAULT '{}',
  nghia_vu text[] NOT NULL DEFAULT '{}',
  thu_tuc text[] NOT NULL DEFAULT '{}',
  loai_hanh_dong text CHECK (loai_hanh_dong IS NULL OR loai_hanh_dong IN ('hoi', 'mo_trang', 'soan_tai_lieu', 'nguoi_dung_lam', 'kiem_ket_qua')),
  dich_hanh_dong text CHECK (dich_hanh_dong IS NULL OR char_length(dich_hanh_dong) <= 200),
  ly_do_chan text CHECK (ly_do_chan IS NULL OR char_length(ly_do_chan) <= 500),
  hoan_tat_luc timestamptz,
  UNIQUE (hanh_trinh_id, khoa)
);
CREATE INDEX IF NOT EXISTS buoc_hanh_trinh_ht_idx ON public.buoc_hanh_trinh (hanh_trinh_id, thu_tu);

-- ── Thư viện tài liệu, phiên bản bất biến, duyệt chuyên môn ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tai_lieu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  hoi_thoai_id uuid REFERENCES public.hoi_thoai_tro_ly(id) ON DELETE SET NULL,
  ho_so_viec_id uuid REFERENCES public.ho_so_viec(id) ON DELETE SET NULL,
  hanh_trinh_id uuid REFERENCES public.hanh_trinh(id) ON DELETE SET NULL,
  thu_tuc_ma text CHECK (thu_tuc_ma IS NULL OR char_length(thu_tuc_ma) <= 40),
  loai text NOT NULL CHECK (loai IN (
    'invoice', 'receipt', 'bank_statement', 'tax_form', 'authority_notice', 'penalty_decision',
    'explanation_letter', 'administrative_letter', 'registration_document', 'submission_receipt',
    'payment_evidence', 'audit_pack', 'reconciliation_report', 'financial_review_memo', 'cashflow_report',
    'tax_readiness_pack', 'other'
  )),
  tieu_de text NOT NULL CHECK (char_length(btrim(tieu_de)) BETWEEN 3 AND 200),
  mo_ta text NOT NULL DEFAULT '' CHECK (char_length(mo_ta) <= 1000),
  -- Nhãn in trên chính tài liệu, để bản in rời app vẫn nói nó là gì.
  nhan text NOT NULL DEFAULT 'draft_for_review' CHECK (nhan IN (
    'official_template_filled', 'mimi_generated', 'draft_for_review', 'reference_only'
  )),
  ma_mau_chinh_thuc text CHECK (ma_mau_chinh_thuc IS NULL OR char_length(ma_mau_chinh_thuc) <= 40),
  ky text CHECK (ky IS NULL OR char_length(ky) <= 40),
  can_cu jsonb NOT NULL DEFAULT '[]'::jsonb,
  nguon jsonb NOT NULL DEFAULT '[]'::jsonb,
  bang_chung jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Gói bằng chứng: đủ / thiếu / cần xem lại. NULL với tài liệu không phải gói.
  do_day text CHECK (do_day IS NULL OR do_day IN ('COMPLETE', 'INCOMPLETE', 'NEEDS_REVIEW')),
  tao_boi uuid,
  sinh_boi text NOT NULL DEFAULT 'mimi' CHECK (sinh_boi IN ('mimi', 'nguoi_dung', 'nhap_tu_nguon')),
  phien_ban_hien_tai smallint NOT NULL DEFAULT 1 CHECK (phien_ban_hien_tai BETWEEN 1 AND 500),
  trang_thai text NOT NULL DEFAULT 'generated' CHECK (trang_thai IN (
    'generated', 'edited', 'needs_review', 'reviewed', 'approved', 'rejected', 'signed', 'submitted', 'accepted'
  )),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tai_lieu_cty_idx ON public.tai_lieu (company_id, cap_nhat_luc DESC);

CREATE TABLE IF NOT EXISTS public.phien_ban_tai_lieu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tai_lieu_id uuid NOT NULL REFERENCES public.tai_lieu(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  so smallint NOT NULL CHECK (so BETWEEN 1 AND 500),
  trang_thai text NOT NULL CHECK (trang_thai IN ('generated', 'edited', 'reviewed', 'signed', 'submitted', 'accepted')),
  duong_dan text NOT NULL CHECK (duong_dan ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/v[0-9]{1,3}\.(html|pdf|json)$'),
  mime text NOT NULL CHECK (mime IN ('text/html', 'application/pdf', 'application/json')),
  noi_dung_bam text NOT NULL CHECK (noi_dung_bam ~ '^[0-9a-f]{64}$'),
  kich_thuoc integer NOT NULL CHECK (kich_thuoc BETWEEN 1 AND 5242880),
  tao_boi uuid,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  ghi_chu text CHECK (ghi_chu IS NULL OR char_length(ghi_chu) <= 500),
  UNIQUE (tai_lieu_id, so)
);

CREATE TABLE IF NOT EXISTS public.duyet_tai_lieu (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tai_lieu_id uuid NOT NULL REFERENCES public.tai_lieu(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phien_ban_so smallint NOT NULL,
  vai_tro_duyet text NOT NULL CHECK (vai_tro_duyet IN ('ke_toan', 'chuyen_gia_thue', 'nguoi_duyet_tai_chinh', 'chu_doanh_nghiep')),
  ket_qua text NOT NULL CHECK (ket_qua IN ('needs_review', 'reviewed', 'approved', 'rejected')),
  nhan_xet text CHECK (nhan_xet IS NULL OR char_length(nhan_xet) <= 2000),
  boi uuid NOT NULL,
  luc timestamptz NOT NULL DEFAULT now()
);

-- ── Nhật ký thay đổi (dấu vết kiểm toán) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nhat_ky_thay_doi (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doi_tuong text NOT NULL CHECK (doi_tuong IN ('ho_so_viec', 'hanh_trinh', 'buoc_hanh_trinh', 'tai_lieu', 'phien_ban_tai_lieu', 'duyet_tai_lieu')),
  doi_tuong_id text NOT NULL CHECK (char_length(doi_tuong_id) BETWEEN 1 AND 80),
  hanh_dong text NOT NULL CHECK (hanh_dong ~ '^[a-z_]{3,40}$'),
  boi uuid,
  luc timestamptz NOT NULL DEFAULT now(),
  truoc jsonb,
  sau jsonb,
  nguon text CHECK (nguon IS NULL OR char_length(nguon) <= 200),
  bang_chung jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS nhat_ky_thay_doi_dt_idx ON public.nhat_ky_thay_doi (company_id, doi_tuong, doi_tuong_id, luc);

/* Chỉ ghi thêm. Sửa hoặc xoá một dòng dấu vết là xoá bằng chứng — chặn cả service role. */
CREATE OR REPLACE FUNCTION public.chi_ghi_them()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Xoá theo dây chuyền khi công ty bị xoá (quyền xoá dữ liệu của chủ) vẫn được.
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.companies WHERE id = OLD.company_id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% chỉ ghi thêm: không sửa, không xoá', TG_TABLE_NAME USING ERRCODE = '42501';
END $$;

DROP TRIGGER IF EXISTS nhat_ky_thay_doi_chi_ghi_them ON public.nhat_ky_thay_doi;
CREATE TRIGGER nhat_ky_thay_doi_chi_ghi_them BEFORE UPDATE OR DELETE ON public.nhat_ky_thay_doi
  FOR EACH ROW EXECUTE FUNCTION public.chi_ghi_them();
DROP TRIGGER IF EXISTS phien_ban_tai_lieu_chi_ghi_them ON public.phien_ban_tai_lieu;
CREATE TRIGGER phien_ban_tai_lieu_chi_ghi_them BEFORE UPDATE OR DELETE ON public.phien_ban_tai_lieu
  FOR EACH ROW EXECUTE FUNCTION public.chi_ghi_them();
DROP TRIGGER IF EXISTS duyet_tai_lieu_chi_ghi_them ON public.duyet_tai_lieu;
CREATE TRIGGER duyet_tai_lieu_chi_ghi_them BEFORE UPDATE OR DELETE ON public.duyet_tai_lieu
  FOR EACH ROW EXECUTE FUNCTION public.chi_ghi_them();

/*
 * Tài liệu đã ký / đã nộp / được chấp nhận: không đổi nội dung mô tả, không lùi trạng thái.
 * (Phiên bản thì bất biến hoàn toàn ở trigger trên.)
 */
CREATE OR REPLACE FUNCTION public.tai_lieu_khoa_sau_ky()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.trang_thai IN ('signed', 'submitted', 'accepted') THEN
    IF NEW.trang_thai NOT IN ('signed', 'submitted', 'accepted')
       OR (OLD.trang_thai = 'submitted' AND NEW.trang_thai = 'signed')
       OR (OLD.trang_thai = 'accepted' AND NEW.trang_thai <> 'accepted')
       OR NEW.tieu_de IS DISTINCT FROM OLD.tieu_de
       OR NEW.loai IS DISTINCT FROM OLD.loai
       OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Tài liệu đã % — không sửa được, tạo tài liệu mới', OLD.trang_thai USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.cap_nhat_luc := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tai_lieu_khoa_sau_ky ON public.tai_lieu;
CREATE TRIGGER tai_lieu_khoa_sau_ky BEFORE UPDATE ON public.tai_lieu
  FOR EACH ROW EXECUTE FUNCTION public.tai_lieu_khoa_sau_ky();

-- ── Sổ mẫu biểu chính thức, danh bạ cơ quan ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mau_bieu_chinh_thuc (
  ma_mau text PRIMARY KEY CHECK (char_length(ma_mau) BETWEEN 2 AND 40),
  ten text,
  co_quan text,
  thu_tuc_ma text[] NOT NULL DEFAULT '{}',
  nguon_url text CHECK (nguon_url IS NULL OR nguon_url ~ '^https://'),
  van_ban_nguon text,
  hieu_luc_tu date,
  hieu_luc_den date,
  phien_ban text,
  mau_tep text,
  loai_mau text CHECK (loai_mau IS NULL OR loai_mau IN ('xml_htkk', 'docx', 'pdf', 'html', 'khong_co')),
  luoc_do_truong jsonb,
  yeu_cau_ky text CHECK (yeu_cau_ky IS NULL OR yeu_cau_ky IN ('chu_ky_so', 'ky_tay', 'khong')),
  cach_nop text[] NOT NULL DEFAULT '{}',
  xac_minh_luc timestamptz,
  trang_thai text NOT NULL DEFAULT 'needs_review' CHECK (trang_thai IN ('verified', 'superseded', 'needs_review', 'unsupported')),
  ghi_chu text,
  -- "verified" phải có nguồn và lúc đối chiếu; không ai được đánh dấu tin cậy suông.
  CHECK (trang_thai <> 'verified' OR (nguon_url IS NOT NULL AND xac_minh_luc IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.co_quan (
  khoa text PRIMARY KEY CHECK (khoa ~ '^[a-z0-9_]{2,60}$'),
  ten text NOT NULL,
  loai text NOT NULL CHECK (loai IN ('thue', 'dang_ky_kinh_doanh', 'ngan_hang', 'khac')),
  dia_ban text,
  url_chinh_thuc text CHECK (url_chinh_thuc IS NULL OR url_chinh_thuc ~ '^https://'),
  url_cong text CHECK (url_cong IS NULL OR url_cong ~ '^https://'),
  kenh_nop text[] NOT NULL DEFAULT '{}',
  thu_tuc_ho_tro text[] NOT NULL DEFAULT '{}',
  nguon jsonb NOT NULL DEFAULT '[]'::jsonb,
  xac_minh_luc timestamptz
);

/*
 * Nạp sổ mẫu từ danh mục thủ tục đã cào (`thu_tuc_thue.mau_to_khai`). Tất cả ở `needs_review`: tên mẫu
 * có trong danh mục cổng không có nghĩa là MIMI đã có tệp mẫu và đối chiếu hiệu lực. 01/TKN-CNKD đã bị
 * thay từ 01/07/2026 (xem `luat/to-khai.ts` → MAU_DA_THAY) nên ghi `superseded`.
 */
INSERT INTO public.mau_bieu_chinh_thuc (ma_mau, thu_tuc_ma, co_quan, trang_thai, ghi_chu)
SELECT m, array_agg(DISTINCT t.ma), 'Cơ quan thuế', 'needs_review',
       'Nạp từ danh mục thủ tục trên Cổng dịch vụ công thuế; chưa có tệp mẫu, chưa đối chiếu hiệu lực.'
FROM public.thu_tuc_thue t, unnest(t.mau_to_khai) m
WHERE char_length(m) BETWEEN 2 AND 40
GROUP BY m
ON CONFLICT (ma_mau) DO NOTHING;
UPDATE public.mau_bieu_chinh_thuc
   SET trang_thai = 'superseded', hieu_luc_den = '2026-06-30',
       ghi_chu = 'Bị thay từ 01/07/2026 (Thông tư 89/2026). MIMI chặn xuất mẫu này — xem luat/to-khai.ts.'
 WHERE ma_mau = '01/TKN-CNKD';

/*
 * Danh bạ cơ quan: CHỈ những gì đã có nguồn. Cổng dịch vụ công thuế là đường dẫn MIMI đã dùng và cào
 * dữ liệu từ đó (`scripts/cao-du-lieu`). Không nạp số điện thoại, địa chỉ, số tài khoản nào.
 */
INSERT INTO public.co_quan (khoa, ten, loai, url_cong, kenh_nop, thu_tuc_ho_tro, nguon, xac_minh_luc)
VALUES ('cong_dvc_thue', 'Cổng dịch vụ công — Cục Thuế', 'thue', 'https://dichvucong.gdt.gov.vn/tthc/homelogin',
        ARRAY['truc_tuyen'], ARRAY(SELECT ma FROM public.thu_tuc_thue ORDER BY ma),
        '[{"loai":"cao_du_lieu","url":"https://dichvucong.gdt.gov.vn/tthc/homelogin","luc":"2026-09-25"}]'::jsonb, '2026-09-25')
ON CONFLICT (khoa) DO NOTHING;

-- ── RLS: thành viên đọc, không ai ghi từ trình duyệt ─────────────────────────────────────────────
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['ho_so_viec', 'hanh_trinh', 'buoc_hanh_trinh', 'tai_lieu', 'phien_ban_tai_lieu', 'duyet_tai_lieu', 'nhat_ky_thay_doi']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Thành viên công ty đọc ' || b, b);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))',
      'Thành viên công ty đọc ' || b, b);
  END LOOP;
END $$;

ALTER TABLE public.mau_bieu_chinh_thuc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Người đăng nhập đọc sổ mẫu biểu" ON public.mau_bieu_chinh_thuc;
CREATE POLICY "Người đăng nhập đọc sổ mẫu biểu" ON public.mau_bieu_chinh_thuc FOR SELECT TO authenticated USING (true);
ALTER TABLE public.co_quan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Người đăng nhập đọc danh bạ cơ quan" ON public.co_quan;
CREATE POLICY "Người đăng nhập đọc danh bạ cơ quan" ON public.co_quan FOR SELECT TO authenticated USING (true);

-- Kho tệp tài liệu: riêng tư; thành viên đọc thư mục công ty mình; chỉ máy chủ ghi.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tai-lieu', 'tai-lieu', false, 5242880, ARRAY['text/html', 'application/pdf', 'application/json'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Thành viên đọc tài liệu công ty mình" ON storage.objects;
CREATE POLICY "Thành viên đọc tài liệu công ty mình" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tai-lieu'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.companies WHERE user_id = auth.uid()
    UNION SELECT company_id::text FROM public.thanh_vien_cong_ty WHERE user_id = auth.uid()
  )
);

COMMENT ON TABLE public.ho_so_viec IS 'Một chuyện cần giải quyết (compliance case). Bước giải quyết ở buoc_hanh_trinh của hành trình trỏ tới nó.';
COMMENT ON TABLE public.hanh_trinh IS 'Hành trình có hướng dẫn: hỏi từng dữ kiện một, mở khoá từng bước. Chỉ máy chủ ghi.';
COMMENT ON TABLE public.tai_lieu IS 'Thư viện Tài liệu & Chứng từ. Nội dung ở phien_ban_tai_lieu (bất biến) + kho tai-lieu.';
COMMENT ON TABLE public.nhat_ky_thay_doi IS 'Dấu vết kiểm toán chỉ ghi thêm: ai, lúc nào, trước, sau, nguồn, bằng chứng.';
