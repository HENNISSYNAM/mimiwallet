# Nghiệm thu liên kết tài khoản tài chính — Casso ↔ CLI NUTRIX

Hợp đồng `0319436143/BAAS/1`. Bộ case gốc: `CLI NUTRIX_Test report.xlsx`, 30 case,
ba mã dịch vụ `qrpay`, `transaction`, `transfer,identity`.

Chạy ngày **12/08/2026**, môi trường **sandbox** (`sandbox.bankhub.dev`),
client id `7f98926a…`.

## Kết quả tổng

| | Số case |
|---|---|
| **Passed** | **7** |
| Partial (đạt một phần) | 2 |
| Chưa chạy (đã có mã, chưa bấm) | 1 |
| Chưa hiện thực | 9 |
| Bị chặn — `IP_NOT_ALLOWED` | 10 |
| Bị chặn — cần grant có scope `qrpay` | 1 |
| **Tổng** | **30** |

7/30 không phải vì hệ thống hỏng. Nó phản ánh một chuyện đơn giản: **hợp đồng liệt
kê ba mã dịch vụ, ứng dụng mới hiện thực một** (`transaction`). Hai mã còn lại chưa
có dòng mã nào gọi tới. Đây là việc phải quyết trước khi ký, không phải lỗi để sửa.

## Ba việc chặn, theo mức độ

### 1. `IP_NOT_ALLOWED` chặn toàn bộ nhóm chuyển tiền — 10 case

```
POST /transfer → 403 IP_NOT_ALLOWED
"IP của bạn không có quyền truy cập vào tài nguyên này."
requestId Nt4JTuBQ0-J9PWVb
```

Casso yêu cầu whitelist IP cho `/transfer`. Supabase Edge Functions **không có IP
egress cố định** — mã chạy trên hạ tầng dùng chung, IP đổi giữa các lần gọi. Không
có cách cấu hình nào trong Supabase khắc phục được.

Ba đường đi, theo thứ tự tôi khuyến nghị:

1. **Bỏ `transfer` khỏi phạm vi nghiệm thu.** MIMI đọc sao kê để làm sổ sách và số
   liệu thuế; nó không chuyển tiền hộ ai, và cũng không nên. 10 case biến mất cùng
   với cả một lớp rủi ro.
2. Đưa riêng `/transfer` qua một VM nhỏ có IP tĩnh làm proxy. Thêm một chặng hạ
   tầng phải vận hành và giám sát, chỉ để phục vụ một tính năng chưa có.
3. Hỏi Casso xem sandbox có nới whitelist được không. Kể cả được thì production
   vẫn vướng.

### 2. Không có endpoint nhận webhook của Cas — 4 case

`bank-webhook` hiện chỉ hiểu payload SePay. Không có chỗ nào nhận `GRANT_DELETED`,
`USER_PERMISSION_REVOKED`, `DEFAULT_UPDATE`, hay `TRANSACTIONS` của Cas.

Đây là phần **đáng làm nhất trong danh sách này**, kể cả khi bỏ QRPay và chuyển
tiền. Lý do: `USER_PERMISSION_REVOKED` là cách khách hàng rút lại quyền truy cập
tài khoản ngân hàng của họ. Không nghe được webhook đó nghĩa là MIMI vẫn gọi API
với một liên kết khách đã huỷ, và vẫn hiển thị nó là "đang kết nối". Với sản phẩm
đọc dữ liệu ngân hàng thì đó là lỗi phải sửa bất kể biên bản nghiệm thu nói gì.

Ước lượng: một function mới, xác thực chữ ký, ba nhánh xử lý.

### 3. Ba case xử lý mất kết nối chưa có giao diện — 3 case

Đổi mật khẩu ngân hàng, ngân hàng đòi xác thực thiết bị định kỳ, khách bật chặn
đăng nhập từ website. Cả ba đều dẫn tới cùng một trạng thái: liên kết còn trong DB
nhưng gọi API thì hỏng. Hiện `sync` báo lỗi và dừng; không có thông báo "cần cập
nhật thông tin đăng nhập" cũng không có lối mở lại Cas Link.

Chung một bản sửa với mục 2: khi Cas trả lỗi thuộc nhóm cần-tái-xác-thực, đánh dấu
`bank_connections.status = 'needs_reauth'` và hiện nút mở lại Cas Link.

## Chi tiết từng case

### 1. Chức năng liên kết

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Liên kết tài khoản mới | **Passed** | `grant/token` 200 → Cas Link → `grant/exchange` 200 → dòng `bank_connections` `status=connected`. Grant hiện trong console Casso. |
| 2 | Trùng thông tin liên kết | *Partial* | Upsert theo `(company_id, provider, account_number)` nên **không tạo dòng mới** — phần cốt lõi đạt. Nhưng hệ thống không báo "Liên kết thất bại – Tài khoản đã tồn tại"; nó làm mới token. Cố ý: case 5 yêu cầu liên kết lại để khôi phục kết nối hỏng, mà từ chối liên kết lặp thì không khôi phục được. Hai case này mâu thuẫn nhau ở bản gốc. |
| 3 | Xoá liên kết không cần OTP | *Chưa chạy* | Đã có mã: `disconnect` → `DELETE /grant` → `status=disconnected`, xoá token. Nút ở `CasLink.tsx:443`. Chưa bấm vì nó sẽ huỷ grant thật duy nhất đang có. |
| 4 | Xoá liên kết cần OTP | Chưa hiện thực | `removeGrant` không xử lý nhánh trả về grantToken để nhập OTP; không có chỗ nhận `GRANT_DELETED`. |
| 5 | Thông tin đăng nhập thay đổi | Chưa hiện thực | Xem mục 3 ở trên. |
| 6 | Xác thực OTP/thiết bị định kỳ | Chưa hiện thực | Xem mục 3 ở trên. |
| 7 | Chặn đăng nhập từ website | Chưa hiện thực | Xem mục 3 ở trên. |
| 8 | Liên kết thành công tại đối tác | **Passed** | Dòng `bank_connections` có `grant_id`, `access_token_enc` (ML-KEM-768 + AES-256-GCM), `status=connected`. |
| 9 | Liên kết thành công tại Casso | **Passed** | Grant hiện trong `console.bankhub.dev → Developer → Logs` kèm `grant/exchange`. |

