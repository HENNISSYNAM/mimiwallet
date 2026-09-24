# Kiểm toán trước ra mắt — MIMI, Financial Truth & Compliance Copilot

Ngày 24/09/2026. Viết theo bản chỉ đạo "FINAL PRODUCT + CUSTOMER JOURNEY + LAUNCH EXECUTION". **Chưa sửa mã sản xuất theo bản chỉ đạo này** — tài liệu chờ duyệt.

Cơ sở: nhánh `main` tới commit `7d279f1`, cộng phần việc đang dở chưa commit (mục 0). Mọi nhận định dưới đây đã đối chiếu với mã hoặc với CSDL production trong phiên làm việc này; chỗ nào chưa kiểm được thì ghi "chưa kiểm".

---

## 0. Việc đang dở (chưa commit, chưa deploy)

Làm trước khi nhận bản chỉ đạo, theo yêu cầu "lọc ngầm + thông báo". Đã xanh 1334/1334 test, `deno check` sạch. **Chưa đưa lên** — chờ anh quyết giữ, sửa hay bỏ theo bản chỉ đạo:

| Phần | Khớp với bản chỉ đạo | Lệch với bản chỉ đạo |
|---|---|---|
| `giai_trinh_tien_vao` (người xác nhận khoản tiền vào không phải doanh thu; chỉ máy chủ ghi; có nhật ký) | Là mầm của `revenue_classifications` (mục I) | Chỉ hai trạng thái (doanh thu / không); thiếu "Tôi chưa chắc", thu hộ, chuyển nội bộ do người xác nhận; không có lịch sử để hoàn tác |
| `docDoanhThuQuy` trừ khoản đã xác nhận khỏi doanh thu từ sao kê | Đúng nguyên tắc "máy gợi ý, người quyết" | Chỉ trang Tờ khai và trợ lý trừ; Tổng quan, Nhắc thuế, `tax-summary` không trừ → **các màn hình sẽ lệch số** (mục E) |
| Hệ thống thông báo: `thong_bao`, Web Push, cron quét mỗi giờ, chuông, bật trong Nhắc thuế | Là kênh cho case và lịch nghĩa vụ (mục 13–14) | Thông báo đang là "cảnh báo rời", chưa gắn vào case có bước giải quyết |
| Phụ lục giải trình in kèm tờ khai | Evidence pack thu nhỏ | Chưa có bản xuất theo năm (MIMI Rescue) |

Khuyến nghị: **giữ và đổi hướng** — `giai_trinh_tien_vao` đổi thành `revenue_classifications` ngay trong Sprint 1, thông báo đổi thành lớp giao nhận của case và lịch nghĩa vụ ở Sprint 2. Không deploy nguyên trạng. **Bỏ điều kiện gói Growth ở bước xác nhận** (xem P-4): xác nhận phải miễn phí.

---

## Tiến độ (cập nhật 24/09/2026, tự quyết theo `THANG_DIEM_QUYET_DINH.md`)

| Việc | Trạng thái | Điểm |
|---|---|---|
| Gỡ `open-banking`, 3 hàm Stripe, link Stripe chế độ thử, thẻ "Thẻ quốc tế (Stripe)" | Đã lên production (`b186bec`), gọi lại trả 404 | 95 |
| P-4 Xác nhận miễn phí; `revenue_classifications` + lịch sử + hoàn tác + hàng loạt | Đã lên production | 90 |
| Lọc ngầm + thông báo (web push, chuông, bật trong Nhắc thuế) | Đã lên production; lượt quét đầu tạo đúng 1 thông báo cho công ty demo | 93 |
| Hàng đợi tiền vào trên Tổng quan (4 nút, nhóm, hoàn tác); "Tiền vào tháng này" thay "Doanh thu tháng này"; thẻ điểm tín dụng → kỳ khai kế tiếp | Xong, chờ đưa lên cùng đợt 2 | 90 |
| P-1 Nhập sao kê Excel/CSV (`sao-ke`, `sao_ke_nhap`, chống trùng); gỡ INSERT/DELETE của trình duyệt trên `transactions`; `transactions.source` | Đã lên production (đợt 2); đã kiểm: `transactions` chỉ còn chính sách SELECT | 100 |
| Một hàm doanh thu duy nhất (4 con số + độ phủ + tiền mặt), `tax-summary` đủ trường | Chưa làm | — |
| Đo lường: mở rộng `product_events` có sẵn (thêm `company_id`, sự kiện "lần đầu" một lần mỗi công ty), view `chi_so_pilot` (% giá trị tiền vào đã giải thích) | Xong, đưa lên đợt 3 | 90 |

Việc còn chờ phía chủ dự án: SePay canh tài khoản nhận tiền của MIMI (chưa có sự kiện nào); lỗ hổng cũ trong gói npm (react-router, lodash, postcss… mức cao) — có từ trước, chưa nâng cấp vì phạm vi rộng.

---

## P. Phản biện bản chỉ đạo (đọc trước các mục còn lại)

Bản chỉ đạo đúng ở điều cốt lõi: **tiền vào ≠ doanh thu**, máy gợi ý và người quyết, con số nào cũng truy được về bằng chứng, không làm thêm tính năng trình diễn. Nhưng đặt cạnh mã và dữ liệu thật thì có chín chỗ cần sửa trước khi làm:

1. **Nó bỏ sót chỗ nghẽn lớn nhất: đưa dữ liệu vào.** Cas đang tắc, SePay không có lịch sử, bộ đọc CSV có sẵn mà không màn nào dùng. Hôm nay một hộ kinh doanh mới **không có đường nào** đưa 12 tháng sao kê vào MIMI. Chỉ tiêu "≥70% kết nối/nhập thành công" là bất khả thi nếu không làm việc này trước tiên. → **Nhập sao kê Excel/CSV** (ngân hàng nào cũng cho tải) là việc số 1, trước cả màn phân loại.

