# MIMI Wallet — Tài liệu bàn giao

Cập nhật 20/08/2026. Mọi con số trong tài liệu này lấy từ mã nguồn và cơ sở dữ
liệu thật tại thời điểm đó, không lấy từ trí nhớ.

**Đọc mục "Luật của dự án" trước khi viết dòng mã đầu tiên.** Nó không phải phần
mở đầu cho có — nó là thứ phân biệt việc làm đúng với việc làm hỏng ở dự án này.

---

## 1. MIMI là gì

Phần mềm đọc **sao kê ngân hàng** của doanh nghiệp nhỏ và hộ kinh doanh Việt Nam,
rồi dựng thành thứ họ cần khi đi làm thuế và đòi nợ:

- Phân loại dòng tiền vào–ra
- Dựng bộ **chứng từ chi phí** để kê khai thuế
- **Đối soát công nợ**: khớp tiền khách trả với hoá đơn bán hàng
- Tra trạng thái người nộp thuế của đối tác

**Vì sao có thị trường:** từ 01/01/2026 Việt Nam bỏ thuế khoán, hộ kinh doanh phải
tự kê khai theo doanh thu thật. Với doanh thu 500 triệu–3 tỷ, luật cho **chọn**
tính theo lợi nhuận hoặc theo % doanh thu — nhưng chọn theo lợi nhuận chỉ có nghĩa
khi **chứng minh được chi phí**. MIMI giữ dòng tiền ra, tức giữ bằng chứng đó.

### Đơn vị vận hành

CÔNG TY CỔ PHẦN CLI NUTRIX, mã số doanh nghiệp **0319436143**, trụ sở 829 Huỳnh
Tấn Phát, Phường Phú Thuận, TP.HCM. Người đại diện: ĐINH VĂN NAM, Tổng giám đốc.

Nguồn duy nhất: [`src/config/company.ts`](../src/config/company.ts). Đừng gõ thông
tin này ở chỗ khác.

### MIMI KHÔNG làm gì — quan trọng ngang phần trên

- **Không phải tổ chức tín dụng.** Không cho vay, không cấp hạn mức, không bảo lãnh.
- **Không phải trung gian thanh toán.** Không giữ tiền, không chuyển tiền hộ ai.
- **Không phải đại lý thuế.** Cung cấp công cụ; khách chịu trách nhiệm kê khai.

Ba câu này nằm trong [Điều khoản sử dụng](../src/pages/Terms.tsx) đã công bố. Đây
là ranh giới pháp lý, không phải khiêm tốn: nhận tiền của người khác hay hứa cấp
tín dụng là ngành có điều kiện, cần giấy phép mà CLI NUTRIX không có.

---

## 2. Luật của dự án

Dự án này đã phải gỡ bỏ **hơn một chục** con số bịa và tuyên bố sai trong một
ngày. Danh sách thật, không phải ví dụ minh hoạ:

| Đã gỡ | Vấn đề |
|---|---|
| "Được cấp phép bởi NHNN Việt Nam" | Mạo nhận giấy phép ngân hàng trung ương |
| "PCI DSS Level 1 — Đạt" | Không có, và MIMI không chạm dữ liệu thẻ |
| "ISO 27001" (hai lần) | Chưa tổ chức nào cấp |
| MST `0123456789` | Chuỗi placeholder hiển thị công khai |
| Điểm tín dụng 701, hạn mức ₫1,5 tỷ | Số cứng, không tính từ gì |
| Điểm tín dụng = số ô checkbox đã tick | Hạn mức = `200tr + số ngân hàng × 300tr` |
| Điểm khớp khuôn mặt KYC | `95 + Math.random() * 4.5` |
| `liveness_passed: true` | Luôn đúng, không kiểm gì |
| "Độ chính xác 94%" | Không đo |
| Audit log "12.847 dòng" | Số cứng |
| 5 khách hàng tiềm năng trong Admin | Bịa, có cả nút xuất CSV |
| Ngày hiệu lực luật thuế | Suy ra chứ không đọc từ nguồn |

**Bốn luật rút ra từ đó:**

