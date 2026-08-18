# Việc cần bạn tự làm — hướng dẫn tuần tự

Cập nhật 18/08/2026. **Bước 1, 2, 3 tôi đã chạy xong** — giữ lại để bạn biết chuyện
gì đã xảy ra. **Việc còn lại của bạn là Bước 4 và 5.**

Tất cả lệnh chạy trong thư mục:

```
C:\Users\NAM DINH\Downloads\mimiwallet-main\mimiwallet-main
```

> **Một điều về máy bạn.** Toolchain trên máy này thỉnh thoảng chậm gấp 30–70 lần:
> typecheck bình thường 10 giây có lần mất 5 phút, build bình thường 20 giây có
> lần mất **24 phút 56 giây**. Nhưng **chưa lần nào hỏng** — cứ để chạy là xong,
> exit 0. Đừng Ctrl+C rồi tưởng lỗi. Cắm sạc, để máy đó, đi pha cà phê.

---

## BƯỚC 1 — Sửa dữ liệu luật đang sai — ✅ **ĐÃ XONG 18/08, Claude chạy**

Không cần bạn làm gì. Ghi lại ở đây để biết chuyện gì đã xảy ra.

**Đã sửa gì:** dòng Luật Thuế TNCN trong `legal_documents` đang ghi hiệu lực
**01/01/2026** — con số đó suy ra chứ không đọc được từ nguồn. Nguồn công bố luật
nói **01/07/2026**. Dòng đó còn gộp hai luật làm một (ngưỡng 500 triệu của GTGT và
của TNCN chạy trên hai mốc khác nhau). Thêm một dòng mới về cách tính thuế hộ kinh
doanh: bỏ thuế khoán, 500tr–3 tỷ **được chọn** 15% trên lợi nhuận hoặc tỷ lệ trên
doanh thu, 3–50 tỷ 17%, trên 50 tỷ 20%.

**Đã xác minh trong DB thật**, không chỉ tin thông báo của CLI:

| Dòng | `ngay_hieu_luc` | `con_so_moc` |
|---|---|---|
| Luật Thuế TNCN (sửa đổi) 2025 | 2026-07-01 | 500.000.000 |
| Luật Thuế TNCN 2025 — cách tính thuế HKD | 2026-07-01 | 3.000.000.000 |

**Hai chỗ tôi đã sai, ghi lại để khỏi lặp:**

1. Bản hướng dẫn đầu bảo bạn tự chạy vì "CLI cần bàn phím thật". Sai — CLI có cờ
   **`--yes`**; tôi đã thử `yes |` (lệnh Unix) rồi kết luận nhầm. Lệnh đúng:
   `npx supabase db push --include-all --yes`
2. Lần chạy đầu **thất bại**: `integer out of range`. Cột `con_so_moc` khai kiểu
   `integer` (trần ~2,1 tỷ) trong một bảng chuyên lưu ngưỡng doanh thu — mà chính
   luật đang trích có mốc **3 tỷ và 50 tỷ**. Nó chỉ chạy được tới giờ nhờ may:
   hai giá trị seed đầu là 500 triệu và 1 tỷ, đều lọt dưới trần. Đã thêm
   `ALTER COLUMN con_so_moc TYPE bigint` vào đầu migration.

**Kiểm lại phía giao diện** (sau khi làm xong Bước 2): mở app → Tổng quan → mục
**Luật & Thuế** → dòng Luật Thuế TNCN phải ghi hiệu lực **01/07/2026**, và có dòng
mới về 15% / 17% / 20%.

---



## BƯỚC 2 — Đẩy mã lên production — ✅ **ĐÃ XONG 18/08, Claude chạy**

Bạn đồng ý nên tôi làm luôn. Commit `f6d123a`, đã push lên `main`.

32 file: 24 sửa + 8 mới (4 logo, 3 tài liệu, 1 migration). Trước khi commit tôi
soát xem có `.env` hay khoá nào lọt vào không — không có.

Trước đó đã kiểm chứng đủ: `tsc` (app + node) exit 0, `deno check` exit 0,
**176/176 test pass**, build exit 0.

**Kiểm lại:** mở `mimiwallet.vercel.app`, tiêu đề phải là **"Đóng thuế trên lợi
nhuận, không phải trên doanh thu"**. Vercel build mất vài phút sau khi push; nếu
còn thấy tiêu đề cũ thì đợi thêm rồi tải lại bỏ qua cache (Ctrl+Shift+R).

---

## BƯỚC 3 — Deploy 2 edge function — ✅ **ĐÃ XONG 18/08, Claude chạy**

`bank-link` và `cas-webhook` đều trả `"message":"Deployed Functions."`.

