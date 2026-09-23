-- 192 dòng seed mang nhãn "tiền thật" phải được trả về đúng tên của nó.
--
-- VÌ SAO. Ngày 23/09/2026, trang Tổng quan kết luận "Doanh thu năm 2026: 8,60
-- tỷ · đã vượt ngưỡng 1 tỷ · đã vượt trần 3 tỷ · chỉ còn cách tính theo thu
-- nhập, thuế suất 17%", và trang Trợ lý dựng sẵn nút "Soạn tờ khai" với hạn
-- 30/04/2026.
--
-- `tax-summary` không hề tính sai: nó lọc `is_synthetic` trước khi cộng, và
-- chú thích ngay tại đó đã nói rõ vì sao. Sai nằm ở dữ liệu — 192 dòng seed
-- `source_bank = 'VCB'` được ghi với `is_synthetic = false`, tức tự nhận là
-- tiền thật. Một bộ lọc đúng đặt trên một cái nhãn nói dối thì vẫn ra số sai,
-- và ở đây số sai đó là số quyết định người ta có phải nộp thuế hay không.
--
-- CĂN CỨ ĐỂ KHẲNG ĐỊNH CHÚNG LÀ DỮ LIỆU THỬ, không phải suy đoán:
--
--   1. Chưa từng có liên kết ngân hàng nào tới VCB. `bank_connections` chỉ có
--      bankhub, sepay (MB Bank) và mock (ACB). Không có đường nào để giao dịch
--      VCB đi vào hệ thống.
--   2. Tên đối tác là Lotteria Vietnam, Highlands Coffee, Co.op Mart, Bách Hóa
--      Xanh, GS25 Franchise, Circle K Vietnam — đúng bộ tên của hoá đơn seed
--      INV-2901…2909 đã đánh dấu ở migration trước.
--   3. Số tròn trăm triệu, rải đều 2025-08 đến 2026-07.
--
-- Sau bước này, tiền thật còn lại là 3 giao dịch MBBank qua SePay, tổng 6.200 ₫
-- — đúng với những gì đã thực sự chạy qua hệ thống. Các dòng seed KHÔNG bị xoá:
-- chúng vẫn hiện ở danh sách giao dịch kèm nhãn "demo", nên màn hình demo vẫn
-- có nội dung, chỉ là không còn được cộng vào tiền của ai.
--
-- Lọc thêm `is_synthetic = false` để lần chạy thứ hai không đụng gì, và để nếu
-- sau này có liên kết VCB thật thì migration cũ cũng đã chạy xong từ lâu.

UPDATE public.transactions
SET is_synthetic = true
WHERE source_bank = 'VCB'
  AND is_synthetic = false;
