-- MIMI-P0 — người đã bị gỡ / đã rời công ty PHẢI mất quyền vào dữ liệu công ty đó.
--
-- Nguồn sự thật DUY NHẤT về "ai thuộc công ty nào" là `thanh_vien_cong_ty` (gỡ hoặc rời = xoá dòng).
-- Trước migration này có bốn đường vẫn cho người đã bị gỡ vào:
--
--   1. `OR company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())` — nhánh "dữ liệu cũ"
--      trong RLS. `companies.user_id` là NGƯỜI TẠO công ty, không bị xoá khi người đó bị gỡ khỏi
--      `thanh_vien_cong_ty` (chủ khác gỡ được chủ cũ), nên người tạo bị gỡ vẫn đọc — và ghi, qua các
--      chính sách INSERT/UPDATE/DELETE — được mọi thứ. Kể cả UPDATE/DELETE chính dòng `companies`
--      (xoá công ty là CASCADE cả sổ sách).
--   2. `hoi_thoai_tro_ly` đọc theo `user_id = auth.uid()` thuần: kế toán nghỉ việc vẫn đọc câu trả lời
--      có số liệu công ty tới 180 ngày. Cùng lỗi ở `thong_bao`.
--   3. Storage: `chung-tu`, `secure-documents` (và nhánh UNION ở `tai-lieu`) cấp theo người tạo.
--   4. `user_company_ids(uid)` (SECURITY DEFINER, nhận uid tuỳ ý) cũng trả theo người tạo.
--
-- Luật mới: quyền = dòng thành viên hiện có. Đọc dữ liệu công ty: mọi vai trò (như 18/09). Ghi trực
-- tiếp từ trình duyệt và các bảng chưa từng mở cho thành viên (KYC, khoản vay, ví thiết bị, p2p…):
-- chỉ vai trò `chu_so_huu`. Nội dung hội thoại/thông báo: phải là của chính mình VÀ còn là thành viên;
-- XOÁ hội thoại của chính mình vẫn được sau khi rời (quyền dữ liệu cá nhân, xoá không lộ nội dung).
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE OR REPLACE. Không xoá, không sửa dữ liệu nào.

