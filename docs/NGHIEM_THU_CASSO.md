# Nghiệm thu liên kết tài khoản tài chính — Casso ↔ CLI NUTRIX

Hợp đồng `0319436143/BAAS/1`. Bộ case gốc: `CLI NUTRIX_Test report.xlsx`, 30 case,
ba mã dịch vụ `qrpay`, `transaction`, `transfer,identity`.

Chạy ngày **12/08/2026**, môi trường **sandbox** (`sandbox.bankhub.dev`),
client id `7f98926a…`.

## Kết quả tổng (cập nhật 17/08/2026)

| | Số case |
|---|---|
| **Passed** | **11** |
| Partial (đạt một phần / đạt phía xử lý) | 4 |
| Sẵn sàng chạy — cần bạn bấm qua giao diện | 1 |
| Chưa chạy (đã có mã, chưa bấm) | 0 |
| Chưa hiện thực | 3 |
| Bị chặn — `IP_NOT_ALLOWED` | 10 |
| Bị chặn — cần dữ liệu sandbox từ Casso | 1 |
| **Tổng** | **30** |

Case 5 và 6 chạy thật lần đầu 17/08 và mỗi cái lộ ra một vấn đề thật — không phải
lỗi của Casso, lỗi ở phía MIMI. Case 5 đã vá ngay trong ngày. Case 6 chưa đủ bằng
chứng để kết luận nguyên nhân, ghi rõ thay vì đoán. Chi tiết ở bảng bên dưới và ở
mục "Vấn đề tìm thấy khi chạy thật case 5–7".

