# Báo cáo nghiệm thu tích hợp Casso / BankHub

**Hợp đồng:** 0319436143/BAAS/1
**Bộ case:** `CLI NUTRIX_Test report.xlsx` — 30 case, ba mã dịch vụ `qrpay`,
`transaction`, `transfer,identity`
**Môi trường:** sandbox `sandbox.bankhub.dev` · client id `7f98926a…`
**Kỳ chạy:** 12/08 – 18/08/2026
**Ngày lập:** 18/08/2026

---

## 1. Kết quả tổng hợp

| Trạng thái | Số case |
|---|---|
| **Đạt** | **14** |
| Đường ống đã chứng minh — chờ công cụ từ Casso | 1 |
| Chờ dữ liệu sandbox từ Casso | 3 |
| Đã hiện thực — chưa gặp điều kiện phát sinh | 1 |
| Đề nghị điều chỉnh phạm vi | 1 |
| Chưa hiện thực — nhóm `transfer` | 10 |
| **Tổng** | **30** |

Nếu Casso chấp thuận đề nghị rút nhóm `transfer` ở **mục 4**, mẫu số còn 20 case
và kết quả là **14/20 — đạt 70%**.

Toàn bộ vòng đời liên kết tài khoản đã nghiệm thu xong: tạo liên kết, xử lý trùng
thông tin, ngắt liên kết, và cả ba tình huống mất kết nối (đổi mật khẩu, xác thực
thiết bị, chặn đăng nhập từ website).

---

## 2. Chi tiết case đã đạt — 14 case

### 2.1 Chức năng liên kết

| # | Tình huống | Bằng chứng |
|---|---|---|
| 1 | Liên kết tài khoản mới | `grant/token` 200 → Cas Link → `grant/exchange` 200. Grant hiện trong console Casso. |
| 2 | Trùng thông tin liên kết | Chạy trọn vòng ngắt → liên kết lại (18/08). Truy vấn cơ sở dữ liệu sau đó: đúng một bản ghi, `created_at` giữ nguyên `2026-08-12 11:10:56` của lần liên kết đầu. Upsert theo `(company_id, provider, account_number)` tái sử dụng đúng bản ghi cũ, không phát sinh bản ghi mới. |
| 3 | Xoá liên kết không cần OTP | 18/08: `POST /grant/remove` → `status=disconnected`, token đã xoá khỏi hệ thống. Ngân hàng không yêu cầu OTP ở bước này. |
| 5 | Thông tin đăng nhập thay đổi | 18/08: dựng lỗi qua `POST /sandbox/grant/reset-login` (`GRANT_LOGIN_REQUIRED`), ứng dụng hiện đúng trạng thái cần xác thực lại; khôi phục qua Update Mode thành công. Xác nhận bằng lệnh đồng bộ chạy được sau đó, mốc `last_synced_at = 2026-08-18 13:32:56 UTC`. |
| 6 | Xác thực OTP/thiết bị định kỳ | 18/08: dựng lỗi `OTP_REQUIRED`, Update Mode mở Cas Link, nhập OTP sandbox, Cas trả hộp thoại "Tài khoản của bạn đã cập nhật thành công", liên kết khôi phục. |
| 7 | Chặn đăng nhập từ website | 18/08: dựng lỗi `PREVENTED`, hệ thống nhận đúng mã lỗi và hiển thị hướng dẫn khách mở ứng dụng ngân hàng để gỡ chặn. |
| 8 | Liên kết thành công tại đối tác | Bản ghi có `grant_id`, access token lưu dạng mã hoá ML-KEM-768 + AES-256-GCM. |
| 9 | Liên kết thành công tại Casso | Grant hiện trong `console.bankhub.dev → Developer → Logs` kèm `grant/exchange`. |

### 2.2 Truy vấn giao dịch

| # | Tình huống | Bằng chứng |
|---|---|---|
| 16 | Lấy toàn bộ danh sách giao dịch | `GET /transactions` → 200, requestId `krMYZheiLZxiHc2R`, 12/08/2026 18:28:14. |
| 17 | Hiệu năng phản hồi API | 5 lần gọi liên tiếp (14/08): **182, 38, 13, 15, 16 ms** — thấp nhất 13 ms, cao nhất 182 ms, trung bình 53 ms. Cả 5 lần dưới mốc 1000 ms. requestId `VZhmOSXWYXgdmoJ-`, `a_nw6i8r2KuLyiCf`, `PzYHBhyEx8n-0p8N`, `IP08YruX1GD_0Xju`, `iUwxE3Ot_T0ZtlSM`. |

### 2.3 Webhook từ Casso

