-- Ba luật an toàn cho agent, 14/09/2026 (docs/CHIEN_LUOC_MIMI.md, S2 kéo lên sớm).
--
-- 1. Trần tần suất: agent chạy vòng lặp gửi hàng trăm yêu cầu là kiểu hỏng
--    thường gặp nhất của agent. Mặc định 30 yêu cầu mỗi 60 phút; NULL = không
--    giới hạn. Dòng chính sách cũ nhận luôn giá trị mặc định.
-- 2. Người nhận thêm chưa đủ 24 giờ: đọc từ nguoi_nhan_duoc_phep.created_at,
--    không cần cột mới.
-- 3. Đổi số tài khoản cùng tên: đọc lịch sử yeu_cau_chi, không cần cột mới.

ALTER TABLE public.chinh_sach_chi
  ADD COLUMN IF NOT EXISTS so_yeu_cau_moi_gio integer DEFAULT 30
  CHECK (so_yeu_cau_moi_gio IS NULL OR so_yeu_cau_moi_gio BETWEEN 1 AND 1000);

-- Đếm yêu cầu của một agent trong 60 phút qua ở mỗi lần xin chi.
CREATE INDEX IF NOT EXISTS yeu_cau_chi_tac_tu_tao_idx
  ON public.yeu_cau_chi (tac_tu_id, created_at DESC);

-- Tìm các lần đã duyệt/đã chi của cùng công ty để so số tài khoản.
CREATE INDEX IF NOT EXISTS yeu_cau_chi_cong_ty_trang_thai_idx
  ON public.yeu_cau_chi (company_id, trang_thai, created_at DESC);