-- ── 1. Hàm dùng trong RLS ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.la_chu_cong_ty(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thanh_vien_cong_ty t
    WHERE t.company_id = p_company AND t.user_id = auth.uid() AND t.vai_tro = 'chu_so_huu'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.la_chu_cong_ty(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.la_chu_cong_ty(uuid) TO authenticated;

-- Thư mục đầu tiên của đường dẫn Storage là id công ty. So bằng TEXT để một thư mục không phải uuid
-- không làm cả truy vấn lỗi (ép kiểu ::uuid trong policy sẽ ném lỗi).
CREATE OR REPLACE FUNCTION public.la_thanh_vien_thu_muc(p_thu_muc text, p_chi_chu boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thanh_vien_cong_ty t
    WHERE t.company_id::text = p_thu_muc AND t.user_id = auth.uid()
      AND (NOT p_chi_chu OR t.vai_tro = 'chu_so_huu')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.la_thanh_vien_thu_muc(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.la_thanh_vien_thu_muc(text, boolean) TO authenticated;

-- Giữ chữ ký cũ nhưng theo thành viên (chủ sở hữu), và chỉ trả cho CHÍNH người gọi: trước đây ai đăng
-- nhập cũng hỏi được công ty của uid bất kỳ.
CREATE OR REPLACE FUNCTION public.user_company_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.company_id FROM public.thanh_vien_cong_ty t
  WHERE t.user_id = uid AND uid = auth.uid() AND t.vai_tro = 'chu_so_huu';
$$;

-- ── 2. Công ty nào chưa có dòng thành viên thì thêm người tạo làm chủ (không xoá gì) ───────────────
-- Bỏ nhánh `companies.user_id` khỏi RLS thì công ty nào thiếu dòng thành viên sẽ khoá chủ ngoài.
-- Migration 18/09 đã backfill và trigger `them_chu_so_huu_cong_ty` giữ cho công ty mới, nên thường
-- không có dòng nào; bước này chỉ là lưới an toàn.
INSERT INTO public.thanh_vien_cong_ty (company_id, user_id, vai_tro, tao_luc)
SELECT c.id, c.user_id, 'chu_so_huu', c.created_at
FROM public.companies c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.thanh_vien_cong_ty t WHERE t.company_id = c.id)
ON CONFLICT (company_id, user_id) DO NOTHING;

-- ── 3. Gỡ MỌI policy cũ còn dựa vào người tạo trên các bảng công ty (kể cả tên lạ trên môi trường thật) ──
DO $$
DECLARE
  b record;
BEGIN
  FOR b IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('transactions', 'invoices', 'gdt_invoices', 'chi_phi_ai', 'token_ai', 'chung_tu_quet', 'ho_so_thue', 'to_khai_nhap', 'tac_tu', 'yeu_cau_chi', 'chinh_sach_chi', 'nguoi_nhan_duoc_phep', 'nhat_ky_tac_tu', 'so_cai_chung_tu', 'neo_thoi_gian', 'ngan_sach_chi_phi_ai', 'lo_nhap_chi_phi_ai', 'bank_connections', 'qr_payments', 'clients', 'transaction_labels', 'subscriptions', 'subscription_invoices', 'danh_muc_dau_tu', 'bang_chung_viec', 'ket_qua_quy_trinh', 'luot_to_khai', 'nhat_ky_quyet_dinh', 'phan_loai_hoat_dong', 'phan_loai_hoat_dong_su_kien', 'quy_trinh_ai', 'revenue_classification_events', 'revenue_classifications', 'sao_ke_nhap', 'quyet_dinh_chung_tu', 'ho_so_viec', 'hanh_trinh', 'buoc_hanh_trinh', 'tai_lieu', 'phien_ban_tai_lieu', 'duyet_tai_lieu', 'nhat_ky_thay_doi', 'yeu_cau_thuc_thi', 'xung_dot_hoa_don', 'carbon_snapshots', 'credit_score_factors', 'credit_score_snapshots', 'device_rules', 'device_wallets', 'kyc_verifications', 'learning_progress', 'loan_applications', 'm2m_transactions', 'p2p_commitments', 'p2p_listings')
      AND (coalesce(qual, '') ~ 'companies|user_company_ids|la_thanh_vien|la_chu_cong_ty'
        OR coalesce(with_check, '') ~ 'companies|user_company_ids|la_thanh_vien|la_chu_cong_ty')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', b.policyname, b.schemaname, b.tablename);
  END LOOP;
END $$;

-- ── 4. Đọc: thành viên hiện tại (mọi vai trò); ghi trực tiếp và bảng nhạy cảm: chủ sở hữu ─────────
DROP POLICY IF EXISTS "Users can view own bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Xem chi phí AI của công ty mình" ON public.chi_phi_ai;
DROP POLICY IF EXISTS "Xem chính sách chi của công ty mình" ON public.chinh_sach_chi;
DROP POLICY IF EXISTS "Xem chứng từ quét của công ty mình" ON public.chung_tu_quet;
DROP POLICY IF EXISTS "Chủ công ty đọc danh bạ của mình" ON public.clients;
DROP POLICY IF EXISTS "Xem danh mục của công ty mình" ON public.danh_muc_dau_tu;
DROP POLICY IF EXISTS "Owners read their GDT invoices" ON public.gdt_invoices;
DROP POLICY IF EXISTS "Xem hồ sơ thuế của công ty mình" ON public.ho_so_thue;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Thành viên đọc kết quả quy trình" ON public.ket_qua_quy_trinh;
DROP POLICY IF EXISTS "Xem lần nhập chi phí AI của công ty mình" ON public.lo_nhap_chi_phi_ai;
DROP POLICY IF EXISTS "Xem dấu thời gian của công ty mình" ON public.neo_thoi_gian;
DROP POLICY IF EXISTS "Xem ngân sách chi phí AI của công ty mình" ON public.ngan_sach_chi_phi_ai;
DROP POLICY IF EXISTS "Xem người nhận được phép của công ty mình" ON public.nguoi_nhan_duoc_phep;
DROP POLICY IF EXISTS "Thành viên đọc nhật ký quyết định" ON public.nhat_ky_quyet_dinh;
DROP POLICY IF EXISTS "Xem nhật ký agent của công ty mình" ON public.nhat_ky_tac_tu;
DROP POLICY IF EXISTS "Owners read their QR payments" ON public.qr_payments;
DROP POLICY IF EXISTS "Thành viên đọc quy trình AI" ON public.quy_trinh_ai;
DROP POLICY IF EXISTS "Thành viên xem quyết định chứng từ" ON public.quyet_dinh_chung_tu;
DROP POLICY IF EXISTS "Xem sổ cái chứng từ của công ty mình" ON public.so_cai_chung_tu;
DROP POLICY IF EXISTS "Chủ công ty xem hoá đơn thuê bao của mình" ON public.subscription_invoices;
DROP POLICY IF EXISTS "Chủ công ty xem thuê bao của mình" ON public.subscriptions;
DROP POLICY IF EXISTS "Xem agent của công ty mình" ON public.tac_tu;
DROP POLICY IF EXISTS "Xem bản nháp tờ khai của công ty mình" ON public.to_khai_nhap;
DROP POLICY IF EXISTS "Xem token AI của công ty mình" ON public.token_ai;
DROP POLICY IF EXISTS "Users can view own labels" ON public.transaction_labels;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Xem yêu cầu chi của công ty mình" ON public.yeu_cau_chi;

DROP POLICY IF EXISTS "Thành viên công ty đọc transactions" ON public.transactions;
CREATE POLICY "Thành viên công ty đọc transactions" ON public.transactions
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc invoices" ON public.invoices;
CREATE POLICY "Thành viên công ty đọc invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc gdt_invoices" ON public.gdt_invoices;
CREATE POLICY "Thành viên công ty đọc gdt_invoices" ON public.gdt_invoices
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc chi_phi_ai" ON public.chi_phi_ai;
CREATE POLICY "Thành viên công ty đọc chi_phi_ai" ON public.chi_phi_ai
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc token_ai" ON public.token_ai;
CREATE POLICY "Thành viên công ty đọc token_ai" ON public.token_ai
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc chung_tu_quet" ON public.chung_tu_quet;
CREATE POLICY "Thành viên công ty đọc chung_tu_quet" ON public.chung_tu_quet
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc ho_so_thue" ON public.ho_so_thue;
CREATE POLICY "Thành viên công ty đọc ho_so_thue" ON public.ho_so_thue
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc to_khai_nhap" ON public.to_khai_nhap;
CREATE POLICY "Thành viên công ty đọc to_khai_nhap" ON public.to_khai_nhap
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc tac_tu" ON public.tac_tu;
CREATE POLICY "Thành viên công ty đọc tac_tu" ON public.tac_tu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc yeu_cau_chi" ON public.yeu_cau_chi;
CREATE POLICY "Thành viên công ty đọc yeu_cau_chi" ON public.yeu_cau_chi
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc chinh_sach_chi" ON public.chinh_sach_chi;
CREATE POLICY "Thành viên công ty đọc chinh_sach_chi" ON public.chinh_sach_chi
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc nguoi_nhan_duoc_phep" ON public.nguoi_nhan_duoc_phep;
CREATE POLICY "Thành viên công ty đọc nguoi_nhan_duoc_phep" ON public.nguoi_nhan_duoc_phep
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc nhat_ky_tac_tu" ON public.nhat_ky_tac_tu;
CREATE POLICY "Thành viên công ty đọc nhat_ky_tac_tu" ON public.nhat_ky_tac_tu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc so_cai_chung_tu" ON public.so_cai_chung_tu;
CREATE POLICY "Thành viên công ty đọc so_cai_chung_tu" ON public.so_cai_chung_tu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc neo_thoi_gian" ON public.neo_thoi_gian;
CREATE POLICY "Thành viên công ty đọc neo_thoi_gian" ON public.neo_thoi_gian
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc ngan_sach_chi_phi_ai" ON public.ngan_sach_chi_phi_ai;
CREATE POLICY "Thành viên công ty đọc ngan_sach_chi_phi_ai" ON public.ngan_sach_chi_phi_ai
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc lo_nhap_chi_phi_ai" ON public.lo_nhap_chi_phi_ai;
CREATE POLICY "Thành viên công ty đọc lo_nhap_chi_phi_ai" ON public.lo_nhap_chi_phi_ai
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc bank_connections" ON public.bank_connections;
CREATE POLICY "Thành viên công ty đọc bank_connections" ON public.bank_connections
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc qr_payments" ON public.qr_payments;
CREATE POLICY "Thành viên công ty đọc qr_payments" ON public.qr_payments
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc clients" ON public.clients;
CREATE POLICY "Thành viên công ty đọc clients" ON public.clients
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc transaction_labels" ON public.transaction_labels;
CREATE POLICY "Thành viên công ty đọc transaction_labels" ON public.transaction_labels
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc subscriptions" ON public.subscriptions;
CREATE POLICY "Thành viên công ty đọc subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc subscription_invoices" ON public.subscription_invoices;
CREATE POLICY "Thành viên công ty đọc subscription_invoices" ON public.subscription_invoices
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc danh_muc_dau_tu" ON public.danh_muc_dau_tu;
CREATE POLICY "Thành viên công ty đọc danh_muc_dau_tu" ON public.danh_muc_dau_tu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc bang_chung_viec" ON public.bang_chung_viec;
CREATE POLICY "Thành viên công ty đọc bang_chung_viec" ON public.bang_chung_viec
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc ket_qua_quy_trinh" ON public.ket_qua_quy_trinh;
CREATE POLICY "Thành viên công ty đọc ket_qua_quy_trinh" ON public.ket_qua_quy_trinh
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc luot_to_khai" ON public.luot_to_khai;
CREATE POLICY "Thành viên công ty đọc luot_to_khai" ON public.luot_to_khai
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc nhat_ky_quyet_dinh" ON public.nhat_ky_quyet_dinh;
CREATE POLICY "Thành viên công ty đọc nhat_ky_quyet_dinh" ON public.nhat_ky_quyet_dinh
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc phan_loai_hoat_dong" ON public.phan_loai_hoat_dong;
CREATE POLICY "Thành viên công ty đọc phan_loai_hoat_dong" ON public.phan_loai_hoat_dong
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc phan_loai_hoat_dong_su_kien" ON public.phan_loai_hoat_dong_su_kien;
CREATE POLICY "Thành viên công ty đọc phan_loai_hoat_dong_su_kien" ON public.phan_loai_hoat_dong_su_kien
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc quy_trinh_ai" ON public.quy_trinh_ai;
CREATE POLICY "Thành viên công ty đọc quy_trinh_ai" ON public.quy_trinh_ai
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc revenue_classification_events" ON public.revenue_classification_events;
CREATE POLICY "Thành viên công ty đọc revenue_classification_events" ON public.revenue_classification_events
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc revenue_classifications" ON public.revenue_classifications;
CREATE POLICY "Thành viên công ty đọc revenue_classifications" ON public.revenue_classifications
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc sao_ke_nhap" ON public.sao_ke_nhap;
CREATE POLICY "Thành viên công ty đọc sao_ke_nhap" ON public.sao_ke_nhap
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc quyet_dinh_chung_tu" ON public.quyet_dinh_chung_tu;
CREATE POLICY "Thành viên công ty đọc quyet_dinh_chung_tu" ON public.quyet_dinh_chung_tu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc ho_so_viec" ON public.ho_so_viec;
CREATE POLICY "Thành viên công ty đọc ho_so_viec" ON public.ho_so_viec
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc hanh_trinh" ON public.hanh_trinh;
CREATE POLICY "Thành viên công ty đọc hanh_trinh" ON public.hanh_trinh
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc buoc_hanh_trinh" ON public.buoc_hanh_trinh;
CREATE POLICY "Thành viên công ty đọc buoc_hanh_trinh" ON public.buoc_hanh_trinh
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc tai_lieu" ON public.tai_lieu;
CREATE POLICY "Thành viên công ty đọc tai_lieu" ON public.tai_lieu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc phien_ban_tai_lieu" ON public.phien_ban_tai_lieu;
CREATE POLICY "Thành viên công ty đọc phien_ban_tai_lieu" ON public.phien_ban_tai_lieu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc duyet_tai_lieu" ON public.duyet_tai_lieu;
CREATE POLICY "Thành viên công ty đọc duyet_tai_lieu" ON public.duyet_tai_lieu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc nhat_ky_thay_doi" ON public.nhat_ky_thay_doi;
CREATE POLICY "Thành viên công ty đọc nhat_ky_thay_doi" ON public.nhat_ky_thay_doi
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc yeu_cau_thuc_thi" ON public.yeu_cau_thuc_thi;
CREATE POLICY "Thành viên công ty đọc yeu_cau_thuc_thi" ON public.yeu_cau_thuc_thi
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Thành viên công ty đọc xung_dot_hoa_don" ON public.xung_dot_hoa_don;
CREATE POLICY "Thành viên công ty đọc xung_dot_hoa_don" ON public.xung_dot_hoa_don
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

DROP POLICY IF EXISTS "Users can delete own bank connections" ON public.bank_connections;
CREATE POLICY "Users can delete own bank connections" ON public.bank_connections
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own bank connections" ON public.bank_connections;
CREATE POLICY "Users can insert own bank connections" ON public.bank_connections
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can update own bank connections" ON public.bank_connections;
CREATE POLICY "Users can update own bank connections" ON public.bank_connections
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own carbon snapshots" ON public.carbon_snapshots;
CREATE POLICY "Users can insert own carbon snapshots" ON public.carbon_snapshots
  FOR INSERT WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can view own carbon snapshots" ON public.carbon_snapshots;
CREATE POLICY "Users can view own carbon snapshots" ON public.carbon_snapshots
  FOR SELECT USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Chủ công ty sửa danh bạ của mình" ON public.clients;
CREATE POLICY "Chủ công ty sửa danh bạ của mình" ON public.clients
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Chủ công ty thêm khách vào danh bạ của mình" ON public.clients;
CREATE POLICY "Chủ công ty thêm khách vào danh bạ của mình" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Chủ công ty xoá khách khỏi danh bạ của mình" ON public.clients;
CREATE POLICY "Chủ công ty xoá khách khỏi danh bạ của mình" ON public.clients
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can delete own factors" ON public.credit_score_factors;
CREATE POLICY "Users can delete own factors" ON public.credit_score_factors
  FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.credit_score_snapshots s WHERE s.id = snapshot_id AND public.la_chu_cong_ty(s.company_id)));

DROP POLICY IF EXISTS "Users can insert own factors" ON public.credit_score_factors;
CREATE POLICY "Users can insert own factors" ON public.credit_score_factors
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.credit_score_snapshots s WHERE s.id = snapshot_id AND public.la_chu_cong_ty(s.company_id)));

