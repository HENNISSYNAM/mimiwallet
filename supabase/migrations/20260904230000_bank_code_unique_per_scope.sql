-- Một công ty được nhiều liên kết cho cùng một ngân hàng, miễn khác mục đích.
--
-- SỰ VIỆC. Migration 20260904220000 thêm `scopes` vào khoá
-- `(company_id, provider, account_number)` để một tài khoản có thể vừa phát mã
-- QR vừa cho đọc sao kê. Cần thiết, nhưng CHƯA ĐỦ: còn hai unique index toàn
-- phần khác trên `(company_id, bank_code)` —
--
--   bank_connections_company_bank_unique  (20260309032110)
--   bank_connections_company_bank_idx     (20260810160000)
--
-- — và cả hai vẫn nói "một công ty chỉ được MỘT liên kết cho mỗi ngân hàng".
-- Nên liên kết MB lần thứ hai để đọc sao kê bị chặn ở tầng CSDL, và giao diện
-- chỉ hiện được câu chung "Không lưu được liên kết".
--
-- QUY TẮC ĐÚNG là (công ty, ngân hàng, MỤC ĐÍCH). Một công ty có đúng một liên
-- kết MB để đọc sao kê, đúng một để nhận tiền QR, đúng một cho thuế. Trước đây
-- không phân biệt được vì mọi liên kết chỉ có một mục đích duy nhất.
--
-- VÌ SAO PHẢI ĐIỀN `scopes` CHO MỌI DÒNG TRƯỚC. Postgres coi các NULL là khác
-- nhau, nên nếu để `scopes` NULL thì unique index có chứa nó sẽ NGỪNG ràng buộc
-- đúng những dòng đang NULL — tức các liên kết demo do `open-banking` tạo, vốn
-- chưa bao giờ đặt trường này. Đổi một lỗi lấy một lỗi âm thầm hơn.
--
-- VÌ SAO KHÔNG DÙNG PARTIAL INDEX. Lý do đã ghi trong 20260811090000 và vẫn
-- đúng: Postgres không dùng partial unique index cho ON CONFLICT trừ khi câu
-- lệnh lặp lại đúng predicate, mà `onConflict` của PostgREST chỉ mang được tên
-- cột. Giữ chỉ mục toàn phần và làm cho dữ liệu sạch là đường đúng.

-- ── 1. Điền `scopes` cho mọi dòng đang trống ────────────────────────────────
--
-- Dòng bankhub cũ có trước khi cột này ra đời đều là liên kết đọc sao kê —
-- lúc đó chưa có QR Pay lẫn thuế. Dòng của provider khác là liên kết mô phỏng.
UPDATE public.bank_connections
   SET scopes = 'transaction'
 WHERE scopes IS NULL AND provider = 'bankhub';

UPDATE public.bank_connections
   SET scopes = 'demo'
 WHERE scopes IS NULL;

-- ── 2. Không cho trống lại ──────────────────────────────────────────────────
ALTER TABLE public.bank_connections
  ALTER COLUMN scopes SET DEFAULT 'transaction';

ALTER TABLE public.bank_connections
  ALTER COLUMN scopes SET NOT NULL;

-- ── 3. Khoá theo mục đích ───────────────────────────────────────────────────
DROP INDEX IF EXISTS public.bank_connections_company_bank_unique;
DROP INDEX IF EXISTS public.bank_connections_company_bank_idx;

-- `open-banking` upsert dòng demo theo bộ ba này, nên thứ tự cột phải khớp
-- đúng chuỗi `onConflict` bên đó: company_id,bank_code,scopes.
CREATE UNIQUE INDEX IF NOT EXISTS bank_connections_company_bank_scope_idx
  ON public.bank_connections (company_id, bank_code, scopes);