### Luật 1 — Không có số nào không có nguồn

Mọi con số hiển thị cho người dùng phải truy được về dữ liệu thật hoặc văn bản
pháp luật. Chưa có thì viết `{{TOKEN}}` hoặc để trống, **không điền tạm**.

Xem [`src/lib/dailyBrief.ts`](../src/lib/dailyBrief.ts): có test bắt buộc mọi tip
nhắc tới mốc ngày hoặc số tiền phải có trường `nguon`.

### Luật 2 — Chạy thật, đừng đọc mã rồi kết luận

Gần như mọi lỗi nghiêm trọng trong dự án này chỉ lộ ra khi chạy thật:

- Nghiệm thu Cas: 6 case đóng được trong một buổi, **không case nào** tìm ra bằng đọc mã
- Case 6 từng ghi "treo vô hạn, chưa rõ nguyên nhân" — thực ra **OTP sandbox là `123456`**
- Cron đối soát trả 401 vì cổng Supabase chặn trước khi mã hàm chạy
- Phân loại tin gán sai hàng loạt, chỉ thấy khi đổ 200 tin thật ra xem

### Luật 3 — Màn hình nói một đằng, sự thật một nẻo là lỗi nặng

Một họ lỗi đã lặp lại nhiều lần ở đây:

- Khung đỏ "Liên kết chưa hoàn tất" đọng lại **bên dưới** toast báo thành công
- Dòng đã ngắt kết nối vẫn nằm trong danh sách, cảnh báo hổ phách về việc người dùng vừa cố ý làm
- Chân trang có cột "Pháp lý" đầy đủ nhưng **mọi link đều `href="#"`**
- Tiện ích `.safe-top`/`.safe-bottom` tồn tại nhưng luôn bằng 0 vì thiếu `viewport-fit=cover`

### Luật 4 — Nói thẳng cái chưa có

[`ComplianceDashboard`](../src/components/fintech/ComplianceDashboard.tsx) giờ có
hai cột: **Đang có** và **Chưa có**. Không có điểm tổng hợp — điểm số gộp những
thứ không cùng đơn vị và tạo cảm giác đã đo lường trong khi chưa đo gì.

---

## 3. Kiến trúc

### Ngăn xếp

| Tầng | Công nghệ |
|---|---|
| Giao diện | Vite + React + TypeScript, **không SSR** |
| Trạng thái | Zustand |
| Hoạt ảnh | framer-motion |
| Backend | Supabase Edge Functions (**Deno**) |
| CSDL | Supabase Postgres, RLS trên toàn bộ bảng |
| Test | Vitest — **269 test** đang xanh |

> **Không phải Next.js.** Mọi hướng dẫn `@supabase/ssr`, `middleware.ts`,
> `NEXT_PUBLIC_*` đều **không áp dụng**. Đây là SPA thuần.

### Lệnh

```bash
npm run dev          # máy chủ phát triển, cổng 8080
npm test             # 269 test
npm run typecheck    # tsc -b --noEmit
npm run check:functions   # deno check cho edge function
```

> **Toolchain trên máy này thỉnh thoảng chậm gấp 30–70 lần** — typecheck 10 giây
> có lần mất 5 phút, build có lần mất **24 phút 56 giây**. Nhưng **chưa lần nào
> hỏng**, luôn exit 0. Cứ để chạy, đừng Ctrl+C rồi tưởng lỗi.

### Cấu trúc

```
src/
  config/company.ts      ← danh tính pháp nhân, NGUỒN DUY NHẤT
  lib/
    dailyBrief.ts        ← chọn tin/tip mỗi ngày (17 test)
    predictions.ts       ← chấm điểm dự đoán (20 test)
    vietqr.ts            ← dựng chuỗi VietQR EMVCo (10 test)
  pages/                 ← 22 trang
  components/

supabase/
  functions/
    _shared/             ← module thuần, TEST ĐƯỢC bằng vitest
    <19 edge function>
  migrations/

research/                ← KHÔNG phải phụ thuộc của ứng dụng
  quantum-reconciliation/ ← Python, nghiên cứu subset-sum
  mirofish-seed/          ← xuất seed cho mô phỏng
```