2. **Nó chỉ nhìn một chiều sai lệch.** Bản chỉ đạo lo tiền vay, tiền người nhà làm phình doanh thu. Chiều ngược lại cũng có: **tiền mặt bán hàng không đi qua ngân hàng**. Hộ tạp hoá thu tiền mặt nhiều. "Doanh thu đã xác nhận từ sao kê" khi đó thấp hơn thật, và nếu trình bày như doanh thu thì là khai thiếu. → Thêm đúng một câu hỏi dần: "Bạn có thu tiền mặt không? Khoảng bao nhiêu mỗi tháng?". Độ phủ (coverage) phải có hạng mục "tiền mặt chưa ghi".

3. **Mười một lựa chọn cho câu "Khoản tiền này là gì?" là quá nhiều** với người dùng chính (ba mẹ lớn tuổi, không rành công nghệ — insight thật đã gom). → Hiện 4 nút: *Tiền bán hàng* · *Chuyển giữa tài khoản của tôi* · *Không phải tiền bán hàng* (bấm vào mới hiện vay / người nhà / góp vốn / hoàn tiền / đặt cọc / thu hộ / khác) · *Tôi chưa chắc*. Gợi ý của MIMI đứng sẵn làm nút chính. Mô hình dữ liệu vẫn giữ đủ 11 trạng thái.

4. **Thu tiền ở bước xác nhận là giết kích hoạt** — và đó đúng là lỗi của phần tôi đang làm dở (gói Growth mới được xác nhận). Bản chỉ đạo định nghĩa kích hoạt là "xác nhận khoản ngoại lệ đầu tiên". → **Xác nhận miễn phí, không giới hạn.** Chỉ thu ở: xuất tờ khai (đã có, 10.000đ), xuất bộ đối chiếu năm, theo dõi liên tục, dựng lại nhiều năm, nhờ kế toán. Sửa phần đang dở trước khi deploy.

5. **"tax_revenue_basis" không được là kết luận pháp lý.** MIMI không có thẩm quyền quyết định cơ sở tính thuế. → Đổi tên hiển thị thành "doanh thu MIMI dùng để soạn bản nháp", luôn kèm nguồn và độ phủ; người nộp thuế ký và chịu trách nhiệm.

6. **Chỉ số North Star dễ bị "làm đẹp".** "Số case đã giải quyết mỗi tháng" tăng được bằng cách đẻ ra nhiều case vặt. → Trong pilot dùng **% giá trị tiền vào đã giải thích được** làm chỉ số chính (bản chỉ đạo để nó là phụ); số case đã giải quyết làm phụ.

7. **Mô hình dữ liệu nặng quá cho 30 hộ pilot.** Bản chỉ đạo (và mục I bên dưới) có khoảng 10 bảng mới. `revenue_figures`, `obligations`, `case_steps`, `expert_reviews` đều **tính được ngay lúc đọc** từ dữ liệu đã có. Lưu thành bảng khi chưa có người dùng là thêm chỗ lệch dữ liệu. → Sprint 1 chỉ thêm: `transactions.source` + `imports`, `revenue_classifications` + `revenue_classification_events`, `product_events`. Các bảng khác để khi pilot cho thấy cần.

8. **Người chuyên môn là việc vận hành, không phải việc lập trình — ở giai đoạn này.** → Pilot: nút "Nhờ kế toán kiểm tra" xuất gói hồ sơ (PDF/Excel) rồi gửi thủ công cho 1–2 kế toán quen. Chưa dựng `expert_reviews` hay luồng phân công.

9. **Sàn TMĐT nằm trong ICP nhưng MIMI chưa có một dòng dữ liệu sàn nào.** Tiền sàn trả là tiền ròng sau phí, đối chiếu khác hẳn tiền khách chuyển khoản. Người dùng thật mà MIMI đang có bằng chứng là hộ kinh doanh bán tại chỗ, nhận chuyển khoản. → Pilot đợt 1 **thu hẹp** vào nhóm này; người bán online vào đợt 2, qua nhập file báo cáo thu nhập của sàn.

**Ngoại lệ với "chưa viết mã":** mục 25 của chính bản chỉ đạo yêu cầu kiểm soát bảo mật. Ba việc sau nên làm ngay, không chờ duyệt kiến trúc:
- gỡ hàm `open-banking` đang sinh giao dịch giả;
- gỡ ba hàm Stripe;
- chặn trình duyệt INSERT/DELETE vào `transactions`, chỉ khi đã có đường nhập sao kê thay thế.

---

## A. Bản đồ kiến trúc hiện tại

**Giao diện** (React + Vite, Vercel, `www.mimiwallet.online`). Thanh bên: Trợ lý · Tổng quan · Thư viện chứng từ · Nhắc thuế · Kết nối, cộng mục "Công cụ" (Kiểm tra trước khi chuyển, Soạn tờ khai, Khoản chi thiếu chứng từ, Chi phí AI). Trang con: Tờ khai, Chứng từ chi phí, Hoá đơn, Báo cáo, Tách chi cá nhân, Giấy tờ, Fintech (Cas + SePay), Cài đặt.

**Edge function đang chạy (22):**

| Nhóm | Hàm | Ghi chú |
|---|---|---|
| Lõi sự thật tài chính | `tro-ly`, `to-khai`, `tax-summary`, `tax-lookup` | `tro-ly` là bộ định tuyến theo mẫu + năng lực tính sẵn; `to-khai` có hệ luật, soạn tờ khai, xuất có tính tiền |
| Dữ liệu ngân hàng | `bank-link`, `cas-webhook`, `bank-webhook` | Cas đang tắc phía Casso; SePay chạy (chỉ tiền mới, không có lịch sử) |
| Thu tiền MIMI | `subscription-billing`, `bank-webhook` (nhánh tài khoản MIMI) | Chuyển khoản + mã tham chiếu; SePay **chưa** canh tài khoản MIMI |
| Mở rộng (đóng băng) | `tac-tu`, `chi-phi-ai`, `macro-news`, `dau-thoi-gian`, `mcp`, `chat`, `elevenlabs-tts` | Ngoài phạm vi ra mắt |
| Tàn dư phải gỡ | `open-banking` (sinh giao dịch giả), `check-subscription` / `create-checkout` / `customer-portal` (Stripe, không thu được ở VN) | Vẫn gọi được |
| Hạ tầng | `cong-ty`, `delete-account`, `nap-kho-luat` | Thành viên/vai trò, xoá tài khoản, nạp Công báo |

