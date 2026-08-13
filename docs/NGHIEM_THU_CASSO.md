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

### 2. Endpoint nhận webhook của Cas — đã dựng 12/08, chờ đăng ký

Trước 12/08 `bank-webhook` chỉ hiểu payload SePay, không có chỗ nào nhận
`GRANT_DELETED`, `USER_PERMISSION_REVOKED`, `DEFAULT_UPDATE` hay `TRANSACTIONS`.
Console Casso cũng trống — chưa webhook nào được tạo, nên thiếu từ cả hai đầu.

Đây là phần đáng làm nhất trong danh sách này, kể cả khi bỏ QRPay và chuyển tiền:
`USER_PERMISSION_REVOKED` là cách khách hàng rút lại quyền truy cập tài khoản. Không
nghe được nó nghĩa là MIMI vẫn gọi API với liên kết khách đã huỷ và vẫn hiện "đang
kết nối". Đã làm xong: `supabase/functions/cas-webhook`.

**Một điều về thiết kế cần Casso biết.** Form tạo webhook có bốn ô — Tên, Mô tả,
Đường dẫn, Phân loại — và **không có ô secret để ký payload**. Không có chữ ký thì
không cách nào chứng minh một request đến từ Casso. Nên endpoint này không làm theo
payload:

> Payload là **tín hiệu đi kiểm tra**, không phải mệnh lệnh.

Một body nói "grant X đã bị thu hồi" không thu hồi gì cả. Nó khiến hệ thống gọi Cas
hỏi về grant X, rồi hành động theo câu trả lời của Cas. Webhook giả tốn đúng một
lời gọi API và không đổi được trạng thái nào. Khoá chia sẻ trong URL chỉ là bộ lọc
rẻ tiền để nhiễu Internet không chạm tới bước xác minh — nó không phải ranh giới
bảo mật; lời gọi xác minh mới là.

Mọi payload nhận được ghi thô vào `webhook_events` **trước** khi quyết định gì, kể
cả body không parse được. Chưa có tài liệu nào mô tả envelope của Cas, và đoán một
schema không tài liệu chính là thứ đã tốn bốn vòng sửa sai ở luồng Cas Link. Lần gửi
thật đầu tiên sẽ dạy ta hình dạng của nó.

### 3. Ba case xử lý mất kết nối — cơ chế đã có, chưa dựng được tình huống

*Đính chính bản trước: tôi ghi ba case này là "chưa hiện thực". Sai.*

Trạng thái `needs_relink` đã tồn tại. Khi Cas trả `GRANT_LOGIN_REQUIRED` hoặc
`USER_PERMISSION_REVOKED`, `sync` đánh dấu liên kết (`bank-link/index.ts:358`) và
giao diện hiện banner "Có N tài khoản cần liên kết lại để tiếp tục đồng bộ"
(`CasLink.tsx:415,470`) — đúng thứ mà kết quả dự kiến của case 5, 6, 7 mô tả.

Thiếu hai thứ: đường **chủ động** qua webhook (nay đã có), và cách dựng tình huống
trong sandbox. Không tự đổi được mật khẩu ngân hàng giả lập hay bật chặn đăng nhập
từ website trên đó. Vì vậy ghi *Untested* chứ không phải *chưa hiện thực* — cần
Casso cho biết sandbox có mô phỏng được ba trạng thái này không.

## Chi tiết từng case

### 1. Chức năng liên kết

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Liên kết tài khoản mới | **Passed** | `grant/token` 200 → Cas Link → `grant/exchange` 200 → dòng `bank_connections` `status=connected`. Grant hiện trong console Casso. |
| 2 | Trùng thông tin liên kết | *Partial* | Upsert theo `(company_id, provider, account_number)` nên **không tạo dòng mới** — phần cốt lõi đạt. Nhưng hệ thống không báo "Liên kết thất bại – Tài khoản đã tồn tại"; nó làm mới token. Cố ý: case 5 yêu cầu liên kết lại để khôi phục kết nối hỏng, mà từ chối liên kết lặp thì không khôi phục được. Hai case này mâu thuẫn nhau ở bản gốc. |
| 3 | Xoá liên kết không cần OTP | *Chưa chạy* | Đã có mã: `disconnect` → `DELETE /grant` → `status=disconnected`, xoá token. Nút ở `CasLink.tsx:443`. Chưa bấm vì nó sẽ huỷ grant thật duy nhất đang có. |
| 4 | Xoá liên kết cần OTP | Chưa hiện thực | `removeGrant` không xử lý nhánh trả về grantToken để nhập OTP; không có chỗ nhận `GRANT_DELETED`. |
| 5 | Thông tin đăng nhập thay đổi | *Chưa chạy* | Cơ chế đã có (`needs_relink` + banner mời liên kết lại). Chưa dựng được tình huống trong sandbox. Xem mục 3. |
| 6 | Xác thực OTP/thiết bị định kỳ | *Chưa chạy* | như trên |
| 7 | Chặn đăng nhập từ website | *Chưa chạy* | như trên |
| 8 | Liên kết thành công tại đối tác | **Passed** | Dòng `bank_connections` có `grant_id`, `access_token_enc` (ML-KEM-768 + AES-256-GCM), `status=connected`. |
| 9 | Liên kết thành công tại Casso | **Passed** | Grant hiện trong `console.bankhub.dev → Developer → Logs` kèm `grant/exchange`. |

