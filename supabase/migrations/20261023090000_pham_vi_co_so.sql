-- PHẠM VI CƠ SỞ (23/10/2026): kế toán phụ trách một cơ sở chỉ đọc được giao dịch và hoá đơn của cơ sở đó.
-- Cùng quy tắc với supabase/functions/_shared/da-co-so/pham-vi.ts (edge function dùng service role, đi vòng RLS,
-- nên lọc lại ở đó).
--
-- Mỗi policy cũng đi qua la_thanh_vien (thừa vì policy cho phép đã đòi thành viên, nhưng giữ một quy tắc chung cho
-- mọi policy trên bảng công ty — rls-thanh-vien-bi-loai.test.ts).
-- Policy RESTRICTIVE: AND với các policy PERMISSIVE đang có (thành viên công ty đọc được). Không ai được mở thêm quyền
-- ở đây — chỉ thu hẹp cho người có thanh_vien_cong_ty.co_so_id và vai trò không phải chủ sở hữu / quản trị.

-- Cơ sở mà NGƯỜI ĐANG ĐĂNG NHẬP bị giới hạn vào, trong công ty này. NULL = thấy cả công ty.
-- SECURITY DEFINER để policy không đọc lại bảng thành viên qua RLS của chính nó.
CREATE OR REPLACE FUNCTION public.co_so_gioi_han(p_company uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.co_so_id
  FROM public.thanh_vien_cong_ty t
  WHERE t.company_id = p_company
    AND t.user_id = auth.uid()
    AND t.co_so_id IS NOT NULL
    AND t.vai_tro NOT IN ('chu_so_huu', 'quan_tri')
    -- Không miễn riêng người TẠO công ty: vai trò hiện tại mới là nguồn sự thật (cùng lý do _shared/company.ts bỏ
    -- đường dự phòng companies.user_id ngày 30/09/2026).
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.co_so_gioi_han(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.co_so_gioi_han(uuid) TO authenticated;

-- Tài khoản ngân hàng (chỉ chữ số) đã gán cho cơ sở đó.
CREATE OR REPLACE FUNCTION public.tai_khoan_cua_co_so(p_company uuid, p_co_so uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT k.so_tai_khoan FROM public.co_so_tai_khoan k WHERE k.company_id = p_company AND k.co_so_id = p_co_so;
$$;

REVOKE ALL ON FUNCTION public.tai_khoan_cua_co_so(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tai_khoan_cua_co_so(uuid, uuid) TO authenticated;

-- Giao dịch: thuộc cơ sở khi số tài khoản (bỏ ký tự không phải số) đã gán cho cơ sở. Không có số tài khoản hoặc tài
-- khoản chưa gán → kế toán cơ sở không thấy.
DROP POLICY IF EXISTS "Kế toán cơ sở chỉ thấy giao dịch cơ sở mình" ON public.transactions;
CREATE POLICY "Kế toán cơ sở chỉ thấy giao dịch cơ sở mình" ON public.transactions
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.la_thanh_vien(company_id) AND (
      public.co_so_gioi_han(company_id) IS NULL
      OR regexp_replace(coalesce(account_number, ''), '\D', '', 'g')
         IN (SELECT public.tai_khoan_cua_co_so(company_id, public.co_so_gioi_han(company_id)))
    )
  );

-- Hoá đơn bán ra: theo cột co_so_id. Hoá đơn chưa gán cơ sở → kế toán cơ sở không thấy.
DROP POLICY IF EXISTS "Kế toán cơ sở chỉ thấy hoá đơn cơ sở mình" ON public.invoices;
CREATE POLICY "Kế toán cơ sở chỉ thấy hoá đơn cơ sở mình" ON public.invoices
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND (public.co_so_gioi_han(company_id) IS NULL OR co_so_id = public.co_so_gioi_han(company_id)));

-- Danh sách cơ sở và tài khoản: kế toán cơ sở chỉ thấy cơ sở của mình.
DROP POLICY IF EXISTS "Kế toán cơ sở chỉ thấy cơ sở mình" ON public.co_so;
CREATE POLICY "Kế toán cơ sở chỉ thấy cơ sở mình" ON public.co_so
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND (public.co_so_gioi_han(company_id) IS NULL OR id = public.co_so_gioi_han(company_id)));

DROP POLICY IF EXISTS "Kế toán cơ sở chỉ thấy tài khoản cơ sở mình" ON public.co_so_tai_khoan;
CREATE POLICY "Kế toán cơ sở chỉ thấy tài khoản cơ sở mình" ON public.co_so_tai_khoan
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) AND (public.co_so_gioi_han(company_id) IS NULL OR co_so_id = public.co_so_gioi_han(company_id)));

-- thanh_vien_cong_ty vốn chỉ GRANT SELECT cho authenticated (20260918090000): không ai tự gán co_so_id từ trình duyệt.

CREATE INDEX IF NOT EXISTS invoices_co_so_idx ON public.invoices (company_id, co_so_id);
