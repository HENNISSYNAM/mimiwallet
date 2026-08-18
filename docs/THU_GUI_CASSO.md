# Nội dung gửi Casso

Hai bản: một để gửi email (đầy đủ), một để nhắn nhanh qua Zalo/Slack nếu có kênh
trao đổi trực tiếp. Đính kèm `BAO_CAO_NGHIEM_THU_GUI_CASSO.md` (xuất PDF nếu cần).

---

## Bản email

**Tiêu đề:** MIMI Wallet — Báo cáo nghiệm thu tích hợp BankHub, HĐ 0319436143/BAAS/1

---

Kính gửi anh/chị,

MIMI Wallet xin gửi báo cáo nghiệm thu tích hợp BankHub theo hợp đồng
0319436143/BAAS/1. Chúng tôi đã chạy bộ 30 case trên môi trường sandbox trong kỳ
12/08 – 18/08/2026.

**Kết quả: 13 case đạt.** Toàn bộ vòng đời liên kết tài khoản đã hoàn tất — tạo
liên kết, xử lý trùng thông tin, ngắt liên kết, và cả ba tình huống mất kết nối
(đổi mật khẩu, xác thực thiết bị, chặn đăng nhập từ website). Nhóm truy vấn giao
dịch và kiểm soát truy cập token cũng đã đạt, với hiệu năng trung bình 53 ms cho
`GET /transactions`.

Chi tiết từng case kèm requestId và mốc thời gian có trong báo cáo đính kèm. Xin
phép nêu ngắn gọn ở đây **ba việc cần Casso hỗ trợ** và **hai đề nghị về phạm vi**.

**Cần Casso hỗ trợ**

1. **Một cặp số tài khoản và tên chủ tài khoản BIDV hợp lệ trên sandbox.**
   Luồng QR Pay đã hiện thực đầy đủ. BIDV VietQR Official đã nhận yêu cầu và trả
   về "Thông tin nhập không chính xác", tức đã đi tới khâu kiểm tra dữ liệu của
   ngân hàng. Chúng tôi chỉ thiếu một cặp dữ liệu hợp lệ mà tài liệu chưa công bố.
   Có dữ liệu này sẽ mở được case 12, 13 và 15.

2. **Phương án thu hồi quyền trong môi trường sandbox.**
   Chúng tôi cần khách hàng thu hồi quyền từ ứng dụng Cas ID để Casso phát sinh
   webhook thật — đó là cách duy nhất chứng minh phía nhận webhook. Tuy nhiên ứng
   dụng Cas ID hiện không quét được mã QR do Cas Link sinh ra trên sandbox. Xin hỏi
   có bản Cas ID kết nối sandbox, hoặc cách nào khác để thu hồi quyền trong môi
   trường thử không? Việc này liên quan case 10 và 11.

3. **Xác thực nguồn gửi webhook.**
   Form tạo webhook trong console hiện có bốn trường và không có trường secret để
   ký payload. Chúng tôi đã xử lý bằng cách không hành động theo nội dung payload —
   mỗi sự kiện chỉ kích hoạt một lời gọi ngược lại Cas để xác minh, rồi hành động
   theo câu trả lời của Cas. Cách này an toàn nhưng tốn thêm một lời gọi mỗi sự
   kiện. Nếu Casso có phương án xác thực nguồn gửi, chúng tôi rất mong được biết.

**Hai đề nghị về phạm vi**

4. **Rút nhóm `transfer` (10 case) khỏi bộ nghiệm thu.**
   Lý do chính là phạm vi sản phẩm: MIMI Wallet không xây dựng chức năng chuyển
   tiền. Ứng dụng đọc sao kê để dựng sổ sách và số liệu thuế cho hộ kinh doanh,
   việc đó không cần quyền chuyển tiền, và trong mã nguồn hiện không có lệnh gọi
   `/transfer` nào. Có một yếu tố kỹ thuật đi kèm — `POST /transfer` trả
   `403 IP_NOT_ALLOWED` và Supabase Edge Functions không có IP egress cố định để
   đăng ký whitelist — nhưng đó chỉ là lý do phụ.

5. **Ghi nhận case 18 (Thông tin tài khoản – KYC) là ngoài phạm vi theo thiết kế.**
   Ứng dụng chủ động không yêu cầu scope `identity` để Cas không gửi số CCCD, ngày
   sinh, địa chỉ và số điện thoại của khách hàng. Đây là lựa chọn về bảo vệ dữ liệu
   cá nhân. Để đạt case này theo mô tả gốc, chúng tôi phải bật lại scope đó.

Sau khi nhận được hai mục dữ liệu ở phần đầu, chúng tôi sẽ chạy lại và bổ sung bằng
chứng ngay. Kết quả dự kiến khi đó là 18 trên 20 case.

Rất mong nhận được phản hồi từ anh/chị. Nếu cần trao đổi trực tiếp về bất kỳ mục
nào, chúng tôi sẵn sàng sắp xếp một buổi làm việc.

Trân trọng cảm ơn,

**[Tên bạn]**
MIMI Wallet
[Số điện thoại] · [Email]

---

## Bản nhắn nhanh

> Chào anh/chị, bên em vừa xong đợt nghiệm thu tích hợp BankHub (HĐ
> 0319436143/BAAS/1), chạy sandbox từ 12/08 đến 18/08. **Kết quả 13 case đạt**,
> trọn vòng đời liên kết tài khoản đã hoàn tất, báo cáo chi tiết em gửi kèm.
>
> Có **2 việc em cần anh/chị hỗ trợ** để chạy tiếp:
>
> 1. Cho em xin **một cặp số tài khoản + tên chủ tài khoản BIDV hợp lệ trên
>    sandbox**. Luồng QR Pay bên em làm xong rồi, BIDV đã nhận yêu cầu và báo
>    "Thông tin nhập không chính xác" — tức là đã tới khâu kiểm tra dữ liệu của
>    ngân hàng, chỉ thiếu đúng cặp dữ liệu này. Mở được 3 case.
>
> 2. **App Cas ID không quét được mã QR sandbox.** Bên em cần thu hồi quyền từ app
>    để Casso gửi webhook thật, mà không quét được nên chưa chứng minh được phía
>    nhận webhook. Anh/chị cho em hỏi có bản Cas ID cho sandbox không ạ?
>
> Ngoài ra em có **2 đề nghị về phạm vi** đã ghi trong báo cáo: xin rút nhóm
> `transfer` (10 case, bên em không làm chức năng chuyển tiền), và ghi nhận case
> 18 là ngoài phạm vi theo thiết kế (bên em chủ động không nhận scope `identity`
> để không lưu CCCD của khách).
>
> Có 2 mục trên là em chạy tiếp được ngay, dự kiến lên 18/20 case. Em cảm ơn
> anh/chị nhiều ạ.

---

## Ghi chú trước khi gửi

- Điền tên, số điện thoại, email vào cuối bản email.
- Xác nhận lại tên người nhận và cách xưng hô cho đúng quan hệ hiện tại.
- `BAO_CAO_NGHIEM_THU_GUI_CASSO.md` là bản dành cho đối tác. **Không gửi**
  `NGHIEM_THU_CASSO.md` — đó là tài liệu nội bộ, có ghi chú kỹ thuật và các lần tự
  sửa sai trong quá trình làm.
- Nếu Casso hỏi vì sao bỏ `transfer`, câu trả lời ngắn: sản phẩm chuyển hướng sang
  dựng sổ chi phí và số liệu thuế cho hộ kinh doanh, không còn cấp vốn hay chuyển
  tiền. Không cần đi sâu hơn.
