-- Hai kiểm soát nâng cao cho agent, 11/10/2026 (docs/AGENT_KIEM_SOAT_NANG_CAO.md).
--
-- 1. Khung giờ được chi theo giờ Việt Nam. Agent chạy cả đêm, người trông nó thì
--    không: khoản xin ngoài khung giờ không tự đi. NULL = mọi lúc (giữ hành vi cũ).
--    Dạng: {"tu_phut": 480, "den_phut": 1200, "thu": [1,2,3,4,5]} — phút trong
--    ngày, "đến" không gồm; thu theo ISO, 1 = thứ Hai … 7 = Chủ nhật. Máy chủ
--    (tac-tu/luu_chinh_sach) kiểm khuôn chi tiết; ở đây chỉ chặn kiểu sai thô.
-- 2. ngoai_khung_gio: ngoài giờ thì chờ người duyệt (mặc định) hay từ chối hẳn.
-- 3. Trần tổng chi cho MỘT người nhận trong tháng, trên mỗi agent. NULL = không
--    giới hạn riêng. Tính từ yeu_cau_chi sẵn có, không cần bảng mới.
--
-- Mọi cột đều có mặc định "không đổi gì", nên dòng chính sách cũ chạy y như trước.

ALTER TABLE public.chinh_sach_chi
  ADD COLUMN IF NOT EXISTS khung_gio_chi jsonb
    CHECK (khung_gio_chi IS NULL OR jsonb_typeof(khung_gio_chi) = 'object'),
  ADD COLUMN IF NOT EXISTS ngoai_khung_gio text NOT NULL DEFAULT 'cho_duyet'
    CHECK (ngoai_khung_gio IN ('cho_duyet', 'tu_choi')),
  ADD COLUMN IF NOT EXISTS han_muc_moi_nguoi_nhan_thang bigint
    CHECK (han_muc_moi_nguoi_nhan_thang IS NULL OR han_muc_moi_nguoi_nhan_thang > 0);
