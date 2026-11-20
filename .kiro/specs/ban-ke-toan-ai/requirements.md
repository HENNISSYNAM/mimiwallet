# Bàn kế toán AI — Yêu cầu (MoMo TechDay 2026, nộp tối 26/11/2026)

> **"Một kế toán. Năm mươi hộ kinh doanh. Một đội agent AI. Agent làm — kế toán duyệt."**

## Vì sao hướng này (chọn ngày 20/11 bằng ma trận Stanford, xem cuối file)

- Đề "Future **Workspace**" nói về **người đang làm việc**. Kế toán dịch vụ là người làm việc chịu sức ép lớn nhất năm 2026:
  hộ kinh doanh bỏ thuế khoán (01/01/2026), phải khai báo mọi tài khoản nhận tiền, tên tài khoản phải khớp đăng ký.
- Nút thắt của MIMI là **phân phối**: một kế toán mang theo 30–100 hộ.
- Lừa đảo đi vào **bên trong** bàn làm việc: bill giả ở quầy của khách, tin nhắn giả danh cán bộ thuế nhắm vào hộ kinh
  doanh mùa đổi luật, email "đổi số tài khoản" của nhà cung cấp. Kế toán là người duy nhất thấy cả 50 hộ một lúc.

## Người dùng
- **Kế toán dịch vụ** (người dùng chính, người giám khảo đóng vai): duyệt việc agent đề xuất.
- **Chủ hộ** (khách của kế toán): chuyển tiếp tin nhắn đáng ngờ, chụp bill, nghe loa.

## Nguyên tắc không đổi
N1 Agent không chuyển tiền, không nộp tờ khai, không gọi cho ai. Agent đề xuất; người duyệt.
N2 Mỗi đề xuất có **bằng chứng** (dòng sao kê, văn bản luật, câu trích tin nhắn) và **tác động lên con số**.
N3 Không kết tội: nói "không khớp với nghĩa vụ thuế thật của bạn", không nói "đây là kẻ lừa đảo".
N4 Không lưu ảnh / ghi âm; chỉ lưu kết quả đọc và mã băm.
N5 Không bịa số. Mọi con số trên slide đã đo.

## Yêu cầu (EARS)

### R1 — Văn phòng (đã có, giữ)
Danh mục khách, đèn, agent ở bàn, hàng duyệt kiểu Cursor (`van-phong`, `HangDuyetCursor`).

### R2 — Agent Đối Soát đưa ca rủi ro lên hàng duyệt (mới, dùng lại `soat-bill`)
1. WHEN một khách có ca soát bill đỏ / lệch chưa quyết, THE SYSTEM SHALL đưa vào hàng duyệt của kế toán: khách, câu kết
   quả, số trên bill vs tiền thật, giờ.
2. Kế toán bấm "Mở khách" → `/dashboard/quay-tin` của khách đó để quyết.

### R3 — Agent Lá Chắn Thuế (mới)
1. WHEN chủ hộ hoặc kế toán dán một tin nhắn / mô tả cuộc gọi tự xưng cơ quan thuế, THE SYSTEM SHALL tách: tổ chức tự
   xưng, việc yêu cầu (chuyển tiền / cài app / bấm link / cung cấp OTP-mật khẩu / đến trụ sở), số tiền, hạn, đường link, số tài khoản.
2. THE SYSTEM SHALL đối chiếu với **nghĩa vụ thuế thật** của khách trong MIMI (hạn kê khai kế tiếp, tờ khai đã/chưa nộp,
   số thuế MIMI tính) và bộ dấu hiệu:
   - yêu cầu chuyển tiền vào tài khoản cá nhân / không phải tài khoản thu NSNN;
   - yêu cầu cài ứng dụng ngoài kho chính thức hoặc bấm link không thuộc tên miền nhà nước;
   - xin OTP, mật khẩu, ảnh CCCD qua tin nhắn;
   - số tiền / hạn không khớp nghĩa vụ MIMI biết;
   - giục gấp ("trong hôm nay", "bị phạt/khoá mã số thuế").
3. Kết quả: đèn (đỏ / vàng / xanh) + giải thích tiếng Việt dễ hiểu + "việc nên làm" (gọi số chính thức của chi cục thuế
   quản lý — lấy từ hồ sơ khách nếu có, tra trên eTax). Mỗi dấu hiệu có nguồn văn bản cảnh báo chính thức (điền khi đã kiểm nguồn).
4. Ca đỏ / vàng vào hàng duyệt của kế toán (R1).
5. AI chỉ TÁCH thông tin; luật chấm là hàm thuần có test. Mô hình: Bedrock (dự phòng OpenRouter).

### R4 — Agent Soát Chi (đã có: `kiem_truoc_khi_chuyen`)
Ca "nên giữ lại" hiện trong hàng duyệt (nếu kịp; không thì chỉ liên kết).

### R5 — Văn phòng mẫu cho giám khảo
Một tài khoản kế toán thử thấy ~8 hộ mẫu (dữ liệu giả lập `is_synthetic`), mỗi hộ có sẵn ít nhất một việc cho từng agent;
có 3 tin nhắn "cán bộ thuế" mẫu (1 thật-dạng-nhắc-hạn, 2 giả) và 3 bill mẫu. Tài khoản do đội tạo; mật khẩu không vào repo.

### R6 — Ngoài chức năng
Dùng được trực tuyến; chạy trên điện thoại và máy tính; Bedrock ap-southeast-1 là mô hình chính.

## Ma trận chọn hướng (20/11, thang 1–5)

| Tiêu chí (trọng số) | Bàn kế toán AI | Quầy Tin | Lá chắn thuế | Hồ sơ vụ lừa | Soát chi |
|---|---|---|---|---|---|
| Khớp đề & giám khảo (25%) | 5 | 4 | 4 | 5 | 3 |
| Bằng chứng nhu cầu (20%) | 4 | 2 | 3 | 4 | 4 |
| Lợi thế riêng MIMI (15%) | 5 | 4 | 5 | 1 | 3 |
| Làm kịp 6 ngày (20%) | 4 | 5 | 4 | 3 | 5 |
| Demo (10%) | 3 | 4 | 4 | 4 | 3 |
| Doanh thu (10%) | 5 | 2 | 4 | 1 | 3 |
| **Tổng** | **4,40** | 3,60 | 3,95 | 3,40 | 3,60 |

Hội tụ: Bàn kế toán AI làm khung; Lá chắn thuế là khoảnh khắc demo; Quầy Tin và Soát chi là agent phụ.
Quyết định cuối chờ phỏng vấn 21–22/11 (`docs/techday/PHONG_VAN_KIEM_NHU_CAU.md`).
