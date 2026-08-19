# Kế hoạch — Chứng từ chi phí, chữ ký hậu lượng tử, và bài toán tổ hợp

Lập ngày 19/08/2026.

Kế hoạch này xếp theo **giá trị trên công sức**, không theo độ hấp dẫn. Giai đoạn 1
gần như không phải xây mới — nó nối những thứ đã có nhưng chưa ai nối. Giai đoạn 3
hấp dẫn nhất khi kể chuyện nhưng đứng cuối, vì nó không tạo ra giá trị cho người
dùng nào.

> **Về máy bạn.** Toolchain thỉnh thoảng chậm gấp 30–70 lần nhưng chưa lần nào
> hỏng. Cứ để chạy, đừng Ctrl+C rồi tưởng lỗi.

---

## Hiện trạng — cái gì đã có, cái gì chưa

Trước khi lên việc, đây là bản kiểm kê đã đối chiếu với mã nguồn ngày 19/08:

| Thành phần | Trạng thái | Ở đâu |
|---|---|---|
| Liên kết quyền `gdt` với Cas | ✅ có, có nút trên giao diện | `CasLink.tsx:762` |
| Gọi `/gdt/invoices` | ✅ có | `bankhub.ts:318` |
| Chuẩn hoá, tách thuế suất, xác định chiều | ✅ có | `gdt-invoice-map.ts` |
| Lưu vào bảng `gdt_invoices` | ✅ có | `bank-link/index.ts:727` |
| Đếm hoá đơn `received` và trả về | ✅ có | `bank-link/index.ts:757` |
| **Dùng hoá đơn `issued` tính doanh thu** | ✅ có | `ThresholdClock`, `tax-summary` |
| **Dùng hoá đơn `received` làm chứng từ chi phí** | ❌ **chưa** | — |
| **Màn hình xem hoá đơn điện tử** | ❌ **chưa** | — |
| Động cơ đối soát | ✅ có, 3 ứng dụng | `_shared/ledger/`, `_shared/billing/` |
| Chữ ký hậu lượng tử | ❌ chưa (chỉ có mã hoá) | `pqcCrypto.ts` |

Điểm mấu chốt: **hoá đơn mua vào đang chảy vào cơ sở dữ liệu và nằm im.**

Đó là chứng từ chi phí do cơ quan thuế công nhận — mạnh hơn sao kê ngân hàng, vì
sao kê chỉ chứng minh *đã trả tiền*, còn hoá đơn chứng minh *mua gì, của ai, thuế
bao nhiêu*. Toàn bộ lý do sản phẩm xoay sang thuế nằm ở câu "chỉ ai chứng minh
được chi phí mới được chọn cách tính theo lợi nhuận". Nguồn chứng từ mạnh nhất cho
câu đó đang bị bỏ không.

---

## GIAI ĐOẠN 1 — Hoá đơn mua vào thành chứng từ chi phí

Mục tiêu: trả lời được câu **"chi phí nào của tôi có chứng từ hợp lệ, và tổng là
bao nhiêu?"**

### 1.1 — Màn hình hoá đơn điện tử

Tạo `src/pages/EInvoicesPage.tsx`, route `/dashboard/e-invoices`.

Hai tab theo `direction`, và đây không phải chia cho gọn — hai chiều trả lời hai
câu hỏi khác hẳn nhau:

- **Bán ra** (`issued`) → doanh thu, đối chiếu ngưỡng 1 tỷ và 500 triệu
- **Mua vào** (`received`) → chi phí được khấu trừ

Mỗi dòng hiện: số hoá đơn, ngày, đối tác (tên + mã số thuế), tiền trước thuế,
thuế, tổng. Có nút đồng bộ gọi lại action `gdt` của `bank-link`.

**Nghiệm thu:** đăng nhập, bấm đồng bộ, thấy đúng số hoá đơn mà API trả về, tổng
tiền khớp.

### 1.2 — Module đối soát chi phí

Tạo `supabase/functions/_shared/ledger/expenses.ts` + test.

Đây là **ứng dụng thứ tư** của động cơ đối soát, nhưng là dòng **đầu tiên** trong
danh sách viết ở đầu `receivables.ts`:

```
tiền RA  ↔ chứng từ chi phí      → khấu trừ thuế        ← giai đoạn này
tiền VÀO ↔ hoá đơn bán hàng      → công nợ phải thu     ✅ xong
tiền VÀO ↔ hoá đơn thuê bao      → thu phí MIMI         ✅ xong
tiền VÀO ↔ mã QR đã phát         → xác nhận thanh toán  ✅ xong
```

Hàm `doiSoatChiPhi(hoaDonMuaVao[], tienRa[])`.

