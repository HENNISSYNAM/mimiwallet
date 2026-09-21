-- Khoá cột token ngân hàng khỏi trình duyệt.
--
-- Migration 20260918140000 mở quyền ĐỌC theo thành viên cho 24 bảng, trong đó có
-- `bank_connections`. Đúng cho gần hết các cột — kế toán cần thấy liên kết ngân hàng — nhưng
-- `access_token_enc` thì không: trước đây chỉ chủ công ty đọc được dòng đó, giờ cả vai trò
-- `nguoi_xem` cũng đọc được. Token có mã hoá, nhưng người chỉ được xem không có việc gì với nó.
--
-- Trong PostgreSQL, quyền SELECT ở mức BẢNG bao trùm mọi cột và không thể "trừ" một cột ra bằng
-- REVOKE cột. Cách duy nhất là thu quyền bảng rồi cấp lại theo danh sách cột. Danh sách dưới đây
-- là toàn bộ cột của bảng TRỪ `access_token_enc`; thêm cột mới sau này phải cấp thêm ở đây, nếu
-- quên thì truy vấn sẽ báo lỗi quyền chứ không âm thầm trả về rỗng.
--
-- Trình duyệt chỉ cần biết "còn chìa khoá hay không", không cần chính chìa khoá:
-- `PaymentMethods.tsx` lọc `.not('access_token_enc','is',null)` để biết liên kết còn dùng được.
-- Lọc theo một cột cũng cần quyền đọc cột đó, nên thay bằng cột sinh `co_token`.

ALTER TABLE public.bank_connections
  ADD COLUMN IF NOT EXISTS co_token boolean
  GENERATED ALWAYS AS (access_token_enc IS NOT NULL) STORED;

COMMENT ON COLUMN public.bank_connections.co_token IS
  'Còn token dùng được hay không. Có để giao diện kiểm tra mà không cần quyền đọc access_token_enc.';

COMMENT ON COLUMN public.bank_connections.access_token_enc IS
  'Token đã mã hoá. Chỉ service_role đọc được: quyền SELECT của authenticated được cấp theo từng cột, không có cột này.';

REVOKE SELECT ON public.bank_connections FROM anon, authenticated;

GRANT SELECT (
  id, company_id, bank_name, bank_code, status, last_synced_at, accounts,
  consent_granted, consent_expires_at, created_at, updated_at, provider,
  account_number, grant_id, account_name, last_reference, revoked_at,
  direction_convention, scopes, co_token
) ON public.bank_connections TO authenticated;

-- anon không còn quyền đọc cột nào. RLS vốn đã không cho anon dòng nào (không có policy), nhưng
-- quyền bảng vẫn còn đó là dư; bỏ luôn để hai lớp nói cùng một điều.