**Lõi dùng chung** (`supabase/functions/_shared`, dùng cả ở trình duyệt): `ledger/internal-transfer`, `ledger/reconcile-qr` + `qr-reconciler`, `ledger/receivables`, `doi-soat/cham-diem` (tiền về ↔ hoá đơn bán), `chung-tu/khop-chung-tu` (tiền chi ↔ hoá đơn đầu vào), `phan-loai/ca-nhan`, `phan-loai/tien-vao`, `luat/he-luat` (có `PHIEN_BAN_HE_LUAT`, căn cứ đối chiếu kho Công báo, `hieu-luc`), `thue/han-ke-khai`, `bat-thuong`, `billing`, `mst/tra-cuu`, `minh-hoa`.

**Dữ liệu chính:** `transactions` (thô), `transaction_labels` (nhãn, chủ công ty ghi thẳng được), `invoices`, `gdt_invoices`, `chung_tu_quet`, `ho_so_thue`, `to_khai_nhap` (có mã băm), `van_ban_phap_luat` + `doan_phap_luat`, `nhat_ky_quyet_dinh`, `hoi_thoai_tro_ly`, `subscriptions` / `subscription_invoices` / `luot_to_khai` / `tien_ve_mimi`, `luu_tru.ban_ghi`.

---

## B. Bản đồ hành trình khách hàng

Cột "Hiện trạng" cho biết điều đang có thật hôm nay.

| # | Giai đoạn | Mục tiêu người dùng | Câu hỏi trong đầu họ | MIMI làm gì | Dữ liệu cần | Màn hình | CTA | Sự kiện thành công | Thất bại / trạng thái trống | Hiện trạng |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Landing | Hiểu MIMI giúp gì | "Có đúng cái tôi đang lo không?" | Nói một câu: tiền vào chưa chắc là doanh thu | — | Trang chủ | "Kiểm tra sao kê của tôi" | `landing_cta_clicked` | Không hiểu → rời | Landing còn nói AI/agent/chi phí AI; chưa có thông điệp "tiền vào ≠ doanh thu" |
| 2 | Đăng ký / đăng nhập | Vào nhanh | "Có phải khai nhiều không?" | Chỉ email công ty hoặc Google | Email | `/register`, `/login` | "Tiếp tục với Google" | `signup_completed` | Lỗi OTP/email → nói rõ cách sửa | Đã gọn (1 trường) |
| 3 | Nhận diện doanh nghiệp | MIMI biết tôi là ai | "Sao phải kể lại những gì nhà nước đã biết?" | Tra mã số thuế: tên, loại hình, địa chỉ, cơ quan thuế | MST (10 hoặc 12 số) | Thẻ chào mừng | "Đúng, tiếp tục" | `business_identified` | Không có MST → hỏi tên + loại hình; tra không thấy → nói rõ | Đã làm 24/09 (chưa hỏi lại tên/loại hình); vẫn hỏi 3 câu thừa (mục "Câu hỏi thừa") |
| 4 | Kết nối / nhập dữ liệu | Đưa sao kê vào | "Có an toàn không? Mất bao lâu?" | Cas (lịch sử), SePay (tiền mới), **nhập CSV/Excel** | Tài khoản ngân hàng hoặc tệp sao kê | Kết nối | "Tải sao kê lên" / "Liên kết ngân hàng" | `financial_source_connected` | Ngân hàng không hỗ trợ → mời tải tệp | Cas tắc; SePay không có lịch sử; **bộ đọc CSV có sẵn nhưng không có màn nào dùng** → người mới gần như không có đường vào dữ liệu thật |
| 5 | Quét lần đầu | Thấy MIMI hiểu tiền của mình | "MIMI thấy gì?" | Đọc hết, tách nội bộ, gợi ý bản chất, đếm phần chưa rõ | Giao dịch | Màn kết quả quét | "Xem 34 khoản" | `first_scan_completed`, `first_exception_detected` | 0 giao dịch → "Chưa có giao dịch để MIMI kiểm tra…" | Chưa có. Tổng quan hiện dòng tiền, không có "đã đọc N / cần xem M" |
| 6 | Xem tiền vào | Biết khoản nào là gì | "Khoản 50 triệu này tính là gì?" | Gợi ý kèm lý do ("trông giống tiền vay vì có chữ 'vay'"), gom nhóm | Nội dung CK, người chuyển, lịch sử | **Tiền vào & Doanh thu** (chưa có) | "Áp dụng 17 khoản" | `first_classification_confirmed` | Không gợi ý được → "Tôi chưa chắc" vẫn là câu trả lời hợp lệ | Chỉ có thông báo từng khoản (đang dở); không có màn tổng, không gom nhóm, không "Tôi chưa chắc", không hoàn tác |
| 7 | Chốt doanh thu | Có con số doanh thu đáng tin | "Doanh thu thật của tôi là bao nhiêu?" | Tách: tiền vào / ước tính / đã xác nhận / cơ sở tính thuế | Phân loại | Tiền vào & Doanh thu | "Chốt doanh thu tháng 9" | `revenue_confirmed` | Còn khoản chưa rõ → hiện số tiền chưa rõ bên cạnh | Chưa có 4 con số tách bạch; Tổng quan gọi tổng tiền vào là "Doanh thu tháng này" |
| 8 | Đối chiếu hoá đơn | Tiền về khớp hoá đơn nào | "Hoá đơn nào khách chưa trả, tiền nào chưa có hoá đơn?" | Ghép tiền về ↔ hoá đơn bán, tiền chi ↔ hoá đơn vào | Giao dịch + hoá đơn | Hàng đợi ngoại lệ (chưa có) | "Xem 13 khoản chưa khớp" | `first_reconciliation_completed` | Chưa có hoá đơn → nói nguồn nào còn thiếu | Có hai bộ ghép (`cham-diem`, `khop-chung-tu`) nhưng nằm ở hai màn khác nhau, không có màn "187 đã giải thích, 13 cần xem" |
| 9 | Hồ sơ thuế | MIMI biết nghĩa vụ của tôi | "Sao lại hỏi tôi câu này?" | Hỏi dần, chỉ khi câu trả lời đổi kết quả | Hồ sơ thuế + doanh thu | Tờ khai → Hồ sơ thuế | "Lưu" | `tax_profile_completed` | Không chắc → "Tôi chưa chắc", MIMI nói hệ quả | Hỏi hết một lần, nhiều thuật ngữ (mục "Thuật ngữ") |
| 10 | Lịch nghĩa vụ cá nhân hoá | Biết việc gì, khi nào, vì sao là tôi | "Tôi phải làm gì, trước ngày nào?" | Sinh nghĩa vụ từ hồ sơ + luật có hiệu lực + độ đủ dữ liệu | Hồ sơ, doanh thu, luật | Nhắc thuế | "Kiểm tra 8 giao dịch" | `calendar_generated` | Hồ sơ thiếu → nói thiếu gì | Lịch hiện chung cho mọi người (4 quý), không "vì sao là tôi", không "còn thiếu gì" |
| 11 | Giải quyết case | Xử lý xong một việc | "Làm sao cho hết vấn đề này?" | Case có bước, đếm 3/5 | Case + dữ liệu liên quan | Màn case (chưa có) | Bước kế tiếp | `first_case_created`, `first_case_resolved` | Không có case → "Hiện MIMI chưa phát hiện việc cần xử lý từ dữ liệu đã kết nối." | Chưa có case; chỉ có cảnh báo rời |
| 12 | Nhờ kế toán | Có người chuyên môn xem | "Ai xem giúp? Bao nhiêu tiền?" | Đóng gói case gửi người xem | Case + bằng chứng | Case → "Nhờ kế toán kiểm tra" | "Gửi kế toán" | `expert_review_requested` | Chưa có người xem → nói thời gian chờ thật | Chỉ có mời thành viên vai trò Kế toán; chưa có gói hồ sơ, chưa có quyết định ghi lại |
| 13 | Thanh toán | Trả đúng lúc có giá trị | "Trả tiền để được gì?" | Gắn giá vào kết quả | — | Tại chỗ bị chặn | "Xuất bộ đối chiếu 2026" | `first_paid_action` | Chuyển thiếu/thừa → không tự kích hoạt, liên hệ | Có: 10.000đ/tờ khai, gói tháng, chuyển khoản tự duyệt (webhook). Chữ trên thẻ gói còn "Starter/Growth" |
| 14 | Người dùng quay lại | Xem nhanh rồi đi | "Hôm nay có gì cần tôi?" | Hàng đợi việc + những gì đã ổn | Case, lịch, đồng bộ | Trang chủ "Hôm nay MIMI đang theo dõi gì?" | "Xem 2 việc" | `week2_return` | Không có việc → nói điều đã kiểm, không nói "bạn tuân thủ" | Trang chủ là trợ lý, gợi ý đầu tiên là chi phí AI |