**Quy tắc `_shared`:** module ở đó **không được import Deno**, để vitest chạy được.
I/O nằm ở `index.ts` của từng function. Đó là lý do có 269 test cho một backend
chạy trên Deno.

---

## 4. Lõi sản phẩm — một động cơ, bốn ứng dụng

Đây là ý tưởng kiến trúc quan trọng nhất của MIMI:

```
tiền RA  ↔ chứng từ chi phí   → khấu trừ thuế       (CHƯA CÓ nguồn chứng từ)
tiền VÀO ↔ hoá đơn bán hàng   → công nợ phải thu    ledger/receivables.ts
tiền VÀO ↔ hoá đơn thuê bao   → thu phí MIMI        billing/subscription.ts
tiền VÀO ↔ mã QR đã phát      → xác nhận thanh toán ledger/reconcile-qr.ts
```

Bốn nghiệp vụ, **một phép toán**: lấy một dòng sao kê, tìm chứng từ tương ứng,
ghi lại mối liên hệ sao cho truy vết được.

**Hệ quả chiến lược:** mở rộng sang tệp khách mới không phải xây tính năng mới —
chỉ là một cặp ghép khác trên cùng động cơ. Và lõi này **trung lập về pháp lý**:
"khớp một dòng sao kê với một chứng từ" là bài toán không biên giới. Chỉ phần
thuế mới là của Việt Nam.

Ba bản đã viết **không** gộp chung một trừu tượng, và đó là chủ ý — quy tắc của
chúng khác nhau ở chỗ quan trọng:

| | Công nợ | Thuê bao |
|---|---|---|
| Trả một phần | **Hợp lệ**, theo dõi số dư | **Không tính là đã trả** |
| Trả sai số tiền | Ghi `overpaid` | Không bao giờ tự kích hoạt |

---

## 5. Tích hợp bên ngoài

### Cas / BankHub — dữ liệu ngân hàng

Nhà cung cấp open banking. Sandbox `https://sandbox.bankhub.dev`, production
`https://production.bankhub.dev`. Tài liệu ở **`cas.so/general/api/...`**
(**không** phải `docs.bankhub.dev` — tên miền đó không tồn tại).

Ba scope: `transaction` (sao kê), `qrpay` (nhận tiền), `gdt` (hoá đơn điện tử).

**OTP trên sandbox là `123456`.** Thiếu mẩu thông tin này từng làm cả một case
nghiệm thu bị ghi nhầm là "treo vô hạn".

Envelope webhook thật: `{webhookCode, webhookType, grantId, environment, error}`.

**Nghiệm thu: 14/20 (70%)** — xem [`docs/NGHIEM_THU_CASSO.md`](NGHIEM_THU_CASSO.md).
Bốn case còn thiếu quy về hai nguyên nhân bên ngoài: chưa có credential merchant
cho QR Pay, và app Cas ID không quét được mã QR sandbox.

### Hoá đơn điện tử — hai sản phẩm dễ nhầm

| | E-Invoice | GDT Hub |
|---|---|---|
| Việc | **Phát hành** hoá đơn | **Đọc** từ cổng Tổng cục Thuế |
| Scope | `invoice` | `gdt` |
| MIMI dùng | chưa | đang dùng |

GDT Hub có **ba** endpoint, MIMI mới dùng **một** (`/gdt/invoices`). Hai cái chưa
dùng: `Etax` và `Invoice Detail`.

### Stripe — KHÔNG DÙNG ĐƯỢC

`create-checkout`, `check-subscription`, `customer-portal` đi qua Stripe.
**Stripe không nhận merchant Việt Nam.** Ba function đó không còn được giao diện
gọi và nên xoá. Đường thu tiền thật là `subscription-billing`.

### XInvoice — tra mã số thuế

`tax-lookup` gọi `api.xinvoice.vn`. **Chưa đặt secret** `XINVOICE_CLIENT_ID` /
`XINVOICE_API_KEY` nên đang trả 503.

---

## 6. Kênh doanh thu

