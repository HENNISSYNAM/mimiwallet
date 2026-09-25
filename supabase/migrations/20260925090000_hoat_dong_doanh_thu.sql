-- Doanh thu thuộc NHÓM HOẠT ĐỘNG nào — lớp ngữ nghĩa nằm giữa "khoản tiền này là gì" và "dòng nào
-- trên tờ khai".
--
-- VÌ SAO. Trước 25/09/2026 tờ khai làm thế này: hồ sơ thuế chỉ có một nhóm ngành → đổ TOÀN BỘ doanh
-- thu vào dòng của nhóm đó. Công ty demo (hồ sơ "phân phối hàng hoá") thấy 954 triệu nằm trọn ở
-- [08a]. Ngành đăng ký là ngành ĐƯỢC PHÉP làm, không phải ngành THỰC SỰ sinh ra từng đồng: một hộ
-- đăng ký bán hàng vẫn có thể thu tiền dịch vụ, mà hai nhóm này khác tỷ lệ thuế.
--
-- NGUYÊN TẮC.
--   - Ngành đăng ký chỉ là GỢI Ý. Chỉ người xác nhận (từng khoản, hoặc cả nhóm một lần) mới gắn
--     được nhóm hoạt động. Khoản chưa ai gắn là "chưa rõ", và "chưa rõ" chặn xuất tờ khai.
--   - Không backfill bằng cách đoán: dữ liệu cũ bắt đầu ở trạng thái chưa rõ.
--   - Không sửa dòng giao dịch/hoá đơn gốc. Phân loại nằm ở bảng riêng, có lịch sử, hoàn tác được.
--
-- Một bảng cho ba nguồn doanh thu, vì tờ khai có thể lấy doanh thu từ bất kỳ nguồn nào
-- (`chonDoanhThu`): giao dịch ngân hàng, hoá đơn điện tử, số người dùng tự nhập theo quý.

CREATE TABLE IF NOT EXISTS public.phan_loai_hoat_dong (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- 'giao_dich' → transactions.id; 'hoa_don' → gdt_invoices.id; 'tu_nhap' → "<năm>-q<quý>".
  nguon text NOT NULL CHECK (nguon IN ('giao_dich', 'hoa_don', 'tu_nhap')),
  nguon_id text NOT NULL,
  -- Cùng bộ mã với ho_so_thue.nhom_nganh — một bộ mã cho cả hồ sơ, tờ khai và phân loại.
  hoat_dong text NOT NULL CHECK (hoat_dong IN
    ('phan_phoi_hang_hoa', 'dich_vu', 'cho_thue_tai_san', 'san_xuat_van_tai', 'noi_dung_so', 'khac')),
  -- Bằng chứng: người xác nhận là nguồn duy nhất được ghi hôm nay. Hoá đơn có dòng hàng hoá /
  -- sàn TMĐT sẽ là nguồn máy khi có dữ liệu đó.
  nguon_xac_dinh text NOT NULL DEFAULT 'nguoi_dung' CHECK (nguon_xac_dinh IN ('nguoi_dung', 'hoa_don', 'san_tmdt')),
  -- Máy đã gợi ý gì lúc người xác nhận (để đo gợi ý đúng bao nhiêu), không phải căn cứ.
  goi_y text,
  confirmed_by uuid NOT NULL,
  confirmed_role text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, nguon, nguon_id)
);

CREATE INDEX IF NOT EXISTS phan_loai_hoat_dong_cty_idx ON public.phan_loai_hoat_dong (company_id, nguon);

-- Lịch sử, chỉ thêm. Hoàn tác = một dòng mới đưa về như trước (from/to đảo lại).
CREATE TABLE IF NOT EXISTS public.phan_loai_hoat_dong_su_kien (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nguon text NOT NULL,
  nguon_id text NOT NULL,
  tu_hoat_dong text,
  sang_hoat_dong text,
  nhom_hang_loat uuid,
  la_hoan_tac boolean NOT NULL DEFAULT false,
  actor uuid NOT NULL,
  actor_role text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phan_loai_hoat_dong_su_kien_nhom_idx
  ON public.phan_loai_hoat_dong_su_kien (nhom_hang_loat) WHERE nhom_hang_loat IS NOT NULL;
CREATE INDEX IF NOT EXISTS phan_loai_hoat_dong_su_kien_khoan_idx
  ON public.phan_loai_hoat_dong_su_kien (company_id, nguon, nguon_id, at DESC);

ALTER TABLE public.phan_loai_hoat_dong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phan_loai_hoat_dong_su_kien ENABLE ROW LEVEL SECURITY;

-- Chỉ đọc cho thành viên công ty. Không có chính sách ghi: chỉ máy chủ (service role) ghi, sau khi
-- kiểm quyền vai trò — cùng mô hình với revenue_classifications.
CREATE POLICY "Thành viên công ty đọc phan_loai_hoat_dong" ON public.phan_loai_hoat_dong
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Thành viên công ty đọc phan_loai_hoat_dong_su_kien" ON public.phan_loai_hoat_dong_su_kien
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.phan_loai_hoat_dong IS
  'Khoản doanh thu thuộc nhóm hoạt động nào (dòng [08a]/[08b]… trên tờ khai). Chỉ người xác nhận; không có dòng = chưa rõ, và chưa rõ chặn xuất tờ khai.';
COMMENT ON TABLE public.phan_loai_hoat_dong_su_kien IS
  'Lịch sử phân loại nhóm hoạt động, chỉ thêm. Hoàn tác theo từng khoản hoặc theo nhom_hang_loat.';
