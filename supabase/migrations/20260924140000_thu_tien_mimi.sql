-- Thu tiền của chính MIMI: tiền về tài khoản MIMI thì tự duyệt gói hoặc cộng lượt xuất tờ khai.
--
-- LỖ HỔNG ĐƯỢC VÁ (24/09/2026). Vòng đối soát thuê bao đọc tiền vào từ bảng `transactions` của
-- MỌI công ty. Bảng đó có chính sách "Users can insert own transactions": chủ công ty tự chèn được
-- một dòng tiền vào 149.000đ ghi mã hoá đơn của mình, và mười phút sau gói trả phí tự kích hoạt
-- — MIMI không nhận đồng nào. Không cần chèn tay cũng được: tự chuyển khoản giữa hai tài khoản
-- của chính mình (đã nối SePay) ghi mã hoá đơn là đủ.
--
-- Cách vá: tiền về tài khoản nhận của MIMI (`MIMI_BANK_ACCOUNT`) đi một đường riêng, vào bảng
-- `tien_ve_mimi` mà KHÔNG trình duyệt nào ghi được. Đối soát chỉ đọc bảng này.

CREATE TABLE IF NOT EXISTS public.tien_ve_mimi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nguon text NOT NULL DEFAULT 'sepay',
  -- Mã giao dịch của bên báo tiền (SePay gửi lại tới 7 lần): khoá chống ghi trùng.
  ma_giao_dich text NOT NULL,
  so_tien bigint NOT NULL CHECK (so_tien > 0),
  noi_dung text,
  ngay_giao_dich date NOT NULL,
  -- Hoá đơn mà khoản này đã trả. NULL = chưa khớp được hoá đơn nào (cần người xem).
  hoa_don_id uuid UNIQUE REFERENCES public.subscription_invoices(id) ON DELETE SET NULL,
  nhan_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nguon, ma_giao_dich)
);

-- Không có chính sách nào cho `authenticated`/`anon`: chỉ máy chủ (service role) đọc và ghi.
ALTER TABLE public.tien_ve_mimi ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tien_ve_mimi IS
  'Tiền vào tài khoản nhận của MIMI (doanh thu của MIMI). Chỉ máy chủ ghi. Nguồn duy nhất để kích hoạt gói và cộng lượt.';

-- Hoá đơn: trả cho gói tháng, hoặc mua N lượt xuất tờ khai.
ALTER TABLE public.subscription_invoices
  ADD COLUMN IF NOT EXISTS so_luot integer CHECK (so_luot IS NULL OR so_luot > 0),
  ADD COLUMN IF NOT EXISTS tien_ve_id uuid UNIQUE REFERENCES public.tien_ve_mimi(id) ON DELETE SET NULL;

-- ── Lượt xuất tờ khai: sổ cộng trừ, số dư = tổng ─────────────────────────────
--
-- Sổ chứ không phải một cột số dư: mỗi lần cộng, trừ đều để lại dòng — mua bằng hoá đơn nào,
-- trừ cho tờ khai kỳ nào. Khách hỏi "sao tôi hết lượt" thì có câu trả lời từng dòng.
CREATE TABLE IF NOT EXISTS public.luot_to_khai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thay_doi integer NOT NULL CHECK (thay_doi <> 0),
  ly_do text NOT NULL CHECK (ly_do IN ('mua', 'xuat')),
  -- Mỗi hoá đơn cộng lượt đúng một lần, kể cả khi đối soát chạy hai lần cùng lúc.
  hoa_don_id uuid UNIQUE REFERENCES public.subscription_invoices(id) ON DELETE SET NULL,
  -- "mẫu|năm|kỳ|quý": một kỳ khai chỉ bị tính tiền một lần; sửa số rồi xuất lại thì miễn phí.
  ky_khoa text,
  to_khai_nhap_id uuid REFERENCES public.to_khai_nhap(id) ON DELETE SET NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT luot_to_khai_dung_chieu CHECK (
    (ly_do = 'mua' AND thay_doi > 0 AND hoa_don_id IS NOT NULL) OR
    (ly_do = 'xuat' AND thay_doi = -1 AND ky_khoa IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS luot_to_khai_mot_lan_moi_ky
  ON public.luot_to_khai (company_id, ky_khoa) WHERE ly_do = 'xuat';
CREATE INDEX IF NOT EXISTS luot_to_khai_company_idx ON public.luot_to_khai (company_id, tao_luc DESC);

ALTER TABLE public.luot_to_khai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thành viên công ty đọc luot_to_khai" ON public.luot_to_khai
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Bản nháp đã xuất: lúc nào, trả bằng gì.
ALTER TABLE public.to_khai_nhap
  ADD COLUMN IF NOT EXISTS da_xuat_luc timestamptz,
  ADD COLUMN IF NOT EXISTS cach_tra text CHECK (cach_tra IS NULL OR cach_tra IN ('goi', 'luot', 'da_tra_ky_nay'));

/*
 * Trừ một lượt để xuất tờ khai của một kỳ — nguyên tử.
 *
 * Khoá dòng công ty trước khi đếm, để hai lần bấm "Xuất" cùng lúc không cùng thấy còn 1 lượt rồi
 * cùng trừ. Kỳ đã trả rồi thì không trừ nữa. Trả về: 'da_tra_ky_nay' | 'da_tru' | 'het_luot'.
 * Chỉ máy chủ gọi được.
 */
CREATE OR REPLACE FUNCTION public.tru_luot_to_khai(p_company uuid, p_ky_khoa text, p_to_khai_nhap uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  con integer;
BEGIN
  PERFORM 1 FROM public.companies WHERE id = p_company FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.luot_to_khai WHERE company_id = p_company AND ly_do = 'xuat' AND ky_khoa = p_ky_khoa) THEN
    RETURN 'da_tra_ky_nay';
  END IF;
  SELECT COALESCE(SUM(thay_doi), 0) INTO con FROM public.luot_to_khai WHERE company_id = p_company;
  IF con < 1 THEN
    RETURN 'het_luot';
  END IF;
  INSERT INTO public.luot_to_khai (company_id, thay_doi, ly_do, ky_khoa, to_khai_nhap_id)
  VALUES (p_company, -1, 'xuat', p_ky_khoa, p_to_khai_nhap);
  RETURN 'da_tru';
END;
$$;

REVOKE ALL ON FUNCTION public.tru_luot_to_khai(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tru_luot_to_khai(uuid, text, uuid) TO service_role;
