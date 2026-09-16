-- Hồ sơ thuế và bản nháp tờ khai (16/09/2026).
--
-- MIMI suy ra nghĩa vụ thuế từ dữ liệu thật (hoá đơn điện tử, sao kê) cộng vài điều chỉ người
-- dùng biết: là hộ kinh doanh hay doanh nghiệp, nhóm ngành, bán ở đâu, chọn cách tính thuế TNCN
-- nào. Bảng `ho_so_thue` giữ đúng mấy điều đó — không giữ số liệu tính được từ dữ liệu, để một
-- con số không có hai nơi nói hai giá trị.
--
-- `to_khai_nhap` là bản nháp tờ khai đã soạn: giữ nguyên trạng tờ khai (jsonb), danh sách căn cứ
-- pháp lý kèm kết quả đối chiếu với kho Công báo lúc soạn, và mã băm nội dung. Giữ lại vì đây là
-- giấy tờ hành chính: sau này cần đối chiếu "hôm đó MIMI khai số nào, dựa vào điều nào".
--
-- Mọi ghi đi qua edge function `to-khai` (service role). Người dùng chỉ ĐỌC qua RLS, chỉ dòng
-- của công ty mình — tờ khai là dữ liệu thuế, không cho trình duyệt sửa trực tiếp.

CREATE TABLE IF NOT EXISTS public.ho_so_thue (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  loai_nguoi_nop text CHECK (loai_nguoi_nop IS NULL OR loai_nguoi_nop IN ('ho_kinh_doanh', 'doanh_nghiep')),
  nhom_nganh text[] NOT NULL DEFAULT '{}'
    CHECK (
      cardinality(nhom_nganh) <= 6
      AND nhom_nganh <@ ARRAY['phan_phoi_hang_hoa', 'dich_vu', 'cho_thue_tai_san', 'san_xuat_van_tai', 'noi_dung_so', 'khac']::text[]
    ),
  kenh text CHECK (kenh IS NULL OR kenh IN ('dia_diem_co_dinh', 'tmdt_khong_thanh_toan', 'tmdt_co_thanh_toan')),
  phuong_phap_tncn text CHECK (phuong_phap_tncn IS NULL OR phuong_phap_tncn IN ('doanh_thu', 'thu_nhap')),
  bat_dau_kinh_doanh date CHECK (bat_dau_kinh_doanh IS NULL OR bat_dau_kinh_doanh >= DATE '1990-01-01'),
  da_nop_thue_trong_nam boolean,
  -- Tổng doanh thu năm trước trên quyết toán TNDN (doanh nghiệp) — căn cứ xét miễn thuế.
  doanh_thu_nam_truoc bigint CHECK (doanh_thu_nam_truoc IS NULL OR (doanh_thu_nam_truoc >= 0 AND doanh_thu_nam_truoc <= 1000000000000000)),
  co_quan_he_lien_ket boolean,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ho_so_thue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Xem hồ sơ thuế của công ty mình" ON public.ho_so_thue FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.ho_so_thue IS
  'Vài dữ kiện chỉ người dùng biết, cần cho hệ luật thuế (supabase/functions/_shared/luat/he-luat.ts). Ghi qua edge function to-khai.';

CREATE TABLE IF NOT EXISTS public.to_khai_nhap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mau text NOT NULL CHECK (mau IN ('01/TKN-CNKD', '01/CNKD')),
  nam smallint NOT NULL CHECK (nam BETWEEN 2026 AND 2100),
  ky_loai text NOT NULL CHECK (ky_loai IN ('nam', '6_thang_dau', 'quy')),
  quy smallint CHECK (quy IS NULL OR quy BETWEEN 1 AND 4),
  han_nop date NOT NULL,
  du_lieu jsonb NOT NULL,
  -- Căn cứ pháp lý kèm cờ đã đối chiếu với kho Công báo tại thời điểm soạn.
  can_cu jsonb NOT NULL,
  ma_bam text NOT NULL CHECK (ma_bam ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT to_khai_nhap_quy_dung CHECK ((ky_loai = 'quy') = (quy IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS to_khai_nhap_company_idx ON public.to_khai_nhap (company_id, created_at DESC);

ALTER TABLE public.to_khai_nhap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Xem bản nháp tờ khai của công ty mình" ON public.to_khai_nhap FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Một công ty không cần quá 200 bản nháp; chặn để bảng không thành kho chứa.
CREATE OR REPLACE FUNCTION public.to_khai_nhap_toi_da()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.to_khai_nhap WHERE company_id = NEW.company_id) >= 200 THEN
    RAISE EXCEPTION 'Tối đa 200 bản nháp tờ khai mỗi công ty';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS to_khai_nhap_toi_da_trg ON public.to_khai_nhap;
CREATE TRIGGER to_khai_nhap_toi_da_trg
  BEFORE INSERT ON public.to_khai_nhap
  FOR EACH ROW EXECUTE FUNCTION public.to_khai_nhap_toi_da();

COMMENT ON TABLE public.to_khai_nhap IS
  'Bản nháp tờ khai MIMI soạn (mẫu 01/TKN-CNKD, 01/CNKD kèm TT 50/2026), giữ cả căn cứ đã đối chiếu. MIMI không nộp thay người dùng.';