| # | Tình huống | Bằng chứng |
|---|---|---|
| 11 | Xử lý mã `DEFAULT_UPDATE` | Casso đã gửi **25 lần** mã `DEFAULT_UPDATE` (loại `GRANT`), lần đầu 17/08/2026 13:30:35, lần cuối 18/08/2026 13:47:16 (UTC). Envelope nhận được: `{webhookCode, webhookType, grantId, environment:"dev", error}`. Kết quả xử lý: **6 lần `verified`**, trong đó có bản ghi `1fdc82dd-…:alive+2` — endpoint gọi ngược lại Cas, Cas xác nhận grant còn hiệu lực, hệ thống đồng bộ lại và **nạp về 2 giao dịch**. Đúng kết quả dự kiến: hệ thống đối tác tiếp tục gọi API lấy giao dịch bình thường. 19 lần còn lại `ignored` kèm ghi chú "no connection for grant …" — các grant đã ngắt trước đó, bỏ qua là đúng. Mã `ERROR` cũng xử lý đúng: 9 lần `verified` với các nhánh `needs-relink`, `PREVENTED`, `rate-limited`. |

### 2.4 Kiểm soát truy cập

| # | Tình huống | Bằng chứng |
|---|---|---|
| 14 | Token không hợp lệ (QR Pay) | `POST /qr-pay` → 400 `GRANT_NOT_FOUND`, requestId `4B0BqYAD5UCMwobq`, 196 ms. |
| 19 | Gọi lại API dưới 1 phút | Nhận đúng `RATE_LIMIT`, requestId `p3xWQO8zGpdyMh5T`. |
| 20 | Token không hợp lệ (identity) | `GET /identity` → 400 `GRANT_NOT_FOUND`, requestId `ex7NzqLUT2jM9UVv`, 15 ms. |

---

## 3. Case cần Casso hỗ trợ — 4 case

### 3.1 Case 10 — Webhook `USER_PERMISSION_REVOKED`

**Đường ống nhận webhook đã chứng minh xong** (chi tiết ở mục 2.4 — case 11 đạt).
Casso gửi thật, endpoint nhận, xác minh và xử lý đúng.

**Phía xử lý riêng cho mã này cũng đạt.** Ngày 13/08 chúng tôi tự phát một sự kiện
`USER_PERMISSION_REVOKED` cho grant thật `5455fe9b-9640-11f1-b705-fa163e5398eb`.
Endpoint **không** thu hồi theo nội dung payload — nó gọi ngược lại Cas để xác minh,
Cas trả lời grant còn hiệu lực, hệ thống giữ nguyên trạng thái và ghi log
`verified / alive`.

**Còn thiếu đúng một thứ: cái kích hoạt.** Thống kê `webhook_events` tính đến
18/08/2026:

| Mã Casso đã gửi | Số lần |
|---|---|
| `DEFAULT_UPDATE` | 25 |
| `ERROR` | 10 |
| `USER_PERMISSION_REVOKED` | **0** |

Mã này chỉ phát sinh khi khách hàng thu hồi quyền từ ứng dụng **Cas ID**. Ngày 18/08
chúng tôi thử và ứng dụng Cas ID **không quét được mã QR** do Cas Link sinh ra trên
sandbox.

> **Đề nghị:** Casso cho biết có bản Cas ID kết nối môi trường sandbox không, hoặc
> có cách nào khác để thu hồi quyền trong môi trường thử.

### 3.2 Case 12, 13, 15 — QR Pay

Luồng QR Pay đã hiện thực đầy đủ: grant riêng với scope `qrpay`, Cas Link mở với
`feature: "qrpay"`, dò tài khoản bằng `GET /qr-pay/identity`, tạo mã bằng
`POST /qr-pay`, đối soát qua webhook `TRANSACTIONS`.

Chúng tôi đã thử **hai ngân hàng**, và mỗi ngân hàng yêu cầu một bộ thông tin
merchant khác nhau:

| Ngân hàng | Cas Link yêu cầu | Kết quả |
|---|---|---|
| BIDV VietQR Official | Số tài khoản + tên chủ tài khoản | Ngân hàng **đã nhận yêu cầu** và trả *"Thông tin nhập không chính xác"* — tức đã đi tới khâu kiểm tra dữ liệu |
| Vietcombank | **Mã định danh doanh nghiệp (Business ID)**, **Mã điểm thu (TID)**, Số tài khoản | Không có giá trị hợp lệ để nhập |

Trường hợp Vietcombank là luồng **VietQRPay** (Vietcombank hợp tác Napas). Business
ID và TID là thông tin ngân hàng cấp khi doanh nghiệp đăng ký làm merchant, không
phải giá trị do Cas sinh ra.

Chúng tôi đã tra tài liệu Cas ngày 18/08 và **không tìm thấy trang nào mô tả các
trường này**. Trang QR Pay chỉ mô tả tầng API (`amount`, `description`,
`referenceNumber`); phần thông tin merchant mà Cas Link thu thập không có trong tài
liệu.

Case 13 phụ thuộc case 12: probe hiện trả `GRANT_NOT_FOUND` (requestId
`rLDsrCRHsC8cqHcp`) chứ không phải `INVALID_PARAM`, vì Cas kiểm tra token trước
tham số. Muốn quan sát `INVALID_PARAM` phải có grant mang scope `qrpay` hợp lệ.

