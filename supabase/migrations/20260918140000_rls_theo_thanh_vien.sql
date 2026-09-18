-- MIMI-P1-003 (phần còn lại) — thành viên công ty đọc được dữ liệu của công ty đó.
--
-- Sau khi có `thanh_vien_cong_ty`, edge function đã kiểm vai trò, nhưng RLS của các bảng dữ liệu
-- vẫn chỉ cho `companies.user_id`. Nghĩa là kế toán hay người duyệt mở trang lên thấy trống trơn:
-- ứng dụng nói họ thuộc công ty, còn cơ sở dữ liệu thì không.
--
-- CHỈ MỞ QUYỀN ĐỌC. Ghi trực tiếp từ trình duyệt vẫn giữ nguyên như trước (chủ công ty), vì đường
-- ghi có kiểm vai trò là edge function; mở UPDATE cho mọi thành viên sẽ đi vòng qua chỗ kiểm đó.
--
-- Giữ thêm nhánh `companies.user_id` để dữ liệu cũ chưa có dòng thành viên không bị khoá ngoài.

DO $$
DECLARE
  b record;
  ten text;
BEGIN
  FOR b IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
      AND qual LIKE '%companies.user_id = auth.uid()%'
      AND tablename IN (
        'transactions', 'invoices', 'gdt_invoices', 'chi_phi_ai', 'token_ai', 'chung_tu_quet',
        'ho_so_thue', 'to_khai_nhap', 'tac_tu', 'yeu_cau_chi', 'chinh_sach_chi',
        'nguoi_nhan_duoc_phep', 'nhat_ky_tac_tu', 'so_cai_chung_tu', 'neo_thoi_gian',
        'ngan_sach_chi_phi_ai', 'lo_nhap_chi_phi_ai', 'bank_connections', 'qr_payments',
        'clients', 'transaction_labels', 'subscriptions', 'subscription_invoices', 'danh_muc_dau_tu'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', b.policyname, b.tablename);
    ten := 'Thành viên công ty đọc ' || b.tablename;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))',
      ten, b.tablename
    );
  END LOOP;
END $$;

-- Công ty: thành viên thấy công ty mình thuộc về (trước đây chỉ người tạo thấy).
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
DROP POLICY IF EXISTS "Thành viên đọc công ty mình thuộc về" ON public.companies;
CREATE POLICY "Thành viên đọc công ty mình thuộc về" ON public.companies
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.la_thanh_vien(id));