DROP POLICY IF EXISTS "Users can view own credit score factors" ON public.credit_score_factors;
CREATE POLICY "Users can view own credit score factors" ON public.credit_score_factors
  FOR SELECT USING ( snapshot_id IN ( SELECT id FROM public.credit_score_snapshots WHERE public.la_chu_cong_ty(company_id) ) );

DROP POLICY IF EXISTS "Users can view own factors" ON public.credit_score_factors;
CREATE POLICY "Users can view own factors" ON public.credit_score_factors
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.credit_score_snapshots s WHERE s.id = snapshot_id AND public.la_chu_cong_ty(s.company_id)));

DROP POLICY IF EXISTS "Users can delete own snapshots" ON public.credit_score_snapshots;
CREATE POLICY "Users can delete own snapshots" ON public.credit_score_snapshots
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own snapshots" ON public.credit_score_snapshots;
CREATE POLICY "Users can insert own snapshots" ON public.credit_score_snapshots
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can view own credit score snapshots" ON public.credit_score_snapshots;
CREATE POLICY "Users can view own credit score snapshots" ON public.credit_score_snapshots
  FOR SELECT USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can view own snapshots" ON public.credit_score_snapshots;
CREATE POLICY "Users can view own snapshots" ON public.credit_score_snapshots
  FOR SELECT TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Sửa danh mục của công ty mình" ON public.danh_muc_dau_tu;