Thu phí thuê bao qua **chuyển khoản ngân hàng** kèm mã tham chiếu.

```
Khách chọn gói
  → subscription-billing?action=create
  → phát hành hoá đơn + mã MIMIxxxxxx
  → giao diện dựng QR VietQR TẠI CHỖ (không gọi dịch vụ ngoài)
  → khách quét, tiền vào tài khoản CLI NUTRIX
  → pg_cron 10 phút/lần gọi ?action=reconcile
  → doiSoatThueBao khớp mã → kích hoạt thuê bao
```

Giá: Starter 149.000đ, Growth 249.000đ/tháng. **Bảng giá nằm phía máy chủ** —
giá do trình duyệt gửi lên thì khách sửa thành 1.000đ.

Tài khoản nhận: Techcombank **830388888**, CÔNG TY CỔ PHẦN CLI NUTRIX, BIN 970407.

Vài quyết định đáng biết:

- `reference_code` **UNIQUE toàn hệ thống**, không phải theo công ty — tiền vào
  không mang danh tính công ty nào, chỉ có mã trong nội dung để tra ngược.
- `subscription_invoices` **không có** chính sách INSERT/UPDATE cho `authenticated`
  — khách ghi được vào bảng này là tự đặt `status='paid'` cho chính mình.
- Gia hạn cộng dồn từ ngày hết hạn **cũ**, không từ hôm nay: trả sớm mà bị cắt
  ngày thì lần sau khách đợi sát hạn mới trả.
- `subscriptions` không có cờ `is_active`, chỉ có `current_period_end` — cờ cần ai
  đó chạy đúng giờ để tắt, so ngày thì luôn đúng.

**Chặn duy nhất còn lại:** tài khoản `830388888` **chưa liên kết vào MIMI qua Cas**,
nên `reconcile` đọc bảng `transactions` sẽ không thấy khoản nào.

---

## 7. Bảo mật

### Mật mã hậu lượng tử — có thật, đã kiểm

[`_shared/pqcCrypto.ts`](../supabase/functions/_shared/pqcCrypto.ts): **ML-KEM-768**
(NIST FIPS 203) bọc khoá **AES-256-GCM**, dẫn khoá qua HKDF-SHA256. Dùng cho mã
truy cập ngân hàng (`bank-link` mã hoá, `cas-webhook`/`kyc-verify` giải mã).

**Đây là mã hoá theo từng bản ghi ở tầng ứng dụng**, khác hẳn mã hoá toàn đĩa: bản
dump cơ sở dữ liệu rời khỏi hệ thống vẫn không đọc được.

Mô hình đe doạ: "thu thập hôm nay, giải mã sau" — dữ liệu tài chính sống 10–30 năm
vì thời hiệu thanh tra thuế.

**Phân biệt rõ:** đây là **mật mã hậu lượng tử**, không phải máy tính lượng tử.
Gọi nhầm tên là đúng loại tuyên bố sai mà dự án này đang gỡ.

### RLS

Bật trên **toàn bộ 28 bảng public**, đã kiểm bằng truy vấn — 0 bảng thiếu.

Hai bảng cố ý **không có policy nào** cho `authenticated`:
- `predictions` — sổ nội bộ, chỉ service role
- `webhook_events` — nhật ký hệ thống

### Chưa có

Không chứng nhận an toàn thông tin nào. Không kiểm toán độc lập. Nói thẳng trong
[Chính sách bảo mật](../src/pages/Privacy.tsx) và ComplianceDashboard.

---

## 8. Trạng thái dữ liệu thật

| Bảng | Số dòng | Ghi chú |
|---|---|---|
| `transactions` | 2.435 | Giao dịch thật từ Cas |
| `macro_news` | 654 | RSS, 5 nguồn |
| `product_events` | 302 | |
| `clients` | 68 | Khách hàng Thịnh Phát + HTP |
| `webhook_events` | 51 | Casso gửi thật |
| `invoices` | 13 | |
| `companies` | 11 | |
| `bank_connections` | 5 | |
| `gdt_invoices` | **0** | Chưa liên kết scope `gdt` |
| `subscription_invoices` | **0** | Chưa ai trả tiền |
| `predictions` | **0** | Bảng mới |

