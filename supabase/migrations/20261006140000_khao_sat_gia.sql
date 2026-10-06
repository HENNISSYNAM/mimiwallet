-- Khảo sát giá (06/10/2026) — tìm điểm khách chịu trả tiền bằng phương pháp Van Westendorp, gửi cho hộ kinh doanh thật.
-- Ai cũng gửi được (không cần đăng nhập), không ai đọc được qua API; đội đọc bằng service role (SQL editor).
-- Giới hạn độ dài và khoảng số để chặn rác; bốn mức giá phải tăng dần như câu hỏi đặt ra.
CREATE TABLE IF NOT EXISTS public.khao_sat_gia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  nhom_doanh_thu text NOT NULL CHECK (nhom_doanh_thu IN ('duoi_500tr', '500tr_1ty', '1_3ty', 'tren_3ty', 'chua_ro')),
  cach_thu_tien text NOT NULL CHECK (cach_thu_tien IN ('chuyen_khoan', 'tien_mat', 'ca_hai')),
  dang_ghi_so text NOT NULL CHECK (dang_ghi_so IN ('so_tay_excel', 'phan_mem_ban_hang', 'thue_ke_toan', 'chua_ghi')),
  tra_ke_toan_thang integer CHECK (tra_ke_toan_thang IS NULL OR tra_ke_toan_thang BETWEEN 0 AND 50000000),
  viec_dang_tien text NOT NULL CHECK (viec_dang_tien IN ('doi_chieu_sao_ke', 'thieu_chung_tu', 'khong_tre_han', 'soan_to_khai', 'kiem_truoc_khi_chuyen')),
  gia_qua_re integer NOT NULL CHECK (gia_qua_re BETWEEN 0 AND 50000000),
  gia_hoi integer NOT NULL CHECK (gia_hoi BETWEEN 0 AND 50000000),
  gia_bat_dau_dat integer NOT NULL CHECK (gia_bat_dau_dat BETWEEN 0 AND 50000000),
  gia_qua_dat integer NOT NULL CHECK (gia_qua_dat BETWEEN 0 AND 50000000),
  lien_he text CHECK (lien_he IS NULL OR char_length(lien_he) <= 200),
  nguon text CHECK (nguon IS NULL OR char_length(nguon) <= 60),
  CHECK (gia_qua_re <= gia_hoi AND gia_hoi <= gia_bat_dau_dat AND gia_bat_dau_dat <= gia_qua_dat)
);

ALTER TABLE public.khao_sat_gia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.khao_sat_gia FROM anon, authenticated;
GRANT INSERT ON public.khao_sat_gia TO anon, authenticated;

DROP POLICY IF EXISTS "Ai cũng gửi được khảo sát giá" ON public.khao_sat_gia;
CREATE POLICY "Ai cũng gửi được khảo sát giá" ON public.khao_sat_gia FOR INSERT TO anon, authenticated WITH CHECK (true);

COMMENT ON TABLE public.khao_sat_gia IS
  'Khảo sát giá Van Westendorp (/khao-sat-gia). Chỉ ghi; đội đọc bằng service role. Phân tích: docs/NGHIEN_CUU_CONG_NGHE_WTP_2026-10.md mục 6.';
