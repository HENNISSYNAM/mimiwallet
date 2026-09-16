-- Hoạt động đặc thù của người nộp thuế (16/09/2026).
--
-- Ngành quyết định MẪU tờ khai, không chỉ tỷ lệ thuế: người cho thuê nhà khai mẫu 01/BĐS
-- (Thông tư 18/2026/TT-BTC Điều 4 khoản 4), người làm đại lý xổ số/bảo hiểm/đa cấp khai theo
-- năm phần chưa bị khấu trừ (Điều 4 khoản 3), còn hàng chịu thuế tiêu thụ đặc biệt, tài nguyên
-- hay bảo vệ môi trường thì khai thêm theo luật riêng (Nghị định 68/2026/NĐ-CP Điều 7).
--
-- Vì vậy MIMI hỏi điều này ngay lúc bắt đầu, và giữ ở đây để mọi màn (trợ lý, tờ khai, nhắc
-- thuế) nói cùng một kết luận.

ALTER TABLE public.ho_so_thue
  ADD COLUMN IF NOT EXISTS nganh_dac_thu text;

ALTER TABLE public.ho_so_thue DROP CONSTRAINT IF EXISTS ho_so_thue_nganh_dac_thu_check;
ALTER TABLE public.ho_so_thue
  ADD CONSTRAINT ho_so_thue_nganh_dac_thu_check
  CHECK (nganh_dac_thu IS NULL OR nganh_dac_thu IN ('khong', 'cho_thue_bat_dong_san', 'dai_ly_xo_so_bao_hiem_da_cap', 'hang_thue_khac'));

COMMENT ON COLUMN public.ho_so_thue.nganh_dac_thu IS
  'Hoạt động dùng mẫu tờ khai riêng: cho thuê bất động sản (01/BĐS), đại lý xổ số/bảo hiểm/đa cấp, hàng chịu thuế TTĐB/tài nguyên/BVMT.';
