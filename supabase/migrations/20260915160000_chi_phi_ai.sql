-- Chi phí AI: chi phí THẬT từ nhà cung cấp, không ước tính từ số token.
--
-- Hai đường vào, người dùng chọn (15/09/2026):
--   1. Nhập file CSV xuất từ trang chi phí của nhà cung cấp — mặc định, không lưu khoá.
--   2. Admin API key (Anthropic, OpenAI) — tuỳ chọn, để tự đồng bộ. Khoá này có quyền
--      quản trị cả tổ chức của khách, nên chỉ lưu dạng mã hoá (PQC, cùng cơ chế token
--      ngân hàng) và KHÔNG có policy SELECT: trình duyệt không bao giờ đọc được cột khoá.
-- Gemini không có API chi phí (chỉ Cloud Billing), nên chỉ đi đường nhập file.
--
-- Mọi ghi đi qua edge function `chi-phi-ai` bằng service role. Tiền lưu bằng USD —
-- đơn vị nhà cung cấp tính; MIMI không tự quy đổi vì không có nguồn tỷ giá đáng tin.

CREATE TABLE public.ket_noi_chi_phi_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- OpenRouter: Management key, đọc cả tiền lẫn token từ /api/v1/activity.
  nha_cung_cap text NOT NULL CHECK (nha_cung_cap IN ('anthropic', 'openai', 'openrouter')),
  -- EncryptedBlob. NULL sau khi gỡ: khoá không còn dùng thì giữ lại chỉ thêm rủi ro.
  khoa_enc jsonb,
  khoa_hien text NOT NULL CHECK (char_length(khoa_hien) BETWEEN 4 AND 40),
  trang_thai text NOT NULL DEFAULT 'hoat_dong' CHECK (trang_thai IN ('hoat_dong', 'loi', 'da_go')),
  dong_bo_luc timestamptz,
  du_lieu_toi date,
  loi_cuoi text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (trang_thai = 'da_go' OR khoa_enc IS NOT NULL)
);
-- Mỗi nhà cung cấp một kết nối đang dùng; dòng đã gỡ giữ lại làm dấu vết.
CREATE UNIQUE INDEX ket_noi_chi_phi_ai_mot_dang_dung
  ON public.ket_noi_chi_phi_ai (company_id, nha_cung_cap) WHERE trang_thai <> 'da_go';

CREATE TABLE public.lo_nhap_chi_phi_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nha_cung_cap text NOT NULL CHECK (nha_cung_cap IN ('anthropic', 'openai', 'gemini', 'openrouter', 'khac')),
  ten_file text NOT NULL CHECK (char_length(ten_file) BETWEEN 1 AND 200),
  so_dong integer NOT NULL CHECK (so_dong >= 0),
  tu_ngay date NOT NULL,
  den_ngay date NOT NULL,
  tong_usd numeric(18, 6) NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (den_ngay >= tu_ngay)
);
CREATE INDEX lo_nhap_chi_phi_ai_theo_khoang
  ON public.lo_nhap_chi_phi_ai (company_id, nha_cung_cap, tu_ngay, den_ngay);

