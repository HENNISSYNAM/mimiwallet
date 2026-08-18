# Phương án: Chứng minh chi phí — tính năng lõi

Trạng thái: **đề xuất thiết kế**, chưa viết dòng mã nào.
Ngày: 17/08/2026.

---

## 1. Vì sao đây là lõi, không phải tính năng phụ

Từ 2026 **thuế khoán bị xoá hoàn toàn**. Mọi hộ kinh doanh phải tự kê khai theo
doanh thu thực. Nhưng điều quan trọng hơn nằm ở cách tính:

| Doanh thu/năm | Thuế suất | Cách tính |
|---|---|---|
| ≤ 500 triệu | Miễn | — |
| **500 triệu – 3 tỷ** | **15%** | **Được CHỌN: trên lợi nhuận, hoặc theo tỷ lệ trên doanh thu** |
| 3 – 50 tỷ | 17% | Trên lợi nhuận |
| > 50 tỷ | 20% | Trên lợi nhuận |

Dòng in đậm là toàn bộ sản phẩm.

Khách của MIMI nằm gọn trong khoảng 500 triệu – 3 tỷ. Luật cho họ **quyền chọn**.
Nhưng quyền chọn chỉ có nghĩa nếu chứng minh được chi phí — không chứng minh được
thì mặc nhiên rơi về tính trên doanh thu.

Nói cách khác: **luật vừa tạo ra một khoản tiền, và giao chìa khoá cho ai giữ được
sổ chi.** MIMI giữ toàn bộ dòng tiền ra của họ.

Đây là khác biệt căn bản so với mọi thứ MIMI đang làm. Các tính năng hiện có trả
lời "tình hình thế nào". Cái này trả lời **"bạn tiết kiệm được bao nhiêu"** — con
số cụ thể, so được với phí thuê bao.

### Vì sao không phải "lập tờ khai hộ"

Đó là ý ban đầu, và nó yếu hơn:

- Biểu mẫu tờ khai là mẫu chuẩn nhà nước công bố. Ai render cũng được, không có
  moat.
- eTax tự tính sẵn số thuế và cập nhật lên cổng dịch vụ công. Phần "tính hộ" đang
  bị chính cơ quan thuế lấy mất.
- Phần **nộp** không phải của MIMI (xem mục 5).

Phần khó, và phần chưa ai làm cho hộ kinh doanh Việt Nam, là **phân loại từng
giao dịch mỗi ngày sao cho tới kỳ quyết toán có bộ chi phí đứng vững**. Tờ khai chỉ
là đầu ra cuối cùng của việc đó.

---

## 2. Rào chặn phải giải: tiền vào ≠ doanh thu, tiền ra ≠ chi phí

Mã hiện tại đã biết vế đầu. `findInternalTransfers` và `revenueExcludingInternal`
tồn tại vì thế; `tax-summary` cố tình trả `bankRevenue` và `gdtRevenue` **tách
riêng** kèm `gap` và `needsReview` — vì hai số đó không tự khớp.

Vế sau khó hơn hẳn. Một khoản tiền ra là chi phí hợp lệ chỉ khi:

1. Phục vụ hoạt động kinh doanh (không phải chi tiêu cá nhân)
2. Có chứng từ
3. Đúng kỳ

Sao kê ngân hàng chứng minh được **duy nhất một điều**: tiền đã rời tài khoản, ngày
nào, tới ai. Nó **không** chứng minh khoản đó phục vụ kinh doanh, và **không** thay
được hoá đơn.

> **Đây là ranh giới thiết kế quan trọng nhất của cả tính năng.**
> MIMI không được phép tự khẳng định một khoản là chi phí hợp lệ. MIMI *đề xuất*,
> con người *xác nhận*, và hệ thống *ghi lại ai xác nhận, lúc nào*.

Hộ kinh doanh còn tệ hơn doanh nghiệp ở chỗ tiền cá nhân và tiền kinh doanh dùng
chung một tài khoản. Nếu tự động gắn nhãn chi phí cho mọi khoản chi, MIMI sẽ dựng
ra một bộ sổ **khai khống chi phí** — và người ký tên chịu phạt là khách.

---

## 3. Kiến trúc đề xuất

