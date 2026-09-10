-- Lớp kiểm soát chi cho agent AI của doanh nghiệp.
--
-- Agent (một bot, một quy trình tự động, một trợ lý AI) xin chi qua MIMI. MIMI
-- xét theo chính sách chủ doanh nghiệp đặt, đưa người duyệt khi cần, dựng lệnh
-- trả VietQR, rồi đối soát với sao kê để biết tiền đã đi thật.
--
-- MIMI KHÔNG GIỮ TIỀN. Không bảng nào ở đây có cột "số dư". Bảng
-- `device_wallets` cũ có — một con số trong database không có đồng tiền nào
-- đứng sau, và chính nó là lý do thiết kế này bắt đầu lại từ đầu.
--
-- MỌI GHI ĐI QUA EDGE FUNCTION `tac-tu`. Người dùng chỉ có quyền ĐỌC qua RLS.
-- Lý do: khoá agent phải băm ở máy chủ, quyết định chi phải chạy bộ luật ở máy
-- chủ, và nhật ký phải được ghi cùng lúc với thay đổi — không cái nào trong ba
-- điều đó giữ được nếu trình duyệt tự ghi thẳng vào bảng.

CREATE TABLE IF NOT EXISTS public.tac_tu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ten text NOT NULL CHECK (char_length(ten) BETWEEN 2 AND 80),
  mo_ta text,
  -- Không có 'da_xoa'. Agent thôi dùng thì thu hồi, không xoá: các khoản chi nó
  -- từng xin phải còn trỏ về được một cái tên.
  trang_thai text NOT NULL DEFAULT 'hoat_dong'
    CHECK (trang_thai IN ('hoat_dong', 'tam_dung', 'thu_hoi')),
  khoa_bam text NOT NULL UNIQUE CHECK (khoa_bam ~ '^[0-9a-f]{64}$'),
  khoa_hien text NOT NULL,
  dung_lan_cuoi timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tac_tu_company_idx ON public.tac_tu (company_id);

-- Mặc định chặt: mọi khoản phải có người duyệt (ngưỡng 0), chỉ chi cho người
-- nhận đã duyệt. Chủ doanh nghiệp nới ra khi đã tin agent, không phải ngược lại.
CREATE TABLE IF NOT EXISTS public.chinh_sach_chi (
  tac_tu_id uuid PRIMARY KEY REFERENCES public.tac_tu(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  han_muc_moi_lan bigint NOT NULL DEFAULT 2000000 CHECK (han_muc_moi_lan >= 0),
  han_muc_ngay bigint NOT NULL DEFAULT 5000000 CHECK (han_muc_ngay >= 0),
  han_muc_thang bigint NOT NULL DEFAULT 50000000 CHECK (han_muc_thang >= 0),
  nguong_can_duyet bigint NOT NULL DEFAULT 0 CHECK (nguong_can_duyet >= 0),
  nhom_chi_duoc_phep text[],
  chi_tra_nguoi_nhan_da_duyet boolean NOT NULL DEFAULT true,
  het_han timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (han_muc_moi_lan <= han_muc_ngay AND han_muc_ngay <= han_muc_thang)
);

CREATE TABLE IF NOT EXISTS public.nguoi_nhan_duoc_phep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ngan_hang_bin text NOT NULL CHECK (ngan_hang_bin ~ '^\d{6}$'),
  so_tai_khoan text NOT NULL CHECK (so_tai_khoan ~ '^\d{6,19}$'),
  ten_chu_tai_khoan text NOT NULL CHECK (char_length(ten_chu_tai_khoan) BETWEEN 2 AND 120),
  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, ngan_hang_bin, so_tai_khoan)
);

