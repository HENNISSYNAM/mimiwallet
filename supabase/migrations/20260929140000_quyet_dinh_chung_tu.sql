-- Quyết định của người duyệt cho khoản chi KHÔNG có chứng từ (29/09/2026).
--
-- Quy trình đối soát sao kê → chứng từ → ngoại lệ → người duyệt. Mỗi khoản chi thiếu chứng từ được xử lý
-- bằng một trong ba cách: gắn chứng từ (chung_tu_quet.giao_dich_id), đánh dấu chi cá nhân
-- (transaction_labels), hoặc QUYẾT ĐỊNH "không có chứng từ" kèm lý do — bảng này.
--
-- CHỈ THÊM: không sửa nội dung, không xoá. Hoàn tác = đánh dấu huy_luc/huy_boi (một lần). Nhật ký ai quyết,
-- lúc nào, lý do gì, ai hoàn tác — là chính các dòng của bảng. Mỗi khoản chi có tối đa một quyết định còn
-- hiệu lực (chỉ mục duy nhất có điều kiện). Ghi qua edge function `tro-ly` (service role), đã kiểm vai trò.

CREATE TABLE IF NOT EXISTS public.quyet_dinh_chung_tu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  ly_do text NOT NULL CHECK (ly_do IN ('luong_bao_hiem', 'thue_phi_nha_nuoc', 'phi_lai_ngan_hang', 'nguoi_ban_khong_xuat', 'khac')),
  ghi_chu text CHECK (ghi_chu IS NULL OR char_length(ghi_chu) <= 300),
  user_id uuid NOT NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  huy_luc timestamptz,
  huy_boi uuid,
  CHECK ((huy_luc IS NULL) = (huy_boi IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS quyet_dinh_chung_tu_mot_hieu_luc
  ON public.quyet_dinh_chung_tu (transaction_id) WHERE huy_luc IS NULL;
CREATE INDEX IF NOT EXISTS quyet_dinh_chung_tu_cong_ty ON public.quyet_dinh_chung_tu (company_id, tao_luc DESC);

ALTER TABLE public.quyet_dinh_chung_tu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Thành viên xem quyết định chứng từ" ON public.quyet_dinh_chung_tu;
CREATE POLICY "Thành viên xem quyết định chứng từ" ON public.quyet_dinh_chung_tu FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id));
-- Không có policy ghi: chỉ edge function (service role) ghi, sau khi kiểm vai trò.

-- Chỉ thêm: cấm xoá; cập nhật chỉ được đặt huy_luc/huy_boi một lần, không đổi gì khác.
CREATE OR REPLACE FUNCTION public.quyet_dinh_chung_tu_chi_them()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'quyet_dinh_chung_tu chỉ thêm: không xoá, hoàn tác bằng huy_luc';
  END IF;
  IF OLD.huy_luc IS NOT NULL THEN
    RAISE EXCEPTION 'Quyết định đã được hoàn tác, không sửa lại';
  END IF;
  IF NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.transaction_id <> OLD.transaction_id
     OR NEW.ly_do <> OLD.ly_do OR NEW.ghi_chu IS DISTINCT FROM OLD.ghi_chu OR NEW.user_id <> OLD.user_id
     OR NEW.tao_luc <> OLD.tao_luc THEN
    RAISE EXCEPTION 'quyet_dinh_chung_tu chỉ cho đặt huy_luc/huy_boi';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quyet_dinh_chung_tu_chi_them_trg ON public.quyet_dinh_chung_tu;
CREATE TRIGGER quyet_dinh_chung_tu_chi_them_trg BEFORE UPDATE OR DELETE ON public.quyet_dinh_chung_tu
  FOR EACH ROW EXECUTE FUNCTION public.quyet_dinh_chung_tu_chi_them();

COMMENT ON TABLE public.quyet_dinh_chung_tu IS
  'Người duyệt quyết định một khoản chi không có chứng từ (kèm lý do). Chỉ thêm; hoàn tác bằng huy_luc. Ghi qua edge function tro-ly.';
