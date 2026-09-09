-- Danh mục tài sản số do người dùng TỰ KHAI.
--
-- VÌ SAO TỰ KHAI CHỨ KHÔNG NỐI TÀI KHOẢN SÀN. Nối tài khoản đòi khoá API của
-- sàn, và một khoá API — kể cả khoá chỉ-đọc — là thứ nếu rò rỉ thì lộ toàn bộ
-- lịch sử giao dịch của khách. Tự khai thì MIMI chỉ biết những gì khách chọn
-- kể, không giữ chìa khoá nào, và không có đường nào để đặt lệnh dù có bị chiếm
-- quyền. Đây là ranh giới cố ý, giống việc bỏ scope `identity` của Cas.
--
-- BẢNG NÀY KHÔNG PHẢI SỔ KẾ TOÁN. Nó không đi vào báo cáo thuế, không vào
-- `transactions`, không ảnh hưởng ngưỡng doanh thu. Tài sản số và doanh thu
-- kinh doanh là hai thứ khác nhau, và trộn chúng lại sẽ làm hỏng đúng con số mà
-- cả sản phẩm được dựng để tính đúng.
--
-- GIÁ VỐN GHI BẰNG USD. Không phải vì USD tiện hơn, mà vì giá công khai của các
-- sàn đều quy về USD — ghi giá vốn bằng VND rồi so với giá USD là so hai đại
-- lượng khác đơn vị, và cần một tỷ giá mà MIMI hiện không có nguồn nào đáng tin
-- để lấy. Khi nào có nguồn tỷ giá thì thêm cột `tien_te`, không quy đổi ngầm.

CREATE TABLE IF NOT EXISTS public.danh_muc_dau_tu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Mã tài sản viết hoa, ví dụ BTC, ETH, SOL. Không lưu cặp giao dịch
  -- (BTCUSDT) vì mỗi sàn đặt tên cặp một kiểu; tầng gọi API tự ghép.
  ma text NOT NULL CHECK (ma ~ '^[A-Z0-9]{2,15}$'),

  -- Số lượng đang giữ. numeric chứ không phải float: 0.1 + 0.2 trong float
  -- không bằng 0.3, và đây là số nhân với tiền.
  so_luong numeric(38, 18) NOT NULL CHECK (so_luong > 0),

  -- Giá vốn trung bình, USD một đơn vị. NULL nghĩa là khách không muốn khai —
  -- khi đó vẫn tính được giá trị nhưng KHÔNG tính được lãi lỗ, và màn hình phải
  -- nói ra điều đó thay vì hiện 0.
  gia_von_usd numeric(38, 18) CHECK (gia_von_usd IS NULL OR gia_von_usd > 0),

  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Một mã một dòng cho mỗi công ty. Mua thêm thì sửa số lượng và giá vốn
  -- trung bình, không tạo dòng thứ hai — hai dòng cùng mã sẽ hiện thành hai
  -- khoản riêng và tổng danh mục vẫn đúng, nhưng tỷ trọng thì sai.
  UNIQUE (company_id, ma)
);

CREATE INDEX IF NOT EXISTS danh_muc_dau_tu_company_idx
  ON public.danh_muc_dau_tu (company_id);

ALTER TABLE public.danh_muc_dau_tu ENABLE ROW LEVEL SECURITY;

-- Chỉ đọc và sửa danh mục của công ty mình. Cùng khuôn với các bảng khác:
-- quyền đi qua `companies.user_id`, không qua một cột user_id riêng dễ lệch.
CREATE POLICY "Xem danh mục của công ty mình"
  ON public.danh_muc_dau_tu FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Thêm vào danh mục của công ty mình"
  ON public.danh_muc_dau_tu FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Sửa danh mục của công ty mình"
  ON public.danh_muc_dau_tu FOR UPDATE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Xoá khỏi danh mục của công ty mình"
  ON public.danh_muc_dau_tu FOR DELETE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.danh_muc_dau_tu IS
  'Tài sản số do người dùng tự khai. Không nối tài khoản sàn, không giữ khoá API, không vào sổ kế toán hay báo cáo thuế.';
COMMENT ON COLUMN public.danh_muc_dau_tu.gia_von_usd IS
  'Giá vốn trung bình mỗi đơn vị, USD. NULL nghĩa là chưa khai — khi đó không tính lãi lỗ.';
