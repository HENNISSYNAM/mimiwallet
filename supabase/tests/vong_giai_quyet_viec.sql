DO $$
DECLARE
  ca uuid; ua uuid; cb uuid; ub uuid; hs uuid; n int; ket text := '';
BEGIN
  SELECT id, user_id INTO ca, ua FROM public.companies WHERE user_id IS NOT NULL ORDER BY created_at LIMIT 1;
  SELECT id, user_id INTO cb, ub FROM public.companies WHERE user_id IS NOT NULL AND user_id <> ua ORDER BY created_at LIMIT 1;
  IF ca IS NULL OR cb IS NULL THEN RAISE EXCEPTION 'KET_QUA=can_hai_cong_ty_hai_chu'; END IF;

  INSERT INTO public.ho_so_viec (company_id, loai, tieu_de, dau_van_tay) VALUES (ca, 'tam_ngung', 'Tạm ngừng kinh doanh', 'tam_ngung:kiem_thu') RETURNING id INTO hs;
  ket := ket || '01_mo=' || (SELECT trang_thai || '/v' || phien_ban FROM public.ho_so_viec WHERE id = hs) || ';';

  BEGIN
    INSERT INTO public.ho_so_viec (company_id, loai, tieu_de, dau_van_tay) VALUES (ca, 'tam_ngung', 'Tạm ngừng lần hai', 'tam_ngung:kiem_thu');
    ket := ket || '02_mo_trung=LOT;';
  EXCEPTION WHEN unique_violation THEN ket := ket || '02_mo_trung=CHAN;';
  END;

  BEGIN
    INSERT INTO public.ho_so_viec (company_id, loai, tieu_de, dau_van_tay, trang_thai, giai_quyet_luc, ket_qua) VALUES (ca, 'kiem_thu', 'Việc thử', 'kiem_thu:1', 'resolved_user_confirmed', now(), 'x');
    ket := ket || '03_mo_san_da_xong=LOT;';
  EXCEPTION WHEN check_violation THEN ket := ket || '03_mo_san_da_xong=CHAN;';
  END;

  BEGIN
    UPDATE public.ho_so_viec SET trang_thai = 'resolved_user_confirmed', giai_quyet_luc = now(), ket_qua = 'x' WHERE id = hs;
    ket := ket || '04_xong_khong_bang_chung=LOT;';
  EXCEPTION WHEN check_violation THEN ket := ket || '04_xong_khong_bang_chung=CHAN;';
  END;

  BEGIN
    INSERT INTO public.bang_chung_viec (company_id, ho_so_viec_id, loai, nguon, trang_thai_xac_minh, khoa_trung) VALUES (ca, hs, 'official_response', 'nguoi_dung', 'system_verified', 'tu_xac_minh');
    ket := ket || '05_nguoi_dung_tu_xac_minh=LOT;';
  EXCEPTION WHEN check_violation THEN ket := ket || '05_nguoi_dung_tu_xac_minh=CHAN;';
  END;

  INSERT INTO public.bang_chung_viec (company_id, ho_so_viec_id, loai, nguon, trang_thai_xac_minh, khoa_trung, gia_tri) VALUES (ca, hs, 'user_confirmation', 'nguoi_dung', 'user_confirmed', 'da_nop', 'Bạn ghi nhận đã nộp');
  BEGIN
    INSERT INTO public.bang_chung_viec (company_id, ho_so_viec_id, loai, nguon, trang_thai_xac_minh, khoa_trung) VALUES (ca, hs, 'user_confirmation', 'nguoi_dung', 'user_confirmed', 'da_nop');
    ket := ket || '06_bang_chung_trung=LOT;';
  EXCEPTION WHEN unique_violation THEN ket := ket || '06_bang_chung_trung=CHAN;';
  END;

  BEGIN
    UPDATE public.ho_so_viec SET trang_thai = 'resolved_system_verified', giai_quyet_luc = now(), ket_qua = 'x' WHERE id = hs;
    ket := ket || '07_xac_minh_khi_chi_co_loi_ban=LOT;';
  EXCEPTION WHEN check_violation THEN ket := ket || '07_xac_minh_khi_chi_co_loi_ban=CHAN;';
  END;

  BEGIN
    INSERT INTO public.bang_chung_viec (company_id, ho_so_viec_id, loai, nguon, trang_thai_xac_minh, khoa_trung) VALUES (cb, hs, 'user_confirmation', 'nguoi_dung', 'user_confirmed', 'khac_cong_ty');
    ket := ket || '08_bang_chung_khac_cong_ty=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '08_bang_chung_khac_cong_ty=CHAN;';
  END;

  BEGIN
    UPDATE public.bang_chung_viec SET gia_tri = 'sửa' WHERE ho_so_viec_id = hs;
    ket := ket || '09_sua_bang_chung=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '09_sua_bang_chung=CHAN;';
  END;
  BEGIN
    DELETE FROM public.bang_chung_viec WHERE ho_so_viec_id = hs;
    ket := ket || '10_xoa_bang_chung=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '10_xoa_bang_chung=CHAN;';
  END;

  BEGIN
    UPDATE public.ho_so_viec SET dau_van_tay = 'doi_danh_tinh' WHERE id = hs;
    ket := ket || '11_doi_danh_tinh=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '11_doi_danh_tinh=CHAN;';
  END;

  UPDATE public.ho_so_viec SET trang_thai = 'waiting_external', hen_kiem_lai = current_date + 3 WHERE id = hs;
  UPDATE public.ho_so_viec SET trang_thai = 'resolved_user_confirmed', giai_quyet_luc = now(), ket_qua = 'Thông báo chấp nhận (bạn nhập)' WHERE id = hs;
  ket := ket || '12_xong_co_bang_chung=' || (SELECT trang_thai || '/v' || phien_ban FROM public.ho_so_viec WHERE id = hs) || ';';

  BEGIN
    UPDATE public.ho_so_viec SET trang_thai = 'ready_to_act' WHERE id = hs;
    ket := ket || '13_mo_lai_viec_da_xong=LOT;';
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN ket := ket || '13_mo_lai_viec_da_xong=CHAN;';
  END;

  INSERT INTO public.nhat_ky_thay_doi (company_id, doi_tuong, doi_tuong_id, hanh_dong, sau) VALUES (ca, 'bang_chung_viec', hs::text || ':da_nop', 'them', '{}'::jsonb);
  ket := ket || '14_nhat_ky_bang_chung=DUOC;';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.ho_so_viec WHERE company_id = ca;
  ket := ket || '15_B_doc_viec_A=' || n || ';';
  SELECT count(*) INTO n FROM public.bang_chung_viec WHERE company_id = ca;
  ket := ket || '16_B_doc_bang_chung_A=' || n || ';';
  BEGIN
    INSERT INTO public.bang_chung_viec (company_id, ho_so_viec_id, loai, nguon, trang_thai_xac_minh, khoa_trung) VALUES (ca, hs, 'user_confirmation', 'nguoi_dung', 'user_confirmed', 'B_chen');
    ket := ket || '17_B_chen_bang_chung_A=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '17_B_chen_bang_chung_A=CHAN;';
  END;
  BEGIN
    UPDATE public.ho_so_viec SET tieu_de = 'bị sửa' WHERE id = hs;
    GET DIAGNOSTICS n = ROW_COUNT;
    ket := ket || '18_B_sua_viec_A=' || n || 'dong;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '18_B_sua_viec_A=CHAN;';
  END;
  BEGIN
    DELETE FROM public.bang_chung_viec WHERE ho_so_viec_id = hs;
    GET DIAGNOSTICS n = ROW_COUNT;
    ket := ket || '19_B_xoa_bang_chung_A=' || n || 'dong;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '19_B_xoa_bang_chung_A=CHAN;';
  END;
  BEGIN
    INSERT INTO public.ho_so_viec (company_id, loai, tieu_de, dau_van_tay) VALUES (ca, 'tam_ngung', 'B chen', 'b:chen');
    ket := ket || '20_B_chen_viec_A=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '20_B_chen_viec_A=CHAN;';
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.ho_so_viec WHERE id = hs;
  ket := ket || '21_A_doc_viec_minh=' || n || ';';
  SELECT count(*) INTO n FROM public.bang_chung_viec WHERE ho_so_viec_id = hs;
  ket := ket || '22_A_doc_bang_chung_minh=' || n || ';';
  BEGIN
    INSERT INTO public.bang_chung_viec (company_id, ho_so_viec_id, loai, nguon, trang_thai_xac_minh, khoa_trung) VALUES (ca, hs, 'user_confirmation', 'nguoi_dung', 'user_confirmed', 'A_tu_chen');
    ket := ket || '23_A_tu_ghi_thang=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '23_A_tu_ghi_thang=CHAN;';
  END;
  BEGIN
    UPDATE public.ho_so_viec SET trang_thai = 'resolved_system_verified' WHERE id = hs;
    ket := ket || '24_A_tu_danh_dau_xac_minh=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || '24_A_tu_danh_dau_xac_minh=CHAN;';
  END;
  EXECUTE 'RESET ROLE';

  RAISE EXCEPTION 'KET_QUA=%', ket;
END $$;