Bốn lớp, mỗi lớp một câu hỏi.

### Lớp 1 — Phân loại (SCOUT)

Với mỗi giao dịch ra, sinh một *đề xuất* kèm độ tin cậy:

- `chi_phi_kinh_doanh` — có vẻ phục vụ kinh doanh
- `ca_nhan` — có vẻ chi tiêu cá nhân
- `chuyen_noi_bo` — chuyển giữa tài khoản của chính chủ (đã có `findInternalTransfers`)
- `khong_ro` — không đủ căn cứ

Căn cứ phân loại, theo thứ tự tin cậy giảm dần:

1. **Khớp hoá đơn đầu vào từ `/gdt/invoices`** — mạnh nhất, vì hoá đơn đã có trên
   hệ thống thuế. Khớp theo (số tiền, ngày ±3, mã số thuế người bán).
2. **Đối tác lặp lại đã được xác nhận trước đó** — cùng người nhận, cùng nhóm.
3. **Mẫu mô tả giao dịch** — yếu nhất, chỉ dùng để gợi ý, không bao giờ tự chốt.

Không có căn cứ nào ở trên → `khong_ro`. **Mặc định là không biết, không phải là
chi phí.**

### Lớp 2 — Xác nhận (con người)

Đây là "tự động hoá từng ngày" bạn nói, và nó phải nhẹ:

- Mỗi ngày tối đa **một nhúm nhỏ** giao dịch cần trả lời, không phải cả danh sách
- Mỗi câu hỏi là một chạm: *Kinh doanh* / *Cá nhân* / *Để sau*
- Trả lời một lần cho một đối tác → lần sau tự áp, hiện dưới dạng "đã tự phân loại
  theo lần trước, bấm để sửa"

Chỉ số thành công của lớp này không phải độ chính xác của mô hình, mà là **số câu
hỏi mỗi ngày giảm dần theo thời gian**. Nếu sau 3 tháng vẫn hỏi 20 câu/ngày thì
tính năng thất bại dù phân loại đúng.

### Lớp 3 — So sánh hai phương án (đây là màn hình bán hàng)

Tính song song, luôn hiện cả hai:

```
Phương án A — nộp theo tỷ lệ trên doanh thu     {{THUE_THEO_DOANH_THU}}
Phương án B — nộp 15% trên lợi nhuận            {{THUE_THEO_LOI_NHUAN}}
                                                 ─────────────────────
Chênh lệch                                       {{CHENH_LECH}}
```

Kèm ba con số làm nên phương án B, và **mức độ vững** của nó:

```
Chi phí đã có hoá đơn khớp        {{CHI_PHI_CO_HOA_DON}}   ← vững
Chi phí bạn đã xác nhận           {{CHI_PHI_DA_XAC_NHAN}}  ← cần chứng từ
Khoản chưa phân loại              {{CHI_PHI_CHUA_RO}}      ← chưa tính vào
```

Nếu phương án A rẻ hơn thì **nói thẳng là A rẻ hơn**. Một công cụ chỉ biết đẩy
người dùng sang hướng có lợi cho mình sẽ mất niềm tin ngay lần đầu bị phát hiện.

### Lớp 4 — Kết xuất

- Bảng kê chi phí, kèm cột nguồn của từng dòng (hoá đơn nào / ai xác nhận / lúc nào)
- Tờ khai điền sẵn theo mẫu chuẩn, **để khách tải về**
- Danh sách khoản còn thiếu chứng từ, để đi xin hoá đơn trước kỳ quyết toán

---

## 4. Thứ tự làm

| Bước | Nội dung | Vì sao trước |
|---|---|---|
| 1 | Lớp 1 + lớp 2 (phân loại + xác nhận) | Không có dữ liệu sạch thì mọi thứ sau đều là số bịa |
| 2 | Lớp 3 (so sánh hai phương án) | Đây là chỗ khách nhìn thấy tiền — bán được ngay khi có |
| 3 | Khớp hoá đơn `/gdt/invoices` | Nâng chi phí từ "tự khai" lên "có chứng từ" |
| 4 | Lớp 4 kết xuất | Chỉ có ích khi ba bước trên đã đúng |
| 5 | Phát hành hoá đơn qua Cas `POST /invoices` | Khép vòng NĐ 70/2025, xem mục 6 |