### Câu hỏi đang hỏi thừa
- **"Cửa hàng có bao nhiêu người?"** và **"Điều bạn cần nhất lúc này?"** (thẻ chào mừng): ghi vào `employee_count`, `primary_goal`, **không chỗ nào đọc lại**. Bỏ.
- **"Bạn đang kinh doanh ngành gì?"** (thẻ chào mừng, 6 lựa chọn đời thường): ghi `industry`, chỉ để hiển thị. Tờ khai lại hỏi **nhóm ngành** theo danh mục thuế — hỏi hai lần, hai bộ từ khác nhau.
- **"Cách tính thuế TNCN"**: hỏi mọi hộ, trong khi chỉ cần khi doanh thu 1–3 tỷ.
- **"Ngày bắt đầu kinh doanh"**: hỏi mọi người; chỉ cần khi mới ra kinh doanh trong năm.

### Câu hỏi trùng
- Loại hình (thẻ chào mừng `account_type`) ↔ "Bạn nộp thuế với tư cách" (hồ sơ thuế). Đã gộp khi có MST (24/09); **không có MST vẫn hỏi hai lần**.
- Ngành (thẻ chào mừng) ↔ nhóm ngành (hồ sơ thuế).

### Câu hỏi còn thiếu (nên hỏi dần, đúng lúc)
- "Khoản tiền này là gì?" có "Tôi chưa chắc" — lúc gặp khoản đáng ngờ.
- "Bạn còn tài khoản ngân hàng nào khác dùng cho kinh doanh không?" — để biết độ phủ dữ liệu.
- "Bạn có bán trên Shopee/TikTok không?" — chỉ khi thấy tiền về từ sàn.
- "Có ai chuyển tiền hộ khách cho bạn không?" (thu hộ) — chỉ khi gặp mẫu đó.

