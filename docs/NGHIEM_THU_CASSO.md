# Nghiệm thu liên kết tài khoản tài chính — Casso ↔ CLI NUTRIX

Hợp đồng `0319436143/BAAS/1`. Bộ case gốc: `CLI NUTRIX_Test report.xlsx`, 30 case,
ba mã dịch vụ `qrpay`, `transaction`, `transfer,identity`.

Chạy ngày **12/08/2026**, môi trường **sandbox** (`sandbox.bankhub.dev`),
client id `7f98926a…`.

## Chốt đợt 04/09/2026 — 16/20 (80%)

Buổi này đóng thêm **hai case** (12 và 13) và **xác định nguyên nhân** cho case
15. Cả ba đều là những case bế tắc lâu nhất của cả đợt nghiệm thu.

| | Số case | Ghi chú |
|---|---|---|
| **Passed** | **16 / 20** | 80% trên nhóm trong phạm vi |
| Chặn bởi dữ liệu sandbox — đã chứng minh | 1 | case 15 |
| Chờ app Cas ID gửi webhook thật | 1 | case 10 |
| Đã viết mã, chưa gặp điều kiện phát sinh | 1 | case 4 |
| Ngoài phạm vi theo thiết kế | 1 | case 18 |
| Chặn `IP_NOT_ALLOWED` — nhóm `transfer` | 10 | ngoài 20 case trên |

### Điều đáng nhớ nhất của buổi này

**Không một phát hiện nào tìm ra được bằng đọc mã.** Cả năm đều chỉ lộ khi có
một grant thật đi được tới khâu tiếp theo, và mỗi cái che khuất cái sau:

1. Casso xác nhận sandbox **chỉ hỗ trợ MB** — giải thích trọn vẹn một tuần thử
   BIDV và Vietcombank vô ích.
2. **MIMI tự đập hỏng grant `qrpay` của chính mình.** Vòng đồng bộ gọi
   `/transactions` lên grant không có scope đó, lỗi map thành `needs_relink`,
   và Casso đẩy `DEFAULT_UPDATE` 25 lần/ngày nên mỗi webhook là một lần đập
   lại. Bộ chắn cũ đo **triệu chứng của một lần dò danh tính hỏng** chứ không
   đo **sự thật rằng đây là liên kết QR**, nên đúng ngày dò danh tính chạy được
   là ngày nó lặng lẽ ngừng bảo vệ.
3. **`description` tối đa 9 ký tự** — không có trong tài liệu Cas. Ràng buộc
   này cũng khiến nút tạo QR trên trang Hoá đơn **chưa từng chạy được**, vì nó
   gửi `Thanh toan <số hoá đơn>` dài gấp đôi.
4. **Hai unique index cũ chặn liên kết thứ hai cho cùng một ngân hàng.** Một
   tài khoản cần hai grant — `qrpay` để phát mã, `transaction` để thấy tiền về
   — nhưng khoá cũ là `(company_id, bank_code)`. Nguy hiểm hơn: `onConflict`
   cũ sẽ **ghi đè grant QR thành `transaction`** mà không báo gì, nên người
   dùng làm theo hướng dẫn hiển nhiên sẽ tự phá thứ mình vừa dựng.
5. **Sandbox không phục vụ sao kê thật** — kết luận của case 15, xem dưới.

### Bốn giả thuyết bị loại bằng đo đạc, không bằng lập luận

Sau khi mã QR chạy và tiền thật đã về, `qr_payments` vẫn `pending`. Thay vì
đoán, mỗi vòng thêm một phép đo và loại một khả năng:

| Giả thuyết | Phép đo | Kết quả |
|---|---|---|
| Sandbox không nhận tài khoản thật | Liên kết `transaction` trên MB | **Sai** — thành công, có mốc đồng bộ |
| Lệch định dạng số tài khoản làm lọc sạch | Đếm `scopedOut` | **Sai** — `khacTaiKhoan = 0` |
| Trùng dữ liệu đã có trong sổ | `fetched` | **Sai** — `fetched = 0` |
| Đọc sai tầng phản hồi | Liệt kê tên trường tầng ngoài | **Sai** — `transactions` đúng tầng |

Còn lại: Cas trả về `accounts[1], transactions[0]`, tài khoản Cas thấy là
`2002` — **khớp đúng liên kết** — trên cửa sổ **12 tháng**. Một tài khoản đang
dùng thật không thể trống suốt một năm.

**Kết luận: sandbox không phục vụ sao kê thật cho tài khoản này.** Đây là câu
hỏi cho Casso, không phải việc sửa mã.

---

## Casso phản hồi 21/08/2026 — mở khoá case 12, 13

Chị Lê Tuyết (Casso) nhắn ba việc:

1. **Đề nghị MIMI tạo một tài khoản demo** trên hệ thống để phía Casso tự test.
2. **QR Pay: sandbox CHỈ hỗ trợ MB Bank.** Nguyên văn: *"với api qr pay, bên mình
   test với tài khoản MB thật giúp em lun nha — hiện tại trên sandbox thì chỉ hỗ
   trợ test MB ạ"*
3. Casso đã xem qua file test của MIMI.

**Điểm (2) giải thích trọn vẹn vì sao case 12 bế tắc suốt tuần qua.** Chúng tôi đã
thử **BIDV** (trả "Thông tin nhập không chính xác") rồi **Vietcombank** (đòi
Business ID + TID, là credential ngân hàng cấp cho merchant). Cả hai đều là ngân
hàng **sandbox không hỗ trợ QR Pay** — nên không bộ credential nào làm chúng chạy
được, và thời gian bỏ ra đi tìm tài liệu về ba trường đó là công cốc.

Không phải lỗi của bên nào: **tài liệu QR Pay không nêu giới hạn ngân hàng ở đâu
cả.** Kiến nghị Casso ghi một dòng vào trang QR Pay — nó tiết kiệm cho khách tích
hợp tiếp theo đúng một tuần.

**Việc tiếp theo:** liên kết một tài khoản **MB thật** với scope `qrpay`, rồi chạy
lại case 12 → 13 → 15 theo đúng thứ tự đó, vì 13 và 15 đều bị 12 chặn.

---

## 04/09/2026 — liên kết MB dựng được, và một ngõ cụt trong chính giao diện

**Đóng thêm 0 case.** Nói trước con số đó để phần dưới không đọc thành tiến bộ
nhiều hơn thực tế. Việc hôm nay là gỡ một vật cản, không phải vượt qua nó.

### Chuyện đã xảy ra

Liên kết **MB Bank** với `feature: "qrpay"` chạy được. Đây là lần đầu tiên có một
dòng `scopes = 'qrpay'` trong `bank_connections` — trước đó mọi lần thử BIDV và
Vietcombank đều dừng trước bước này. Đúng như Casso trả lời 21/08: sandbox chỉ hỗ
trợ MB.

Nhưng dòng đó rơi vào `needs_relink`. Và giao diện mời bấm **"Cập nhật"**, kèm
một dòng hổ phách bảo *"bấm Cập nhật ở tài khoản đó — bạn không phải liên kết lại
từ đầu"*. Bấm vào thì Cas trả về:

> *"Dịch vụ tài chính này không hỗ trợ Update Mode"*

Ngõ cụt kín: **nút duy nhất được mời bấm là nút duy nhất không dùng được.**

### Nguyên nhân, và nó không nằm ở bảng mã lỗi

