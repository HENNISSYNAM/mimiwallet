-- Thư viện chứng từ và màu đại diện công ty (15/09/2026).
--
-- ẢNH CHỨNG TỪ. Bản đầu của `chung_tu_quet` cố ý không lưu ảnh. Người dùng muốn một "thư
-- viện ảnh" lưu hoá đơn, chứng từ — giống cách Ramp giữ ảnh biên lai đi kèm từng khoản chi
-- để kế toán và kiểm toán tra lại. Ảnh là bằng chứng; chỉ các trường đã đọc thì không kiểm
-- lại được. Nên giờ lưu ảnh, nhưng:
--   - kho riêng tư, không public; đường dẫn `{company_id}/{chung_tu_id}.{jpg|png|webp}`;
--   - chỉ người dùng của đúng công ty đọc được (ký URL tạm), không ai ghi từ trình duyệt:
--     edge function `tro-ly` tải lên bằng service role sau khi người dùng bấm lưu;
--   - người dùng bỏ chọn "lưu ảnh" thì chỉ lưu các trường như trước.
--
-- MÀU ĐẠI DIỆN. Ảnh đại diện công ty là vòng tròn chữ cái đầu, kiểu tài khoản Google. Người
-- dùng chọn màu bằng dải kéo trong Cài đặt; lưu sắc độ (0–359) để mọi máy thấy cùng màu.
-- NULL = màu tự động theo tên.

ALTER TABLE public.chung_tu_quet
  ADD COLUMN IF NOT EXISTS anh_path text CHECK (anh_path IS NULL OR char_length(anh_path) BETWEEN 3 AND 300);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS mau_dai_dien smallint CHECK (mau_dai_dien IS NULL OR mau_dai_dien BETWEEN 0 AND 359);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chung-tu', 'chung-tu', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Chỉ ĐỌC, chỉ thư mục của công ty mình. Không có policy ghi: chỉ edge function ghi.
CREATE POLICY "Xem ảnh chứng từ của công ty mình"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chung-tu'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.companies WHERE user_id = auth.uid())
);

COMMENT ON TABLE public.chung_tu_quet IS
  'Trường đọc từ ảnh chứng từ, người dùng đã xác nhận; ảnh gốc (nếu người dùng chọn lưu) ở kho riêng tư chung-tu. Không phải hoá đơn điện tử của cơ quan thuế.';
COMMENT ON COLUMN public.companies.mau_dai_dien IS
  'Sắc độ HSL 0–359 của ảnh đại diện chữ cái; NULL là màu tự động theo tên.';
