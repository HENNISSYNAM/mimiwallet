-- Bản nháp tờ khai nhận thêm mẫu 05/KK-TNCN (thuế TNCN tổ chức trả thu nhập từ tiền lương, tiền
-- công khấu trừ — mẫu kèm Thông tư 89/2026/TT-BTC, khai theo quý).
--
-- Vì sao chỉ nới ràng buộc `mau`: tờ khai mới dùng lại nguyên luồng `to_khai_nhap` (jsonb tờ khai,
-- căn cứ, mã băm, xuất/thu tiền theo kỳ) — không dựng bảng song song. Ràng buộc kỳ đã đúng sẵn:
-- 05/KK-TNCN luôn là kỳ quý (`ky_loai = 'quy'`, có `quy`).
--
-- Không lưu bảng lương: `du_lieu` chỉ giữ số tổng của tờ khai và `bam_bang_luong` (SHA-256 của bảng
-- lương đã chuẩn hoá) — xem `supabase/functions/to-khai/index.ts` → `soanTncn`.
--
-- Ràng buộc gốc viết liền trên cột (20260916090000_ho_so_thue_to_khai.sql) nên Postgres đặt tên
-- `to_khai_nhap_mau_check`.

ALTER TABLE public.to_khai_nhap DROP CONSTRAINT IF EXISTS to_khai_nhap_mau_check;
ALTER TABLE public.to_khai_nhap
  ADD CONSTRAINT to_khai_nhap_mau_check CHECK (mau IN ('01/TKN-CNKD', '01/CNKD', '05/KK-TNCN'));
