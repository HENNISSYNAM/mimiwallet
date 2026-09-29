-- Khách trả tiền mặt nhiều hay ít (29/09/2026).
--
-- MIMI chỉ thấy tiền qua ngân hàng. Thử bằng khách giả lập (docs/PHAN_HOI_GIA_LAP_WTP.md): tiệm vàng bán
-- chủ yếu tiền mặt, MIMI thấy 938 triệu và báo "chưa vượt 1 tỷ" trong khi doanh thu thật 2,59 tỷ. Có câu
-- trả lời này thì đồng hồ ngưỡng không kết luận "chưa vượt" khi phần lớn tiền không qua ngân hàng.
-- NULL = chưa hỏi. Ghi qua edge function to-khai (hành động `luu_tien_mat`).
ALTER TABLE public.ho_so_thue
  ADD COLUMN IF NOT EXISTS tien_mat text
  CHECK (tien_mat IS NULL OR tien_mat IN ('gan_nhu_khong', 'mot_phan', 'phan_lon'));

COMMENT ON COLUMN public.ho_so_thue.tien_mat IS
  'Khách trả tiền mặt: gan_nhu_khong | mot_phan | phan_lon. NULL = chưa hỏi. Dùng để không kết luận ngưỡng doanh thu khi MIMI không thấy tiền mặt.';