Cần đẩy tay vì **Vercel chỉ deploy frontend** — edge function nằm trên Supabase,
không nằm trong pipeline của Vercel. Cả hai đều dùng `_shared/bank/bankhub.ts` và
`_shared/bank/ingest.ts` vừa sửa, nên không đẩy thì backend vẫn chạy bản cũ và
nhánh OTP của case 4 sẽ không tồn tại.

---


## BƯỚC 4 — Chạy nghiệm thu, một buổi ~30 phút

**Đọc hết bước này trước khi bắt đầu.** Thao tác đầu tiên **huỷ liên kết ngân hàng
đang có**. Đừng bắt đầu nếu không ngồi liền mạch tới hết — bỏ dở giữa chừng thì
không còn grant để chạy tiếp.

Chuỗi này **đóng 7 case cùng lúc**: 10, 11, 1, 2, 3, 5, 7.

Mở sẵn: app MIMI (Fintech Hub) và ứng dụng **Cas ID** trên điện thoại.

| # | Bạn làm | Nhìn thấy gì | Đóng case |
|---|---|---|---|
| 4.1 | Mở **Cas ID** → thu hồi quyền đã cấp cho MIMI | Casso gửi webhook thật đầu tiên | **10** |
| 4.2 | Về MIMI, refresh Fintech Hub | Liên kết chuyển sang trạng thái mời nối lại | **11** + một phần **4** |
| 4.3 | Bấm **Liên kết ngân hàng**, nối lại tài khoản cũ | Nối thành công | **1** |
| 4.4 | Xem có tạo dòng trùng không | Chỉ 1 dòng, không nhân đôi | **2** |
| 4.5 | Bấm biểu tượng **ngắt liên kết** | Hỏi OTP → làm theo; hoặc ngắt luôn | **3** (+ **4** nếu hỏi OTP) |
| 4.6 | Nối lại lần nữa để có grant chạy tiếp | | |
| 4.7 | Chọn **Giả lập lỗi…** → **Đổi mật khẩu** → bấm **Cập nhật** | Nối lại được, không còn báo lỗi khó hiểu | **5** |
| 4.8 | Chọn **Giả lập lỗi…** → **Chặn đăng nhập web** → đợi toast tan | Dòng chữ **hổ phách** vẫn còn dưới tên tài khoản | **7** |

### Bước 4.9 — case 6, giờ nhiều khả năng đóng được luôn

Chọn **Giả lập lỗi…** → **Xác thực thiết bị** → bấm **Cập nhật** → **nhập OTP `123456`**.

Lần chạy 17/08 tôi ghi case này là "treo vô hạn ở Đang liên kết…, chưa rõ nguyên
nhân". **Với dữ kiện OTP sandbox là `123456`, nhiều khả năng nó chưa bao giờ
treo.** Cas Link mở ra và chờ nhập OTP; `onSuccess` chỉ bắn sau khi khách làm
xong, nên nút của MIMI đứng ở "Đang liên kết…" là **đúng thiết kế**, không phải
lỗi. Thứ tôi gọi là bug hoá ra là một ô nhập tôi không biết cách điền.

Nhập `123456` rồi cho tôi biết:

- **Có `onSuccess` không** — tức liên kết trở lại xanh, hết banner cảnh báo?
- Nếu vẫn đứng im sau khi nhập, chụp giúp màn hình bên trong khung Cas Link

Timeout 4 phút vẫn giữ nguyên: nó vô hại, và vẫn đúng cho trường hợp khách bỏ dở
thật giữa chừng.
---

## BƯỚC 5 — Gửi Casso 4 câu hỏi

Câu 1 là nút thắt lớn nhất còn lại của cả đợt nghiệm thu.

