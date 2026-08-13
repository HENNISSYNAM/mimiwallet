# Mimi Wallet — trạng thái bàn giao

Cập nhật 13/08/2026. Ghi lại những gì đã kiểm chứng, những gì đang chặn, và thứ
tự làm tiếp — để không ai phải dò lại từ đầu.

## Đọc trước: sandbox Cas bịa dữ liệu mỗi lời gọi

Không phát lại một sao kê cố định. Ba request 7 ngày giống hệt nhau ghi thêm 8
dòng mỗi lần, bảng tăng 375 → 383 → 391, reference nào cũng mới.

Hai điều rút ra, cả hai đều quan trọng:

- **Mọi dòng `bankhub:` hiện có là dữ liệu bịa**, và đã được đánh
  `is_synthetic = true`. `ingest.ts` đặt cờ lúc ghi, suy từ `cfg.baseUrl`, nên
  khi có khoá production thì tự tắt. Đừng gỡ chốt đó.
- **Không đo được khử trùng trên sandbox này.** Cơ chế đúng (UNIQUE
  `(company_id, reference_id)`) nhưng không bao giờ kích hoạt. Đừng kết luận nó
  hỏng khi thấy số dòng tăng — đã tốn ba vòng vì hiểu nhầm đúng chuyện này.

Bài học kèm theo, lặp lại lần thứ hai trong cùng dự án: **hỏi nguồn có thẩm quyền
trước.** Ba giả thuyết và ba lần deploy dựa trên đọc mã đều sai; bốn câu SQL giải
quyết xong. Với Cas thì nguồn đó là console của họ; với dữ liệu thì là database.

## Chặn cứng: chưa lấy được dữ liệu ngân hàng thật

Khoá Cas hiện tại **chỉ chạy sandbox**. Production trả:

```
{"errorCode":"CLIENT_NOT_FOUND","errorMessage":"Tài khoản nhà phát triển không tìm thấy"}
```

Sandbox chỉ nối tới ngân hàng giả lập, không có đường nào lấy sao kê thật từ đó.
Cần xin bộ khoá production riêng qua console.bankhub.dev (cần hợp đồng + giấy
phép kinh doanh). Khi có: `supabase secrets set BANKHUB_ENV=production` cùng
`BANKHUB_CLIENT_ID` / `BANKHUB_SECRET_KEY` mới, và đăng ký `redirectUri`
production.

Mọi thứ phía dưới đã sẵn sàng nhận khoá đó.

## Đã chạy và đã kiểm chứng

| Việc | Bằng chứng |
|---|---|
| Khách vãng lai không bị tự đăng nhập | Profile trình duyệt sạch: `/dashboard` → `/login`, không cấp token |
| Tài khoản demo không nối được ngân hàng thật | Gọi API thật → `403 DEMO_ACCOUNT` |
| `/admin` chặn người không phải admin | Khách vãng lai → "Không có quyền truy cập" |
| Cas Link mở được với grantToken của ta | iframe `dev.link.bankhub.dev` 1265×720 |
| `bank-link?action=create-token` | HTTP 200, grantToken thật |
| Nav anchor theo route | `/about` → `/#pricing`, `/` → `#pricing` |
| 121 test, typecheck, build | `npx vitest run`, `tsc --noEmit`, `npm run build` |

## Hỏng gì liên quan Cas: mở log của họ TRƯỚC

`console.bankhub.dev → Developer → Logs`, bấm mũi tên để mở chi tiết một request.
Nó hiện nguyên `redirectUri`, query params, response code và message.

Điều này không phải lời khuyên chung chung. Luồng liên kết hỏng bốn vòng liền và
mỗi vòng tôi sửa theo suy đoán từ mã nguồn — callback ném lỗi, thiếu route
redirect, origin không khớp, sai case `fiServiceType` — **không cái nào đúng**.
Nguyên nhân thật (`redirectUri` trỏ localhost trong khi trình duyệt ở vercel)
hiện ra trong một dòng ngay khi mở chi tiết grant. Sau đó mỗi vòng chỉ mất vài
phút vì lỗi nói rõ nó cần gì.

Bốn lỗi đã gặp trên đường đi, đều là lỗi phía ta:

1. **`redirectUri` sai môi trường.** Secret đặt localhost lúc dev rồi để nguyên.
   Cas hoàn tất liên kết, hiện "Thành công", rồi không có chỗ trả `publicToken`
   về. Iframe đứng im, log có `grant/token` mà không có `grant/exchange` nào.
   Nay `BANKHUB_REDIRECT_URIS` nhận danh sách và function chọn theo header
   `Origin`.
2. **Hai handler cùng đổi một `publicToken`.** Callback của SDK và listener
   riêng của ta đều chạy; token dùng-một-lần nên lần hai thất bại và ghi đè kết
   quả thành công. Nay khử trùng bằng `handledTokens`.
3. **`fromReference là bắt buộc`.** Tài liệu ghi `accounts` tuỳ chọn, nhưng một
   phần tử trong đó bắt buộc kèm con trỏ — mà lần đồng bộ đầu thì không có. Nay
   chỉ gửi `accounts` khi đã có `last_reference`.
