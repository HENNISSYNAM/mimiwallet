-- Nghị định 141/2026/NĐ-CP: ngưỡng không chịu thuế của hộ kinh doanh lên 01 tỷ.
--
-- Ký 29/04/2026, hiệu lực từ 01/01/2026. Điều 1 đổi cụm "500 triệu đồng" thành
-- "01 tỷ đồng" tại các Điều 3, 4, 8, 9, 10, 11, 12, 17, 18 của Nghị định
-- 68/2026/NĐ-CP — ngưỡng miễn GTGT, miễn TNCN, và ngưỡng bắt buộc hoá đơn điện tử.
--
-- Bảng này đã hiện "500 triệu" cho người dùng suốt bốn tháng sau đó. Không ai
-- báo, vì con số vẫn có nguồn — chỉ là nguồn đã bị một văn bản sau sửa. Bài học
-- ghi vào đây: một trích dẫn đúng lúc viết không có nghĩa là còn đúng lúc đọc.
--
-- Sửa thêm một lỗi cùng chỗ: thuế theo tỷ lệ tính trên PHẦN DOANH THU VƯỢT
-- ngưỡng, không phải toàn bộ doanh thu ("cho trừ mức này trước khi tính thuế
-- theo tỷ lệ trên doanh thu" — giới thiệu Luật 109/2025/QH15 trên
-- xaydungchinhsach.chinhphu.vn).

INSERT INTO public.legal_documents
  (so_hieu, ten, loai, co_quan_ban_hanh, ngay_ban_hanh, ngay_hieu_luc,
   tom_tat_de_hieu, tom_tat_chinh_thuc, doi_tuong_ap_dung, con_so_moc, don_vi_moc, url_nguon)
SELECT
  '141/2026/NĐ-CP',
  'Nghị định sửa đổi Nghị định 68/2026/NĐ-CP về chính sách thuế hộ kinh doanh, cá nhân kinh doanh và Nghị định 320/2025/NĐ-CP về thuế thu nhập doanh nghiệp',
  'nghi_dinh',
  'Chính phủ',
  '2026-04-29',
  '2026-01-01',
  'Doanh thu năm từ 01 tỷ đồng trở xuống: chưa phải nộp thuế GTGT và thuế TNCN, vẫn '
  'phải thông báo doanh thu. Trên 01 tỷ: phải nộp, và phải dùng hoá đơn điện tử có mã '
  'của cơ quan thuế. Áp dụng cho cả năm 2026 — nếu bạn dưới 01 tỷ mà đã nộp thuế theo '
  'mốc 500 triệu cũ, số đã nộp được xử lý lại theo Điều 12 Nghị định 68/2026/NĐ-CP.',
  'Sửa đổi cụm từ "500 triệu đồng" thành "01 tỷ đồng" tại các Điều 3, 4, 8, 9, 10, 11, '
  '12, 17, 18 Nghị định 68/2026/NĐ-CP. Hộ kinh doanh, cá nhân kinh doanh có doanh thu '
  'năm trên 01 tỷ đồng phải áp dụng hoá đơn điện tử có mã của cơ quan thuế. Bổ sung '
  'miễn thuế thu nhập doanh nghiệp cho doanh nghiệp có tổng doanh thu năm từ 01 tỷ đồng '
  'trở xuống.',
  ARRAY['ho_kinh_doanh', 'ca_nhan'],
  1000000000,
  'VND/năm',
  'https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-141-2026-nd-cp-nang-nguong-doanh-thu-khong-phai-chiu-thue-len-1-ty-dong-119260504154326455.htm'
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_documents WHERE so_hieu = '141/2026/NĐ-CP'
);

-- Dòng Luật giữ đúng điều Luật nói (500 triệu), nhưng câu "nghĩa là gì với tôi"
-- phải trả lời theo luật đang áp dụng, không theo luật lúc viết.
UPDATE public.legal_documents
SET tom_tat_de_hieu =
  'Luật nâng mức doanh thu không phải nộp thuế TNCN lên 500 triệu đồng/năm. Nhưng Nghị '
  'định 141/2026/NĐ-CP đã nâng tiếp lên 01 tỷ đồng/năm, áp dụng từ 01/01/2026 — nên với '
  'doanh thu năm 2026 của bạn, mốc cần nhìn là 01 tỷ, không phải 500 triệu.'
WHERE so_hieu = 'Luật Thuế TNCN (sửa đổi) 2025';

UPDATE public.legal_documents
SET
  tom_tat_de_hieu =
    'Từ 2026 không còn thuế khoán. Nếu doanh thu của bạn trên 01 tỷ đến 3 tỷ/năm, bạn '
    'ĐƯỢC CHỌN một trong hai cách: nộp 15% trên thu nhập (doanh thu trừ chi phí), hoặc '
    'nộp theo tỷ lệ phần trăm trên PHẦN DOANH THU VƯỢT 01 tỷ. Muốn tính trên thu nhập thì '
    'phải chứng minh được chi phí. Trên 3 tỷ thì chỉ còn cách tính trên thu nhập.',
  tom_tat_chinh_thuc =
    'Bỏ phương pháp khoán thuế. Doanh thu trên ngưỡng không chịu thuế đến 3 tỷ đồng/năm '
    'được lựa chọn tính thuế theo tỷ lệ trên doanh thu (sau khi trừ mức doanh thu không '
    'chịu thuế) hoặc trên thu nhập với thuế suất 15%; trên 3 tỷ đến 50 tỷ đồng/năm thuế '
    'suất 17%; trên 50 tỷ đồng/năm thuế suất 20%. Ngưỡng không chịu thuế là 01 tỷ '
    'đồng/năm theo Nghị định 141/2026/NĐ-CP.'
WHERE so_hieu = 'Luật Thuế TNCN 2025 — cách tính thuế hộ kinh doanh';
