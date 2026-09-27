-- Kiểm định nghĩa "kích hoạt" (migration 20260927090000). Chạy trên DB thật, KẾT THÚC BẰNG
-- RAISE EXCEPTION nên mọi thứ tạo ra đều bị huỷ:
--   npx supabase db query --linked -f supabase/tests/hanh_trinh_kich_hoat.sql
-- Đạt khi dòng KET_QUA không có chữ SAI hay LOT.
DO $$
DECLARE
  ua uuid; c uuid; cd uuid; gd uuid; r record; ket text := '';
  ok boolean;
BEGIN
  SELECT user_id INTO ua FROM public.companies WHERE user_id IS NOT NULL ORDER BY created_at LIMIT 1;
  IF ua IS NULL THEN RAISE EXCEPTION 'KET_QUA=can_mot_nguoi_dung'; END IF;

  INSERT INTO public.companies (user_id, name, created_at) VALUES (ua, 'Kiểm thử kích hoạt', now() - interval '10 days') RETURNING id INTO c;
  SELECT * INTO r FROM public.hanh_trinh_kich_hoat WHERE company_id = c;
  ok := r.noi_nguon IS NULL AND r.co_so_doanh_thu IS NULL AND r.tu_tay_bat_dau IS NULL AND NOT r.da_kich_hoat;
  ket := ket || '01_moi_dang_ky=' || CASE WHEN ok THEN 'DUNG' ELSE 'SAI' END || ';';

  -- Giao dịch minh hoạ không phải nguồn thật.
  INSERT INTO public.transactions (company_id, amount, type, transaction_date, is_synthetic) VALUES (c, 1000, 'income', current_date, true);
  SELECT * INTO r FROM public.hanh_trinh_kich_hoat WHERE company_id = c;
  ket := ket || '02_du_lieu_minh_hoa_khong_tinh=' || CASE WHEN r.noi_nguon IS NULL THEN 'DUNG' ELSE 'SAI' END || ';';

  INSERT INTO public.transactions (company_id, amount, type, transaction_date, is_synthetic) VALUES (c, 5000000, 'income', current_date, false) RETURNING id INTO gd;
  SELECT * INTO r FROM public.hanh_trinh_kich_hoat WHERE company_id = c;
  ket := ket || '03_giao_dich_that_la_noi_nguon=' || CASE WHEN r.noi_nguon IS NOT NULL THEN 'DUNG' ELSE 'SAI' END || ';';

  -- MIMI tự phân loại: có sự thật doanh thu, nhưng CHƯA phải người dùng tự tay làm.
  INSERT INTO public.revenue_classifications (company_id, transaction_id, suggested_type, suggestion_source, confirmed_type,
    revenue_effect, requires_review, confirmed_by, confirmed_role, confirmed_at)
  SELECT c, gd, 'business_revenue', 'rule', 'business_revenue', 'include', false, '00000000-0000-0000-0000-000000000000'::uuid, 'mimi', now();
  SELECT * INTO r FROM public.hanh_trinh_kich_hoat WHERE company_id = c;
  ok := r.co_so_doanh_thu IS NOT NULL AND r.tu_tay_bat_dau IS NULL AND NOT r.da_kich_hoat;
  ket := ket || '04_mimi_tu_lam_chua_kich_hoat=' || CASE WHEN ok THEN 'DUNG' ELSE 'SAI' END || ';';

  -- Người dùng tự xác nhận lại → kích hoạt; nhưng quá 7 ngày sau đăng ký nên không "trong 7 ngày".
  UPDATE public.revenue_classifications SET confirmed_by = ua, confirmed_role = 'chu_so_huu', confirmed_at = now() WHERE transaction_id = gd;
  SELECT * INTO r FROM public.hanh_trinh_kich_hoat WHERE company_id = c;
  ok := r.tu_tay_bat_dau IS NOT NULL AND r.da_kich_hoat AND NOT r.kich_hoat_trong_7_ngay;
  ket := ket || '05_tu_tay_la_kich_hoat_nhung_tre=' || CASE WHEN ok THEN 'DUNG' ELSE 'SAI' END || ';';

  ket := ket || '06_chua_quay_lai=' || CASE WHEN NOT r.quay_lai_7_ngay THEN 'DUNG' ELSE 'SAI' END || ';';
  INSERT INTO public.product_events (company_id, user_id, name, created_at) VALUES (c, ua, 'app_opened', now());
  SELECT * INTO r FROM public.hanh_trinh_kich_hoat WHERE company_id = c;
  ket := ket || '07_quay_lai_sau_7_ngay=' || CASE WHEN r.quay_lai_7_ngay THEN 'DUNG' ELSE 'SAI' END || ';';

  -- Công ty demo đứng ngoài.
  INSERT INTO public.companies (user_id, name, la_demo) VALUES (ua, 'Demo kiểm thử', true) RETURNING id INTO cd;
  ket := ket || '08_demo_dung_ngoai=' || CASE WHEN NOT EXISTS (SELECT 1 FROM public.hanh_trinh_kich_hoat WHERE company_id = cd) THEN 'DUNG' ELSE 'SAI' END || ';';

  -- Người dùng thường không đọc được hai view (chỉ quản trị).
  -- Người dùng gắn sự kiện vào công ty mình không thuộc → bị chặn.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  SELECT co.id INTO cd FROM public.companies co
    WHERE NOT EXISTS (SELECT 1 FROM public.thanh_vien_cong_ty tv WHERE tv.company_id = co.id AND tv.user_id = ua) LIMIT 1;
  IF cd IS NULL THEN RAISE EXCEPTION 'KET_QUA=can_mot_cong_ty_nguoi_khac'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.product_events (company_id, user_id, name) VALUES (cd, ua, 'app_opened');
    ket := ket || '10_gan_su_kien_cong_ty_nguoi_khac=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '10_gan_su_kien_cong_ty_nguoi_khac=CHAN;';
  END;
  INSERT INTO public.product_events (company_id, user_id, name) VALUES (c, ua, 'app_opened');
  ket := ket || '11_gan_su_kien_cong_ty_minh=DUOC;';
  EXECUTE 'RESET ROLE';

  ket := ket || '09_authenticated_khong_doc=' || CASE WHEN NOT has_table_privilege('authenticated', 'public.hanh_trinh_kich_hoat', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.pheu_kich_hoat', 'SELECT') THEN 'DUNG' ELSE 'SAI' END || ';';

  RAISE EXCEPTION 'KET_QUA=%', ket;
END $$;
