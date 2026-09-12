-- Tính lại tần suất từ sau khi nạp đủ kho luật (12/09/2026).
--
-- Kho lên 5.130 văn bản, khoảng 125 nghìn đoạn. `lam_moi_tu_pho_bien()` quét
-- toàn bộ chỉ mục bằng ts_stat; gọi qua API thì bị cắt ở giới hạn thời gian
-- của PostgREST (khoảng 8 giây), nên bước làm mới cuối lần nạp không chạy xong.
-- Bảng `tu_pho_bien` khi đó chỉ phản ánh 66 nghìn đoạn nạp trước — từ chỉ có
-- trong văn bản mới bị coi là "không tồn tại" và không bao giờ được dùng để lọc.
--
-- Migration chạy qua CLI, không bị giới hạn đó. Khi nạp thêm văn bản sau này,
-- tạo một migration giống hệt file này để làm mới lại.

SELECT public.lam_moi_tu_pho_bien();