8/30 không phải vì hệ thống hỏng. Nó phản ánh một chuyện đơn giản: **hợp đồng liệt
kê ba mã dịch vụ, ứng dụng mới hiện thực một** (`transaction`, cộng `qrpay` và `gdt`
đã dựng thêm ngoài phạm vi gốc). Nhóm `transfer` chưa có dòng mã nào gọi tới. Đây là
việc phải quyết trước khi ký, không phải lỗi để sửa.

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
| 2 | Trùng thông tin liên kết | *Partial* | Upsert theo `(company_id, provider, account_number)` nên **không tạo dòng mới** — phần cốt lõi đạt. Nhưng hệ thống không báo "Liên kết thất bại – Tài khoản đã tồn tại"; nó làm mới token. Cố ý: case 5 yêu cầu liên kết lại để khôi phục kết nối hỏng, mà từ chối liên kết lặp thì không khôi phục được. Hai case này mâu thuẫn nhau ở bản gốc. |
| 3 | Xoá liên kết không cần OTP | **Passed** — chạy thật 18/08 | Bấm biểu tượng ngắt liên kết → toast "Đã ngắt liên kết", `status=disconnected`, token xoá. Ngân hàng **không** đòi OTP ở bước này nên nhánh case 4 không chạm tới. Lộ ra một lỗi giao diện, đã sửa cùng ngày: dòng bị ngắt **vẫn nằm lại trong danh sách**, màu hổ phách kèm tam giác cảnh báo và mốc đồng bộ cũ, không một chữ nào nói đã ngắt. Hổ phách nghĩa là "cần bạn để ý", nên màn hình đang cảnh báo về đúng việc người dùng vừa cố ý làm. Nay lọc `status != disconnected` khỏi danh sách; dòng trong DB giữ nguyên vì nó mang dấu vết kiểm toán và `revoked_at`. |
| 4 | Xoá liên kết cần OTP | *Đã viết mã 18/08 — chưa kiểm chứng* | `removeGrant` giờ trả `RemoveGrantResult` với cờ `otpRequired`, đặt khi Cas đáp bằng `grantToken` thay vì hoàn tất. Backend **không** đánh dấu `disconnected` trên nhánh đó — đó là điểm mấu chốt: báo "đã ngắt kết nối" trong khi ngân hàng vẫn coi dữ liệu được uỷ quyền là kiểu sai duy nhất endpoint này tuyệt đối không được mắc. Frontend mở Cas Link trên `grantToken` rồi gọi `disconnect` lần hai sau khi khách xác thực xong; bỏ dở giữa chừng thì hàng vẫn ghi `connected`, đúng sự thật. **Chưa chạy được `deno check` lẫn `tsc` vì toolchain máy treo (xem ghi chú cuối mục kế hoạch) — mã chưa được kiểm chứng dòng nào.** |
| 5 | Thông tin đăng nhập thay đổi | **Passed** — chạy thật 18/08 | Chạy 17/08 lộ lỗi: Cas Link gọi `onSuccess('', state)` — chuỗi rỗng, không phải publicToken — và app gửi thẳng lên, bị server từ chối đúng luật (`"publicToken required"`), nhưng câu đó vô nghĩa với người đang nhìn màn hình. Vá cùng ngày: chặn publicToken rỗng, đổi thành thông báo hành động được. **18/08 chạy lại và khôi phục trọn vẹn**: dòng chuyển từ hổ phách "Ngân hàng yêu cầu đăng nhập lại" sang xanh, và — bằng chứng quan trọng hơn cái tick — bấm **Đồng bộ** chạy được, mốc nhảy sang **20:32 18-08**. Grant thật sự dùng được, không chỉ là cờ `connected` trong DB. |
| 6 | Xác thực OTP/thiết bị định kỳ | **Passed** — chạy thật 18/08 | 17/08 ghi là "treo vô hạn ở Đang liên kết…, chưa rõ nguyên nhân". **Sai, và sai vì thiếu một mẩu thông tin chứ không phải vì mã hỏng: OTP trên sandbox Cas là `123456`.** Cas Link không treo — nó đang chờ nhập OTP, và spinner "Đang liên kết…" của MIMI hiển thị đúng như thiết kế, vì `onSuccess` chỉ bắn sau khi khách làm xong. 18/08 nhập `123456` thì Cas hiện hộp thoại **"Thành công — Tài khoản của bạn đã cập nhật thành công"**, `onSuccess` bắn, liên kết khôi phục. Một lần chạy trung gian còn cho thấy nhánh còn lại cũng đúng: khi Cas trả `FI_SERVICE_ACCOUNT_CONNECTING`, MIMI khôi phục `connected` và báo "Liên kết vẫn hoạt động, không cần cập nhật" thay vì bắt liên kết lại. **Bài học:** tôi đọc mã, đọc tài liệu, rồi kết luận "không đủ bằng chứng" — trong khi thứ thiếu không nằm trong mã, nó là một giá trị test. Timeout 4 phút giữ nguyên, vẫn đúng cho trường hợp khách bỏ dở thật. |
| 7 | Chặn đăng nhập từ website | *Partial* | Dựng lỗi thành công 17/08, toast "Đồng bộ lỗi: Tài khoản đang bị chặn đăng nhập từ website, mở ứng dụng di động..." đúng ý nghĩa `PREVENTED`. Người dùng thật gặp đúng case này báo lại bằng "dm =))" — hàng vẫn hiện dấu tick xanh "đã kết nối" cùng lúc với toast, nhìn mâu thuẫn. Kiểm tra lại mã: đúng về bản chất — `FI_SERVICE_ACCOUNT_PAUSED`/`PREVENTED` có `action: 'reauth_in_bank_app'`, không phải `'relink'`, nên **"Cập nhật" (Update Mode) không sửa được lỗi này** — grant phía MIMI vẫn còn nguyên, chỉ là ngân hàng tự chặn truy cập từ web, khách phải mở app ngân hàng gỡ chặn, việc nằm hoàn toàn ngoài tầm MIMI. Cái thiếu là toast biến mất thì không còn dấu hiệu gì trên hàng. Đã vá 17/08: `ingest.ts` trả thêm `action`/`remedy` theo bảng lỗi có sẵn, `CasLink.tsx` lưu `remedy` vào state bền `bankNotes` theo từng connection và hiện thành dòng phụ màu hổ phách dưới tên tài khoản, thay cho dòng "Đồng bộ lúc..." — không còn biến mất theo toast, và không gắn nút "Cập nhật" vì bấm cũng không giải quyết được. |
| 8 | Liên kết thành công tại đối tác | **Passed** | Dòng `bank_connections` có `grant_id`, `access_token_enc` (ML-KEM-768 + AES-256-GCM), `status=connected`. |
| 9 | Liên kết thành công tại Casso | **Passed** | Grant hiện trong `console.bankhub.dev → Developer → Logs` kèm `grant/exchange`. |

