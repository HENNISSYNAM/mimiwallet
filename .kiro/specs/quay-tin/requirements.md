# Quầy Tin — Yêu cầu

> MoMo TechDay 2026 · đội MIMI THE CATS · nhánh Chống lừa đảo + Trợ lý AI.
> Câu định vị: **"Tiền thật mới giao hàng."**

## Bối cảnh

Mọi công cụ chống lừa đảo hiện có ở Việt Nam (cảnh báo tài khoản nhận, SIMO, sinh trắc học) bảo vệ **người trả tiền**.
Người bán nhỏ **nhận tiền** vẫn tự soi bill chuyển khoản bằng mắt, dưới áp lực khách đang chờ. Bill giả không tạo ra
giao dịch nào, nên nằm ngoài mọi cơ chế hoàn / chặn / truy vết. Xem `reports/Gian lận người bán toàn cầu.md` và
`reports/MoMo cần gì ở TechDay 2026.md` (thư mục nghiên cứu, ngoài repo).

MIMI đã có: tiền vào thật từ nhiều ngân hàng (BankHub/Cas webhook), POS VietQR mã theo đơn (`ban_hang_pos`),
kiểm trước khi chuyển (`tro-ly` action `kiem_truoc_khi_chuyen`, đang đóng băng), nhật ký quyết định.

## Nguyên tắc không đổi

- **N1 — Ảnh không bao giờ làm đèn xanh.** Chỉ dữ liệu ngân hàng thật mới chuyển xanh. Ảnh bill chỉ là gợi ý để tìm.
- **N2 — Không kết tội.** MIMI nói "chưa thấy tiền về", không nói "bill giả".
- **N3 — Agent không chuyển tiền.** Không agent nào có quyền gọi lệnh chi. Mọi hành động về tiền do người bấm.
- **N4 — Không giữ ảnh.** Ảnh bill xử lý xong thì bỏ; chỉ lưu kết quả đọc và mã băm ảnh.
- **N5 — Không bịa số.** Độ trễ, độ chính xác: đo rồi mới ghi.

## Người dùng

- **Thu ngân / chủ quán** (có thể lớn tuổi, ít rành công nghệ): đứng quầy, cần câu trả lời bằng tai trong vài giây.
- **Chủ hộ / kế toán**: duyệt các ca lệch, ca đỏ, lệnh chi bị giữ; xem nhật ký.
- **Giám khảo**: mở link, đăng nhập tài khoản thử, chạy trên cửa hàng mẫu.

## Yêu cầu (EARS)

### R1 — Soát Bill (agent đọc bill)
1. WHEN thu ngân chụp hoặc chọn ảnh bill khách đưa, THE SYSTEM SHALL đọc bằng AI thị giác: số tiền, số tài khoản
   nhận (ít nhất 4 số cuối), tên người nhận, ngân hàng gửi, thời điểm chuyển, nội dung/mã giao dịch, kèm độ tin cậy.
2. IF ảnh không phải bill chuyển khoản hoặc độ tin cậy thấp, THEN THE SYSTEM SHALL trả trạng thái `khong_doc_duoc`
   và nói "Không đọc được bill. Mở app ngân hàng để kiểm."
3. THE SYSTEM SHALL xử lý ảnh ≤ 2 MB, trả kết quả trong ≤ 8 giây (đo p95, ghi vào README).

### R2 — Đối chiếu tiền về thật
1. IF tài khoản nhận trên bill không trùng (4 số cuối) tài khoản nào của quán, THEN đèn **đỏ** "Bill chuyển cho tài
   khoản khác, không phải của quán."
2. WHEN có khoản TIỀN VÀO thật đúng số tiền, trong khoảng [giờ bill − 5 phút, giờ bill + 30 phút], chưa gắn ca soát
   hay lần bán nào khác, THE SYSTEM SHALL bật **xanh** "Đã nhận {số tiền} về {ngân hàng} lúc {giờ}."
3. IF có tiền vào đúng mã đơn nhưng sai số, THEN **vàng-lệch** "Mới nhận {x}, còn thiếu {y}."
4. IF chưa thấy tiền và giờ trên bill trong vòng `CUA_SO_CHO` (mặc định 10 phút, chỉnh theo số đo độ trễ), THEN
   **vàng** "Đang chờ ngân hàng báo…" và tự kiểm lại mỗi 5 giây cho tới hết cửa sổ.
5. IF hết cửa sổ chờ mà vẫn không thấy, THEN **đỏ** "Chưa thấy {số tiền} về tài khoản nào. Đừng giao hàng."
6. Một giao dịch thật chỉ được làm xanh **một** ca soát (chống dùng một bill thật cho nhiều lần lấy hàng).

### R3 — Loa (giọng đọc tại quầy)
1. WHEN một lần bán chuyển khoản chuyển `paid`, hoặc một ca soát bill có kết quả, THE SYSTEM SHALL đọc to câu kết
   quả bằng tiếng Việt (Web Speech API, `vi-VN`), kèm màu toàn màn hình (xanh/vàng/đỏ).
2. Số tiền đọc theo kiểu nói: "một trăm năm mươi nghìn", không đọc "150000 đồng".
3. Có nút tắt/bật loa; máy không có giọng `vi-VN` thì hiện chữ to và báo một lần.

### R4 — Soát Chi (kiểm trước khi chi)
1. THE SYSTEM SHALL mở lại trang Kiểm trước khi chuyển (bỏ đóng băng) trong Quầy Tin.
2. WHEN người dùng dán tin nhắn/email "đổi số tài khoản" hoặc nhập người nhận + số tiền, THE SYSTEM SHALL chấm theo
   bộ dấu hiệu sẵn có (`doi_so_tai_khoan`, `nguoi_nhan_moi_so_lon`, `vuot_muc_quen`, `tach_nho`) và gợi ý gọi lại
   nhà cung cấp theo số đã lưu.
3. THE SYSTEM SHALL NOT có nút chuyển tiền. Kết quả chỉ là "Nên giữ lại" / "Có thể chuyển, bạn tự quyết".

### R5 — Hàng chờ duyệt và nhật ký
1. Ca **đỏ**, **vàng-lệch**, và lệnh chi bị "Nên giữ lại" vào hàng chờ của chủ/kế toán.
2. Chủ bấm: "Đã kiểm, cho qua" (ghi lý do) hoặc "Từ chối". Thu ngân không bấm được (dùng quyền `duocXacNhanTay`).
3. Mọi kết quả agent và quyết định người đều ghi `nhat_ky_quyet_dinh` với: agent nào, đọc được gì, đối chiếu với giao
   dịch nào, ai quyết, lúc nào.

### R6 — Dùng thử cho giám khảo
1. Cửa hàng mẫu (`la_demo = true`) có sẵn tài khoản nhận, món bán, giao dịch mẫu, và 3 ảnh bill mẫu (1 khớp, 1 sai
   tài khoản, 1 không có tiền về) để giám khảo bấm thử không cần chuyển tiền thật.
2. Tài khoản thử do đội tạo (không ghi mật khẩu trong repo).

### R7 — Tiêu chí ngoài chức năng
- AI qua **Amazon Bedrock** (ap-southeast-1) là nhà cung cấp chính cho đọc bill; OpenRouter là dự phòng; lỗi cả hai
  thì rơi về R1.2, không chặn quầy.
- Không lưu ảnh (N4). Không gửi số tài khoản đầy đủ lên mô hình ngoài phần có trong ảnh.
- Giới hạn gọi: 30 lần soát / phút / người.