---

## 9. Việc đang dở

### Chặn tiền thật

**Liên kết tài khoản `830388888` vào MIMI qua Cas.** Không có nó thì không thu
được đồng nào dù toàn bộ đường ống đã chạy.

### Giai đoạn 1 — hoá đơn mua vào thành chứng từ chi phí

Kế hoạch đầy đủ: [`docs/KE_HOACH_CHUNG_TU_CHI_PHI.md`](KE_HOACH_CHUNG_TU_CHI_PHI.md).

Đường ống hoá đơn điện tử **đã dựng xong ở backend** nhưng hoá đơn `received`
(mua vào) chảy vào cơ sở dữ liệu rồi **nằm im**. Đó chính là chứng từ chi phí do
cơ quan thuế công nhận — mạnh hơn sao kê, vì sao kê chỉ chứng minh *đã trả tiền*
còn hoá đơn chứng minh *mua gì, của ai, thuế bao nhiêu*.

Cần đọc trang `Invoice Detail` của Cas trước khi làm: `/gdt/invoices` chỉ trả tổng
tiền, mà chứng từ hợp lệ cần **chi tiết hàng hoá dịch vụ**.

### Giai đoạn 2 — chữ ký ML-DSA

`@noble/post-quantum@0.6.1` đã cài và **đã có ML-DSA** — chỉ thêm một dòng import.
Ký bản tóm tắt khi chốt kỳ, để chứng từ lập 2026 vẫn kiểm chứng được năm 2036.

### Secret cần đặt

| Secret | Chặn gì |
|---|---|
| `XINVOICE_CLIENT_ID` / `XINVOICE_API_KEY` | Nút "Tra cứu thuế" trả 503 |
| `CONTACT` trong `company.ts` | Nộp App Store (đang để rỗng có chủ ý) |
| `PQC_SIGN_*` | Giai đoạn 2 |

### App Store

Chuẩn giao diện đã làm (`viewport-fit=cover`, `.tap-target` 44pt, xoá tài khoản
theo Guideline 5.1.1v, trang pháp lý công khai). Nhưng còn **hai rào cản chưa
quyết**: Guideline 4.2 (app chỉ bọc website bị từ chối) và 3.1.1 (Apple đòi bán
qua IAP, ăn 15–30%).

---

## 10. Nghiên cứu — đọc kết luận trước khi làm lại

### Lượng tử: đã đo, kết luận là ÂM

[`research/quantum-reconciliation/`](../research/quantum-reconciliation/)

Bài toán "khách gộp nhiều hoá đơn vào một lần chuyển" là **subset-sum**, NP-hard.
Đã quy về QUBO và đo:

| Hoá đơn | Giải chính xác | Tham lam sai lệch |
|---|---|---|
| 200 | 14,67 ms | 40.000đ |
| 500 | **126,83 ms** | 0đ |

**Cổ điển thắng.** Một lượt gọi D-Wave tốn hàng trăm ms chỉ riêng độ trễ mạng.
Ngưỡng đáng thử lại: vài nghìn hoá đơn mở cùng lúc — quy mô ngân hàng, không phải SME.

Nhưng phép đo tìm ra **lỗi sản phẩm thật**: heuristic tham lam sai ở 5/6 kích
thước, lệch tới 2,47 triệu. Sửa bằng cách port `classical.py` sang TypeScript,
**không cần lượng tử**.

`qiskit-finance` **không dùng được**: toàn bộ ứng dụng của nó là danh mục đầu tư,
quyền chọn châu Âu, trái phiếu. MIMI không có thứ nào.

### MiroFish — mô phỏng lan truyền tin

[`research/mirofish-seed/README.md`](../research/mirofish-seed/README.md)

Lõi là **OASIS — mô phỏng mạng xã hội**, không phải mô phỏng kinh tế. Trả lời được
"tin này lan thế nào, đọng lại thành cảm nhận gì"; **không** trả lời được "lãi
suất sẽ về đâu".

Đã dựng: bảng `predictions` + module chấm điểm, script xuất seed.
Chưa chạy lần nào.