**Khác biệt so với ba bản kia — đọc kỹ trước khi viết:**

| | Công nợ phải thu | Chi phí |
|---|---|---|
| Căn cứ khớp mạnh nhất | số hoá đơn trong nội dung CK | **mã số thuế người bán** |
| Trả một phần | hợp lệ | hợp lệ (trả nhiều đợt cho NCC) |
| Sai lệch số tiền | ghi `overpaid` | **phải cảnh báo** — lệch giữa hoá đơn và tiền trả là dấu hiệu thiếu chứng từ |
| Hệ quả khi bỏ sót | thu thiếu tiền | **nộp thừa thuế** |

Mã số thuế là căn cứ mạnh hơn tên vì nó duy nhất và đã có sẵn trong `gdt_invoices.counterparty_tax_code`.
Danh bạ `clients` vừa nạp cho phép đối chiếu chéo tên ↔ mã số thuế.

Không tự khớp khi không chắc. Một khoản chi bị gán nhầm hoá đơn sẽ đi thẳng vào tờ
khai thuế — hậu quả nặng hơn nhiều so với để người xử lý.

**Nghiệm thu:** test bao các ca — trả một phần, trả gộp nhiều hoá đơn, tiền ra
không có hoá đơn, hoá đơn không có tiền ra, lệch số tiền.

### 1.3 — Nối vào `tax-summary`

Bổ sung vào phần trả về:

- `chiPhiCoChungTu` — tổng hoá đơn mua vào đã khớp được với tiền ra
- `chiPhiChuaCoChungTu` — tiền ra chưa khớp hoá đơn nào
- `hoaDonChuaThanhToan` — hoá đơn mua vào chưa thấy tiền ra tương ứng

Ba con số này phải **để riêng**, không cộng lại. Cùng lý do `tax-summary` đang giữ
`bank` và `gdt` tách nhau: khoảng lệch giữa chúng là thông tin, gộp lại là phá mất
thứ duy nhất đáng nói.

### 1.4 — So sánh hai cách tính thuế bằng số thật

Đây là chỗ giai đoạn 1 trả về giá trị cho người dùng, và là **lời hứa trên trang
chủ** ("Luật cho bạn chọn cách tính — nhưng chỉ khi chứng minh được chi phí").

Với doanh thu 500tr–3 tỷ, hiện hai lựa chọn:

- 15% trên **lợi nhuận** — chỉ có nghĩa khi chi phí chứng minh được
- tỷ lệ % trên **doanh thu** — không cần chứng từ

Màn hình hiện hai con số cạnh nhau, và quan trọng nhất: **"nếu bạn tìm thêm được
X đồng chứng từ nữa thì cách tính theo lợi nhuận bắt đầu có lợi hơn"**. Đó là câu
biến phần mềm kế toán thành thứ đáng trả tiền.

> ⚠️ **Cần xác minh trước khi hiện số:** tỷ lệ % trên doanh thu theo từng ngành
> chưa được kiểm trong repo này. Phải đọc từ văn bản gốc, không suy ra. Trước khi
> có, để token `{{TY_LE_DOANH_THU_THEO_NGANH}}` chứ không điền số.

---

## GIAI ĐOẠN 2 — Chữ ký hậu lượng tử cho chứng từ

Mục tiêu: **bộ chứng từ lập năm 2026 vẫn kiểm chứng được năm 2036.**

### 2.1 — Thêm ký/xác minh vào `pqcCrypto.ts`

`@noble/post-quantum@0.6.1` đã cài sẵn và **đã có ML-DSA** — chỉ cần thêm một dòng
import, không cài gói mới:

```ts
import { ml_dsa65 } from "https://esm.sh/@noble/post-quantum@0.6.1/ml-dsa.js";
```

Thêm `signRecord()` / `verifyRecord()` bên cạnh `encryptField`/`decryptField`.

**Vì sao ML-DSA chứ không phải ECDSA:** chữ ký cổ điển ký hôm nay có thể bị **giả
mạo ngược** khi có máy tính lượng tử. Với dữ liệu sống 10 ngày thì không sao; với
chứng từ thuế sống 10 năm thì toàn bộ dấu vết kiểm toán mất giá trị đúng lúc cần
nó nhất. Đây là bài toán "harvest now, decrypt later" ở dạng chữ ký.

Cần thêm biến môi trường `PQC_SIGN_PRIVATE_KEY` / `PQC_SIGN_PUBLIC_KEY` — **không
dùng chung khoá với `PQC_KYC_*`**, vì khoá ký và khoá mã hoá phải tách.

### 2.2 — Ký khi chốt kỳ

