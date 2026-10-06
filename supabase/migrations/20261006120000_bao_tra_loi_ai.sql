-- Nút "Báo câu trả lời này" ở trợ lý (06/10/2026) — chính sách Nội dung do AI tạo của Google Play đòi người dùng báo
-- được câu trả lời AI ngay trong app. Ghi chung bảng phản hồi, thêm một loại câu hỏi. Không sửa dữ liệu nào.
ALTER TABLE public.phan_hoi_khach DROP CONSTRAINT IF EXISTS phan_hoi_khach_cau_hoi_check;
ALTER TABLE public.phan_hoi_khach ADD CONSTRAINT phan_hoi_khach_cau_hoi_check
  CHECK (cau_hoi IN ('sao_ke_khop', 'doanh_thu_dung', 'doi_soat_de_kho', 'sean_ellis', 'bao_tra_loi_ai'));