4. **`RATE_LIMIT`.** Cas cho khoảng một lần gọi mỗi grant mỗi phút. Đây cũng
   chính là một case trong biên bản nghiệm thu, chứng minh được bằng requestId
   `p3xWQO8zGpdyMh5T`.

## Ba cạm bẫy đã gặp — đừng lặp lại

**1. Giá trị mặc định vô hiệu hoá chốt bảo vệ.** `env.ts` đặt sẵn
`DEMO_EMAIL`/`DEMO_PASSWORD`, khiến `if (DEMO_EMAIL && DEMO_PASSWORD)` luôn đúng
và **mọi khách đều bị đăng nhập vào chung một tài khoản**. Chú thích ngay trên nó
nói "no-op unless both env vars are set". Chú thích không sai — giá trị mặc định
mới là thứ phá nó.

**2. Partial unique index không dùng được cho `ON CONFLICT`.** Postgres không suy
ra được partial index trừ khi câu lệnh lặp lại điều kiện, mà PostgREST chỉ truyền
được tên cột. Upsert chống trùng sẽ **raise chứ không bỏ qua**. Đã sửa; đừng tạo
lại index dạng partial cho mục đích dedupe.

**3. `overflow-hidden` giết `position: sticky`.** Bất kỳ tổ tiên nào tạo
scrollport đều vô hiệu hoá sticky ở con, không báo lỗi gì.

Và một cạm bẫy khi **đo đạc**: `-webkit-touch-callout` chỉ có trên iOS —
`CSS.supports()` trên Chrome desktop trả `false`, nên kiểm bằng computed style ở
đó sẽ luôn trông như bản sửa hỏng. Đo `user-select` thay thế.

## Dashboard đã chạy trên dữ liệu thật (xong 12/08/2026)

`DashboardOverview.tsx` và `DashboardSidebar.tsx` giờ truy vấn `companies`,
`transactions`, `invoices`, `credit_score_snapshots`, `bank_connections`. Đã gỡ
hết số cứng: "Anh Minh", ₫2.85 tỷ, ₫8.32 tỷ, điểm 701, và ba insight bịa nhắc
ABC Corp / INV-2841.

Hai quyết định giữ lại:
- **Bỏ ô "Tổng số dư"**. Không bảng nào lưu số dư ngân hàng, nên ô đó chỉ có thể
  là bịa. Thay bằng dòng tiền ròng — tính được thật từ giao dịch.
- **Bỏ "target ₫10 tỷ"**. Hệ thống không có mục tiêu doanh thu nào; so với tháng
  trước thì đo được.

Trạng thái rỗng nói thẳng "chưa có giao dịch" kèm lối đi liên kết ngân hàng, không
hiện số 0 giả dạng số đo.

**Bốn trang còn đọc `mockData.ts`:** `ReportsPage`, `SettingsPage`, `Onboarding`,
`Landing`. Cùng nguyên tắc: dữ liệu thật hoặc trạng thái rỗng trung thực.

## Webhook Cas (làm 12–13/08)

`supabase/functions/cas-webhook`, đã đăng ký hai loại `GRANT` và `TRANSACTIONS`
bên Casso, cả hai ENABLED.

**Form tạo webhook của Casso không có ô secret để ký payload.** Không chữ ký thì
không chứng minh được request đến từ họ, nên endpoint không làm theo payload:

> Payload là tín hiệu đi kiểm tra, không phải mệnh lệnh.

Một body nói "grant X bị thu hồi" không thu hồi gì — nó khiến hệ thống gọi Cas
hỏi về grant X rồi làm theo câu trả lời của Cas. **Đã kiểm chứng trên grant thật:**
bắn `USER_PERMISSION_REVOKED` giả cho `5455fe9b-9640-11f1-b705-fa163e5398eb`, kết
quả `verified / …:alive` — không thu hồi. Khoá trong URL chỉ là bộ lọc; lời gọi
xác minh mới là ranh giới.

Mọi payload ghi thô vào `webhook_events` trước khi quyết định gì. Tới 13/08 bảng
có 9+ dòng và **toàn bộ do ta tự bắn** — Casso chưa gửi lần nào, vì sandbox chưa
có sự kiện nào xảy ra. Muốn thấy envelope thật phải thu hồi quyền từ ứng dụng
Cas ID; chuỗi đó đóng luôn bốn case nghiệm thu (xem `docs/NGHIEM_THU_CASSO.md`).

## Một đường ghi giao dịch cho cả poll lẫn push

`_shared/bank/ingest.ts`. Trước đó logic nằm trong `bank-link?action=sync`; nay
`cas-webhook` dùng chung. Nếu để hai bản sao, một giao dịch tới bằng push có thể
được ghi theo luật khác với chính nó tới bằng poll — khác quy ước dấu, khác khoá
khử trùng — và khác biệt đó hiện ra thành tiền xuất hiện hoặc biến mất tuỳ đường
nào chạy trước.

## `resolveCompany` và con bug `.single()` còn sót