### 2. Webhook Cas ID

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 10 | `USER_PERMISSION_REVOKED` | Chưa hiện thực | `bank-webhook` chỉ parse payload SePay. |
| 11 | `DEFAULT_UPDATE` | Chưa hiện thực | như trên |

### 3. QRPay

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 12 | Tạo mã QR Pay hợp lệ | Chưa hiện thực | Không xin scope `qrpay`, không có mã nào gọi `/qr-pay`. |
| 13 | Thiếu/sai trường bắt buộc | Bị chặn | Probe trả `GRANT_NOT_FOUND` (`rLDsrCRHsC8cqHcp`) chứ không phải `INVALID_PARAM`: Cas kiểm token **trước** tham số. Muốn chứng minh `INVALID_PARAM` phải có grant kèm scope `qrpay`. |
| 14 | Token không hợp lệ | **Passed** | `POST /qr-pay` → 400 `GRANT_NOT_FOUND`, requestId `4B0BqYAD5UCMwobq`, 196ms. |
| 15 | Webhook xác nhận thanh toán | Chưa hiện thực | Không có QRPay và không có endpoint nhận webhook Cas. |

### 4. Truy vấn giao dịch

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 16 | Lấy toàn bộ danh sách giao dịch | **Passed** | `GET /transactions` → 200, requestId `krMYZheiLZxiHc2R`, 12/08/2026 18:28:14. Giao dịch thật đã vào DB. |
| 17 | Hiệu năng phản hồi API | *Partial* | 132ms ở lần gọi thành công — dưới mốc 1000ms. Case yêu cầu lặp 3–5 lần; Cas giới hạn ~1 lần/grant/phút nên phải chạy giãn cách, chưa làm. |

### 5. Chuyển tiền

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 18 | Thông tin tài khoản (KYC) | Chưa hiện thực — **cố ý** | Đã bỏ scope `identity` để Cas không gửi CCCD, ngày sinh, địa chỉ, số điện thoại. Không nhận thì mạnh hơn nhận rồi không lưu. Ghi trong `bank-link/index.ts`. |
| 19 | Recall API <1 phút | **Passed** | `RATE_LIMIT`, requestId `p3xWQO8zGpdyMh5T` (quan sát trên `/transactions`). |
| 20 | Token không hợp lệ (identity) | **Passed** | `GET /identity` → 400 `GRANT_NOT_FOUND`, requestId `ex7NzqLUT2jM9UVv`, 15ms. |
| 21 | Chuyển tiền thành công | Bị chặn | 403 `IP_NOT_ALLOWED`. |
| 22–29 | TC01–TC08 (8 mã lỗi) | Bị chặn | Mọi lời gọi `/transfer` bị chặn ở tầng IP trước khi tới bước kiểm tham số, nên không mã lỗi nào trong TC01–TC08 quan sát được. |
| 30 | Token không hợp lệ (transfer) | Bị chặn | 403 `IP_NOT_ALLOWED` (`Nt4JTuBQ0-J9PWVb`) thay vì `GRANT_NOT_FOUND`. |

## Đề nghị gửi Casso

1. **Thu phạm vi biên bản về đúng `transaction`.** MIMI đọc sao kê để dựng sổ sách
   và số liệu thuế. Không thu hộ, không chuyển tiền hộ. Với phạm vi đó, mẫu số còn
   khoảng 11 case và phần chưa đạt là việc của MIMI, làm được trong tầm tay.
2. Nếu vẫn giữ `transfer`: xác nhận cách whitelist IP khi bên tích hợp chạy trên
   serverless không có IP cố định.
3. Bật `identity` hay không là quyết định của MIMI, không phải rào kỹ thuật — hiện
   cố tình không xin, vì không có nhu cầu dùng CCCD của khách.

## Việc của MIMI, theo thứ tự

1. Endpoint nhận webhook Cas — `GRANT_DELETED`, `USER_PERMISSION_REVOKED`,
   `DEFAULT_UPDATE`. Không phải để qua nghiệm thu; để không hiển thị sai một liên
   kết khách đã huỷ.
2. Trạng thái `needs_reauth` + lối mở lại Cas Link (case 5, 6, 7).
3. Chạy case 3 (xoá liên kết) — cần một grant dùng-một-lần để không mất grant hiện
   tại.
4. Đo lại hiệu năng 5 lần giãn cách 70 giây (case 17).
