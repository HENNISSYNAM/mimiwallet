-- Câu trả lời "cần xác minh" của doanh nghiệp và ngành nghề VSIC (12/10/2026).
--
-- Lịch thuế doanh nghiệp (supabase/functions/_shared/luat/lich-thue.ts) cần bốn điều chỉ người dùng biết:
-- có trả lương không, khai GTGT theo tháng hay quý, có phải doanh nghiệp siêu nhỏ, nộp TNDN theo thu nhập
-- hay theo tỷ lệ % trên doanh thu. Trước đây không có nơi lưu nên lịch hỏi mãi cùng một câu (lỗi L16,
-- docs/DONG_BO_THONG_BAO_NHAC_THUE.md). NULL = chưa trả lời → mốc vẫn "cần xác minh".
--
-- Ngành: mã VSIC cấp 4 người dùng khai (mã + tên chép từ giấy đăng ký), nhiều ngành, một ngành chính.
--
-- Cùng bảng `ho_so_thue`, cùng đường ghi: edge function `to-khai` (service role), hành động
-- `luu_tra_loi_nghia_vu` / `luu_nganh`, quyền `sua_ho_so_thue`. Người dùng vẫn chỉ ĐỌC qua RLS sẵn có.
ALTER TABLE public.ho_so_thue
  ADD COLUMN IF NOT EXISTS tra_luong boolean,
  ADD COLUMN IF NOT EXISTS ky_khai_gtgt text CHECK (ky_khai_gtgt IS NULL OR ky_khai_gtgt IN ('thang', 'quy')),
  ADD COLUMN IF NOT EXISTS sieu_nho boolean,
  ADD COLUMN IF NOT EXISTS phuong_phap_tndn text CHECK (phuong_phap_tndn IS NULL OR phuong_phap_tndn IN ('thu_nhap', 'ty_le')),
  ADD COLUMN IF NOT EXISTS nganh_vsic jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(nganh_vsic) = 'array' AND jsonb_array_length(nganh_vsic) <= 30),
  ADD COLUMN IF NOT EXISTS nganh_chinh text CHECK (nganh_chinh IS NULL OR nganh_chinh ~ '^[0-9]{4}$');

COMMENT ON COLUMN public.ho_so_thue.tra_luong IS 'Người dùng xác nhận công ty có trả tiền lương, tiền công. NULL = chưa trả lời.';
COMMENT ON COLUMN public.ho_so_thue.ky_khai_gtgt IS 'Kỳ khai GTGT: thang | quy. NULL = chưa trả lời.';
COMMENT ON COLUMN public.ho_so_thue.sieu_nho IS 'Doanh nghiệp siêu nhỏ (TT 58/2026 Điều 10). NULL = chưa trả lời.';
COMMENT ON COLUMN public.ho_so_thue.phuong_phap_tndn IS 'Nộp TNDN: thu_nhap | ty_le (% trên doanh thu). NULL = chưa trả lời.';
COMMENT ON COLUMN public.ho_so_thue.nganh_vsic IS 'Mảng {ma: 4 chữ số VSIC cấp 4, ten}; người dùng khai theo giấy đăng ký.';
COMMENT ON COLUMN public.ho_so_thue.nganh_chinh IS 'Mã VSIC cấp 4 của ngành chính — phải nằm trong nganh_vsic (kiểm ở edge function).';
