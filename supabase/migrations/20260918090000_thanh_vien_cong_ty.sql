-- MIMI-P1-003 — một công ty có nhiều người, mỗi người một vai trò.
--
-- Trước đây công ty chỉ có `companies.user_id`: ai đăng ký thì làm tất. Doanh nghiệp thật có kế
-- toán ghi chứng từ, người đề nghị chi, và chủ duyệt — ba việc khác nhau, ba quyền khác nhau.
--
-- Vai trò khớp `_shared/quyen/vai-tro.ts`. Kiểm quyền thật nằm ở edge function (service role);
-- RLS ở đây để người dùng đọc được đúng phần của mình và KHÔNG tự đổi vai trò của chính mình.

CREATE TABLE IF NOT EXISTS public.thanh_vien_cong_ty (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vai_tro text NOT NULL CHECK (vai_tro IN ('chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan', 'nguoi_xem')),
  moi_boi uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS thanh_vien_cong_ty_user_idx ON public.thanh_vien_cong_ty (user_id, tao_luc);

-- Backfill: chủ hiện tại của mỗi công ty thành chủ sở hữu.
INSERT INTO public.thanh_vien_cong_ty (company_id, user_id, vai_tro, tao_luc)
SELECT c.id, c.user_id, 'chu_so_huu', c.created_at
FROM public.companies c
WHERE c.user_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Công ty mới (trigger từ profiles hoặc do người dùng tạo) luôn có ngay một chủ sở hữu.
CREATE OR REPLACE FUNCTION public.them_chu_so_huu_cong_ty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.thanh_vien_cong_ty (company_id, user_id, vai_tro)
    VALUES (NEW.id, NEW.user_id, 'chu_so_huu')
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS them_chu_so_huu_cong_ty ON public.companies;
CREATE TRIGGER them_chu_so_huu_cong_ty
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.them_chu_so_huu_cong_ty();

ALTER TABLE public.thanh_vien_cong_ty ENABLE ROW LEVEL SECURITY;

-- Đọc: thành viên thấy danh sách thành viên của chính công ty mình.
-- Hàm SECURITY DEFINER để policy không tự truy vấn lại bảng đang bị policy che (đệ quy).
CREATE OR REPLACE FUNCTION public.la_thanh_vien(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thanh_vien_cong_ty t
    WHERE t.company_id = p_company AND t.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.la_thanh_vien(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.la_thanh_vien(uuid) TO authenticated;

DROP POLICY IF EXISTS "Thành viên đọc danh sách thành viên công ty mình" ON public.thanh_vien_cong_ty;
CREATE POLICY "Thành viên đọc danh sách thành viên công ty mình" ON public.thanh_vien_cong_ty
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id));

-- Không có policy INSERT/UPDATE/DELETE: mời và đổi vai trò chỉ đi qua edge function (service role),
-- nơi có kiểm quyền và ghi nhật ký. Người dùng không tự nâng vai trò của mình được.
REVOKE ALL ON public.thanh_vien_cong_ty FROM anon, authenticated;
GRANT SELECT ON public.thanh_vien_cong_ty TO authenticated;

COMMENT ON TABLE public.thanh_vien_cong_ty IS
  'MIMI-P1-003: vai trò của từng người trong một công ty. Ghi chỉ qua edge function; RLS chỉ cho đọc.';
