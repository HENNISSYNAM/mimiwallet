-- Sàn cho vay ngang hàng, theo Nghị định 94/2025/NĐ-CP.
--
-- GIỚI HẠN PHÁP LÝ ĐẶT CẢ Ở TẦNG CSDL, KHÔNG CHỈ Ở GIAO DIỆN. Ràng buộc CHECK
-- dưới đây lặp lại đúng các con số trong `src/lib/vayNgangHang.ts`. Lặp là cố
-- ý: giao diện có thể bị bỏ qua (gọi thẳng API, script, lỗi lập trình), còn
-- CHECK thì không. Đây là loại quy tắc mà một lần lọt là một khoản vay trái
-- quy định đã tồn tại trong sổ.
--
-- Nếu NHNN đổi hạn mức thì phải sửa CẢ HAI chỗ. Ghi chú này nằm ở cả hai file.

CREATE TABLE public.p2p_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Trần 100 triệu cho một bên đi vay tại một giải pháp.
  so_tien BIGINT NOT NULL CHECK (so_tien > 0 AND so_tien <= 100000000),
  -- Hợp đồng vay không quá 02 năm.
  ky_han_ngay INT NOT NULL CHECK (ky_han_ngay > 0 AND ky_han_ngay <= 730),

  lai_suat_nam NUMERIC(5,2) NOT NULL CHECK (lai_suat_nam >= 0 AND lai_suat_nam <= 100),
  muc_dich TEXT,

  trang_thai TEXT NOT NULL DEFAULT 'nhap'
    CHECK (trang_thai IN ('nhap','dang_goi_von','du_von','da_giai_ngan','da_tat_toan','huy')),

  -- Tổng số tiền các bên cho vay đã cam kết. Không bao giờ vượt số tiền cần.
  da_gop BIGINT NOT NULL DEFAULT 0 CHECK (da_gop >= 0),
  CONSTRAINT da_gop_khong_vuot_so_tien CHECK (da_gop <= so_tien),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.p2p_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.p2p_listings(id) ON DELETE CASCADE,

  -- Bên cho vay là cá nhân (user) hoặc pháp nhân (company). Đúng một trong hai.
  lender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lender_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  CONSTRAINT mot_ben_cho_vay CHECK (
    (lender_user_id IS NOT NULL AND lender_company_id IS NULL) OR
    (lender_user_id IS NULL AND lender_company_id IS NOT NULL)
  ),

  so_tien BIGINT NOT NULL CHECK (so_tien > 0),
  trang_thai TEXT NOT NULL DEFAULT 'cam_ket'
    CHECK (trang_thai IN ('cam_ket','da_chuyen','da_hoan','huy')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX p2p_listings_trang_thai_idx ON public.p2p_listings (trang_thai, created_at DESC);
CREATE INDEX p2p_commitments_listing_idx ON public.p2p_commitments (listing_id);

ALTER TABLE public.p2p_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_commitments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: đây là chỗ sàn khác mọi bảng khác trong dự án.
--
-- Mọi bảng khác đều theo một luật: chỉ thấy dữ liệu công ty mình. Sàn thì không
-- thể như vậy — bên cho vay BẮT BUỘC phải nhìn được khoản vay của người khác,
-- nếu không thì không có sàn nào cả.
--
-- Nên tách làm hai: bản nháp và khoản đã huỷ chỉ chủ nó thấy; khoản đang gọi
-- vốn thì mọi người dùng đã đăng nhập đều thấy. Ranh giới nằm ở `trang_thai`
-- chứ không ở quyền, và người đăng khoản vay tự quyết định lúc nào nó bước qua
-- ranh giới đó.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Chu khoan vay thay tat ca cua minh"
  ON public.p2p_listings FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Ai cung thay khoan dang goi von"
  ON public.p2p_listings FOR SELECT TO authenticated
  USING (trang_thai IN ('dang_goi_von','du_von'));

CREATE POLICY "Chu khoan vay tu dang"
  ON public.p2p_listings FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Chu khoan vay tu sua"
  ON public.p2p_listings FOR UPDATE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Cam kết: bên cho vay thấy cam kết của mình; chủ khoản vay thấy mọi cam kết
-- vào khoản của mình. Không ai thấy cam kết của người thứ ba.
CREATE POLICY "Ben cho vay thay cam ket cua minh"
  ON public.p2p_commitments FOR SELECT TO authenticated
  USING (
    lender_user_id = auth.uid()
    OR lender_company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Chu khoan vay thay cam ket vao khoan cua minh"
  ON public.p2p_commitments FOR SELECT TO authenticated
  USING (
    listing_id IN (
      SELECT l.id FROM public.p2p_listings l
      JOIN public.companies c ON c.id = l.company_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Ben cho vay tu tao cam ket"
  ON public.p2p_commitments FOR INSERT TO authenticated
  WITH CHECK (
    lender_user_id = auth.uid()
    OR lender_company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Không được đi vay trên chính sàn của mình (Nghị định 94).
--
-- Ở tầng ứng dụng đã có `duocLamBenDiVay()`, nhưng cùng lý do với CHECK ở trên:
-- một quy tắc chỉ sống ở giao diện là một quy tắc sẽ bị bỏ qua ít nhất một lần.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.p2p_khong_tu_cho_vay()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chu_khoan_vay UUID;
BEGIN
  SELECT c.user_id INTO chu_khoan_vay
  FROM public.p2p_listings l
  JOIN public.companies c ON c.id = l.company_id
  WHERE l.id = NEW.listing_id;

  IF chu_khoan_vay IS NOT NULL AND chu_khoan_vay = auth.uid() THEN
    RAISE EXCEPTION 'Khong the tu cho vay khoan vay cua chinh minh';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p2p_commitments_khong_tu_cho_vay
  BEFORE INSERT ON public.p2p_commitments
  FOR EACH ROW EXECUTE FUNCTION public.p2p_khong_tu_cho_vay();