### Chỗ đang dùng thuật ngữ thuế/kế toán
- Hồ sơ thuế: "Cách tính thuế thu nhập cá nhân", "Theo tỷ lệ trên doanh thu", "đã nộp thuế GTGT hoặc TNCN (hoặc bị khấu trừ, nộp thay)", "quyết toán thuế TNDN", "quan hệ liên kết", nhóm ngành "Hoạt động cho thuê tài sản trừ bất động sản", "Sản xuất, vận tải, dịch vụ có gắn với hàng hoá, xây dựng có bao thầu nguyên vật liệu".
- Tờ khai: "01/TKN-CNKD", "chỉ tiêu [11]" hiện trên màn chính (cần ở bản in, không cần ở câu hỏi).
- Nhắc thuế: "thuế GTGT và thuế TNCN", "thuế suất 17%".
- Kết nối: "Cas", "SePay", "grant", "Update Mode".

### Hành trình cụt
- Tổng quan: nút **"Vay vốn"** dẫn sang Báo cáo; thẻ **"Điểm tín dụng MIMI"** — tàn dư sản phẩm cho vay.
- Kết nối: 3 kết nối "mock" trong demo hiện "Đang chạy".
- Nhắc thuế: mốc 1 tỷ "đã vượt" mà không có việc tiếp theo.
- Người mới không liên kết được ngân hàng (Cas tắc, SePay không có lịch sử) và **không có nút nhập tệp** → không tới được giá trị đầu tiên.

### Chỗ MIMI đã biết mà vẫn hỏi
- Không có MST: loại hình hỏi hai lần (xem trên).
- Nhóm ngành: có thể gợi ý từ hoá đơn bán ra (tên hàng hoá), nhưng vẫn bắt chọn trống.
- "Đã nộp thuế trong năm": có thể thấy từ giao dịch nộp ngân sách trên sao kê, nhưng vẫn hỏi.

---

## C. Module dùng lại được

| Module | Dùng cho |
|---|---|
| `phan-loai/tien-vao.ts` (gợi ý theo nội dung CK, có lý do, không tự trừ) | Gợi ý trong Tiền vào & Doanh thu |
| `phan-loai/ca-nhan.ts` | Gợi ý chi cá nhân |
| `ledger/internal-transfer.ts` (`findInternalTransfers`, `needsReview`) | Trạng thái `internal_transfer` |
| `doi-soat/cham-diem.ts` (chấm điểm tiền về ↔ hoá đơn, "khớp chắc" / "cần xem") | Hàng đợi ngoại lệ phía thu |
| `chung-tu/khop-chung-tu.ts` | Hàng đợi ngoại lệ phía chi |
| `ledger/reconcile-qr.ts`, `qr-reconciler.ts` | Tiền về từ mã QR |
| `luat/he-luat.ts` (+ `hieu-luc`, `doc-can-cu`, `PHIEN_BAN_HE_LUAT`) | Nghĩa vụ, căn cứ có phiên bản |
| `thue/han-ke-khai.ts` | Hạn nộp |
| `luat/to-khai.ts` + hành động `xuat` (có mã băm, tính tiền theo kỳ) | Xuất tờ khai |
| `bat-thuong/phat-hien.ts` | Case "giao dịch bất thường" (lừa đảo) |
| `billing/thu-tien.ts` | Thu tiền mọi gói |
| `mst/tra-cuu.ts` | Nhận diện doanh nghiệp |
| `nhat_ky_quyet_dinh` | Nhật ký quyết định (đã có ai / vai trò / lúc nào) |
| `bang_chung` + `themMaBam` ở trợ lý | Khung "Trả lời → Căn cứ → Việc cần làm" |
| `parseTransactionsCsv.ts` (chưa dùng) | Nhập sao kê |
| `cong-ty` + vai trò `ke_toan` | Nền cho người xem chuyên môn |
| Phần đang dở: `giai_trinh`, `thong-bao` | Xem mục 0 |

---

## D. Mảnh còn thiếu

1. **Lớp phân loại doanh thu** đủ trạng thái, có lịch sử và hoàn tác (`revenue_classifications`).
2. **Phân loại hàng loạt** theo người chuyển / mẫu nội dung / tài khoản của mình.
3. **Nhập sao kê** (CSV/Excel) có đợt nhập, chống trùng, giữ bản gốc.
4. **Độ phủ dữ liệu** (tháng nào, tài khoản nào đã có) — hiện không đo.
5. **Một hàm tính doanh thu duy nhất** trả 4 con số tách bạch.
6. **Hàng đợi ngoại lệ đối chiếu** gộp các bộ ghép đang có.
7. **Lịch nghĩa vụ cá nhân hoá** (vì sao là tôi, dựa trên gì, thiếu gì).
8. **Case** có bước giải quyết.
9. **Gói hồ sơ cho kế toán** + ghi quyết định.
10. **Đo lường theo công ty cho hành trình kích hoạt.** *(Đính chính 24/09: MIMI đã có `product_events` + `track()` từ 13/08, ghi theo người dùng — bản đầu của tài liệu này nói nhầm là không có. Thiếu là: gắn công ty, các sự kiện kích hoạt, chỉ số % tiền vào đã giải thích.)*
11. **Dữ liệu sàn TMĐT** — chưa có (để Sprint sau; bắt đầu bằng nhập tệp đối soát của sàn).

---

## E. Logic trùng lặp / mâu thuẫn

| Chỗ | Vấn đề |
|---|---|
| Doanh thu tính ở ít nhất 5 chỗ: `tax-summary`, `luat/doc-su-kien` (`docDoanhThuQuy`), Tổng quan (cộng tiền vào phía trình duyệt), `ChungTuPage` (cộng tiền vào cả năm), Báo cáo, năng lực trợ lý | Không cùng định nghĩa: `ChungTuPage` không trừ chuyển nội bộ; `tax-summary` có trừ; phần đang dở chỉ trừ khoản đã xác nhận ở `docDoanhThuQuy` → **mốc 1 tỷ ở Nhắc thuế và số ở Tờ khai có thể khác nhau** |
| Hai kho "nhãn": `transaction_labels` (chủ công ty ghi thẳng, có `is_personal`) và `giai_trinh_tien_vao` (chỉ máy chủ ghi) | Phải gộp về một lớp phân loại |
| Hai bộ từ ngành: `industry` (fnb/retail…) và `nhom_nganh` (danh mục thuế) | Hỏi hai lần, không nối với nhau |
| Hai loại hình: `account_type` và `loai_nguoi_nop` | Nối một chiều (`loaiTuTaiKhoan`), vẫn hỏi hai lần khi không có MST |
| Hai đường thu tiền: Stripe (chết) và chuyển khoản | Gỡ Stripe |
| Hai quy ước dấu số tiền trong `transactions` (luôn dương + `type`, và có dấu) | `chieuTien` xử lý được, nhưng mọi phép cộng mới đều phải nhớ gọi nó |

