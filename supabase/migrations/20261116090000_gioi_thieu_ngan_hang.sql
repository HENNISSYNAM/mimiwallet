-- CƠ HỘI PHÁT TRIỂN / GIỚI THIỆU NGÂN HÀNG (16/11/2026). Xem supabase/functions/_shared/gioi-thieu-ngan-hang/.
--
-- Luật Bảo vệ dữ liệu cá nhân 2025 + NĐ 356/2025: dữ liệu tài chính là nhạy cảm; không mua bán dữ liệu; đồng ý cụ thể,
-- không đánh dấu sẵn, có công bố việc phân tích. MIMI KHÔNG gửi danh sách người cho ngân hàng nào. Một gói giới thiệu
-- chỉ tồn tại SAU một lời đồng ý của chủ / quản trị cho MỘT gói dịch vụ, chứa đúng các trường đã chọn, chỉ cho pháp nhân
-- ngân hàng tại Việt Nam. Không phải thông tin tín dụng (NĐ 58/2021), không phải điểm.
--
-- 1. goi_ngan_hang       : danh mục gói (cấu hình, không gắn cứng ngân hàng). Gói CHƯA xác minh không được mang điều
--                          kiện/ngưỡng (CHECK); gói đã xác minh phải có URL nguồn công khai. Không có nhóm đầu tư / bảo hiểm.
-- 2. dong_y_gioi_thieu   : lời đồng ý của chủ (phạm vi dữ liệu, mục đích, hạn, thu hồi).
-- 3. gioi_thieu_ngan_hang: gói giới thiệu (draft → sent_by_owner do chủ bấm Gửi → withdrawn khi rút; rút thì xoá nội dung).
--
-- Chỉ edge function `gioi-thieu-ngan-hang` (service role) ghi. Trình duyệt chỉ đọc: chủ sở hữu / quản trị KHÔNG bị giới
-- hạn cơ sở, còn là thành viên.

-- Chủ sở hữu hoặc quản trị thấy cả công ty (không bị gán một cơ sở). SECURITY DEFINER để policy không đọc lại bảng thành
-- viên qua RLS của nó.
CREATE OR REPLACE FUNCTION public.la_chu_quan_tri_ca_cong_ty(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thanh_vien_cong_ty t
    WHERE t.company_id = p_company AND t.user_id = auth.uid()
      AND t.vai_tro IN ('chu_so_huu', 'quan_tri') AND t.co_so_id IS NULL
  );