Phản xạ đầu tiên là thêm mã lỗi mới vào `_shared/bank/errors.ts`. Sai — và sai
đúng theo bài học của case 7: bảng mã lỗi sẽ luôn thiếu, vì Cas thêm mã lúc nào
cũng được.

Nguyên nhân thật: **giao diện không biết `scopes`.** Câu `select` trong
`CasLink.tsx` không lấy cột đó, nên mọi dòng `needs_relink` đều nhận cùng một lời
khuyên, kể cả dòng không cập nhật được. Trong khi chính máy chủ đã biết đúng —
`bank-link/index.ts` khi không tìm thấy liên kết QR đã khuyên *"bấm Liên kết để
nhận tiền QR"*. Hai nơi trong cùng một ứng dụng nói hai điều trái nhau về cùng
một dòng dữ liệu.

### Đã sửa (commit `5110667`)

Quy tắc tách thành module thuần `src/lib/lienKetNganHang.ts`, **16 test**:

> liên kết `qrpay` → **luôn** liên kết lại từ đầu, không bao giờ Update Mode
> liên kết khác   → giữ Update Mode, vì case 5 đã nghiệm thu đạt

Không cần nhớ lần bấm hỏng nào: grant QR gắn với dịch vụ merchant của ngân hàng
chứ không gắn với phiên đăng nhập, nên "làm mới phiên" vốn không phải phép sửa
đúng cho nó.

Kèm theo, hai lỗi độc lập lộ ra khi khảo sát và đã sửa cùng lúc:

1. **`BankCallback.tsx` làm mất `feature`.** Nó gọi `exchange` chỉ với
   `publicToken`, nên bất kỳ liên kết QR nào hoàn tất qua **chuyển hướng toàn
   trang** (thay vì iframe) sẽ bị lưu với `scopes = 'transaction'` mặc định — và
   `create-qr` vĩnh viễn không thấy nó. Lỗi im lặng: màn hình báo thành công, rồi
   QR báo "chưa có tài khoản nào". Lần này thoát vì đi đường iframe, nhưng nó nằm
   đúng trên đường sắp phải chạy lại.

2. **Dòng trùng tích luỹ vô hạn.** Khi `fetchQrPayIdentity` thất bại, khoá upsert
   rơi về `grant:<grantId>`, mà `grantId` mới mỗi lần liên kết — nên **chắc chắn**
   sinh dòng mới, và dòng cũ nằm lại làm banner sáng mãi. Nay `exchange` tự
   chuyển các dòng cùng scope đang `needs_relink` sang `disconnected` kèm
   `revoked_at`. Không xoá: dòng giữ dấu vết kiểm toán.

3. **Ghi chú cụ thể bị câu chung nuốt.** Bản vá `a1b3147` hôm trước ghi hướng dẫn
   vào `bankNotes`, nhưng ternary hiển thị phụ đề xếp `needs_relink` **trước**,
   nên ghi chú đó không bao giờ hiện ra ở dòng — chỉ sống trong tooltip và một
   toast 10 giây. Nói thẳng: **bản vá đó gần như vô tác dụng.** Nay `bankNotes`
   thắng câu chung, có test hồi quy.

### Case 12 giờ bị chặn bởi cái gì

Vật cản đã đổi bản chất, và đây là điểm cần chính xác:

- **Trước 04/09:** không biết ngân hàng nào hỗ trợ, không biết cần credential gì.
- **Sau 04/09:** biết là MB, grant `qrpay` đã dựng được, ngõ cụt giao diện đã gỡ.
- **Còn lại:** **chưa chứng minh được MB thật sự phát ra mã QR.** Dòng MB rơi vào
  `needs_relink` mà **chưa rõ vì sao** — có thể grant hết hạn, cũng có thể MB
  cũng đòi credential merchant như Vietcombank. Chưa có bằng chứng cho giả thuyết
  nào.

Nên case 12 **vẫn chưa Passed**, và cũng chưa nên ghi là "sắp xong". Việc kế tiếp
là một thao tác tay: liên kết lại MB bằng nút **"Liên kết để nhận tiền QR"**, OTP
sandbox `123456`, rồi thử tạo mã. Kết quả của lần đó mới nói được câu tiếp theo.

---

### Case 12 đã đóng — và ba việc phải nối tiếp nhau mới mở được

Đây là case bế tắc lâu nhất của cả đợt. Nó không mở bằng một phát hiện mà bằng
ba, xảy ra trong cùng một ngày, mỗi cái che khuất cái sau:

1. **Casso xác nhận sandbox chỉ hỗ trợ MB.** Trước đó ta thử BIDV rồi
   Vietcombank — cả hai đều không được hỗ trợ, nên không bộ credential nào làm
   chúng chạy. Một tuần đi tìm tài liệu về Business ID và TID là công cốc.

2. **MIMI tự đập hỏng grant `qrpay` của chính mình.** Grant `qrpay` không có
   scope `transaction`, nhưng vòng đồng bộ vẫn gọi `/transactions` lên nó, Cas
   từ chối, và `ingestConnection` đánh dấu `needs_relink`. Casso đẩy
   `DEFAULT_UPDATE` tới 25 lần một ngày nên mỗi webhook là một lần đập lại —
   người dùng liên kết lại bao nhiêu lần cũng thua.

   Bộ chắn cũ đo sai thứ: nó hỏi `account_number.startsWith("grant:")`, tức đo
   *triệu chứng của một lần dò danh tính hỏng*, không đo *sự thật rằng đây là
   liên kết QR*. Đúng ngày dò danh tính chạy được, bộ chắn lặng lẽ ngừng bảo vệ.

3. **`description` tối đa 9 ký tự** — không có trong tài liệu Cas. Lộ ra qua
   `INVALID_PARAM`, requestId `Bgv44JpvIbxfvfmr`. Ràng buộc này cũng làm nút tạo
   QR trên trang Hoá đơn **chưa từng chạy được**, vì nó gửi
   `Thanh toan <số hoá đơn>` dài gấp đôi giới hạn — không ai biết vì case 12 đã
   chặn từ trước đó.

**Không việc nào trong ba tìm ra được bằng đọc mã.** Cả ba chỉ lộ khi có một
grant thật đi được tới khâu tiếp theo. Đây là bài học lặp lại đúng ba lần trong
tài liệu này rồi: cái chặn nằm ở chỗ chỉ chạy thật mới thấy.

---

## Kết quả tổng (cập nhật 04/09/2026)

| | Trên 30 case | Trên 20 case — bỏ nhóm `transfer` |
|---|---|---|
| **Passed** | **16** | **16 (80%)** |
| Đường ống đã chứng minh, chờ app Cas ID (case 10) | 1 | 1 |
| Đã viết mã, chưa chạy thật (case 4) | 1 | 1 |
| Chặn bởi dữ liệu sandbox — đã chứng minh (case 15) | 1 | 1 |
| Ngoài phạm vi theo thiết kế (case 18) | 1 | 1 |
| Bị chặn `IP_NOT_ALLOWED` — nhóm `transfer` | 10 | — |
| **Tổng** | **30** | **20** |

**Buổi 18/08 đóng thêm 6 case**: 2, 3, 5, 6, 7 và 11. Cả sáu đều từng bị ghi là chưa
xong hoặc chưa rõ nguyên nhân, và cả sáu chỉ đóng được nhờ **chạy thật** — không
case nào tìm ra được bằng đọc mã.