Bước 1 và 2 chạy được **ngay trên dữ liệu MIMI đã có**. Không cần API mới, không
cần giấy phép.

---

## 5. Phần MIMI không làm được

Nói rõ để không hứa nhầm trong lúc thiết kế:

- **Nộp thay khách.** Cần tài khoản eTax và chữ ký số của chính người nộp thuế.
  MIMI không giữ, và không nên giữ. Muốn nộp thay phải đăng ký **đại lý thuế** theo
  Luật Quản lý thuế — đó là giấy phép, không phải sprint.
- **Khẳng định một khoản là chi phí hợp lệ.** MIMI đề xuất, khách xác nhận. Trách
  nhiệm pháp lý thuộc người ký tờ khai.
- **Thay hoá đơn.** Sao kê chứng minh tiền đã chi, không chứng minh chi cho việc gì.

Câu hiện có trên landing page — *"MIMI không nộp hồ sơ thuế thay bạn"* — vẫn đúng
và giữ nguyên.

---

## 6. Năng lực Cas chưa dùng

Tra tài liệu Cas ngày 17/08/2026:

| Endpoint | Làm gì | MIMI |
|---|---|---|
| `GET /gdt/invoices` | Đọc hoá đơn từ cổng thuế | đang dùng |
| `POST /invoices` | Phát hành hoá đơn điện tử | **chưa** |
| `POST /tvan/send` | Truyền hoá đơn tới cơ quan thuế qua T-VAN | **chưa** |
| `POST /transfer` | Chuyển tiền (scope `transfer`) | chưa — 10 case đang kẹt `IP_NOT_ALLOWED` |

`GET /gdt/invoices` là đầu vào của bước 3 và **quan trọng gấp đôi so với hiểu biết
trước đây**: nó không chỉ dựng doanh thu, nó còn là **bằng chứng chi phí đầu vào**
— hoá đơn mua vào đã nằm sẵn trên hệ thống thuế.

Cas **không có** endpoint nộp thuế hay khai thuế. T-VAN gửi *hoá đơn* lên cơ quan
thuế, không gửi *tờ khai*. Ba nghĩa vụ khác nhau: truyền hoá đơn ≠ khai thuế ≠ nộp
thuế.

---

## 7. Cần xác minh trước khi viết mã

Chưa được đưa vào code hay hiển thị cho người dùng cho tới khi tra xong:

- [ ] **Tỷ lệ % trên doanh thu theo từng ngành** (nghe là 0,5–2%). Đây là mẫu số
      của phương án A — sai là sai toàn bộ phép so sánh. Phải tra Thông tư hướng dẫn,
      không lấy từ báo.
- [ ] **Điều kiện chi phí được trừ** với hộ kinh doanh: có yêu cầu hoá đơn cho mọi
      khoản không, có ngưỡng bắt buộc chuyển khoản không.
- [ ] **Mẫu tờ khai** áp dụng cho hộ kinh doanh kê khai từ kỳ 2026 và tần suất
      (tháng/quý/năm).
- [ ] **Invoice Hub của Cas có hỗ trợ hoá đơn từ máy tính tiền** theo NĐ 70/2025
      không — tài liệu không nói. Hỏi thẳng Casso.
- [ ] Việc dựng bộ chi phí và tờ khai điền sẵn có bị coi là hành nghề **đại lý
      thuế** không.

Mốc 15% / 17% / 20% và các ngưỡng 500 triệu / 3 tỷ / 50 tỷ **đã đối chiếu
baochinhphu.vn ngày 17/08/2026** và đã ghi vào `legal_documents` qua migration
`20260817140000`.

---

## 8. Chuyển trục: từ cho vay sang thuế

MIMI **chưa cấp vốn được** — chưa có giấy phép tín dụng, chưa có đối tác giải
ngân. Nên mọi lời hứa về vay vốn hiện tại là lời hứa không giữ được, và phải rút
xuống đúng mức thật.