---

## F. Rủi ro khi tính doanh thu

1. **Tiền vào bị gọi là doanh thu.** Tổng quan ghi "Doanh thu tháng này" cho tổng tiền vào. Vi phạm nguyên tắc 5 ("ước tính không được trông như đã xác minh").
2. **Máy tự trừ không cần người.** Chuyển nội bộ suy đoán (`needsReview`: cùng số tiền, sát ngày) đang bị trừ khỏi doanh thu tự động. Trừ nhầm một khoản bán hàng là khai thiếu.
3. **Rơi về nguồn yếu hơn mà không nói rõ ở mọi chỗ.** `chonDoanhThu` rơi từ hoá đơn điện tử xuống sao kê; có câu cảnh báo ở Tờ khai, nhưng mốc 1 tỷ ở Nhắc thuế trình bày như chắc chắn.
4. **Không đo độ phủ.** Người dùng có 3 tài khoản mà mới nối 1 thì doanh thu thấp hơn thật, không ai biết.
5. **Chưa có loại đặt cọc, hoàn tiền, thu hộ, tiền sàn trả sau khi trừ phí.**
6. **`ChungTuPage` cộng mọi tiền vào cả năm** làm "doanh thu năm" để so ngưỡng.

---

## G. Rủi ro đúng sai về thuế / kế toán

1. **Lịch khai theo quý cho mọi hộ.** Chưa phân biệt khai tháng, khai năm, mới ra kinh doanh, bán qua sàn có khấu trừ.
2. **Phần đang dở làm giảm doanh thu tính thuế** theo xác nhận của người dùng. Theo đặc tả audit của dự án, thay đổi quy tắc thuế cần người có chuyên môn duyệt — **chưa duyệt**.
3. **Mẫu tờ khai theo Thông tư 50/2026 chưa được kế toán đối chiếu từng chỉ tiêu.** Xuất XML cho Cổng thuế cần mẫu XML chuẩn của HTKK — chưa có.
4. **Loại hình theo MST** suy từ `orgType` bằng mẫu chữ; loại lạ thì hỏi lại (đúng), nhưng chưa thử với dữ liệu hộ kinh doanh thật.
5. **Căn cứ pháp lý** đã đối chiếu kho Công báo và có trạng thái hiệu lực — điểm mạnh, cần giữ khi làm lịch nghĩa vụ.

---

## H. Rủi ro bảo mật / kiểm soát

| Mức | Rủi ro | Bằng chứng |
|---|---|---|
| Cao | **Dữ liệu gốc không bất biến**: chủ công ty INSERT và DELETE được `transactions` qua RLS | Chính sách "Users can insert own transactions", "Users can delete own transactions" |
| Cao | Hàm **`open-banking` (sinh giao dịch giả) vẫn chạy** | Danh sách hàm đang chạy |
| Trung bình | 3 hàm Stripe chết vẫn chạy | Như trên |
| Trung bình | `chat`, `elevenlabs-tts`, `mcp` chưa rà quyền và giới hạn gọi | Chưa kiểm |
| Trung bình | `XINVOICE_CLIENT_ID` và `XINVOICE_API_KEY` có **cùng mã băm** (cùng giá trị) | `supabase secrets list` — tra cứu vẫn chạy, cần xác nhận với nhà cung cấp |
| Trung bình | `webhook_events` lưu nguyên payload SePay (tên người chuyển) — chưa có hạn giữ | Bảng `webhook_events` |
| Trung bình | `luu_tru.ban_ghi` giữ bản sao dữ liệu đã gỡ — chưa có hạn giữ và chưa nối với luồng xoá tài khoản | Migration 20260924160000 |
| Thấp | Tài khoản demo dùng chung, ai cũng ghi được (đã gắn cờ minh hoạ, làm mới mỗi đêm) | Migration 20260924160000 |
| Đã vá 24/09 | Kích hoạt gói không cần trả tiền; `tax-lookup` mở không cần đăng nhập; mã tham chiếu dùng `Math.random` | Commit `96ac5a5`, `934fae4` |
| Hạ tầng | Supabase gói FREE, đang báo vượt hạn mức | Cảnh báo trên bảng điều khiển |

Không nói "không thể rò dữ liệu" trong bất kỳ tài liệu tiếp thị nào.

---

## I. Đề xuất mô hình dữ liệu