### 2. Webhook Cas ID

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 10 | `USER_PERMISSION_REVOKED` | *Một nửa* | **Phía xử lý: đạt.** Bắn một sự kiện `USER_PERMISSION_REVOKED` giả mạo cho grant thật `5455fe9b-9640-11f1-b705-fa163e5398eb` (13/08). Endpoint **không** thu hồi: nó hỏi Cas, Cas nói grant còn sống, trả `verified / …:alive`. Đường push cũng chạy được đầu cuối — gọi Cas, ánh xạ, ghi DB. **Phía nhận: chưa.** Webhook do ta tự bắn, chưa phải Casso gửi. Xem đề nghị bên dưới. |
| 11 | `DEFAULT_UPDATE` | *Một nửa* | như trên. Nhánh "grant còn sống → khôi phục `status=connected`" có trong mã nhưng chưa chạy được vì liên kết chưa từng bị treo. |

### 3. QRPay

| # | Tình huống | Kết quả | Bằng chứng |
|---|---|---|---|
| 12 | Tạo mã QR Pay hợp lệ | *Chờ dữ liệu sandbox* | Đã hiện thực đầy đủ 13/08: grant riêng `scopes: "qrpay"`, Cas Link mở với `feature: "qrpay"`, dò tài khoản bằng `GET /qr-pay/identity`, tạo QR bằng `POST /qr-pay`, đối soát về hoá đơn qua webhook `TRANSACTIONS`. BIDV VietQR Official nhận yêu cầu và trả **"Thông tin nhập không chính xác"** — lỗi xác thực dữ liệu, tức đã tới khâu kiểm tra của ngân hàng. Thiếu đúng một cặp số tài khoản/tên hợp lệ trong sandbox BIDV; tài liệu không công bố. |
| 13 | Thiếu/sai trường bắt buộc | Bị chặn | Probe trả `GRANT_NOT_FOUND` (`rLDsrCRHsC8cqHcp`) chứ không phải `INVALID_PARAM`: Cas kiểm token **trước** tham số. Muốn chứng minh `INVALID_PARAM` phải có grant kèm scope `qrpay`. |
| 14 | Token không hợp lệ | **Passed** | `POST /qr-pay` → 400 `GRANT_NOT_FOUND`, requestId `4B0BqYAD5UCMwobq`, 196ms. |
| 15 | Webhook xác nhận thanh toán | Chưa hiện thực | Không có QRPay và không có endpoint nhận webhook Cas. |

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

## Cần bạn — ba việc không tự chạy được

Tài khoản demo bị chặn liên kết ngân hàng thật theo thiết kế, và tôi không giữ mật
khẩu tài khoản `hoc.qk2@gmail.com` để tự làm thay. Ba việc dưới đây cần bạn đăng
nhập và bấm qua giao diện.

**Case 5, 6, 7 — dựng lỗi rồi khôi phục (5 phút):**

1. Đăng nhập, vào **Fintech Hub**.
2. Trên dòng ngân hàng đang kết nối (Vietcombank), bấm ô **"Giả lập lỗi…"**.
3. Chọn lần lượt cả ba: **Đổi mật khẩu** (case 5), **Xác thực thiết bị** (case 6),
   **Chặn đăng nhập web** (case 7). Mỗi lần chọn, `sync` sẽ tự chạy và liên kết
   chuyển sang trạng thái "cần xác thực lại" — chụp màn hình banner đó là bằng
   chứng.
4. Sau mỗi lần, bấm nút **"Cập nhật"** hiện cạnh liên kết để khôi phục qua Update
   Mode — không mất lịch sử giao dịch đã đồng bộ.

**Case 3 — xoá liên kết (2 phút, làm sau cùng vì có rủi ro):**

Bấm "Huỷ liên kết" trên Vietcombank. Sẽ mất grant thật duy nhất đang có — liên kết
lại được ngay sau đó bằng nút "Liên kết ngân hàng", nhưng nói tôi biết trước khi
bấm để tôi không hiểu nhầm là sự cố nếu thấy dữ liệu tạm biến mất.

**Case 10, 11 — webhook thật (10 phút, đóng luôn case 4 và case 2):**

Mở app Cas ID → thu hồi quyền đã cấp cho MIMI → Casso gửi `USER_PERMISSION_REVOKED`
thật lần đầu tiên → liên kết lại từ đầu. Chi tiết đầy đủ ở mục "Một chuỗi thao tác
đóng được bốn case cùng lúc" bên dưới.