CREATE TABLE public.chi_phi_ai (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nha_cung_cap text NOT NULL CHECK (nha_cung_cap IN ('anthropic', 'openai', 'gemini', 'openrouter', 'khac')),
  -- Ngày theo UTC, đúng cách nhà cung cấp chia bucket.
  ngay date NOT NULL,
  hang_muc text NOT NULL DEFAULT '' CHECK (char_length(hang_muc) <= 200),
  du_an text NOT NULL DEFAULT '' CHECK (char_length(du_an) <= 200),
  -- Có thể âm: khoản hoàn/credit trong file xuất của nhà cung cấp.
  so_tien_usd numeric(18, 6) NOT NULL,
  nguon text NOT NULL CHECK (nguon IN ('api', 'nhap_file')),
  lo_nhap_id uuid REFERENCES public.lo_nhap_chi_phi_ai(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((nguon = 'nhap_file') = (lo_nhap_id IS NOT NULL))
);
CREATE UNIQUE INDEX chi_phi_ai_api_khong_trung
  ON public.chi_phi_ai (company_id, nha_cung_cap, ngay, hang_muc, du_an) WHERE nguon = 'api';
CREATE UNIQUE INDEX chi_phi_ai_file_khong_trung
  ON public.chi_phi_ai (lo_nhap_id, ngay, hang_muc, du_an) WHERE nguon = 'nhap_file';
CREATE INDEX chi_phi_ai_theo_ngay ON public.chi_phi_ai (company_id, ngay);

CREATE TABLE public.ngan_sach_chi_phi_ai (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  han_muc_thang_usd numeric(18, 2) NOT NULL CHECK (han_muc_thang_usd > 0),
  canh_bao_phan_tram integer NOT NULL DEFAULT 80 CHECK (canh_bao_phan_tram BETWEEN 1 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Số token theo ngày và model, từ Usage API của nhà cung cấp. `token_vao` gồm cả phần
-- đọc cache; `token_vao_cache` là phần đó. Chỉ đường API: file chi phí không có token.
CREATE TABLE public.token_ai (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nha_cung_cap text NOT NULL CHECK (nha_cung_cap IN ('anthropic', 'openai', 'openrouter')),
  ngay date NOT NULL,
  model text NOT NULL DEFAULT '' CHECK (char_length(model) <= 200),
  token_vao bigint NOT NULL DEFAULT 0 CHECK (token_vao >= 0),
  token_vao_cache bigint NOT NULL DEFAULT 0 CHECK (token_vao_cache >= 0 AND token_vao_cache <= token_vao),
  token_ra bigint NOT NULL DEFAULT 0 CHECK (token_ra >= 0),
  so_lan_goi bigint NOT NULL DEFAULT 0 CHECK (so_lan_goi >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX token_ai_khong_trung ON public.token_ai (company_id, nha_cung_cap, ngay, model);

-- Bảng giá công khai, dùng chung mọi công ty. Nguồn: OpenRouter /api/v1/models
-- (giá bán lại của OpenRouter, USD). Chỉ edge function `chi-phi-ai` ghi.
CREATE TABLE public.bang_gia_model (
  model_id text PRIMARY KEY CHECK (char_length(model_id) BETWEEN 1 AND 200),
  ten text NOT NULL CHECK (char_length(ten) BETWEEN 1 AND 200),
  gia_vao_usd_moi_trieu numeric(18, 6) NOT NULL CHECK (gia_vao_usd_moi_trieu >= 0),
  gia_ra_usd_moi_trieu numeric(18, 6) NOT NULL CHECK (gia_ra_usd_moi_trieu >= 0),
  nguon text NOT NULL DEFAULT 'openrouter' CHECK (nguon IN ('openrouter')),
  lay_luc timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bang_gia_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Xem token AI của công ty mình" ON public.token_ai FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Ai đăng nhập cũng xem được bảng giá model" ON public.bang_gia_model FOR SELECT TO authenticated
  USING (true);

ALTER TABLE public.ket_noi_chi_phi_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lo_nhap_chi_phi_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chi_phi_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngan_sach_chi_phi_ai ENABLE ROW LEVEL SECURITY;

-- Chỉ ĐỌC, chỉ công ty mình. `ket_noi_chi_phi_ai` cố ý không có policy nào.
CREATE POLICY "Xem chi phí AI của công ty mình" ON public.chi_phi_ai FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Xem lần nhập chi phí AI của công ty mình" ON public.lo_nhap_chi_phi_ai FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Xem ngân sách chi phí AI của công ty mình" ON public.ngan_sach_chi_phi_ai FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.chi_phi_ai IS
  'Chi phí AI theo ngày (UTC), USD, lấy từ Cost API của nhà cung cấp (nguon=api) hoặc file người dùng tải lên (nguon=nhap_file). Không ước tính.';
COMMENT ON COLUMN public.ket_noi_chi_phi_ai.khoa_enc IS
  'Admin API key đã mã hoá. Không policy SELECT: chỉ edge function chi-phi-ai đọc bằng service role.';