Case 15 (webhook xác nhận thanh toán) phụ thuộc case 12.

> **Đề nghị:** Casso cung cấp bộ thông tin merchant hợp lệ trên sandbox cho **một**
> ngân hàng bất kỳ mà Casso khuyến nghị — BIDV (số tài khoản + tên chủ) hoặc
> Vietcombank (Business ID + TID + số tài khoản). Chỉ cần một bộ chạy được là hoàn
> tất cả ba case 12, 13, 15.

---

## 4. Đề nghị điều chỉnh phạm vi

### 4.1 Nhóm `transfer` — 10 case (21, 22–29, 30)

Chúng tôi đề nghị **rút 10 case này khỏi bộ nghiệm thu**.

Lý do chính là phạm vi sản phẩm: **MIMI Wallet không xây dựng chức năng chuyển
tiền.** Ứng dụng đọc sao kê để dựng sổ sách và số liệu thuế cho hộ kinh doanh; việc
đó không cần quyền chuyển tiền. Trong mã nguồn hiện tại không có lệnh gọi
`/transfer` nào.

Lý do kỹ thuật đi kèm: `POST /transfer` trả `403 IP_NOT_ALLOWED` (requestId
`Nt4JTuBQ0-J9PWVb`). Supabase Edge Functions không có IP egress cố định nên không
thể đăng ký whitelist. Tuy nhiên đây chỉ là yếu tố phụ — kể cả khi gỡ được whitelist,
chúng tôi vẫn không sử dụng API này.

### 4.2 Case 18 — Thông tin tài khoản (KYC)

Chúng tôi đề nghị ghi nhận case này là **ngoài phạm vi theo thiết kế**, không phải
chưa hiện thực.

Ứng dụng **chủ động không yêu cầu scope `identity`** để Cas không gửi số CCCD, ngày
sinh, địa chỉ và số điện thoại của khách hàng. Đây là lựa chọn về bảo vệ dữ liệu cá
nhân: dữ liệu không được tiếp nhận thì không thể rò rỉ. Để đạt case này theo đúng
mô tả gốc, chúng tôi phải bật lại scope `identity`, tức đi ngược nguyên tắc trên.

---

## 5. Case đã hiện thực, chưa gặp điều kiện phát sinh

### Case 4 — Xoá liên kết cần OTP

Đã hiện thực ngày 18/08. Khi `POST /grant/remove` trả về `grantToken` thay vì kết
quả hoàn tất, hệ thống **không** đánh dấu liên kết là đã ngắt; nó mở Cas Link để
khách xác thực OTP rồi mới gọi lại lệnh xoá. Nguyên tắc: không báo với khách rằng
quyền truy cập đã đóng trong khi ngân hàng vẫn xem là còn hiệu lực.

Ngân hàng dùng để thử nghiệm không yêu cầu OTP ở bước ngắt liên kết, nên nhánh này
chưa có dịp chạy thật. Chúng tôi sẽ bổ sung bằng chứng khi gặp ngân hàng có yêu cầu.

---

## 6. Ghi nhận về thiết kế webhook

Form tạo webhook trong console Casso có bốn trường — Tên, Mô tả, Đường dẫn, Phân
loại — và **không có trường secret để ký payload**. Không có chữ ký thì bên nhận
không thể chứng minh một request đến từ Casso.

Chúng tôi đã xử lý bằng cách **không hành động theo nội dung payload**: mỗi sự kiện
nhận được chỉ kích hoạt một lời gọi ngược lại Cas để xác minh, rồi hành động theo
câu trả lời của Cas. Một webhook giả mạo vì vậy chỉ tốn một lời gọi API và không
thay đổi được trạng thái nào.

Cách này an toàn nhưng tốn thêm một lời gọi mỗi sự kiện. Nếu Casso có phương án xác
thực nguồn gửi, chúng tôi rất mong được biết.

---

## 7. Việc cần từ hai phía

| Việc | Bên thực hiện |
|---|---|
| Cung cấp cặp số tài khoản + tên chủ tài khoản BIDV hợp lệ trên sandbox | Casso |
| Cho biết phương án thu hồi quyền trong môi trường sandbox (Cas ID sandbox hoặc cách khác) | Casso |
| Xác nhận rút nhóm `transfer` khỏi phạm vi nghiệm thu | Casso |
| Xác nhận case 18 là ngoài phạm vi theo thiết kế | Casso |
| Cho biết phương án xác thực nguồn gửi webhook, nếu có | Casso |
| Chạy lại và bổ sung bằng chứng cho case 12, 13, 15 sau khi nhận dữ liệu | MIMI |
| Bổ sung bằng chứng case 10, 11 sau khi có công cụ thu hồi quyền | MIMI |
| Bổ sung bằng chứng case 4 khi gặp ngân hàng yêu cầu OTP | MIMI |

Sau khi nhận được hai mục dữ liệu đầu tiên, kết quả dự kiến đạt **18/20 case**.
