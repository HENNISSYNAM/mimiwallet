# Nội dung gửi Casso

> Cập nhật **08/09/2026**. Bản trước viết 18/08 khi mới đạt 14 case và luồng QR
> Pay còn bế tắc; cả hai đã thay đổi. Bản cũ còn trong lịch sử git.

Hai bản: một để gửi email, một để nhắn nhanh nếu có kênh trao đổi trực tiếp.
Đính kèm `NGHIEM_THU_CASSO.md` (xuất PDF nếu cần).

---

## Bản email

**Tiêu đề:** MIMI Wallet — Nghiệm thu tích hợp BankHub, HĐ 0319436143/BAAS/1

---

Kính gửi anh/chị,

MIMI Wallet xin cập nhật kết quả nghiệm thu tích hợp BankHub theo hợp đồng
0319436143/BAAS/1, tính tới ngày 08/09/2026.

**Kết quả: 16/20 case trong phạm vi đã đạt**, mỗi case đều có requestId và mốc
thời gian trong báo cáo đính kèm. Từ bản báo cáo ngày 18/08, chúng tôi đóng thêm
hai case khó nhất — case 12 (tạo mã QR Pay hợp lệ) và case 13 (`INVALID_PARAM`)
— sau khi anh/chị xác nhận sandbox chỉ hỗ trợ MB Bank. Xin cảm ơn thông tin đó;
nó gỡ đúng nút thắt.

Điều chúng tôi muốn nêu không phải tỷ lệ 80%, mà là cấu trúc của bốn case còn
lại: **không case nào trong số đó đang chờ MIMI hiện thực thêm chức năng.** Ba
case chờ dữ liệu hoặc thao tác từ phía Casso, một case là vấn đề phạm vi cần hai
bên thống nhất. Chi tiết dưới đây.

### Bốn việc cần Casso

**1. Case 15 — webhook xác nhận thanh toán.** Ngày 04/09 chúng tôi đã chuyển
5.000đ tiền thật vào tài khoản MB có grant `qrpay` đang hoạt động, đồng thời
liên kết thêm một grant `transaction` trên cùng tài khoản đó. Không có envelope
`TRANSACTIONS` nào được gửi tới, và `GET /transactions` trả về
`{accounts: [1], transactions: []}` cho khoảng 12 tháng.

Bốn giả thuyết đã được loại bằng đo đạc chứ không bằng suy luận: sandbox không
nhận tài khoản thật (sai — liên kết thành công và có mốc đồng bộ), lệch định
dạng số tài khoản (sai — bộ lọc loại 0 dòng), trùng dữ liệu đã có (sai — nhận về
0 dòng), đọc sai tầng phản hồi (sai — `transactions` nằm đúng tầng ngoài cùng).

Phần xử lý phía MIMI đã được kiểm chứng độc lập: ngày 08/09, một hoá đơn thật
trị giá 2.200đ đã tự chuyển sang trạng thái đã thu sau khi nhận tiền, qua một
đường không đi qua Cas. Toàn bộ logic đối soát và chuyển trạng thái mà case 15
kiểm đều hoạt động đúng trên dữ liệu thật.

Xin anh/chị hỗ trợ **một trong hai**: dữ liệu mẫu có phát sinh giao dịch trong
sandbox, hoặc credential production để chạy lại case này.

**2. Case 10 — `USER_PERMISSION_REVOKED`.** Đường ống nhận và xử lý đã được
chứng minh ở case 11. Riêng mã lỗi này, chúng tôi đã tự bắn một payload giả cho
một grant đang hoạt động; endpoint không tin payload mà gọi ngược lại Cas để
kiểm chứng, Cas xác nhận grant còn sống, và endpoint trả `verified/alive` —
đúng hành vi mong muốn.

Đếm trên `webhook_events` tới 18/08: `DEFAULT_UPDATE` 25 lần, `ERROR` 10 lần,
`USER_PERMISSION_REVOKED` 0 lần. Mã này chỉ phát sinh khi khách thu hồi quyền từ
app Cas ID, mà app không quét được mã QR của sandbox.

Xin anh/chị **kích hoạt sự kiện này từ phía máy chủ** cho một grant thử.

**3. Case 4 — xoá liên kết cần OTP.** `/grant/remove` có hai dạng phản hồi, cả
hai đều HTTP 200: grant đã gỡ, hoặc khách phải xác nhận qua màn hình Cas Link.
Chúng tôi đã hiện thực cả hai nhánh và có unit test khoá lại việc phân biệt
chúng bằng trường trong body chứ không bằng mã trạng thái.

Chúng tôi đã thử ép nhánh thứ hai bằng `/sandbox/grant/reset-login` với
`OTP_REQUIRED` nhưng chưa quan sát được. Xin anh/chị cho biết **cách buộc
`/grant/remove` rơi vào nhánh cần OTP trên sandbox**.

**4. Case 18 — thông tin định danh (KYC).** Chúng tôi chủ động **không** đăng ký
scope `identity`, nên Cas không gửi số CCCD, ngày sinh, địa chỉ và số điện thoại
của khách sang MIMI. Đây là quyết định giảm thiểu dữ liệu, không phải thiếu sót
kỹ thuật.

