-- Một tài khoản ngân hàng được phép có nhiều liên kết, mỗi scope một liên kết.
--
-- SỰ VIỆC 04/09/2026. Mã QR đã tạo được (case 12 nghiệm thu), tiền đã về tài
-- khoản, nhưng `qr_payments` vẫn ở `pending`. Nguyên nhân nằm ở kiến trúc chứ
-- không ở một dòng mã hỏng:
--
--   `reconcileCompanyQr` khớp `qr_payments` với bảng `transactions`. Muốn có
--   dòng trong `transactions` thì MIMI phải ĐỌC ĐƯỢC SAO KÊ của tài khoản đó.
--   Nhưng grant `qrpay` không có scope `transaction` — nó tạo được mã QR và
--   không nhìn thấy tiền vào.
--
-- Nên một tài khoản cần HAI liên kết: một `qrpay` để phát mã, một `transaction`
-- để thấy tiền về. Đó là thiết kế đúng, và nó vốn đã được ngụ ý ở khắp nơi —
-- `create-qr` lọc `.eq("scopes","qrpay")`, vòng đồng bộ bỏ qua dòng `qrpay`.
--
-- CÁI BẪY. Chỉ mục cũ là `(company_id, provider, account_number)`, và
-- `exchange` upsert theo đúng bộ ba đó. Nghĩa là liên kết tài khoản `2002` lần
-- thứ hai với scope `transaction` sẽ **khớp đúng dòng `qrpay` đang có và ghi đè
-- `scopes` thành `transaction`** — xoá mất khả năng tạo QR vừa lấy được, im
-- lặng, không một thông báo nào. Người dùng làm theo lời khuyên hiển nhiên
-- ("liên kết tài khoản để MIMI đọc sao kê") sẽ tự phá thứ mình vừa dựng.
--
-- Thêm `scopes` vào khoá là sửa đúng chỗ: định danh của một liên kết vốn là
-- "tài khoản nào, để làm gì", chứ không phải "tài khoản nào".
--
-- GIỮ CHỈ MỤC TOÀN PHẦN, KHÔNG DÙNG PARTIAL. Lý do đã ghi trong
-- 20260811090000: Postgres không dùng partial unique index cho ON CONFLICT trừ
-- khi câu lệnh lặp lại đúng predicate, mà `onConflict` của PostgREST chỉ mang
-- được tên cột. NULL vẫn được coi là khác nhau, nên các dòng mock/sepay không
-- có `account_number` không bị ảnh hưởng.

DROP INDEX IF EXISTS public.bank_connections_company_account_idx;

CREATE UNIQUE INDEX IF NOT EXISTS bank_connections_company_account_scope_idx
  ON public.bank_connections (company_id, provider, account_number, scopes);