### 2. Webhook Cas ID

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 10 | `USER_PERMISSION_REVOKED` | *Một nửa* | **Phía xử lý: đạt.** Bắn một sự kiện `USER_PERMISSION_REVOKED` giả mạo cho grant thật `5455fe9b-9640-11f1-b705-fa163e5398eb` (13/08). Endpoint **không** thu hồi: nó hỏi Cas, Cas nói grant còn sống, kết quả `verified / …:alive+2` — và tiện thể nạp 2 giao dịch mới. **Phía nhận: chưa.** Webhook do ta tự bắn, chưa phải Casso gửi. Xem đề nghị bên dưới. |
| 11 | `DEFAULT_UPDATE` | *Một nửa* | như trên. Nhánh "grant còn sống → khôi phục `status=connected`" có trong mã nhưng chưa chạy được vì liên kết chưa từng bị treo. |

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

## Một chuỗi thao tác đóng được bốn case cùng lúc

Đến 13/08, `webhook_events` có 9 dòng và **cả 9 đều do ta tự bắn**. Casso chưa gửi
lần nào — đúng như dự kiến, vì trong sandbox chưa có sự kiện nào xảy ra. Nghĩa là
phía *xử lý* webhook đã chứng minh được, phía *nhận* thì chưa.

Chỉ có một cách chứng minh phía nhận: làm cho một sự kiện thật xảy ra. Thu hồi
quyền từ ứng dụng Cas ID sẽ khiến Casso gửi webhook thật. Chuỗi này đóng được bốn
case liền:

1. Mở Cas ID → thu hồi quyền truy cập đã cấp cho MIMI → Casso gửi
   `USER_PERMISSION_REVOKED` (case 10) và ta thấy **envelope thật** — thứ hiện
   đang phải đọc phòng thủ vì không có tài liệu.
2. Endpoint hỏi lại Cas, nhận `GRANT_NOT_FOUND`, đánh dấu `disconnected` và xoá
   token. Giao diện chuyển sang trạng thái mời liên kết lại (case 4, một phần).
3. Liên kết lại từ đầu → case 1 lần nữa, và lần này là **case 2** (trùng thông tin
   liên kết) vì tài khoản đó đã tồn tại.
4. Sau khi có grant mới, chạy `disconnect` từ giao diện MIMI → case 3.

Cái giá: mất grant hiện tại trong khoảng thời gian liên kết lại, và 2 giao dịch đã
nạp vẫn còn nguyên trong DB (không mất dữ liệu). Nên làm khi có mặt để bấm liên kết
lại ngay.

## Ghi chú về bằng chứng

Ảnh chi tiết log lấy từ `console.bankhub.dev → Developer → Logs`, mốc **21:03:58
12/08/2026 (+07:00)**. Độ trễ Casso ghi nhận là 4–7ms; con số 15–196ms trong bảng
trên đo từ phía client nên bao gồm cả đường truyền. Cả hai đều dưới mốc 1000ms của
case 17, và con số của Casso mới là con số nên đưa vào biên bản.

**`SKXKpCPiOGMeD55b` không phải lỗi sản phẩm.** Bản ghi này hiện `/grant/token` →
400 `INVALID_PARAM "value.split is not a function"` với `scopes` là mảng. Đó là
script probe của tôi gửi sai kiểu. Mã thật gửi chuỗi —
`scopes: (opts.scopes ?? [...]).join(',')` trong `_shared/bank/bankhub.ts:150` — và
đã tạo grant thành công. Ghi ra đây để bản ghi đó không bị đọc nhầm thành defect.

Nhân đây, một điều Casso nên ghi vào tài liệu: `/grant/token` nhận `scopes` dạng
**chuỗi phân tách bằng dấu phẩy**, không phải mảng JSON. Thông báo lỗi hiện tại rò
rỉ chi tiết cài đặt (`value.split is not a function`) thay vì nói trường nào sai.

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