**Ranh giới:** không hiển thị đầu ra mô phỏng cho người dùng như một dự báo. Vừa
là ranh giới pháp lý, vừa vì nó chưa có thành tích nào để đáng tin.

### OSINT — không dùng

Bộ `osint_stuff_tool_collection` là thư mục 1000+ liên kết, phần lớn để điều tra
người và công ty. Tầng lọc từ khoá mà nó có thể thay thế **đã tồn tại và đã có
test**. Chính README của bộ đó nói phần lớn công cụ đã lỗi thời.

---

## 11. Bẫy đã biết

**Phân loại tin — hai lỗi đã sửa, đừng làm lại:**

1. `pad()` từng xoá dấu câu, làm hai từ rời dính thành từ khoá: `"nghìn tỷ, gia
   tăng"` → `"nghin ty gia tang"` → chứa `"ty gia"` → một bài PR ngân hàng thành
   tin tỷ giá. Nay dấu câu ngắt mệnh đề đổi thành `#`.
2. `classify()` từng quét cả tóm tắt nên không biết bài nói *về* cái gì. Nay chỉ
   đọc **tiêu đề**. Có test hồi quy dựng từ tiêu đề thật.

**`cleanText()`** thiếu nhóm entity chữ có dấu, làm `Gi&aacute; USD` hiện nguyên
văn cho người dùng. Đã thêm bảng Latin-1 và giải mã theo số. `&amp;` phải giải mã
**sau cùng**, nếu không sẽ tạo một tầng giải mã giả.

**Edge function bị cổng chặn trước khi mã chạy.** Cron gọi `subscription-billing`
trả `401 UNAUTHORIZED_NO_AUTH_HEADER` — header tự chế không bao giờ tới nơi. Sửa
bằng cách gửi kèm `Authorization` anon key, **không** bằng `verify_jwt = false`
(hàm còn nhánh `create` cần JWT thật).

**Supabase Dashboard hiện digest băm của secret, không phải giá trị.** Không khôi
phục secret từ đó được.

**`resolveCompany()` trả về công ty CŨ NHẤT.** Một người dùng có thể sở hữu nhiều
công ty. Nghiệp vụ nào cần quét hết (như xoá tài khoản) thì không được dùng nó.

---

## 12. Tài liệu khác

| File | Nội dung |
|---|---|
| [`NGHIEM_THU_CASSO.md`](NGHIEM_THU_CASSO.md) | 30 case nghiệm thu Cas, chi tiết từng case |
| [`KE_HOACH_CHUNG_TU_CHI_PHI.md`](KE_HOACH_CHUNG_TU_CHI_PHI.md) | Kế hoạch 3 giai đoạn |
| [`THIET_KE.md`](THIET_KE.md) | Chuẩn giao diện |
| [`TINH_NANG_LOI_CHI_PHI.md`](TINH_NANG_LOI_CHI_PHI.md) | Tính năng lõi và chi phí |
| [`VIEC_CAN_BAN_LAM.md`](VIEC_CAN_BAN_LAM.md) | Việc chủ dự án tự làm |
| [`HO_SO_TUOI_TRE_STARTUP_AWARD.md`](HO_SO_TUOI_TRE_STARTUP_AWARD.md) | Hồ sơ dự thi |

---

## 13. Nếu bạn là AI vừa nhận việc

Bốn điều nên làm trước khi sửa bất cứ thứ gì:

1. **Đọc mục 2 (Luật của dự án).** Cái giá của việc bỏ qua nó đã được trả rồi.
2. **Chạy `npm test`** — 269 test phải xanh. Nếu đỏ, đó là việc đầu tiên.
3. **Đừng tin tài liệu hơn mã nguồn, và đừng tin mã nguồn hơn lần chạy thật.**
   Cả tài liệu Cas lẫn tài liệu này đều đã từng sai.
4. **Khi phát hiện mình suy ra thay vì đọc, nói ra.** Dự án này đã sửa được nhiều
   lỗi nhờ đúng một câu: *"con số đó tôi suy ra chứ không đọc được từ nguồn."*
