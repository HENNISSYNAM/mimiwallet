-- Một quy ước tiền duy nhất:
--   type   = chiều tiền (income | expense | loan)
--   amount = độ lớn không âm, không mang chiều.
--
-- SePay và BankHub đã ghi khoản chi bằng amount dương. CSV import và dữ liệu
-- mock cũ lại ghi âm, khiến các màn hình phải đoán chiều bằng cả type lẫn dấu.
-- Khi hai tín hiệu mâu thuẫn, khoản chi dương bị cộng vào doanh thu.

BEGIN;

UPDATE public.transactions
SET amount = abs(amount)
WHERE amount < 0;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_amount_non_negative;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_non_negative CHECK (amount >= 0);

COMMENT ON COLUMN public.transactions.amount IS
  'Non-negative magnitude in VND. Direction is carried exclusively by transactions.type.';

COMMIT;
