-- Hoá đơn demo phải tách được khỏi hoá đơn thật.
--
-- VÌ SAO. `transactions` có `is_synthetic` từ lâu và mọi chỗ đọc đều lọc nó.
-- `invoices` thì không có cột nào tương đương, nên trang Tổng quan cùng lúc nói
-- "Dòng tiền ròng 30 ngày: 0 ₫ · chưa có giao dịch trong khoảng thời gian này"
-- và "Hóa đơn chờ thanh toán: 165,5 tỷ". Người dùng không suy ra được rằng một
-- thẻ đã lọc dữ liệu thử còn thẻ kia không có gì để lọc; họ chỉ thấy app tự mâu
-- thuẫn về tiền của chính mình. Một lần như vậy là đủ để không tin số nào nữa.
--
-- Quy ước giống hệt `transactions`: mặc định `false`, chỉ dòng do công cụ demo
-- sinh ra mới là `true`. Danh sách nào trình bày "tiền của bạn" thì lọc bỏ;
-- trang quản lý hoá đơn vẫn hiện chúng kèm nhãn, để người dùng biết chúng tồn
-- tại và xoá được.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invoices.is_synthetic IS
  'true = hoá đơn do công cụ demo sinh ra, không phải tiền thật. Mọi con số tổng hợp phải loại bỏ.';

-- Chín dòng seed ngày 20/07/2026 (INV-2901…INV-2909, khách là chuỗi bán lẻ lớn,
-- số tròn trăm triệu). Liệt kê thẳng mã hoá đơn thay vì đoán theo ngày hay theo
-- số tiền: đoán thì có ngày sẽ đánh dấu nhầm một hoá đơn thật, mà một hoá đơn
-- thật bị coi là dữ liệu thử sẽ biến mất khỏi doanh thu mà không ai biết.
UPDATE public.invoices
SET is_synthetic = true
WHERE invoice_number IN (
  'INV-2901', 'INV-2902', 'INV-2903', 'INV-2904', 'INV-2905',
  'INV-2906', 'INV-2907', 'INV-2908', 'INV-2909'
);

-- Mọi truy vấn tổng hợp đều lọc theo cột này cùng với company_id.
CREATE INDEX IF NOT EXISTS invoices_cty_that_idx
  ON public.invoices (company_id)
  WHERE is_synthetic = false;