`_shared/company.ts`. Bảy edge function trước đây mỗi cái tự viết một bản, nên
cùng một lỗi ra mắt ba lần. `credit-scoring` và `kyc-verify` vẫn còn `.single()`
tới 13/08 — tức chấm điểm tín dụng và eKYC hỏng với đúng những tài khoản sở hữu
nhiều hơn một công ty, mà thông báo trả về là "No company found".

## Việc tiếp theo, theo thứ tự

1. **Phép thử cách ly hai tài khoản.** Chưa từng chạy, và bảy function vừa đổi
   cách phân giải công ty nên đây đúng là lúc. Đăng nhập A, gọi mọi edge function
   và mọi truy vấn REST bằng token của A, khẳng định không dòng nào của B lọt ra.
   Với sản phẩm fintech đây là phép thử quan trọng nhất.
2. **Bật Magic Link** ở Supabase → Authentication → Providers. `signInWithEmailLink`
   đã có trong `useAuthStore` nhưng sẽ lỗi tới khi bật. Cùng chỗ đó **tắt đăng ký
   công khai** cho pilot đóng — chốt thật nằm ở đây, không phải trong client.
3. **Viết lại onboarding** (thiết kế đã chốt, chưa làm): `/login` một ô email →
   magic link → thẳng `/dashboard`. Bỏ form 5 bước; hỏi ngành/quy mô bằng 3 thẻ
   bấm-chọn **sau** khi đã thấy dữ liệu. Mã số thuế, mục đích vay, kỳ hạn, số nhân
   viên → hỏi đúng lúc dùng. Bốn file phụ thuộc nhau (`Onboarding.tsx`,
   `Login.tsx`, route callback, `sync`), làm dở một nửa là hỏng đăng ký.
4. **Tách `sync`**: 90 ngày trước để hiện ngay, phần còn lại chạy nền. Hiện kéo 12
   tháng đồng bộ trong một request và sẽ chạm timeout — đúng vào khoảnh khắc quan
   trọng nhất của người dùng mới.
6. **Gỡ mock khỏi bốn trang còn lại**: `ReportsPage`, `SettingsPage`, `Onboarding`,
   `Landing`. (`DashboardOverview` và `DashboardSidebar` đã xong 12/08.)
7. **Phép thử cách ly hai tài khoản** — chạy được ngay khi có tài khoản admin.
   Đăng nhập A, gọi mọi edge function và mọi truy vấn REST bằng token của A,
   khẳng định không dòng nào của B lọt ra. Với một sản phẩm fintech đây là phép
   thử quan trọng nhất, và **chưa từng chạy**.

## Kiến trúc: hai quyết định cần biết

**Logic quan trọng cố ý không phải LLM.** Ghép chuyển khoản nội bộ
(`_shared/ledger/internal-transfer.ts`) và ngưỡng 1 tỷ là code tất định có test,
vì sai là sai nghĩa vụ thuế của người dùng. Agent chỉ điều phối và diễn giải.

**Không dùng LangGraph.** Bản Python không chạy trong Edge Function; dựng service
riêng sẽ đưa giao dịch ngân hàng của khách qua thêm một hệ thống. Runtime tự viết
ở `_shared/agents/graph.ts` mượn đúng bốn ý cần dùng — state có reducer, cạnh điều
kiện, giới hạn bước, interrupt/resume — 16 test.

## Bối cảnh thuế 2026 (đã kiểm chứng)

Bỏ thuế khoán từ 01/01/2026. Nhưng hộ **doanh thu ≤ 1 tỷ/năm được miễn** GTGT và
TNCN, hồi tố từ 01/01/2026 — khoảng **90% trong 2,5 triệu hộ**, và nhóm này chỉ
khai một lần vào 31/01/2027.

Nên định vị khác nhau theo nhóm: với 90% miễn thuế bán "biết doanh thu thật và
khoảng cách tới ngưỡng"; với ~250.000 hộ trên ngưỡng và doanh nghiệp nhỏ theo
TT133 bán "sổ sách lấy thẳng từ ngân hàng".

**Ranh giới:** MIMI chuẩn bị số liệu, **không nộp thuế thay** và không nhận đầu ra
là tờ khai hợp lệ. Mọi bản xuất đóng dấu "bản nháp — cần rà trước khi nộp".

## Bảo mật cần nhớ

- Khoá Cas chỉ ở Supabase secrets, không có trong repo. `.env` bị gitignore.
- Mật khẩu demo nằm trong bundle JS **theo thiết kế** — vì thế tài khoản demo bị
  chặn nối ngân hàng thật, và chốt đó phải giữ.
- `accessToken` của Cas mã hoá ML-KEM-768 + AES-256-GCM trước khi vào DB, không
  bao giờ trả về client.
- Vai trò đọc từ DB. Policy UPDATE trên `profiles` ghim `role` và `is_demo`, nếu
  không thì đó chỉ là cột mà chính chủ tài khoản tự sửa thành `admin`.
- Email `hoc.qk2@gmail.com` hiện nằm trong migration bootstrap admin. Nếu repo để
  public thì nên cân nhắc.
