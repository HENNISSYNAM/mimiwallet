-- 06/10/2026 — hai lỗ ở bảng liên kết ngân hàng.
--
-- 1. Bỏ đường khách tự khai tài khoản SePay: không có bước chứng minh chủ tài khoản, ai cũng khai được tài khoản của
--    người khác và đọc tiền về của họ. SePay chỉ còn báo tiền về tài khoản nhận của MIMI (biến môi trường, không
--    nằm trong bảng này). Ngắt các liên kết SePay cũ — giữ dòng để còn dấu vết, không xoá.
-- 2. Trình duyệt không còn ghi thẳng vào `bank_connections`: mọi liên kết đi qua máy chủ (`bank-link`, service role).
--    Giao diện chỉ đọc. Trước đây chủ công ty tự chèn được dòng với số tài khoản bất kỳ qua REST.
UPDATE public.bank_connections
   SET status = 'disconnected', revoked_at = now()
 WHERE provider = 'sepay' AND status <> 'disconnected';

DROP POLICY IF EXISTS "Users can insert own bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Users can update own bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Users can delete own bank connections" ON public.bank_connections;
REVOKE INSERT, UPDATE, DELETE ON public.bank_connections FROM anon, authenticated;
