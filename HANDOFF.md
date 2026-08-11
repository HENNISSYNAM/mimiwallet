# Mimi Wallet — trạng thái bàn giao

Cập nhật 11/08/2026. Ghi lại những gì đã kiểm chứng, những gì đang chặn, và thứ
tự làm tiếp — để không ai phải dò lại từ đầu.

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

## Việc tiếp theo, theo thứ tự

1. **Đăng ký tài khoản admin.** Invite đã tạo sẵn cho `hoc.qk2@gmail.com` — chỉ
   cần đăng ký bằng đúng email đó, trigger tự gán `role='admin'`.
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
5. **`resolveCompany` dùng chung** (`_shared/company.ts`). `bank-link` và
   `open-banking` đang mỗi nơi một bản `.order('created_at').limit(1)`.
6. **Gỡ mock khỏi sáu trang**: `DashboardOverview`, `ReportsPage`, `SettingsPage`,
   `Onboarding`, `DashboardSidebar`, `Landing`. Sidebar đang hiện "Đức Phát Foods"
   từ `mockData.ts` trong khi công ty thật tên khác.
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