Điều này hợp với tính năng lõi ở trên hơn là mâu thuẫn với nó. Cho vay là lời hứa
*sẽ có tiền*; chứng minh chi phí là *tiền bạn đang mất mỗi kỳ*. Cái sau kiểm chứng
được ngay, không cần giấy phép nào, và nó dựng đúng bộ sổ mà sau này bên cho vay
sẽ cần đọc. Làm thuế trước không phải là hoãn cho vay — nó là cách kiếm được dữ
liệu để cho vay.

### Đã sửa ngay (17/08)

Nút **"Ứng vốn ngay"** trong hoá đơn từng ghi `status: 'advanced'` và
`advanced_amount` = 80% giá trị hoá đơn vào DB, rồi báo *"Đã ứng vốn X đồng"* —
trong khi không đồng nào rời đi. Ba cái sai cùng lúc:

1. Khách được báo là tiền sắp về
2. Trạng thái hoá đơn thật bị ghi đè bằng trạng thái nó chưa từng đạt tới
3. Thẻ KPI **"Đã ứng vốn"** cộng các số đó lại và hiển thị như tiền đã nhận — đúng
   kiểu bịa số mà `mockData` đã bị xoá vì nó

Đã bỏ hàm thực thi, giữ lại phần ước tính (vẫn hữu ích để khách cân nhắc), đổi
nhãn thành *"chưa khả dụng"* kèm câu nói thẳng **"bấm cũng chưa có tiền về tài
khoản"**, hạ tông màu từ nút gradient xuống khối xám, và thay thẻ KPI thứ tư bằng
**"Đã thu"** — số đo thật của cùng thứ mà thẻ cũ đang với tới.

### Đã quét sạch (17/08) — 14 chỗ

| Chỗ | Đã bỏ | Thay bằng |
|---|---|---|
| `landing.vi/en.ts` — **tiêu đề trang chủ** | "Vốn về tài khoản trước khi khách trả tiền" + "ứng trước tới 80%" | "Đóng thuế trên lợi nhuận, không phải trên doanh thu" |
| `vi/en.ts` — hero badge | "Vốn lưu động cho doanh nghiệp nhỏ" | "Từ 2026: bỏ thuế khoán — hộ kinh doanh tự kê khai" |
| `vi/en.ts` — khối Giải pháp | 4 tuyên bố sai (xem dưới) | 6 dòng, mỗi dòng là thứ có thật trong repo |
| `vi/en.ts` — khối AI | "ML huấn luyện trên hàng triệu giao dịch, 94% chính xác" | "Không phải hộp đen — thẻ điểm 5 yếu tố, trọng số công khai" |
| `Landing.tsx` — bảng giá | "Hồ sơ ứng vốn hóa đơn"; tầng "Tổ chức tín dụng" | Năng lực chi phí/thuế; tầng "Kế toán & đại lý thuế" |
| `Landing.tsx` — dưới bảng giá | "Phí ứng vốn do tổ chức tín dụng chi trả" | "MIMI không nộp thuế thay bạn và không cấp vốn" |
| `SettingsPage.tsx` | "Ứng vốn hóa đơn" trong gói | "Tự động phân loại chi phí" |
| `DashboardSidebar.tsx` | Mục "Vay vốn"; nhóm "Vốn & Tín dụng" | Bỏ mục; gộp Điểm tín dụng vào "Hằng ngày" |
| `DashboardLayout.tsx` | Tab mobile "Vay vốn" | "Kết nối" (Fintech Hub) |
| `DashboardOverview.tsx` | Insight CTA "Xem hạn mức" | "Xem ngưỡng thuế" |
| `DashboardOverview.tsx` | Thao tác nhanh "Đăng ký vay vốn" | "Phân loại chi phí" |
| `AIChatWidget.tsx` | "Tôi nên ứng vốn hóa đơn nào?" | 3 câu hỏi về chi phí/ngưỡng thuế |
| `vi/en.ts` — lời chào AI | "tư vấn vay vốn" | "phân loại chi phí, đối chiếu ngưỡng thuế" |
| `vi/en.ts` — footer | "Invoice Financing", "Vay vốn" | "Sổ chi phí", "Kê khai thuế" |
| `onboarding.vi.ts` | "Tăng hạn mức vốn"; "Dự kiến hạn mức" | "Nguồn để dựng sổ chi phí"; "Doanh thu ghi nhận được" |