Ba lỗi giao diện lộ ra trong buổi đó, cùng một họ — **màn hình nói một đằng, sự
thật một nẻo**:

1. **Case 6** — khung đỏ "Liên kết chưa hoàn tất" đọng lại bên dưới một toast báo
   thành công. Nhánh `upToDate` không xoá `lastError`.
2. **Case 7** — ghi chú hổ phách không bám, vì điều kiện ghi chú phụ thuộc vào
   bảng mã lỗi đã biết `PREVENTED`, mà nó không có trong bảng. Lưới an toàn thủng
   đúng chỗ nó được viết ra để đỡ. Sửa bằng cách đổi quy tắc thay vì thêm một
   dòng vào bảng — Cas thêm mã lúc nào cũng được, bảng sẽ luôn thiếu.
3. **Case 3** — dòng đã ngắt vẫn nằm lại danh sách, cảnh báo hổ phách về đúng
   việc người dùng vừa cố ý làm.

Và một kết luận sai của chính tài liệu này đã được đính chính: case 6 từng ghi là
"treo vô hạn, nguyên nhân chưa xác định". Không phải treo — Cas Link đang chờ nhập
OTP, mà **OTP sandbox là `123456`**. Thứ còn thiếu không nằm trong mã; nó là một
giá trị test.

13/30 không phải vì hệ thống hỏng. Nó phản ánh một chuyện đơn giản: **hợp đồng
liệt kê ba mã dịch vụ, ứng dụng hiện thực một** (`transaction`, cộng `qrpay` và
`gdt` dựng thêm ngoài phạm vi gốc). Nhóm `transfer` chưa có dòng mã nào gọi tới,
và sau khi sản phẩm bỏ hướng cho vay thì cũng sẽ không có. Đây là việc phải quyết
với Casso, không phải lỗi để sửa.
## Kế hoạch hoàn thành nghiệm thu (lập 17/08/2026)

### Việc đầu tiên là một quyết định, không phải một dòng mã

Ngày 17/08 sản phẩm bỏ toàn bộ định vị cho vay: không cấp vốn, không ứng hoá đơn,
không chuyển tiền hộ. Trọng tâm chuyển sang dựng sổ chi phí và số liệu thuế
(xem `TINH_NANG_LOI_CHI_PHI.md`).

Điều đó biến khuyến nghị số 1 ở mục dưới từ *đề xuất* thành *hệ quả hiển nhiên*:

> **10 case nhóm `transfer` đang chặn vì `IP_NOT_ALLOWED` phục vụ một tính năng
> MIMI vừa quyết định không làm.**

Giữ chúng trong phạm vi nghiệm thu nghĩa là phải dựng một VM có IP tĩnh làm proxy,
vận hành và giám sát nó, chỉ để chứng minh một API sẽ không ai gọi. Bỏ ra thì mẫu
số còn **20 case**, và tỷ lệ hiện tại đọc đúng thực chất hơn hẳn:

| | Trên 30 case | Trên 20 case (bỏ `transfer`) |
|---|---|---|
| Passed | 8 (27%) | 8 (40%) |
| Còn phải đóng | 22 | 12 |

Đây là việc cần bạn xác nhận với Casso, không phải việc sửa mã.

### Bốn đợt, theo ai gỡ được nút thắt

#### Đợt 1 — tôi làm, không phụ thuộc ai

| Việc | Đóng case | Trạng thái 18/08 |
|---|---|---|
| Ghi lại case 18 cho đúng | 18 | ✅ **Xong.** Chuyển từ "chưa hiện thực" sang "ngoài phạm vi theo thiết kế" |
| Hiện thực nhánh xoá liên kết cần OTP | 4 | ✅ Đã viết và kiểm kiểu sạch — `tsc` (app + node) và `deno check` (`bank-link`, `cas-webhook`) đều exit 0. Vẫn cần **chạy thật** mới đóng được case: kiểm kiểu chứng minh mã hợp lệ, không chứng minh Cas hành xử đúng như giả định |
| Đẩy migration `20260817140000` lên Supabase | — | ✅ **Xong 18/08.** Đã xác minh bằng truy vấn DB thật: hai dòng đúng ngày `2026-07-01`, `con_so_moc` 3 tỷ ghi được. Lần chạy đầu hỏng vì `integer out of range` — đã thêm `ALTER COLUMN con_so_moc TYPE bigint` |

> **Bài học về môi trường, đáng ghi vì đã mắc hai lần.**
>
> Trong lúc làm phần này máy chậm bất thường: lệnh typecheck vốn chạy 10 giây mất
> hơn 5 phút, kể cả sau khi dọn tiến trình node và xoá `.tsbuildinfo`. Tôi kết
> luận toolchain hỏng và ghi vào tài liệu rằng mã "chưa kiểm chứng dòng nào".
>
> **Sai.** Nó chậm chứ không hỏng. Chạy nền và để yên thì xong hết, exit 0:
> `tsc` cả `tsconfig.app.json` lẫn `tsconfig.node.json`, `deno check` cả
> `bank-link` lẫn `cas-webhook`. Cái sai thật là **kill nó giữa chừng bốn lần
> rồi kết luận từ chính việc mình kill**.
>
> Lần trước cũng vậy: một bản build mất 15 phút 19 giây rồi vẫn xong. Quy tắc rút
> ra: lệnh chậm thì cho chạy nền và làm việc khác, đừng dừng nó rồi suy ra kết
> luận về công cụ.

#### Đợt 2 — cần bạn ngồi bấm, một lần ~30 phút

Làm liền mạch trong một buổi vì bước 1 huỷ grant đang có; đừng bắt đầu nếu không
bấm nối lại được ngay.

| Thứ tự | Thao tác | Đóng case |
|---|---|---|
| 1 | Mở **Cas ID** → thu hồi quyền đã cấp cho MIMI | **10** — và lần đầu thấy envelope webhook thật |
| 2 | Xem MIMI tự chuyển liên kết sang `disconnected` | **11**, một phần **4** |
| 3 | Liên kết lại từ đầu trong Fintech Hub | **1** lần nữa, và **2** (trùng thông tin) |
| 4 | Bấm **Ngắt kết nối** trong MIMI | **3** |
| 5 | Giả lập `GRANT_LOGIN_REQUIRED` → bấm **Cập nhật** | **5** — kiểm bản vá publicToken rỗng |
| 6 | Giả lập `OTP_REQUIRED` → bấm **Cập nhật** → **nhập OTP `123456`** | **6** — xem có `onSuccess` không |
| 7 | Giả lập `PREVENTED` → xem ghi chú hổ phách còn lại sau khi toast tan | **7** |

Bước 6 từng là bước duy nhất tôi không tự kết luận được. **18/08 đã có mảnh còn
thiếu: OTP sandbox là `123456`.** Nếu nhập vào rồi `onSuccess` bắn ra thì case 6
chưa bao giờ là lỗi — nó là một ô nhập tôi không biết cách điền, và cái tôi ghi
là "treo vô hạn" thực ra là màn hình đang chờ đúng như thiết kế.

#### Đợt 3 — phải hỏi Casso