CREATE POLICY "Sửa danh mục của công ty mình" ON public.danh_muc_dau_tu
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id)) WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Thêm vào danh mục của công ty mình" ON public.danh_muc_dau_tu;
CREATE POLICY "Thêm vào danh mục của công ty mình" ON public.danh_muc_dau_tu
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Xoá khỏi danh mục của công ty mình" ON public.danh_muc_dau_tu;
CREATE POLICY "Xoá khỏi danh mục của công ty mình" ON public.danh_muc_dau_tu
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can delete own rules" ON public.device_rules;
CREATE POLICY "Users can delete own rules" ON public.device_rules
  FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.device_wallets d WHERE d.id = device_id AND public.la_chu_cong_ty(d.company_id)));

DROP POLICY IF EXISTS "Users can insert own rules" ON public.device_rules;
CREATE POLICY "Users can insert own rules" ON public.device_rules
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.device_wallets d WHERE d.id = device_id AND public.la_chu_cong_ty(d.company_id)));

DROP POLICY IF EXISTS "Users can update own rules" ON public.device_rules;
CREATE POLICY "Users can update own rules" ON public.device_rules
  FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.device_wallets d WHERE d.id = device_id AND public.la_chu_cong_ty(d.company_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.device_wallets d WHERE d.id = device_id AND public.la_chu_cong_ty(d.company_id)));