Kiểm chứng trên trang thật: quét 13 chuỗi cấm trong `document.body.innerText`, còn
lại **0**.

### Bốn tuyên bố sai tìm thấy trong lúc quét

Đáng lo hơn phần cho vay, vì hai cái cuối là loại giám khảo hoặc kiểm toán viên
tra được:

| Tuyên bố cũ | Sự thật |
|---|---|
| "Ứng tiền từ hóa đơn trong 4 giờ, lên đến 80%" | Không có dịch vụ nào |
| "Hạn mức đến ₫10 tỷ, lãi suất cạnh tranh" | Không có giấy phép tín dụng |
| **"độ chính xác dự báo dòng tiền 94%"** | Chưa từng đo cái gì |
| **"chuẩn ISO 27001"** | Không có chứng chỉ này |

Kèm theo: *"Mô hình machine learning được huấn luyện trên hàng triệu giao dịch tài
chính Việt Nam"*. `credit-scoring/scoring.ts` là **thẻ điểm tuyến tính trọng số cố
định** — năm yếu tố, trọng số viết cứng 0,25/0,2/0,25/0,2/0,1. Không có file mô
hình, không có tập huấn luyện. "Hàng triệu giao dịch" thực tế là tài khoản demo
với vài trăm dòng sandbox.

Bản thay thế kể đúng thiết kế thật, và với sản phẩm lấy tính kiểm chứng làm gốc thì
**thẻ điểm minh bạch là câu chuyện mạnh hơn con số 94% không ai xác minh được**.

### Bổ sung 18/08 — `LoansPage` còn một lời hứa nữa

Rút khỏi thanh điều hướng chưa đủ: trang vẫn truy cập được, và nút gửi yêu cầu vẫn
ghi `loan_applications` với `status: 'pending'` rồi báo **"Đã gửi yêu cầu vay, đang
chờ duyệt"**. Không ai duyệt cả — không giấy phép, không đối tác giải ngân. Cùng
loại lỗi với nút ứng vốn, chỉ nhẹ hơn vì không nói tiền đã về.

Đã sửa: banner hổ phách đặt **trên cùng trang**, trước cả đồng hồ điểm số, nói rõ
chưa cho vay được và con số bên dưới là ước tính chứ không phải hạn mức đã cấp.
Toast đổi thành *"Đã ghi nhận nhu cầu vay của bạn. MIMI chưa có đối tác cho vay —
chúng tôi sẽ báo bạn khi có."*

Giữ lại form một cách có chủ đích: **ai hỏi vay và hỏi bao nhiêu chính là bằng
chứng nhu cầu** để đi tìm đối tác cho vay. Nó là danh sách chờ, và giờ nó nói đúng
như vậy.

### Giữ nguyên

- **`lessons.ts`** — dạy khái niệm ứng vốn, hạn mức. Đó là giáo dục tài chính, không
  phải lời hứa sản phẩm.
- **`CreditScoring`** — mô tả hồ sơ của khách từ dữ liệu của khách, không hứa ai sẽ
  cho vay. Route `/dashboard/loans` vẫn sống, chỉ rút khỏi thanh điều hướng.

---

## 9. Ghi chú về một lỗi vừa sửa

Bản seed `legal_documents` ngày 14/08 ghi Luật Thuế TNCN sửa đổi hiệu lực
**01/01/2026**. Bài báo được trích trong `url_nguon` **không hề nói ngày hiệu lực**
— con số đó là suy ra, không phải đọc được. Nguồn công bố luật cho biết hiệu lực
**01/07/2026**, phần thu nhập từ kinh doanh áp dụng cho kỳ tính thuế 2026.

Cùng dòng đó còn gộp hai luật làm một: ngưỡng 500 triệu của **GTGT** hiệu lực
01/01/2026, của **TNCN** thì theo luật TNCN. Đã tách và sửa.

Đây là lần thứ hai một con số thuế lọt vào sản phẩm mà không đọc kỹ nguồn — lần đầu
là `EXEMPTION_THRESHOLD_VND = 1 tỷ`. Cùng một dạng lỗi: **suy ra thay vì đọc được.**
Mục 7 ở trên tồn tại là để lần thứ ba không xảy ra.