Đóng case này theo đúng chữ trong hợp đồng đồng nghĩa với việc bật lại scope đó,
tức tạo ra một luồng dữ liệu định danh mà cả hai bên đều phải chịu trách nhiệm
theo Nghị định 13/2023 — trong khi sản phẩm không dùng tới. Xin đề nghị **hai
bên ghi nhận case 18 là ngoài phạm vi**.

### Một đề nghị về phạm vi

**Xin rút 10 case nhóm `transfer` (case 21, 22–29, 30) khỏi bộ nghiệm thu.**

MIMI không đăng ký sử dụng API chuyển tiền: sản phẩm đọc sao kê để dựng sổ chi
phí và số liệu thuế, không có chức năng nào dịch chuyển tiền của khách. Rà lại
mã nguồn ngày 18/08 xác nhận không có dòng nào gọi `/transfer`.

Về mặt kỹ thuật, mọi lời gọi đều bị chặn `IP_NOT_ALLOWED` (requestId
`Nt4JTuBQ0-J9PWVb`) ở tầng mạng trước cả bước kiểm tham số, nên không mã lỗi nào
trong TC01–TC08 quan sát được. Chúng tôi chạy trên Supabase Edge Functions,
không có IP egress cố định để đưa vào whitelist.

Nếu anh/chị cần đủ số case thay vì rút, chúng tôi sẵn sàng chạy 10 case này một
lần từ một máy có IP cố định để lấy requestId. Xin cho biết Casso nhận whitelist
theo IP đơn hay theo dải CIDR.

### Một việc thuộc trách nhiệm của chúng tôi

Trong quá trình thử, mã của MIMI có lỗi đánh dấu liên kết là đã ngắt trong cơ sở
dữ liệu **mà không gọi `/grant/remove`** trước. Hậu quả là ba grant vẫn còn hiệu
lực phía Casso trong khi MIMI đã bỏ token nên không thu hồi được nữa:

    5455fe9b-9640-11f1-b705-fa163e5398eb
    bf05c762-…
    7b9a58b1-…

Lỗi đã sửa ngày 07/09 — luồng thay thế liên kết nay gọi `/grant/remove` trước
khi đổi trạng thái. Xin anh/chị **thu hồi hộ ba grant trên**, vì đây là quyền
truy cập tài khoản ngân hàng đang tồn tại mà không bên nào quản được.

### Hai đề nghị về tài liệu

1. **Giới hạn 9 ký tự của trường `description`** khi tạo QR Pay. Chúng tôi phát
   hiện qua phản hồi thật (requestId `Bgv44JpvIbxfvfmr`: *"description must has
   maximum 9 characters"*). Trang tài liệu QR Pay liệt kê `amount`,
   `description`, `referenceNumber` nhưng không nêu giới hạn nào.

2. **Sandbox chỉ hỗ trợ MB Bank cho QR Pay.** Chi tiết này tốn của chúng tôi một
   tuần và hai ngân hàng (BIDV, Vietcombank) trước khi anh/chị xác nhận. Một
   dòng trong tài liệu sẽ tiết kiệm cho khách tích hợp tiếp theo đúng chừng đó.

Rất mong nhận được phản hồi của anh/chị.

Trân trọng,

---

## Bản ngắn

Chào anh/chị,

Cập nhật nghiệm thu BankHub tới 08/09: **16/20 case trong phạm vi đã đạt**, đều
có requestId trong báo cáo đính kèm. Case 12 và 13 đã đóng sau khi anh/chị xác
nhận sandbox chỉ hỗ trợ MB — cảm ơn anh/chị.

Bốn case còn lại không case nào chờ MIMI viết thêm mã. Cần anh/chị hỗ trợ:

1. **Case 15** — dữ liệu mẫu có giao dịch trong sandbox, hoặc credential
   production. Đã chuyển 5.000đ tiền thật ngày 04/09, không có webhook và
   `/transactions` trả rỗng cho grant hợp lệ.
2. **Case 10** — kích hoạt `USER_PERMISSION_REVOKED` từ phía máy chủ. App Cas ID
   không quét được mã QR sandbox.
3. **Case 4** — cách buộc `/grant/remove` rơi vào nhánh cần OTP trên sandbox.
4. **Case 18** — xin ghi nhận ngoài phạm vi. Chúng tôi chủ động không đăng ký
   scope `identity` để không nhận dữ liệu định danh của khách.

Và một đề nghị: **xin rút 10 case nhóm `transfer`** — MIMI không có chức năng
chuyển tiền, mã nguồn không có dòng nào gọi `/transfer`.

Một việc phía chúng tôi: ba grant còn hiệu lực bên Casso do lỗi cũ của MIMI
(đánh dấu đã ngắt mà không gọi `/grant/remove`; đã sửa 07/09). Xin anh/chị thu
hồi hộ — danh sách ID trong bản đầy đủ.

Cảm ơn anh/chị.