$$;
REVOKE EXECUTE ON FUNCTION public.la_chu_quan_tri_ca_cong_ty(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.la_chu_quan_tri_ca_cong_ty(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.goi_ngan_hang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma text NOT NULL UNIQUE CHECK (ma ~ '^[a-z0-9_]{3,80}$'),
  ngan_hang text NOT NULL CHECK (char_length(btrim(ngan_hang)) BETWEEN 2 AND 120),
  -- Pháp nhân nhận dữ liệu: phải ở Việt Nam (không chuyển dữ liệu ra nước ngoài).
  phap_nhan_nhan text NOT NULL CHECK (char_length(btrim(phap_nhan_nhan)) BETWEEN 2 AND 200),
  pham_vi_lanh_tho text NOT NULL DEFAULT 'viet_nam' CHECK (pham_vi_lanh_tho = 'viet_nam'),
  ten_goi text NOT NULL CHECK (char_length(btrim(ten_goi)) BETWEEN 2 AND 200),
  -- Không có 'bao_hiem' và không có nhóm đầu tư: MIMI không ghép sản phẩm đầu tư hay bảo hiểm.
  nhu_cau text NOT NULL CHECK (nhu_cau IN ('von_luu_dong', 'tai_khoan_doanh_nghiep', 'ngoai_te', 'tien_gui', 'uu_tien_chu')),
  mo_ta text NOT NULL DEFAULT '' CHECK (char_length(mo_ta) <= 1000),
  tieu_chi jsonb NULL CHECK (tieu_chi IS NULL OR jsonb_typeof(tieu_chi) = 'object'),
  da_xac_minh boolean NOT NULL DEFAULT false,
  nguon text NULL CHECK (nguon IS NULL OR nguon ~ '^https://'),
  dang_hoat_dong boolean NOT NULL DEFAULT true,
  -- Ghi chú nội bộ (không trả qua API): nguồn, việc còn phải xác minh.
  ghi_chu text NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  -- Chưa xác minh thì KHÔNG được có ngưỡng/điều kiện; đã xác minh thì phải có nguồn công khai.
  CONSTRAINT goi_chua_xac_minh_khong_nguong CHECK (da_xac_minh OR tieu_chi IS NULL),
  CONSTRAINT goi_xac_minh_co_nguon CHECK (NOT da_xac_minh OR nguon IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.dong_y_gioi_thieu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.goi_ngan_hang(id) ON DELETE RESTRICT,
  -- Phạm vi dữ liệu chủ đã chọn: ít nhất một trường, chỉ trong tập cho phép.
  data_scope text[] NOT NULL CHECK (
    cardinality(data_scope) BETWEEN 1 AND 11
    AND data_scope <@ ARRAY['muc_tang_truong', 'nhu_cau', 'khoang_doanh_thu', 'dau_hieu', 'doanh_thu_12_thang',
      'ten_doanh_nghiep', 'ma_so_thue', 'tinh_thanh', 'nganh', 'lien_he_email', 'lien_he_dien_thoai']::text[]
  ),
  purpose text NOT NULL CHECK (char_length(purpose) BETWEEN 10 AND 1000),
  -- Liên hệ chỉ khi chủ yêu cầu (NĐ 91/2020: không gọi khi chưa đồng ý).
  yeu_cau_lien_he boolean NOT NULL DEFAULT false,
  cong_bo_phien_ban text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  revoked_by uuid NULL,
  UNIQUE (id, company_id),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '91 days'),
  CHECK (yeu_cau_lien_he OR NOT (data_scope && ARRAY['lien_he_email', 'lien_he_dien_thoai']::text[]))
);
CREATE INDEX IF NOT EXISTS dong_y_gioi_thieu_company_idx ON public.dong_y_gioi_thieu (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gioi_thieu_ngan_hang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Không có gói nếu không có đồng ý CỦA CÙNG công ty.
  consent_id uuid NOT NULL,
  offer_id uuid NOT NULL REFERENCES public.goi_ngan_hang(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_by_owner', 'withdrawn')),
  -- Bản chụp ĐÚNG các trường đã đồng ý; NULL sau khi rút.
  payload jsonb NULL CHECK (payload IS NULL OR octet_length(payload::text) < 50000),
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  sent_by uuid NULL,
  withdrawn_at timestamptz NULL,
  UNIQUE (consent_id),
  FOREIGN KEY (consent_id, company_id) REFERENCES public.dong_y_gioi_thieu (id, company_id) ON DELETE CASCADE,
  CHECK (status <> 'withdrawn' OR (payload IS NULL AND withdrawn_at IS NOT NULL)),
  CHECK (status = 'withdrawn' OR payload IS NOT NULL),
  CHECK (status <> 'sent_by_owner' OR sent_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS gioi_thieu_ngan_hang_company_idx ON public.gioi_thieu_ngan_hang (company_id, created_at DESC);

ALTER TABLE public.goi_ngan_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dong_y_gioi_thieu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gioi_thieu_ngan_hang ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.goi_ngan_hang, public.dong_y_gioi_thieu, public.gioi_thieu_ngan_hang FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.goi_ngan_hang, public.dong_y_gioi_thieu, public.gioi_thieu_ngan_hang TO authenticated;
GRANT ALL ON public.goi_ngan_hang, public.dong_y_gioi_thieu, public.gioi_thieu_ngan_hang TO service_role;

DROP POLICY IF EXISTS "Người đăng nhập đọc gói đang hoạt động" ON public.goi_ngan_hang;
CREATE POLICY "Người đăng nhập đọc gói đang hoạt động" ON public.goi_ngan_hang
  FOR SELECT TO authenticated
  USING (dang_hoat_dong);

DROP POLICY IF EXISTS "Chủ hoặc quản trị đọc đồng ý giới thiệu" ON public.dong_y_gioi_thieu;
CREATE POLICY "Chủ hoặc quản trị đọc đồng ý giới thiệu" ON public.dong_y_gioi_thieu
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND public.la_chu_quan_tri_ca_cong_ty(company_id));

DROP POLICY IF EXISTS "Chủ hoặc quản trị đọc gói giới thiệu" ON public.gioi_thieu_ngan_hang;
CREATE POLICY "Chủ hoặc quản trị đọc gói giới thiệu" ON public.gioi_thieu_ngan_hang
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND public.la_chu_quan_tri_ca_cong_ty(company_id));

-- Không policy INSERT/UPDATE/DELETE: trình duyệt không ghi thẳng; chỉ edge function (service role) ghi.

-- ── Danh mục khởi đầu: UOB Việt Nam (đối chiếu trang công khai ngày 16/11/2026) ─────────────────────────────────
-- Chỉ ghi ngưỡng đã thấy trên trang công khai. Gói chưa xác minh: tieu_chi NULL (CHECK chặn), có TODO trong ghi_chu.
-- Quỹ của UOBAM và bảo hiểm Prudential qua UOB có tồn tại, nhưng MIMI KHÔNG ghép sản phẩm đầu tư / bảo hiểm: chúng chỉ
-- được nhắc trong ghi_chu nội bộ của gói Privilege như việc ngân hàng có thể tự trao đổi, không bao giờ hiện là gợi ý.
INSERT INTO public.goi_ngan_hang (ma, ngan_hang, phap_nhan_nhan, ten_goi, nhu_cau, mo_ta, tieu_chi, da_xac_minh, nguon, ghi_chu) VALUES
  ('uob_vn_privilege', 'UOB Việt Nam', 'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)',
   'UOB Privilege Banking (Khách hàng ưu tiên)', 'uu_tien_chu',
   'Dịch vụ khách hàng ưu tiên cho cá nhân: chuyên viên quan hệ riêng, ưu đãi tỷ giá và chuyển tiền ra nước ngoài.',
   '{"so_du_binh_quan_thang_toi_thieu": 1000000000, "mo_ta_dieu_kien": "Tổng số dư bình quân tháng tại UOB từ 1 tỷ đồng, hoặc điều kiện tương đương khác UOB công bố."}'::jsonb,
   true, 'https://www.uob.com.vn/privilege/index.page',
   'Nguồn: uob.com.vn/privilege (16/11/2026). Điều kiện thay thế công bố: phí bảo hiểm Prudential qua UOB từ 150 triệu (hợp đồng từ 01/2025) — KHÔNG hiện cho chủ (MIMI không gợi ý bảo hiểm/đầu tư); ngân hàng có thể tự trao đổi.'),
  ('uob_vn_prvi_miles', 'UOB Việt Nam', 'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)',
   'Thẻ UOB PRVI Miles', 'uu_tien_chu',
   'Thẻ du lịch cho chủ doanh nghiệp hay đi lại: tích dặm, phòng chờ sân bay.',
   '{"thu_nhap_thang_toi_thieu": 35000000, "tuoi_toi_thieu": 21, "tinh_thanh": ["Hồ Chí Minh", "Hà Nội"], "mo_ta_dieu_kien": "Thu nhập từ 35 triệu đồng/tháng nhận qua tài khoản ngân hàng; từ 21 tuổi; cư trú tại TP. Hồ Chí Minh hoặc Hà Nội."}'::jsonb,
   true, 'https://www.uob.com.vn/personal/cards/credit-card/travel/prvi-miles-card.page',
   'Nguồn: trang thẻ PRVI Miles (16/11/2026).'),
  ('uob_vn_dn_tai_khoan', 'UOB Việt Nam', 'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)',
   'Tài khoản doanh nghiệp và UOB Infinity', 'tai_khoan_doanh_nghiep',
   'Tài khoản thanh toán doanh nghiệp, ngân hàng điện tử UOB Infinity, chi trả hàng loạt và nộp thuế điện tử.',
   NULL, true, 'https://www.uob.com.vn/business/index.page',
   'Xác minh: gói tồn tại cho mọi doanh nghiệp thành lập tại Việt Nam; UOB không công bố hạng SME hay ngưỡng doanh thu → không có tieu_chi.'),
  ('uob_vn_dn_von_luu_dong', 'UOB Việt Nam', 'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)',
   'Hạn mức ngắn hạn và tài trợ thương mại cho doanh nghiệp', 'von_luu_dong',
   'Hạn mức vay ngắn hạn, tài trợ thương mại và tài trợ chuỗi cung ứng cho doanh nghiệp thành lập tại Việt Nam.',
   NULL, true, 'https://www.uob.com.vn/business/finance/index.page',
   'Xác minh: gói tồn tại; không có ngưỡng công bố → không có tieu_chi.'),
  ('uob_vn_dn_ngoai_te', 'UOB Việt Nam', 'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)',
   'Ngoại hối và quản lý rủi ro tỷ giá cho doanh nghiệp', 'ngoai_te',
   'Mua bán ngoại tệ, quản lý rủi ro tỷ giá và thanh toán quốc tế cho doanh nghiệp.',
   NULL, true, 'https://www.uob.com.vn/business/index.page',
   'Xác minh: gói tồn tại; không có ngưỡng công bố.'),
  ('uob_vn_fdi_han_quoc', 'UOB Việt Nam', 'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)',
   'UOB FDI Advisory Unit (bàn Hàn Quốc)', 'ngoai_te',
   'Đơn vị tư vấn của UOB hỗ trợ doanh nghiệp có quan hệ với Hàn Quốc mở rộng hoạt động trong ASEAN; trung tâm Seoul mở ngày 27/03/2025.',
   '{"can_lien_quan_han_quoc": true}'::jsonb, true, 'https://www.uob.com.sg/uobgroup/newsroom/news-releases/2025/launch-of-korea-fdi-centre.page',
   'Dịch vụ, không có ngưỡng. Chỉ hiện khi dấu hiệu dòng tiền quốc tế có liên quan Hàn Quốc.'),
  ('uob_vn_tien_gui_draft', 'UOB Việt Nam', 'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)',
   'Tiền gửi cho doanh nghiệp (chờ xác minh)', 'tien_gui',
   'Tài khoản tiền gửi cho khoản tiền dư của doanh nghiệp.',
   NULL, false, NULL,
   'TODO: xác minh tên sản phẩm tiền gửi doanh nghiệp và điều kiện từ nguồn công khai của UOB Việt Nam; giữ tieu_chi NULL tới khi xác minh.')
ON CONFLICT (ma) DO NOTHING;