```text
transactions (thô, BẤT BIẾN với trình duyệt)
  + source ('cas'|'sepay'|'import'|'manual'), import_id
  RLS: bỏ INSERT/DELETE cho authenticated. Nhập tay đi qua edge function, source = 'manual'.

imports                      -- một đợt nhập sao kê
  id, company_id, nguon, ten_tep, ma_bam_tep, tai_khoan, tu_ngay, den_ngay,
  so_dong, so_trung, tao_boi, tao_luc

coverage (view)              -- tháng × tài khoản đã có dữ liệu chưa, đồng bộ lần cuối

revenue_classifications      -- thay giai_trinh_tien_vao và phần is_personal của transaction_labels
  id, company_id, transaction_id (unique),
  suggested_type, confirmed_type,            -- business_revenue | personal | internal_transfer |
                                             -- loan | capital_contribution | family_transfer | refund |
                                             -- deposit | collection_on_behalf | other | unknown
  suggestion_source ('rule'|'pattern'|'model'|'human'), confidence, reason_code, reason_text,
  revenue_effect ('include'|'exclude'|'pending'),
  requires_review, rule_id, confirmed_by, confirmed_role, confirmed_at, created_at, updated_at

revenue_classification_events  -- chỉ thêm, không sửa: mỗi lần đổi là một dòng -> hoàn tác được
  id, classification_id, from_type, to_type, from_effect, to_effect, actor, bulk_group_id, at

classification_rules         -- "17 khoản từ SHOPEE": áp cho nhóm, vẫn là quyết định của người
  id, company_id, match (sender | memo_pattern | own_account), target_type, created_by, active

revenue_figures              -- mọi con số hệ quả, kèm bằng chứng
  id, company_id, ky, loai ('cash_inflow'|'estimated_business_revenue'|
       'confirmed_business_revenue'|'tax_revenue_basis'),
  value, source, coverage, calculation_version, rule_version, generated_at,
  evidence_ids uuid[], human_override

obligations                  -- lịch nghĩa vụ cá nhân hoá
  id, company_id, loai, ky, han, trang_thai, vi_sao (jsonb: rule id + phiên bản + dữ kiện hồ sơ),
  con_thieu (jsonb), case_id

compliance_cases, case_steps, case_events
  case: id, company_id, case_type, severity, title, description, source_rule, detected_at,
        deadline, amount_at_risk, status, required_actions jsonb, evidence_required jsonb, resolved_at

expert_reviews
  id, case_id, requested_by, reviewer_id, goi_ho_so jsonb (ảnh chụp lúc gửi), trang_thai,
  quyet_dinh, ly_do, phi, tao_luc, xong_luc

product_events               -- đo lường
  id, company_id, user_id, ten, thuoc_tinh jsonb, luc
```

`thong_bao` (đang dở) giữ lại làm kênh giao nhận: mỗi thông báo trỏ về `case_id` hoặc `obligation_id`.

---

## J. Migration cần có

1. `transactions`: thêm `source`, `import_id`; gỡ chính sách INSERT/DELETE của authenticated; thêm đường nhập tay qua edge function.
2. `imports` + view `coverage`.
3. `revenue_classifications` + `revenue_classification_events` + `classification_rules`; chuyển dữ liệu từ `giai_trinh_tien_vao` (nếu đã deploy) và `transaction_labels.is_personal`.
4. `revenue_figures`.
5. `obligations`.
6. `compliance_cases`, `case_steps`, `case_events`.
7. `expert_reviews`.
8. `product_events`.
9. Gỡ bảng/cột chết: `employee_count`, `primary_goal` (sau khi bỏ câu hỏi).

---

## K. File dự kiến đổi

- **Mới:** `supabase/functions/_shared/doanh-thu/` (một hàm tính 4 con số + độ phủ), `_shared/case/`, `_shared/nghia-vu/`, `supabase/functions/doanh-thu/` (hoặc gộp vào `to-khai`), `src/pages/TienVaoPage.tsx` (Tiền vào & Doanh thu), `src/pages/CasePage.tsx`, `src/pages/NhapSaoKePage.tsx`, `src/lib/suKien.ts`.
- **Sửa:** `tax-summary/index.ts`, `_shared/luat/doc-su-kien.ts`, `DashboardOverview.tsx`, `ChungTuPage.tsx`, `ReportsPage.tsx`, `NhacThuePage.tsx`, `TroLyPage.tsx`, `src/lib/troLy.ts`, `WelcomeCards.tsx`, `ToKhaiPage.tsx` (form hồ sơ thuế), `DashboardSidebar.tsx`, `_shared/tro-ly/tinh-toan.ts`, `bank-webhook` + `bank/ingest.ts` (ghi `source`), `SettingsPage.tsx` (tên gói theo kết quả).
- **Gỡ:** hàm `open-banking`, `check-subscription`, `create-checkout`, `customer-portal`; nút "Vay vốn" và thẻ điểm tín dụng ở Tổng quan.

---

## L. Kế hoạch 3 sprint (đã tối ưu theo mục P)

**Sprint 1 — Đưa dữ liệu vào, và một con số doanh thu trung thực**
1. **Nhập sao kê Excel/CSV** (dùng `parseTransactionsCsv`, thêm đọc Excel): đợt nhập, mã băm tệp, chống trùng, giữ nguyên bản gốc; `transactions.source`. Sau đó mới chặn trình duyệt INSERT/DELETE.
2. `revenue_classifications` + `revenue_classification_events` (hoàn tác); chuyển `giai_trinh` sang; **xác nhận miễn phí**.
3. Một hàm tính doanh thu duy nhất: tiền vào / ước tính / đã xác nhận / doanh thu dùng để soạn nháp + độ phủ (tài khoản, tháng, **tiền mặt chưa ghi**). Mọi màn hình và `tax-summary` dùng nó.
4. Màn **Tiền vào & Doanh thu**: 4 nút (mục P-3), gợi ý "trông giống…", phân loại hàng loạt theo người chuyển và mẫu nội dung.
5. Kết quả quét đầu tiên: "Đã đọc N · M giải thích được · K cần xem · X đồng chưa rõ".
6. Trang chủ đổi thứ tự; gỡ "Vay vốn", điểm tín dụng; gỡ hàm mock và Stripe (việc bảo mật, làm ngay).
7. `product_events` cho 11 sự kiện.

**Sprint 2 — Đối chiếu và nghĩa vụ (tính khi đọc, chưa lưu bảng)**
1. Hàng đợi ngoại lệ gộp `cham-diem` + `khop-chung-tu` + QR.
2. Lịch nghĩa vụ cá nhân hoá tính từ hồ sơ + luật có hiệu lực + độ đủ dữ liệu; hồ sơ thuế hỏi dần, bỏ câu thừa, bỏ thuật ngữ.
3. Case `unexplained_revenue`, `threshold_approaching`, `late_filing_risk`, có bước giải quyết (tính khi đọc).
4. Thông báo (đang dở) nối vào case và nghĩa vụ; bật trong Nhắc thuế.