> **1. Xin một cặp số tài khoản + tên chủ tài khoản BIDV hợp lệ trên sandbox để
> test QR Pay.**
> Chúng tôi đã hiện thực đủ luồng. BIDV VietQR Official nhận yêu cầu và trả
> *"Thông tin nhập không chính xác"* — tức đã tới khâu kiểm tra của ngân hàng.
> Chỉ thiếu một cặp dữ liệu hợp lệ mà tài liệu không công bố.
> *(Mở khoá case 12 → 13 → 15)*
>
>
> **2. App Cas ID không quét được mã QR do Cas Link sinh ra trên sandbox.**
> Chúng tôi cần khách tự thu hồi quyền từ app để Casso phát sinh webhook thật —
> đó là cách duy nhất chứng minh phía *nhận* webhook, vì phía *xử lý* chúng tôi
> đã tự bắn sự kiện và chạy được đầu cuối rồi. Có bản Cas ID trỏ vào sandbox
> không, hay có đường nào khác để thu hồi quyền trong môi trường thử?
> *(Mở khoá case 10 và 11 — hiện không có đường nào khác)*
> **3. Form tạo webhook không có ô secret để ký payload — có cách nào xác thực
> nguồn gửi không?**
> Hiện chúng tôi coi payload là tín hiệu đi kiểm tra chứ không phải mệnh lệnh:
> nhận được thì gọi ngược lại Cas hỏi, rồi hành động theo câu trả lời của Cas.
> An toàn, nhưng tốn một lời gọi API mỗi lần.
>
> **4. Đề nghị rút nhóm `transfer` (10 case) khỏi bộ nghiệm thu.**
> Đây là quyết định đã chốt phía chúng tôi, không phải câu hỏi mở: **MIMI không
> làm chức năng chuyển tiền.** Sản phẩm đọc sao kê để dựng sổ chi phí và số liệu
> thuế; việc đó không cần quyền chuyển tiền và cũng không nên có. Trong mã hiện
> không có một dòng nào gọi `/transfer`.
> Riêng `IP_NOT_ALLOWED` chỉ là lý do phụ: Supabase Edge Functions không có IP
> egress cố định nên không whitelist được, nhưng kể cả gỡ được thì chúng tôi vẫn
> không dùng API này.
>
> Mong Casso xác nhận rút 10 case khỏi phạm vi, đưa mẫu số về **20 case**.
> **5. Invoice Hub có hỗ trợ hoá đơn từ máy tính tiền theo NĐ 70/2025 không?**
> *(Câu này cho lộ trình sản phẩm, không thuộc nghiệm thu)*

---

## Sau khi xong, báo lại tôi

- Bước 1, 2, 3 có ra đúng dấu hiệu thành công không
- **Kết quả bước 4.9** — nhập OTP `123456` có ra `onSuccess` không
- Casso trả lời gì

Tôi cập nhật bảng nghiệm thu và ghi requestId cho từng case mới đóng.

**Sau bước 4: 15/20 case.** Chờ Casso trả lời câu 1 thì lên 18/20.

---

## Phụ lục — nội dung commit (dán vào `commit-msg.txt`)

```
Bỏ toàn bộ lời hứa cho vay, chuyển trục sang thuế và chi phí

MIMI không có giấy phép tín dụng và không có đối tác giải ngân, nên mọi
lời hứa về vay vốn là lời hứa không giữ được. Gỡ 15 chỗ, gồm cả tiêu đề
trang chủ (Von ve tai khoan truoc khi khach tra tien) và nút Ứng vốn ngay
vốn ghi status='advanced' rồi báo "Đã ứng vốn X đồng" trong khi không
đồng nào rời đi — số đó còn được cộng vào một thẻ KPI.

Thay bằng nỗi đau có thật và kiểm chứng được: thuế khoán bị bỏ từ
01/01/2026, hộ kinh doanh tự kê khai, nhóm 500tr-3 tỷ ĐƯỢC CHỌN giữa 15%
trên lợi nhuận và tỷ lệ trên doanh thu — nhưng chỉ khi chứng minh được
chi phí. MIMI giữ toàn bộ dòng tiền ra của họ.

Trong lúc quét còn tìm ra 4 tuyên bố sai khác, hai cái nguy hiểm hơn phần
cho vay vì tra được: "độ chính xác dự báo 94%" (chưa từng đo gì) và
"chuẩn ISO 27001" (không có chứng chỉ này). Kèm "mô hình machine learning
huấn luyện trên hàng triệu giao dịch" — scoring.ts thực chất là thẻ điểm
tuyến tính trọng số cố định, không có mô hình, không có tập huấn luyện.

Sửa thêm:
- legal_documents: ngày hiệu lực Luật Thuế TNCN 01/01 -> 01/07/2026, tách
  khỏi ngưỡng GTGT; thêm dòng về cách tính thuế hộ kinh doanh
- Case 4 nghiệm thu: nhánh xoá liên kết cần OTP. Khi Cas đáp bằng
  grantToken thay vì hoàn tất, KHÔNG đánh dấu disconnected — báo đã ngắt
  trong khi ngân hàng vẫn coi dữ liệu được uỷ quyền là lỗi tệ nhất
- Lỗi lưới dashboard: NewsAndLawPanel bị ép còn 1/5 chiều rộng
- Sidebar 12 mục phẳng gom thành nhóm; bỏ Dòng tiền (trùng trang) và
  Công nghệ (trang marketing)
- Avatar in cứng "AM" cho mọi tài khoản; ô tìm kiếm không có onChange
- 4 logo mới: OCB, Timo, VietinBank, Tổng cục Thuế (đã cắt sát lề)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```