DROP POLICY IF EXISTS "Users can view own rules" ON public.device_rules;
CREATE POLICY "Users can view own rules" ON public.device_rules
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.device_wallets d WHERE d.id = device_id AND public.la_chu_cong_ty(d.company_id)));

DROP POLICY IF EXISTS "Users can delete own devices" ON public.device_wallets;
CREATE POLICY "Users can delete own devices" ON public.device_wallets
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own devices" ON public.device_wallets;
CREATE POLICY "Users can insert own devices" ON public.device_wallets
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can update own devices" ON public.device_wallets;
CREATE POLICY "Users can update own devices" ON public.device_wallets
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id)) WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can view own devices" ON public.device_wallets;
CREATE POLICY "Users can view own devices" ON public.device_wallets
  FOR SELECT TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;
CREATE POLICY "Users can delete own invoices" ON public.invoices
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can delete own KYC" ON public.kyc_verifications;
CREATE POLICY "Users can delete own KYC" ON public.kyc_verifications
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own KYC" ON public.kyc_verifications;
CREATE POLICY "Users can insert own KYC" ON public.kyc_verifications
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can update own KYC" ON public.kyc_verifications;
CREATE POLICY "Users can update own KYC" ON public.kyc_verifications
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can view own KYC" ON public.kyc_verifications;
CREATE POLICY "Users can view own KYC" ON public.kyc_verifications
  FOR SELECT TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can delete own progress" ON public.learning_progress;