| Hỏi gì | Mở khoá case |
|---|---|
| Một cặp **số tài khoản + tên chủ tài khoản BIDV hợp lệ trong sandbox** | **12**, rồi **13**, rồi **15** |
| **App Cas ID không quét được mã QR sandbox** — cần bản app trỏ vào sandbox, hoặc cách khác để khách tự thu hồi quyền | **10**, **11** — hiện không có đường nào khác để Casso phát sinh webhook thật |
| Form tạo webhook **không có ô secret để ký payload** — có cách xác thực nguồn gửi không | Củng cố 10, 11 |
| Có bỏ `transfer` khỏi phạm vi hợp đồng được không | Kết luận 10 case |
| Invoice Hub có hỗ trợ **hoá đơn từ máy tính tiền** theo NĐ 70/2025 không | Ngoài nghiệm thu — cho lộ trình sản phẩm |

Case 12 là nút thắt lớn nhất còn lại: mã đã hiện thực đầy đủ, BIDV đã nhận yêu cầu
và trả *"Thông tin nhập không chính xác"* — tức đã tới khâu kiểm tra của ngân hàng.
Thiếu đúng một cặp dữ liệu hợp lệ mà tài liệu không công bố.

#### Đợt 4 — sau khi đợt 2 và 3 xong

Chạy lại toàn bộ, cập nhật bảng, ghi requestId cho từng case mới đóng.

### Đích đến thực tế

| Kịch bản | Passed | Ghi chú |
|---|---|---|
| Hôm nay | 8/20 | Sau khi bỏ `transfer` |
| Xong đợt 1 + 2 | **15/20** | Chỉ cần bạn bấm và tôi viết nhánh OTP |
| Casso trả lời được QRPay | **18/20** | Còn 15 phụ thuộc 12 |
| Còn lại | 2 | Case 6 có thể đóng luôn nếu `123456` là thứ còn thiếu; case 13 phụ thuộc 12 |

**15/20 nằm hoàn toàn trong tầm hai bên**, không chờ ai. Phần còn lại phụ thuộc một
câu trả lời từ Casso.

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

**Đã quyết 18/08: bỏ `transfer` khỏi phạm vi.** Không còn là một trong ba phương án
cân nhắc nữa.

Lý do không phải vì `IP_NOT_ALLOWED` khó gỡ, mà vì **sản phẩm không đi hướng đó**:
MIMI bỏ toàn bộ định vị cho vay và chuyển tiền, chuyển sang dựng sổ chi phí và số
liệu thuế (xem `TINH_NANG_LOI_CHI_PHI.md`). Đọc sao kê để làm sổ thì không cần
quyền chuyển tiền, và không nên có.

Hai phương án còn lại đều đã loại:

- *Dựng VM có IP tĩnh làm proxy cho `/transfer`* — thêm một chặng hạ tầng phải vận
  hành và giám sát, chỉ để chứng minh một API sẽ không ai gọi.
- *Xin Casso nới whitelist cho sandbox* — kể cả được thì production vẫn vướng, và
  vẫn là chứng minh cho tính năng không tồn tại.

Kiểm lại mã ngày 18/08 để chắc: **không có dòng nào gọi `/transfer`**. Nhóm này
chưa từng được hiện thực, nên bỏ đi không để lại mã chết nào.

Điều còn cần: **Casso đồng ý rút 10 case này khỏi bộ nghiệm thu của hợp đồng.**
Đây là việc thương lượng, không phải việc MIMI tự quyết một mình — hợp đồng liệt kê
ba mã dịch vụ và đây là một trong ba. Nhưng phía MIMI thì quyết rồi.

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

### 3. Ba case xử lý mất kết nối — nay chạy được đầu cuối

*Hai lần đính chính, ghi lại cả hai vì chúng nói lên cách phần này được làm.*

**Lần một:** tôi ghi ba case là "chưa hiện thực". Sai — trạng thái `needs_relink`
và banner mời xác thực lại đã có từ trước.

**Lần hai:** tôi ghi là "không dựng được tình huống trong sandbox" và đề nghị hỏi
Casso. Cũng sai. Casso có sẵn `POST /sandbox/grant/reset-login`, và ba mã lỗi nó
nhận ánh xạ đúng vào ba case:

| `errorCode` | Case | Tình huống |
|---|---|---|
| `GRANT_LOGIN_REQUIRED` | 5 | Khách đổi mật khẩu ngân hàng |
| `OTP_REQUIRED` | 6 | Ngân hàng đòi xác thực thiết bị |
| `PREVENTED` | 7 | Khách bật chặn đăng nhập từ website |

Nó nằm trong mục **Sandbox API** của nav tài liệu, một mục đang thu gọn. Tôi đã
đọc bốn trang khác quanh đó mà không mở nó ra.

Nay có đủ cả ba mảnh để chạy thật:

1. **Dựng lỗi** — `bank-link?action=sandbox-reset-login`, có chốt chỉ chạy khi
   `cfg.baseUrl` là sandbox. Giao diện hiện ô "Giả lập lỗi…" trên mỗi liên kết,
   và ô đó chỉ xuất hiện khi backend tự khai environment là sandbox.
2. **App phản ứng** — `sync` nhận lỗi, đánh dấu `needs_relink`, giao diện hiện
   banner và nút "Cập nhật".
3. **Khôi phục** — Cas **Update Mode** (`bank-link?action=update-token`): cùng
   endpoint `/grant/token` nhưng gửi kèm `accessToken` của grant cần sửa, nên Cas
   Link mở thẳng vào tài khoản đó. Liên kết, id và con trỏ `last_reference` giữ
   nguyên — khác hẳn liên kết lại từ đầu, vốn kéo lại cả năm sao kê.

### 4. Chạy thật case 5–7 lần đầu, 17/08 — hai vấn đề tìm thấy

Cả ba đều dựng lỗi thành công qua `sandbox-reset-login` — banner "cần xác thực lại"
và toast lỗi đúng ý nghĩa từng mã. Phần đáng ghi là bước khôi phục qua Update Mode.