Khi người dùng chốt một kỳ kê khai, ký bản tóm tắt gồm: danh sách hoá đơn, danh
sách giao dịch đã khớp, tổng chi phí, thời điểm chốt. Lưu chữ ký vào bảng mới
`sealed_periods`.

Ký **bản tóm tắt đã chốt**, không ký từng bản ghi rời — ký từng dòng cho ra hàng
nghìn chữ ký không nói lên điều gì về tính toàn vẹn của cả bộ.

### 2.3 — Màn hình kiểm chứng

"Bộ chứng từ quý III/2026 — đã ký ngày 05/10/2026 — ✅ chưa bị sửa đổi."

Đây là lúc mật mã hậu lượng tử thôi là câu marketing và thành một dòng chữ kế toán
đọc hiểu ngay.

---

## GIAI ĐOẠN 3 — Bài toán tổ hợp (chỉ khi hồ sơ dự thi cần)

Không tạo giá trị cho người dùng. Chỉ làm nếu cần cho TTSUA.

Bài toán thật, nằm sẵn trong `receivables.ts`: khách gộp nhiều hoá đơn vào một lần
chuyển. *"Tiền vào 47.300.000đ — trong 200 hoá đơn đang mở, tổ hợp nào cộng đúng
bằng số đó?"* Đây là **subset-sum**, NP-hard.

Cách làm trung thực:

1. Quy về QUBO
2. Chạy trên D-Wave Leap (có gói miễn phí, Ocean SDK mã nguồn mở)
3. Chạy solver cổ điển (quy hoạch động / ILP) trên cùng bộ dữ liệu
4. **Công bố kết quả thật**

Dự đoán trung thực: **cổ điển thắng ở quy mô hiện tại.** Ở 200 hoá đơn, quy hoạch
động chạy mili-giây. Lợi thế lượng tử — nếu có — chỉ xuất hiện ở hàng chục nghìn,
quy mô của ngân hàng chứ không phải SME.

Nói ra điều đó làm hồ sơ **mạnh hơn**, không yếu đi: nó chứng minh có đo thật, và
phân biệt được với các hồ sơ nói "chúng tôi ứng dụng AI lượng tử".

> ⚠️ **Quyền riêng tư:** nếu chạy thật, chỉ gửi **số tiền trần trụi** lên đám mây
> lượng tử — không tên, không mã số thuế. Và phải bổ sung mục này vào Chính sách
> bảo mật, vì nó là chia sẻ dữ liệu với bên thứ ba.

**Không làm:** QKD (cần sợi quang riêng, vô nghĩa với SaaS), QRNG (`crypto.getRandomValues`
đã đạt chuẩn CSPRNG), và mọi câu có chữ "AI lượng tử".

---

## Việc cần bạn tự làm

Những thứ tôi không chạy được từ đây:

1. **Đặt secret `XINVOICE_CLIENT_ID` và `XINVOICE_API_KEY`** — chưa có thì
   `tax-lookup` trả 503, và nút "Tra cứu thuế" trong Danh bạ khách hàng không chạy.
2. **Điền `CONTACT` trong `src/config/company.ts`** — email hỗ trợ theo tên miền
   công ty và địa chỉ website. Bắt buộc khi nộp store, và đang để rỗng có chủ ý.
   Đừng dùng email cá nhân: nó đăng công khai vĩnh viễn trên trang sản phẩm.
3. **Liên kết quyền `gdt` với một tài khoản thật** — giai đoạn 1 cần dữ liệu hoá
   đơn thật để nghiệm thu.
4. **Sinh cặp khoá ký cho giai đoạn 2** và đặt vào secret.
5. **Xác minh tỷ lệ % thuế trên doanh thu theo ngành** từ văn bản gốc (mục 1.4).

---

## Những điều chưa chắc, cần kiểm trước khi tin

Ghi lại thay vì giấu:

- **Quyền `gdt` lấy được cả hoá đơn mua vào không?** Mã nguồn xử lý cả hai chiều,
  nhưng chưa ai chạy trên dữ liệu thật để xác nhận API trả về cả hai. Nếu chỉ trả
  hoá đơn bán ra thì **toàn bộ giai đoạn 1 phải tính lại**. Đây là điều cần kiểm
  đầu tiên, trước khi viết một dòng nào.
- **Độ trễ dữ liệu hoá đơn từ cơ quan thuế** — chưa đo. Nếu trễ nhiều ngày thì đối
  soát theo thời gian thực không có nghĩa, phải chuyển sang chốt theo kỳ.
- **Hoá đơn bị huỷ / điều chỉnh** — `invoice_status` có trong dữ liệu nhưng chưa
  có nhánh xử lý. Một hoá đơn đã huỷ mà vẫn tính vào chi phí là lỗi nặng.