CREATE POLICY "Users can delete own progress" ON public.learning_progress
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own learning progress" ON public.learning_progress;
CREATE POLICY "Users can insert own learning progress" ON public.learning_progress
  FOR INSERT WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own progress" ON public.learning_progress;
CREATE POLICY "Users can insert own progress" ON public.learning_progress
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can update own learning progress" ON public.learning_progress;
CREATE POLICY "Users can update own learning progress" ON public.learning_progress
  FOR UPDATE USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can update own progress" ON public.learning_progress;
CREATE POLICY "Users can update own progress" ON public.learning_progress
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id)) WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can view own learning progress" ON public.learning_progress;
CREATE POLICY "Users can view own learning progress" ON public.learning_progress
  FOR SELECT USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can view own progress" ON public.learning_progress;
CREATE POLICY "Users can view own progress" ON public.learning_progress
  FOR SELECT TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can delete own loans" ON public.loan_applications;
CREATE POLICY "Users can delete own loans" ON public.loan_applications
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own loans" ON public.loan_applications;
CREATE POLICY "Users can insert own loans" ON public.loan_applications
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can update own loans" ON public.loan_applications;
CREATE POLICY "Users can update own loans" ON public.loan_applications
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can view own loans" ON public.loan_applications;
CREATE POLICY "Users can view own loans" ON public.loan_applications
  FOR SELECT TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own m2m txs" ON public.m2m_transactions;
CREATE POLICY "Users can insert own m2m txs" ON public.m2m_transactions
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.device_wallets d WHERE d.id = device_id AND public.la_chu_cong_ty(d.company_id)));

DROP POLICY IF EXISTS "Users can view own m2m txs" ON public.m2m_transactions;
CREATE POLICY "Users can view own m2m txs" ON public.m2m_transactions
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.device_wallets d WHERE d.id = device_id AND public.la_chu_cong_ty(d.company_id)));

DROP POLICY IF EXISTS "Ben cho vay thay cam ket cua minh" ON public.p2p_commitments;
CREATE POLICY "Ben cho vay thay cam ket cua minh" ON public.p2p_commitments
  FOR SELECT TO authenticated USING ( lender_user_id = auth.uid() OR public.la_chu_cong_ty(lender_company_id) );

DROP POLICY IF EXISTS "Ben cho vay tu tao cam ket" ON public.p2p_commitments;
CREATE POLICY "Ben cho vay tu tao cam ket" ON public.p2p_commitments
  FOR INSERT TO authenticated WITH CHECK ( lender_user_id = auth.uid() OR public.la_chu_cong_ty(lender_company_id) );