CREATE TABLE IF NOT EXISTS public.yeu_cau_chi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tac_tu_id uuid NOT NULL REFERENCES public.tac_tu(id),
  -- Khoá chống trùng do agent tự đặt. Agent gọi lại vì mất mạng thì nhận lại
  -- đúng yêu cầu cũ, không sinh khoản chi thứ hai.
  ma_yeu_cau text CHECK (ma_yeu_cau IS NULL OR char_length(ma_yeu_cau) BETWEEN 1 AND 100),
  so_tien bigint NOT NULL CHECK (so_tien > 0),
  ngan_hang_bin text NOT NULL,
  so_tai_khoan text NOT NULL,
  ten_nguoi_nhan text,
  muc_dich text NOT NULL,
  nhom_chi text NOT NULL,
  so_hoa_don text,
  trang_thai text NOT NULL DEFAULT 'dang_xet'
    CHECK (trang_thai IN ('dang_xet', 'tu_choi', 'cho_duyet', 'da_duyet', 'da_chi', 'huy')),
  cach_quyet text CHECK (cach_quyet IN ('tu_dong', 'nguoi_duyet')),
  ly_do jsonb NOT NULL DEFAULT '[]'::jsonb,
  ma_tham_chieu text NOT NULL UNIQUE,
  nguoi_quyet uuid,
  quyet_luc timestamptz,
  het_han_luc timestamptz,
  -- Không khoá ngoại sang `transactions`: dòng sao kê có thể được nạp lại, và
  -- việc đó không được bị một khoản chi của agent chặn.
  giao_dich_id uuid,
  so_tien_thuc_chi bigint,
  da_chi_luc timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tac_tu_id, ma_yeu_cau)
);

CREATE INDEX IF NOT EXISTS yeu_cau_chi_tac_tu_luc_idx ON public.yeu_cau_chi (tac_tu_id, created_at);
CREATE INDEX IF NOT EXISTS yeu_cau_chi_company_trang_thai_idx ON public.yeu_cau_chi (company_id, trang_thai);

-- Nhật ký chỉ thêm. Không sửa được dòng nào, kể cả bằng service role.
CREATE TABLE IF NOT EXISTS public.nhat_ky_tac_tu (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tac_tu_id uuid REFERENCES public.tac_tu(id),
  yeu_cau_id uuid REFERENCES public.yeu_cau_chi(id),
  su_kien text NOT NULL,
  nguoi text NOT NULL CHECK (nguoi IN ('tac_tu', 'nguoi_dung', 'he_thong')),
  user_id uuid,
  chi_tiet jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nhat_ky_tac_tu_company_luc_idx ON public.nhat_ky_tac_tu (company_id, created_at DESC);

-- Chặn UPDATE. DELETE không chặn bằng trigger vì xoá tài khoản (xoá công ty,
-- cascade) phải chạy được; người dùng thường không có quyền DELETE qua RLS.
CREATE OR REPLACE FUNCTION public.nhat_ky_tac_tu_chi_them()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'nhat_ky_tac_tu chỉ được thêm, không được sửa';
END;
$$;

DROP TRIGGER IF EXISTS nhat_ky_tac_tu_khong_sua ON public.nhat_ky_tac_tu;
CREATE TRIGGER nhat_ky_tac_tu_khong_sua
  BEFORE UPDATE ON public.nhat_ky_tac_tu
  FOR EACH ROW EXECUTE FUNCTION public.nhat_ky_tac_tu_chi_them();

ALTER TABLE public.tac_tu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chinh_sach_chi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nguoi_nhan_duoc_phep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yeu_cau_chi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhat_ky_tac_tu ENABLE ROW LEVEL SECURITY;

-- Chỉ ĐỌC, và chỉ dữ liệu công ty mình. Không có policy INSERT/UPDATE/DELETE.
-- `khoa_bam` đọc được cũng không sao: là bản băm của khoá 158 bit.
CREATE POLICY "Xem agent của công ty mình" ON public.tac_tu FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Xem chính sách chi của công ty mình" ON public.chinh_sach_chi FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Xem người nhận được phép của công ty mình" ON public.nguoi_nhan_duoc_phep FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Xem yêu cầu chi của công ty mình" ON public.yeu_cau_chi FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Xem nhật ký agent của công ty mình" ON public.nhat_ky_tac_tu FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.yeu_cau_chi IS
  'Khoản chi agent xin. MIMI không chuyển tiền: da_duyet = được phép trả; da_chi = sao kê ngân hàng xác nhận tiền đã đi.';
COMMENT ON TABLE public.nhat_ky_tac_tu IS
  'Nhật ký chỉ thêm của mọi quyết định và thao tác liên quan agent.';