**Sprint 3 — Thu tiền theo kết quả**
1. **Xuất bộ đối chiếu năm** (Excel/PDF: tiền vào, phân loại, ai xác nhận, phần chưa rõ) — sản phẩm trả tiền đầu tiên của MIMI Rescue.
2. **MIMI Monitor** thay Starter/Growth: theo dõi liên tục + thông báo; đổi chữ trên thẻ gói theo kết quả.
3. "Nhờ kế toán kiểm tra": xuất gói hồ sơ, gửi thủ công trong pilot (mục P-8).
4. Trang chủ người quay lại "Hôm nay MIMI đang theo dõi gì?".
5. Chỉ bây giờ mới lưu `obligations` / `compliance_cases` thành bảng nếu pilot cho thấy cần lịch sử.

## M. Kiểm thử nghiệm thu (cụ thể)

1. Công ty có 426 giao dịch, trong đó 34 có gợi ý mơ hồ và 18.600.000đ tiền vào chưa phân loại → màn quét đầu tiên hiện đúng bốn số đó; nút "Xem 34 khoản" mở đúng 34 dòng.
2. Tổng quan **không còn chữ "Doanh thu"** cho tổng tiền vào; hiện "Tiền vào" và, riêng, "Doanh thu đã xác nhận".
3. Xác nhận một khoản là tiền vay → doanh thu đã xác nhận giảm đúng số đó ở **mọi** màn (Tổng quan, Nhắc thuế, Tờ khai, `tax-summary`, trợ lý) — một test so cả năm chỗ.
4. Hoàn tác xác nhận → số trở lại như cũ; `revenue_classification_events` có hai dòng.
5. "Áp dụng 17 khoản" từ cùng người chuyển → 17 phân loại cùng `bulk_group_id`; hoàn tác nhóm → cả 17 trở lại.
6. Chọn "Tôi chưa chắc" → `revenue_effect = pending`, khoản nằm ở tab "Chưa rõ", số tiền chưa rõ tăng.
7. Doanh thu từ sao kê có phần chưa phân loại > 0 → trạng thái mốc 1 tỷ ghi "ước tính", kèm số tiền chưa rõ; không bao giờ ghi "đã vượt" chắc chắn.
8. `tax-summary` trả đủ: `bankGrossInflow, bankEstimatedRevenue, bankConfirmedRevenue, gdtRevenue, platformRevenue, unclassifiedAmount, gapVsInvoice, coverage, basis, disclaimer`.
9. Người dùng đã đăng nhập gọi thẳng PostgREST INSERT/DELETE vào `transactions` → bị từ chối.
10. Nhập cùng một tệp sao kê hai lần → lần hai 0 dòng mới, báo "N dòng trùng".
11. Hộ khai theo quý, hôm nay 20/10 → Nhắc thuế: "Chuẩn bị kỳ khai Q3 · Còn 11 ngày · Vì hồ sơ của bạn khai theo quý · Còn 8 giao dịch chưa xác nhận" và nút mở đúng 8 giao dịch.
12. Tiền vào chưa giải thích vượt ngưỡng → một case `unexplained_revenue` có `required_actions` khác rỗng; xác nhận hết → case tự đóng, `first_case_resolved` ghi một lần.
13. Gửi kế toán → gói hồ sơ chứa giao dịch, hoá đơn, phân loại, phần chưa rõ và phiên bản quy tắc; kế toán ghi quyết định → vào `nhat_ky_quyet_dinh`.
14. Không còn chuỗi "Upgrade", "Nâng cấp lên Pro" trong giao diện; lời mời trả tiền chỉ xuất hiện ở chỗ bị chặn (xuất bộ đối chiếu, xuất tờ khai, dựng lại nhiều năm, nhờ kế toán).
15. Không có dữ liệu → câu trạng thái trống đúng như mục 22 của bản chỉ đạo; không màn nào nói "bạn tuân thủ".
16. Mỗi sự kiện trong 11 sự kiện ghi đúng một lần cho mỗi công ty (kiểm bằng test đơn vị trên hàm ghi sự kiện).

---

## N. Bắt buộc trước ra mắt / để sau

**Bắt buộc:** B-1 nhập sao kê Excel/CSV + dữ liệu gốc bất biến · B-2 lớp phân loại + hoàn tác + hàng loạt, xác nhận miễn phí · B-3 một hàm doanh thu, 4 con số, độ phủ gồm tiền mặt · B-4 màn Tiền vào & Doanh thu · B-5 kết quả quét đầu tiên · B-6 `tax-summary` an toàn · B-7 lịch nghĩa vụ cá nhân hoá (tối thiểu hộ khai quý/năm) · B-8 case `unexplained_revenue` có bước · B-9 gỡ hàm mock/Stripe, "Vay vốn", điểm tín dụng · B-10 đo lường sự kiện · B-11 SePay canh tài khoản MIMI (việc của anh).

**Để sau:** MIMI Rescue đầy đủ, dữ liệu sàn (bắt đầu bằng nhập file báo cáo thu nhập của sàn), luồng phân công kế toán trong app, không gian làm việc cho kế toán nhiều khách, ký số trong MIMI, xuất XML HTKK (cần mẫu chuẩn trước), OCR PDF sao kê, ứng dụng Play, bảng `revenue_figures` / `obligations` / `expert_reviews`.

---

## O. Không làm

Cho vay, chấm điểm tín dụng, đầu tư, carbon, lượng tử, lương đầy đủ, kho đầy đủ, công nợ phải trả đầy đủ, dự báo chung chung, agent mới để trình diễn, bảng điều khiển cho đẹp. Chi phí AI và kiểm soát agent giữ nguyên, lùi xuống hàng thứ yếu trên điều hướng.