DROP POLICY IF EXISTS "Chu khoan vay thay cam ket vao khoan cua minh" ON public.p2p_commitments;
CREATE POLICY "Chu khoan vay thay cam ket vao khoan cua minh" ON public.p2p_commitments
  FOR SELECT TO authenticated USING ( listing_id IN (SELECT l.id FROM public.p2p_listings l WHERE public.la_chu_cong_ty(l.company_id)) );

DROP POLICY IF EXISTS "Chu khoan vay thay tat ca cua minh" ON public.p2p_listings;
CREATE POLICY "Chu khoan vay thay tat ca cua minh" ON public.p2p_listings
  FOR SELECT TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Chu khoan vay tu dang" ON public.p2p_listings;
CREATE POLICY "Chu khoan vay tu dang" ON public.p2p_listings
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Chu khoan vay tu sua" ON public.p2p_listings;
CREATE POLICY "Chu khoan vay tu sua" ON public.p2p_listings
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can insert own labels" ON public.transaction_labels;
CREATE POLICY "Users can insert own labels" ON public.transaction_labels
  FOR INSERT TO authenticated WITH CHECK (public.la_chu_cong_ty(company_id));

DROP POLICY IF EXISTS "Users can update own labels" ON public.transaction_labels;
CREATE POLICY "Users can update own labels" ON public.transaction_labels
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(company_id));


-- ── 5. companies: người tạo bị gỡ không đọc/sửa/xoá được công ty ────────────────────────────────
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
DROP POLICY IF EXISTS "Thành viên đọc công ty mình thuộc về" ON public.companies;
CREATE POLICY "Thành viên đọc công ty mình thuộc về" ON public.companies
  FOR SELECT TO authenticated USING (public.la_thanh_vien(id));

DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
CREATE POLICY "Users can update own companies" ON public.companies
  FOR UPDATE TO authenticated USING (public.la_chu_cong_ty(id));

DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;
CREATE POLICY "Users can delete own companies" ON public.companies
  FOR DELETE TO authenticated USING (public.la_chu_cong_ty(id));
-- INSERT giữ nguyên (`auth.uid() = user_id`): tạo công ty mới; trigger thêm người tạo làm chủ sở hữu.

-- ── 6. Nội dung của riêng một người nhưng thuộc về một công ty ────────────────────────────────────
DROP POLICY IF EXISTS "Đọc hội thoại của chính mình" ON public.hoi_thoai_tro_ly;
CREATE POLICY "Đọc hội thoại của chính mình" ON public.hoi_thoai_tro_ly
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.la_thanh_vien(company_id));
-- XOÁ giữ `user_id = auth.uid()`: người đã rời vẫn xoá được dòng của mình (quyền dữ liệu cá nhân).
DROP POLICY IF EXISTS "Xoá hội thoại của chính mình" ON public.hoi_thoai_tro_ly;
CREATE POLICY "Xoá hội thoại của chính mình" ON public.hoi_thoai_tro_ly
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Người nhận đọc thông báo của mình" ON public.thong_bao;
CREATE POLICY "Người nhận đọc thông báo của mình" ON public.thong_bao
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.la_thanh_vien(company_id));

-- ── 7. Storage: thư mục đầu = id công ty ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Xem ảnh chứng từ của công ty mình" ON storage.objects;
CREATE POLICY "Xem ảnh chứng từ của công ty mình" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chung-tu' AND public.la_thanh_vien_thu_muc((storage.foldername(name))[1], false));

DROP POLICY IF EXISTS "Thành viên đọc tài liệu công ty mình" ON storage.objects;
CREATE POLICY "Thành viên đọc tài liệu công ty mình" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'tai-lieu' AND public.la_thanh_vien_thu_muc((storage.foldername(name))[1], false));

DROP POLICY IF EXISTS "Users can upload to own company folder" ON storage.objects;
CREATE POLICY "Users can upload to own company folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'secure-documents' AND public.la_thanh_vien_thu_muc((storage.foldername(name))[1], true));

DROP POLICY IF EXISTS "Users can read own company folder" ON storage.objects;
CREATE POLICY "Users can read own company folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'secure-documents' AND public.la_thanh_vien_thu_muc((storage.foldername(name))[1], true));

DROP POLICY IF EXISTS "Users can update own company folder" ON storage.objects;
CREATE POLICY "Users can update own company folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'secure-documents' AND public.la_thanh_vien_thu_muc((storage.foldername(name))[1], true));