**Case 5 — `publicToken required` vô nghĩa trên màn hình, đã vá cùng ngày.**
Cas Link gọi `onSuccess('', state)` — chuỗi rỗng chứ không phải thiếu tham số —
khi grant đứng sau cần xác thực lại và luồng đóng mà chưa xong. App gửi thẳng
chuỗi rỗng đó lên `exchange`, bị từ chối đúng luật, nhưng người dùng chỉ thấy một
câu lỗi kỹ thuật không hành động được. Listener postMessage của MIMI vốn đã chắn
`token` rỗng trước khi gọi tiếp; `onSuccess` thì không có chắn tương tự — lỗ hổng
phòng thủ thật, không phải lỗi của Cas. Đã vá: chặn publicToken rỗng, đổi thành
thông báo có thể làm theo ("chưa hoàn tất xác thực, hãy thử lại và làm hết các
bước Cas yêu cầu").

**Case 6 — treo vô hạn ở "Đang liên kết…", nguyên nhân chưa xác định.** Không có
`onSuccess`, không có `onExit`. Có thể vì sandbox không có OTP thật để nhập ở
bước này, có thể vì SDK tự treo — không đủ bằng chứng để chọn một trong hai, nên
không đoán. Đã thêm timeout 4 phút để màn hình không còn spinner vô hạn dù chưa
biết nguyên nhân gốc; đây là chốt an toàn, không phải bản sửa lỗi.

Cả hai đều là bằng chứng cho thấy phép thử "chạy thật" đáng giá hơn đọc tài liệu —
không dò ra được nếu chỉ nhìn mã, và cũng không phải điều Casso cần sửa.

## Chi tiết từng case

### 1. Chức năng liên kết

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Liên kết tài khoản mới | **Passed** | `grant/token` 200 → Cas Link → `grant/exchange` 200 → dòng `bank_connections` `status=connected`. Grant hiện trong console Casso. |
| 2 | Trùng thông tin liên kết | **Passed** — chứng minh bằng DB 18/08 | Chạy trọn vòng ngắt rồi liên kết lại. Truy vấn `bank_connections` sau đó: **đúng một dòng**, `created_at = 2026-08-12 11:10:56` — **nguyên vẹn dòng của lần liên kết đầu tiên ngày 12/08**, `revoked_at` về `null`, `status = connected`. Upsert theo `(company_id, provider, account_number)` tái dùng đúng dòng cũ, không đẻ dòng mới, và danh tính dòng sống sót qua cả một chu kỳ ngắt–nối. Nhìn màn hình không kết luận được điều này (bộ lọc `status != disconnected` che dòng cũ đi), nên bằng chứng lấy thẳng từ database. Vẫn giữ ghi chú thiết kế: hệ thống **không** báo "Liên kết thất bại – Tài khoản đã tồn tại" mà làm mới token, vì case 5 cần đúng hành vi đó để khôi phục kết nối hỏng. Hai case mâu thuẫn nhau ở bản gốc; chọn theo case 5. |
| 3 | Xoá liên kết không cần OTP | **Passed** — chạy thật 18/08 | Bấm biểu tượng ngắt liên kết → toast "Đã ngắt liên kết", `status=disconnected`, token xoá. Ngân hàng **không** đòi OTP ở bước này nên nhánh case 4 không chạm tới. Lộ ra một lỗi giao diện, đã sửa cùng ngày: dòng bị ngắt **vẫn nằm lại trong danh sách**, màu hổ phách kèm tam giác cảnh báo và mốc đồng bộ cũ, không một chữ nào nói đã ngắt. Hổ phách nghĩa là "cần bạn để ý", nên màn hình đang cảnh báo về đúng việc người dùng vừa cố ý làm. Nay lọc `status != disconnected` khỏi danh sách; dòng trong DB giữ nguyên vì nó mang dấu vết kiểm toán và `revoked_at`. |
| 4 | Xoá liên kết cần OTP | *Đã hiện thực, logic đã kiểm bằng test — chưa gặp điều kiện phát sinh* | Hiện thực 18/08: `removeGrant` trả `RemoveGrantResult` với cờ `otpRequired`, đặt khi Cas đáp bằng `grantToken` thay vì kết quả hoàn tất. Backend **không** đánh dấu `disconnected` trên nhánh đó; frontend mở Cas Link rồi gọi lại `disconnect` sau khi khách xác thực xong. Bỏ dở giữa chừng thì hàng vẫn `connected`, đúng sự thật. **Bổ sung 18/08:** ba unit test trong `remove-grant.test.ts` giả lập đúng hai hình dạng response của Cas — cả hai đều HTTP 200, nên bên gọi buộc phải phân biệt bằng trường trong body chứ không bằng mã trạng thái. Test khoá lại: có `grantToken` ⇒ `otpRequired=true`; không có ⇒ `false`; `grantToken` rỗng **không** bị hiểu nhầm thành "cần OTP" (hình dạng này đã gây lỗi thật ở luồng liên kết). Vẫn cần một ngân hàng thật sự đòi OTP lúc ngắt mới đóng được case theo đúng kịch bản gốc — ngân hàng thử nghiệm cho xoá thẳng. |
| 5 | Thông tin đăng nhập thay đổi | **Passed** — chạy thật 18/08 | Chạy 17/08 lộ lỗi: Cas Link gọi `onSuccess('', state)` — chuỗi rỗng, không phải publicToken — và app gửi thẳng lên, bị server từ chối đúng luật (`"publicToken required"`), nhưng câu đó vô nghĩa với người đang nhìn màn hình. Vá cùng ngày: chặn publicToken rỗng, đổi thành thông báo hành động được. **18/08 chạy lại và khôi phục trọn vẹn**: dòng chuyển từ hổ phách "Ngân hàng yêu cầu đăng nhập lại" sang xanh, và — bằng chứng quan trọng hơn cái tick — bấm **Đồng bộ** chạy được, mốc nhảy sang **20:32 18-08**. Grant thật sự dùng được, không chỉ là cờ `connected` trong DB. |
| 6 | Xác thực OTP/thiết bị định kỳ | **Passed** — chạy thật 18/08 | 17/08 ghi là "treo vô hạn ở Đang liên kết…, chưa rõ nguyên nhân". **Sai, và sai vì thiếu một mẩu thông tin chứ không phải vì mã hỏng: OTP trên sandbox Cas là `123456`.** Cas Link không treo — nó đang chờ nhập OTP, và spinner "Đang liên kết…" của MIMI hiển thị đúng như thiết kế, vì `onSuccess` chỉ bắn sau khi khách làm xong. 18/08 nhập `123456` thì Cas hiện hộp thoại **"Thành công — Tài khoản của bạn đã cập nhật thành công"**, `onSuccess` bắn, liên kết khôi phục. Một lần chạy trung gian còn cho thấy nhánh còn lại cũng đúng: khi Cas trả `FI_SERVICE_ACCOUNT_CONNECTING`, MIMI khôi phục `connected` và báo "Liên kết vẫn hoạt động, không cần cập nhật" thay vì bắt liên kết lại. **Bài học:** tôi đọc mã, đọc tài liệu, rồi kết luận "không đủ bằng chứng" — trong khi thứ thiếu không nằm trong mã, nó là một giá trị test. Timeout 4 phút giữ nguyên, vẫn đúng cho trường hợp khách bỏ dở thật. |
| 7 | Chặn đăng nhập từ website | **Passed** — chạy thật 18/08 | Case này đóng sau **hai** vòng sửa. 17/08: toast đúng nghĩa `PREVENTED`, nhưng hàng vẫn tick xanh — người dùng phản ứng bằng "dm =))". Bản chất đúng: `action` là `reauth_in_bank_app` chứ không phải `relink`, grant MIMI còn nguyên, ngân hàng tự chặn, "Cập nhật" không sửa được. Cái thiếu là toast tan thì hàng không còn dấu hiệu gì. Vá lần một: `ingest.ts` trả thêm `action`/`remedy`, `CasLink.tsx` giữ ghi chú hổ phách theo từng connection. **18/08 chạy lại thì ghi chú vẫn không hiện** — vá lần một có lỗ hổng hình dạng đúng bằng chính case này: điều kiện ghi chú là `action === 'reauth_in_bank_app'`, tức phụ thuộc `errors.ts` đã biết mã, mà `PREVENTED` không có trong bảng nên rơi vào `unknown`. Vá lần hai đổi quy tắc: **sync lỗi mà chưa gắn cờ relink thì luôn để lại ghi chú** — mã đã biết hiện câu tiếng Việt, mã lạ hiện nguyên văn Cas. Chạy lại: hàng hiện đúng *"Tài khoản đang bật chặn đăng nhập từ website. Hãy mở ứng dụng ngân hàng trên điện thoại, tắt tuỳ chọn đó, rồi bấm Đồng bộ lại."* và **ở lại sau khi toast tan**. |
| 8 | Liên kết thành công tại đối tác | **Passed** | Dòng `bank_connections` có `grant_id`, `access_token_enc` (ML-KEM-768 + AES-256-GCM), `status=connected`. |
| 9 | Liên kết thành công tại Casso | **Passed** | Grant hiện trong `console.bankhub.dev → Developer → Logs` kèm `grant/exchange`. |

### 2. Webhook Cas ID

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 10 | `USER_PERMISSION_REVOKED` | *Một nửa — đường ống đã chứng minh, thiếu đúng cái kích hoạt* | **Phía nhận: ĐÃ CHỨNG MINH** (xem case 11) — Casso gửi thật, endpoint nhận và xử lý đúng. **Phía xử lý riêng cho mã này: đạt.** Bắn một `USER_PERMISSION_REVOKED` giả mạo cho grant thật `5455fe9b-9640-11f1-b705-fa163e5398eb` (13/08). Endpoint **không** thu hồi theo payload: nó hỏi Cas, Cas nói grant còn sống, trả `verified/alive`. **Còn thiếu:** chưa lần nào Casso gửi mã này thật — đếm trên `webhook_events` tới 18/08: `DEFAULT_UPDATE` 25 lần, `ERROR` 10 lần, `USER_PERMISSION_REVOKED` **0 lần**. Mã này chỉ phát sinh khi khách thu hồi quyền từ app Cas ID, mà app không quét được mã QR sandbox. Đây là thứ duy nhất còn thiếu, không phải cả đường ống. |
| 11 | `DEFAULT_UPDATE` | **Passed** — Casso gửi thật, xác minh 18/08 | Casso đã gửi **25 lần** mã `DEFAULT_UPDATE` (loại `GRANT`), lần đầu 17/08 13:30:35, lần cuối 18/08 13:47:16. Envelope thật: `{webhookCode, webhookType, grantId, environment:"dev", error}` — khác hẳn hình dạng ta tự bịa khi thử ngày 13/08, nên không thể nhầm là của mình. Kết quả xử lý: **6 lần `verified`**, trong đó có `1fdc82dd-…:alive+2` — endpoint hỏi ngược lại Cas, Cas xác nhận grant còn sống, hệ thống đồng bộ lại và **nạp về 2 giao dịch**. Đúng kết quả dự kiến của case: "hệ thống đối tác có thể tiếp tục gọi API lấy giao dịch bình thường". 19 lần còn lại `ignored` kèm "no connection for grant …" — đó là các grant cũ đã ngắt, bỏ qua là đúng. Mã `ERROR` cũng chạy đúng: 9 lần `verified` với các nhánh `needs-relink`, `PREVENTED`, `rate-limited`. |

### 3. QRPay

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 12 | Tạo mã QR Pay hợp lệ | **Passed** — chạy thật 04/09 | Luồng hiện thực đầy đủ 13/08: grant riêng `scopes: "qrpay"`, Cas Link mở với `feature: "qrpay"`, dò tài khoản bằng `GET /qr-pay/identity`, tạo QR bằng `POST /qr-pay`, đối soát qua webhook `TRANSACTIONS`. **Đã thử BIDV** — nhận yêu cầu và trả *"Thông tin nhập không chính xác"*, tức đã tới khâu kiểm tra của ngân hàng; màn hình hỏi **số tài khoản + tên chủ tài khoản**. **Đã thử Vietcombank 18/08** — màn hình hỏi bộ trường **khác hẳn**: `Mã định danh doanh nghiệp (Business ID)`, `Mã điểm thu (TID)`, `Số tài khoản`. Đây là luồng **VietQRPay** của Vietcombank hợp tác Napas; Business ID và TID là credential **ngân hàng cấp khi doanh nghiệp đăng ký làm merchant**, không phải giá trị Cas sinh ra. **Tra tài liệu Cas 18/08: không trang nào mô tả ba trường này** — trang QR Pay chỉ nói tầng API (`amount`, `description`, `referenceNumber`), phần Cas Link hỏi merchant hoàn toàn không có tài liệu. Kết luận: mỗi ngân hàng đòi một bộ credential merchant khác nhau và **không bộ nào công bố**. Đây là thứ chỉ Casso hoặc ngân hàng cấp được cho môi trường thử. **Cập nhật 04/09:** Casso xác nhận sandbox chỉ hỗ trợ **MB Bank**, và liên kết MB với `feature: "qrpay"` đã dựng được — lần đầu có một dòng `scopes = 'qrpay'` trong `bank_connections`. Nhưng dòng đó rơi vào `needs_relink`, và giao diện mời bấm **"Cập nhật"**, vốn trả về *"Dịch vụ tài chính này không hỗ trợ Update Mode"* — ngõ cụt kín. Đã gỡ (commit `5110667`, 16 test): dòng `qrpay` nay mời **"Liên kết lại"**. **Vẫn chưa Passed, và cũng chưa nên ghi là sắp xong:** chưa rõ vì sao dòng MB rơi vào `needs_relink` — có thể grant hết hạn, cũng có thể MB đòi credential merchant như Vietcombank. Xem mục 04/09 ở đầu tài liệu. **Cập nhật lần hai, 04/09 tối:** dòng MB đã ở `connected` và ổn định (nguyên nhân trước đó: chính vòng đồng bộ của MIMI gọi `/transactions` lên grant `qrpay` rồi đánh dấu hỏng — đã sửa). Lần tạo mã đầu tiên đi tới **khâu kiểm tham số** của Cas, tức **MB KHÔNG đòi Business ID/TID** như Vietcombank từng đòi. Giả thuyết "MB cũng cần credential merchant" **đã bị loại**. **ĐÓNG 04/09 tối:** gửi lại với nội dung `HD 0042` (7 ký tự) — **mã QR hiện ra**, số tiền ₫500.000, trạng thái *"Đang chờ thanh toán"*. Bản ghi nằm ở `qr_payments` kèm `reference_number` do máy chủ sinh, `virtual_account_number` và `bin` do Cas trả về. Đây là case bế tắc lâu nhất của cả đợt nghiệm thu — mở được nhờ ba việc nối tiếp trong cùng một ngày: (1) Casso xác nhận sandbox chỉ hỗ trợ MB, (2) sửa vòng đồng bộ vốn tự đập hỏng grant `qrpay` của chính mình, (3) phát hiện giới hạn 9 ký tự không có trong tài liệu. Không việc nào trong ba tìm ra được bằng đọc mã. |
| 13 | Thiếu/sai trường bắt buộc | **Passed** — chạy thật 04/09 | Probe trả `GRANT_NOT_FOUND` (`rLDsrCRHsC8cqHcp`) chứ không phải `INVALID_PARAM`: Cas kiểm token **trước** tham số. Muốn chứng minh `INVALID_PARAM` phải có grant kèm scope `qrpay`. **ĐÓNG 04/09:** với grant MB `qrpay` sống, lần tạo mã đầu tiên trả về **`INVALID_PARAM`**, requestId **`Bgv44JpvIbxfvfmr`**, nguyên văn *"description must has maximum 9 characters"*. Đúng mã lỗi case này đòi, và đúng điều kiện tài liệu đã dự đoán: phải có grant kèm scope `qrpay` thì Cas mới đi qua khâu kiểm token để tới khâu kiểm tham số. Ràng buộc 9 ký tự **không có trong tài liệu Cas** — trang QR Pay liệt kê `amount`, `description`, `referenceNumber` mà không nêu giới hạn nào. Kiến nghị Casso bổ sung. Đã chặn ở cả giao diện và máy chủ (`src/lib/moTaQr.ts`, 9 test). |
| 14 | Token không hợp lệ | **Passed** | `POST /qr-pay` → 400 `GRANT_NOT_FOUND`, requestId `4B0BqYAD5UCMwobq`, 196ms. |
| 15 | Webhook xác nhận thanh toán | *Đã hiện thực — chặn bởi case 12* | **Đính chính 19/08:** bản trước ghi "không có endpoint nhận webhook Cas". Sai. `cas-webhook/index.ts` phân nhánh riêng cho `type === "TRANSACTIONS"` (dòng 223, cửa sổ truy hồi 7 ngày phòng khi lỡ một lần gửi) và gọi `reconcileCompanyQr` sau khi lưu xong. Truy vấn `webhook_events` ngày 19/08: **5 envelope loại `TRANSACTIONS`**, trong đó **4 lần `verified`** với ghi chú `1fdc82dd-…:alive+8` — endpoint không tin payload mà hỏi ngược lại Cas, Cas xác nhận grant còn sống, hệ thống **nạp về 8 giao dịch**. Lần thứ 5 `ignored` kèm "no grant id in payload", đúng. **Vẫn không tính Passed**, vì 5 lần đó do ta tự bắn ngày 12–13/08 chứ không phải Casso gửi. **Cập nhật 04/09 tối — nguyên nhân đã xác định, và nó KHÔNG nằm ở mã MIMI:** mã QR đã phát (case 12 Passed), đã trả **₫5.000 thật** vào tài khoản MB, đã liên kết thêm một grant `transaction` trên **cùng** tài khoản để đọc sao kê. Bấm đồng bộ, Cas trả về:

```
requestId, accounts[1], transactions[0]
Tài khoản Cas thấy: 2002✓
```

Tức Cas **biết đúng tài khoản** (`2002`, khớp liên kết) và trả về **không giao dịch nào** trên cửa sổ **12 tháng**. Một tài khoản đang dùng thật không thể trống suốt một năm. `reconcileCompanyQr` khớp `qr_payments` với bảng `transactions`, nên không có dòng nào vào sổ thì không có gì để khớp — QR đứng ở `pending` là hệ quả, không phải lỗi.

**Bốn giả thuyết đã bị loại bằng đo đạc, không giả thuyết nào bị loại bằng lập luận:** (1) sandbox không nhận tài khoản thật — sai, liên kết `transaction` thành công và có mốc đồng bộ; (2) lệch định dạng số tài khoản làm bộ lọc loại sạch — sai, `khacTaiKhoan = 0`; (3) trùng dữ liệu đã có — sai, `fetched = 0`; (4) đọc sai tầng phản hồi — sai, `transactions` đúng ở tầng ngoài cùng. Kết luận còn lại: **sandbox không phục vụ sao kê thật cho tài khoản này.** Cần Casso xác nhận và cho biết phải làm gì để đóng case — dữ liệu mẫu có giao dịch, hay credential production. |

### 4. Truy vấn giao dịch

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 16 | Lấy toàn bộ danh sách giao dịch | **Passed** | `GET /transactions` → 200, requestId `krMYZheiLZxiHc2R`, 12/08/2026 18:28:14. Giao dịch thật đã vào DB. |
| 17 | Hiệu năng phản hồi API | **Passed** | 5 lần gọi `GET /transactions` liên tiếp (14/08): 182, 38, 13, 15, 16ms — min 13, max 182, trung bình 53ms, cả 5 dưới mốc 1000ms, cùng `errorCode` (ổn định). requestId `VZhmOSXWYXgdmoJ-`, `a_nw6i8r2KuLyiCf`, `PzYHBhyEx8n-0p8N`, `IP08YruX1GD_0Xju`, `iUwxE3Ot_T0ZtlSM`. Đo bằng token không hợp lệ nên không bị giới hạn ~1 lần/phút của Cas — giới hạn đó gắn với một grant thật, không áp cho lời gọi bị chặn từ bước xác thực. |

### 5. Chuyển tiền

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 18 | Thông tin tài khoản (KYC) | **Ngoài phạm vi — theo thiết kế** | Không phải thiếu sót nên không tính vào nhóm "chưa hiện thực". Đã **chủ động bỏ** scope `identity` để Cas không gửi CCCD, ngày sinh, địa chỉ, số điện thoại. Không nhận dữ liệu thì mạnh hơn nhận rồi hứa không lưu — thứ không tồn tại trong hệ thống thì không rò rỉ được. Ghi trong `bank-link/index.ts`. Muốn đóng case này theo đúng chữ trong hợp đồng thì phải bật lại scope `identity`, tức đi ngược quyết định trên; cần Casso và bạn thống nhất là **bỏ khỏi phạm vi**, không phải làm cho có. |
| 19 | Recall API <1 phút | **Passed** | `RATE_LIMIT`, requestId `p3xWQO8zGpdyMh5T` (quan sát trên `/transactions`). |
| 20 | Token không hợp lệ (identity) | **Passed** | `GET /identity` → 400 `GRANT_NOT_FOUND`, requestId `ex7NzqLUT2jM9UVv`, 15ms. |
| 21 | Chuyển tiền thành công | Bị chặn | 403 `IP_NOT_ALLOWED`. |
| 22–29 | TC01–TC08 (8 mã lỗi) | Bị chặn | Mọi lời gọi `/transfer` bị chặn ở tầng IP trước khi tới bước kiểm tham số, nên không mã lỗi nào trong TC01–TC08 quan sát được. |
| 30 | Token không hợp lệ (transfer) | Bị chặn | 403 `IP_NOT_ALLOWED` (`Nt4JTuBQ0-J9PWVb`) thay vì `GRANT_NOT_FOUND`. |

## Một chuỗi thao tác đóng được bốn case cùng lúc

> **Kết quả, ghi 04/09:** chuỗi này đã chạy một phần. Case **2, 3, 4, 11**
> đóng trong buổi 18/08 theo đường khác — không cần tới app Cas ID. Riêng
> **case 10 vẫn mở**, vì nó là case duy nhất bắt buộc phải có một envelope
> `USER_PERMISSION_REVOKED` do chính Casso gửi. Giữ mục này làm nhật ký;
> đừng đọc nó như một kế hoạch đang chờ.

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

**Sandbox sinh dữ liệu mới ở mỗi lời gọi — không phát lại một sao kê cố định.**

Ba request 7 ngày giống hệt nhau, mỗi lần ghi thêm đúng 8 dòng; bảng `bankhub:`
tăng 375 → 383 → 391. Mọi `reference` đều khác nhau, và không hai dòng nào trùng
bộ (ngày, số tiền, mô tả). Kho mô tả thì cố định: chuỗi
`TIKI PAYMENT FOR SELLER S00xxx PERIOD 22.9 30.9 CODE 1468xx` xuất hiện **15 lần**
trải từ 08/2025 tới 08/2026, mỗi lần một số tiền khác.

Hai hệ quả cho biên bản:

1. **Không nghiệm thu được tính bất biến của khử trùng trên sandbox này.** Cơ chế
   có và đúng — chỉ mục UNIQUE `(company_id, reference_id)` — nhưng nó không bao
   giờ kích hoạt vì sandbox không trả lại cùng một giao dịch lần thứ hai. Cần hỏi
   Casso sandbox có chế độ dữ liệu tĩnh để lặp lại một sao kê không.
2. **391 giao dịch bịa từng được cộng thành doanh thu của công ty.** Đã sửa: cờ
   `is_synthetic` nay đặt lúc ghi, suy từ `baseUrl`, nên mọi dòng sandbox bị loại
   khỏi mọi con số tự nhận là mô tả doanh nghiệp. Khi có khoá production thì tự
   tắt. Đây là con số quyết định ngưỡng miễn thuế 1 tỷ nên không thể để lẫn.

*Ghi lại một sai lầm trong quá trình, vì nó thuộc về hồ sơ:* tôi đã ba lần kết
luận con số "8 dòng mới" là lỗi đếm và ba lần sửa mã theo suy luận đó. Cả ba đều
sai — 8 dòng thật sự được ghi. Chỉ có bốn truy vấn thẳng vào database mới phân
định được, và truy vấn quyết định (`merchant_name, count(*)`) lẽ ra phải là truy
vấn đầu tiên. Không dữ liệu nào hỏng vì việc này, nhưng nó tốn ba vòng.

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
4. Sandbox có chế độ trả **dữ liệu tĩnh** không? Hiện mỗi lời gọi sinh một lô giao
   dịch mới, nên không có cách nào chứng minh khử trùng và đồng bộ tăng dần hoạt
   động đúng — hai thứ quan trọng nhất khi dựng sổ sách từ sao kê.
5. Webhook không có secret để ký. Casso có kế hoạch cấp chữ ký không, hay khuyến
   nghị bên tích hợp tự xác minh ngược qua API như MIMI đang làm?
6. **Cho xin tài khoản thử của `bidv_qrpay` trên sandbox.** Luồng QR Pay đã chạy
   tới khâu xác thực tài khoản: Cas Link mở đúng chế độ `qrpay`, BIDV VietQR
   Official nhận yêu cầu, và trả "Thông tin nhập không chính xác". Cặp
   `123456789` / `NGUYEN VAN A` lấy từ ví dụ response trong tài liệu — đó là dữ
   liệu mẫu sinh tự động, không phải tài khoản sandbox. Quickstart có tài khoản
   thử cho luồng đăng nhập (`bankusrdemo1`/`soproudo`/`123456`) nhưng không có
   cặp tương ứng cho luồng QR Pay, vốn xác thực bằng số tài khoản và tên chủ
   tài khoản chứ không bằng đăng nhập.

## Việc của MIMI — đã xong từ bản trước

1. ~~Endpoint nhận webhook Cas~~ — `cas-webhook`, xử lý được cả `GRANT` và
   `TRANSACTIONS`, đã đăng ký ở console Casso.
2. ~~Trạng thái `needs_relink` + lối mở lại Cas Link~~ — `sandbox-reset-login`
   dựng lỗi, `update-token` (Update Mode) khôi phục. Case 5–7 chuyển từ "chưa
   hiện thực" sang "sẵn sàng chạy".
3. ~~Đo lại hiệu năng~~ — case 17, xem bảng ở trên. **Passed.**
4. ~~`state` chống CSRF trên luồng liên kết~~ — ngoài phạm vi 30 case gốc, nhưng
   là lỗ hổng thật trên `BankCallback.tsx` (tấn công qua URL, không cần popup).
   Đã vá 14/08, fail-closed. Xem `CasLink.tsx` và `BankCallback.tsx` để biết chi
   tiết; chưa tự kiểm chứng bằng một lần liên kết thật ở chế độ redirect.

## Cần bạn — một việc, và nó là việc duy nhất còn chặn tiến độ

> **Mục này đã được viết lại 04/09.** Bản trước xin case 3, 5, 6, 7, 10 và 11 —
> cả sáu đã đóng trong buổi 18/08 và bảng kết quả ở trên đã ghi **Passed**. Để
> nguyên thì tài liệu tự mâu thuẫn với chính nó, và người đọc không biết tin bảng
> hay tin mục này.

Tài khoản demo bị chặn liên kết ngân hàng thật theo thiết kế, và tôi không giữ
mật khẩu tài khoản `hoc.qk2@gmail.com`. Việc dưới đây cần bạn đăng nhập và bấm.

### Case 12 → 13 → 15 (khoảng 10 phút, làm đúng thứ tự)

Ba case này xếp chồng: 13 và 15 đều bị 12 chặn, nên hỏng ở bước 1 thì hai bước
sau không chạy được.

1. Đăng nhập → **Fintech Hub**.
2. Dòng `DINH VAN NAM · 2002` giờ hiện nút **"Liên kết lại"**, không còn
   **"Cập nhật"**. Dải cảnh báo cũng đã đổi câu. Nếu vẫn thấy "Cập nhật" thì tải
   lại trang — bản vá `5110667` đã lên.
3. Bấm **"Liên kết để nhận tiền QR"** → chọn **MB Bank** → OTP sandbox `123456`.
   Dòng `needs_relink` cũ sẽ tự chuyển `disconnected` và biến khỏi danh sách;
   không phải ngắt tay.
4. Sang tab **Thanh toán**, thử tạo một mã QR.

**Ba kết cục, và mỗi kết cục nói một điều khác nhau:**

| Thấy gì | Nghĩa là | Việc tiếp theo |
|---|---|---|
| Mã QR hiện ra | **Case 12 Passed.** Chạy tiếp 13 rồi 15. | Tôi lấy requestId thật ghi vào bảng |
| MB hỏi **Business ID / TID** | Giống hệt Vietcombank — credential merchant do ngân hàng cấp | **Dừng lại**, quay lại hỏi Casso. Không phải lỗi thao tác |
| Liên kết lại rồi vẫn `needs_relink` | Grant dựng được nhưng không sống nổi | Gửi tôi requestId, tôi dò tiếp |

Ghi lại **requestId** ở mỗi bước nếu có — bảng nghiệm thu ghi bằng requestId thật
chứ không bằng suy đoán, và đó là lý do các case đã đóng đều có mã đi kèm.

### Case 10 — vẫn chưa có đường

Cần thu hồi quyền từ app **Cas ID** để Casso gửi `USER_PERMISSION_REVOKED` thật.
App không quét được mã QR sandbox, nên chưa có cách. Phía nhận đã chứng minh xong
qua case 11 (25 envelope thật); thiếu đúng cái kích hoạt. Nếu Casso bắn hộ một
envelope thật từ hệ thống của họ thì case đóng ngay.

### Case 4 — không ép được

Cần một ngân hàng thật sự đòi OTP lúc ngắt liên kết. Ngân hàng sandbox cho xoá
thẳng. Logic đã có ba unit test trong `remove-grant.test.ts` khoá cả hai hình
dạng response; chỉ thiếu điều kiện phát sinh, và điều kiện đó không nằm trong tay
mình.

## Cần Casso — ba việc

1. **Tài khoản thử QR Pay cho MB Bank**, nếu MB cũng đòi credential merchant như
   Vietcombank đã đòi. Chưa biết có cần hay không — kết quả bước 4 ở trên sẽ trả
   lời. Hỏi trước để khỏi mất thêm một vòng.
2. **Mở IP cho nhóm `transfer`.** Mười case (21, 22–29, 30) đang chặn ở
   `IP_NOT_ALLOWED` — 403 ngay tầng mạng, trước cả bước kiểm tham số, nên không
   một mã lỗi nào trong TC01–TC08 quan sát được. Đây là cấu hình phía Casso, không
   phải mã phía MIMI.
3. **Một dòng trong tài liệu QR Pay** ghi rõ sandbox chỉ hỗ trợ MB. Chi tiết đó
   tốn của chúng tôi một tuần và hai ngân hàng; nó tiết kiệm cho khách tích hợp
   tiếp theo đúng chừng đó.

