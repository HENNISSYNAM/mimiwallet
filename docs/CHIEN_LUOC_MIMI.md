# Chiến lược MIMI — định vị, lộ trình sản phẩm, ra thị trường, truyền thông

> Lập 14/09/2026, đi cùng `docs/KE_HOACH_MIMI_CHAU_A.md` (vì sao học Ramp ở tầng kiểm soát).
> Tài liệu này trả lời: bán cho ai, nói gì, làm gì trước, và đo bằng gì.
> **Mốc thời gian và giá là mục tiêu/giả thuyết, không phải kết quả.** Mọi con số thị trường có nguồn ở cuối.

---

## 0. Bảy nguyên tắc thiết kế sản phẩm tài chính

Rút từ cách các sản phẩm tiền tệ thành công giữ được người dùng (PayPal khi thanh toán còn đáng
sợ, Ramp khi giao quyền cho AI). Mọi quyết định tính năng bên dưới phải qua được bảy câu này.

1. **Niềm tin trước tính năng.** Mỗi màn hình trả lời được: tiền đang ở đâu, ai cho phép, bằng chứng là gì.
2. **Mặc định chặt, nới có chủ đích.** Agent mới phải duyệt mọi khoản; người nhận lạ bị chặn.
3. **Bằng chứng thay lời hứa.** "Đã chi" chỉ khi sao kê khớp. Không có trạng thái nào tự khẳng định.
4. **Giá trị đầu tiên trong 10 phút.** Nối ngân hàng hoặc tạo agent đầu tiên phải xong trong một lần ngồi.
5. **Hai người, hai màn hình.** Người xin chi (agent, nhân viên) cần tốc độ; người duyệt cần ngữ cảnh và nút rõ ràng — thường trên điện thoại.
6. **Hình khối nói lên độ chắc chắn.** Bề mặt chạm tới tiền và dữ liệu vuông vức; bo tròn chỉ cho chip trạng thái. (Đã đổi thang bo góc 14/09/2026.)
7. **Không nói điều không kiểm được.** Mọi con số trên sản phẩm và tài liệu có nguồn hoặc lấy từ hệ thống đang chạy.

---

## 1. Nhu cầu lớn nhất ở châu Á và chức năng MIMI trả lời

| Nhu cầu | Dữ liệu | Chức năng MIMI | Trạng thái |
|---|---|---|---|
| **Không mất tiền vì lừa đảo chuyển khoản** | 63% người Đông Nam Á gặp lừa đảo trong 12 tháng; 48% thiệt hại đi qua chuyển khoản; 2/3 vụ diễn ra trong 24 giờ kể từ lần liên lạc đầu; chỉ 22% lấy lại được tiền (GASA, 08/2025) | Danh sách người nhận được phép; chặn người lạ; duyệt trên ngưỡng | **Có** |
| | | Giữ người nhận mới 24 giờ trước lần chi đầu; cảnh báo nhà cung cấp đổi số tài khoản; duyệt hai người trên ngưỡng lớn | **Làm ở S2** |
| **Thu được tiền đúng hạn** | 44% doanh số bán chịu B2B ở châu Á bị trễ hạn; nợ xấu khoảng 5% (Atradius, khảo sát Q2/2025, có Việt Nam) | Hoá đơn kèm mã QR, tự khớp khi tiền về | **Có** |
| | | Nhắc nợ tự động theo lịch; báo cáo tuổi nợ | **Làm ở S5** |
| **Có chứng từ để kê khai thuế** | Việt Nam bỏ thuế khoán từ 01/01/2026, hộ kinh doanh tự kê khai theo doanh thu thật; Malaysia bắt buộc e-Invoice cho doanh thu RM1–5 triệu từ 01/01/2026 | Kéo hoá đơn điện tử từ Tổng cục Thuế; sổ chi phí; so sánh hai cách tính thuế | **Có** |
| | | Khớp khoản đã chi với hoá đơn điện tử | **Làm ở S6** |
| **Giao việc cho AI mà không mất kiểm soát** | 81% người dùng Việt Nam tương tác với công cụ AI mỗi ngày; 96% sẵn sàng chia sẻ dữ liệu với AI agent để có trải nghiệm tốt hơn (e-Conomy SEA 2025) | Agent xin chi qua MCP/API; chính sách tất định; nhật ký chỉ thêm | **Có** |
| | | Bảng chi phí AI; chính sách viết bằng văn bản → luật (người xác nhận) | **Làm ở S1, S4** |
| **Biết tiền thật sự đã đi đâu** | Thanh toán số ở Việt Nam đạt 178 tỷ USD năm 2025 (e-Conomy SEA 2025) — khối lượng lớn, đối soát vẫn làm tay | Đối soát theo mã tham chiếu qua SePay và Cas | **Có** |

**Kết luận sản phẩm:** ở châu Á, "kiểm soát chi tiêu" trước hết là **chống chuyển nhầm và chuyển cho kẻ
lừa đảo**, rồi mới tới tối ưu chi phí. Ramp mở đầu bằng tiết kiệm; MIMI mở đầu bằng **an toàn** — và
dùng **chi phí AI** làm cửa vào miễn phí.

### 1b. Bản đồ 17 sản phẩm Ramp → MIMI

| Nhóm Ramp | Sản phẩm Ramp | MIMI | Vì sao |
|---|---|---|---|
| Card & Expense | Corporate Cards | **Không làm** — nối vào thẻ của ngân hàng (vd. VPBank + FINAN) | Phát hành thẻ cần giấy phép; châu Á trả bằng chuyển khoản–QR |
| | Expense Management | **Có** — Chứng từ chi phí, kéo hoá đơn điện tử | Hoá đơn điện tử thay biên nhận giấy |
| | Travel | **Không làm** | Lệch khách hàng số một |
| Procure to Pay | Accounts Payable | **Q1/2027** — agent công nợ phải trả | Sau khi luật chi và đối soát chắc |
| | Procurement | **Sau 2027** — bản nhẹ: đề nghị mua → duyệt | Doanh nghiệp 10–200 người ít quy trình mua hàng |
| | Vendor Management | **S2** — người nhận được phép, cảnh báo đổi số tài khoản | Đây chính là chống lừa đảo chuyển khoản |
| Banking & more | Business Banking | **Không làm** | Cần giấy phép ngân hàng |
| | Investment Account | **Không làm** — đã gỡ trang Đầu tư | Lệch lõi, cần giấy phép |
| Platform | Accounting Automation | **Có** — Sổ & đối soát; xuất cho phần mềm kế toán sau | Đối soát theo mã tham chiếu đã chạy |
| | Intelligence | **Có một phần** — agent xin chi, luật tất định; **S4** chính sách bằng văn bản | Học 8 nguyên tắc tin cậy |
| | Global Ready | **H2/2027** — QR xuyên biên giới, e-Invoice Malaysia | Theo `KE_HOACH_MIMI_CHAU_A.md` |
| | Stack by Ramp | **Tầm nhìn** — "hệ điều hành tài chính cho AI" là đích, không phải tên sản phẩm bây giờ | Tránh hứa quá khả năng |
| | **AI Token Spend Management** | **S1 — làm đầu tiên** | Không cần giấy phép hay ngân hàng; đúng người mua; cửa vào miễn phí; tiền API AI phần lớn đi qua thẻ quốc tế nên sao kê chuyển khoản không thấy — phải nối thẳng API quản trị của nhà cung cấp |
| | Developer Tools | **Có** — MCP server, API agent | Đã chạy |
| | Budgets & Reporting | **S1** — ngân sách AI; mở rộng ngân sách theo agent/nhóm sau | Hạn mức theo agent đã có |
| | Ramp Router | **Cân nhắc sau S1** — gợi ý mô hình rẻ hơn dựa trên dữ liệu chi phí thật | Chỉ có giá trị khi đã có dữ liệu chi phí AI |
| | Integrations | **Có** — Cas, SePay, Tổng cục Thuế; thêm phần mềm kế toán theo nhu cầu đối tác thiết kế | Không làm tích hợp trước khi có người cần |

> Trước khi làm S1: đọc tài liệu API quản trị/usage của từng nhà cung cấp AI để xác nhận trường dữ liệu và
> quyền chỉ-đọc — không thiết kế theo trí nhớ.

### 1c. Hành vi người dùng châu Á → giao diện lúc dùng app

Quyết định 14/09/2026: **thay đổi dồn vào giao diện lúc dùng app**; trang chủ giữ hình ảnh và hiệu ứng cũ,
chỉ đổi chữ phần đầu theo định vị.

| Hành vi | Dữ liệu | Thay đổi trong app | Trạng thái |
|---|---|---|---|
| Xử lý tốt giao diện nhiều thông tin; giao diện hợp văn hoá giúp thao tác nhanh hơn | Người dùng nhanh hơn 22% với giao diện điều chỉnh theo văn hoá; trang web châu Á dày thông tin và nhiều màu hơn (Reinecke & Bernstein, ACM TOCHI 2011) | Màn duyệt hiện đủ ngữ cảnh ngay: số tiền, bằng chữ, người nhận, ngân hàng, lý do, cảnh báo — không giấu sau nhiều lần bấm | **Đã làm 14/09** |
| Tiền Việt nhiều số 0, dễ gõ thừa/thiếu | Thói quen ghi số tiền bằng chữ trên chứng từ thanh toán | Dòng "Bằng chữ" dưới số tiền ở thẻ chờ duyệt (`lib/soTienBangChu.ts`, có test) | **Đã làm 14/09** |
| QR là cách trả chính, và thường trả ngay trên điện thoại | Giao dịch QR tăng 61,63% về lượng và 150,67% về giá trị (NHNN, qua VietnamPlus) | Lệnh trả có **Lưu ảnh mã QR** và **Chép** từng dòng — vì camera không quét được mã trên chính màn hình của máy đó | **Đã làm 14/09** |
| Kẻ gian thắng bằng sự vội | 2/3 vụ lừa đảo diễn ra trong 24 giờ từ lần liên lạc đầu (GASA 2025) | Khối cảnh báo "Lần đầu chi cho tài khoản này" + cách gọi xác nhận qua số đã lưu | **Đã làm 14/09**; giữ 24 giờ ở S2 |
| Duyệt bằng ngón cái trên điện thoại | — | Nút Duyệt/Từ chối chia đôi màn hình, cao 44px trên điện thoại | **Đã làm 14/09** |
| Công việc và thông báo đi qua Zalo | Zalo có 79,6 triệu người dùng hằng tháng (12/2025) | Thông báo khoản chờ duyệt qua Zalo ở S3 — **cần kiểm điều kiện và chi phí gửi tin doanh nghiệp của Zalo trước khi cam kết** | S3 |
| Tin vào dấu hiệu chính thức | Mục công nhận trên trang chủ ghi số quyết định, ngày | Giữ nguyên nguyên tắc: chỉ nói điều tra được | Có |

Nguồn thêm cho mục này:
- Reinecke & Bernstein (2011), *Improving Performance, Perceived Usability, and Aesthetics with Culturally Adaptive User Interfaces*, ACM TOCHI — https://dl.acm.org/doi/10.1145/1970378.1970382
- Zalo 79,6 triệu người dùng hằng tháng — https://www.vietnam.vn/en/79-6-trieu-nguoi-dung-zalo-thuong-xuyen-hang-thang
- Giao dịch QR tăng mạnh — https://en.vietnamplus.vn/digital-payments-surge-qr-code-transactions-jump-over-150-post331573.vnp

---

## 2. Định vị

### Câu định vị
> Dành cho **doanh nghiệp Việt Nam đang giao việc cho AI và trả tiền bằng chuyển khoản**,
> **MIMI** là **lớp kiểm soát chi tiêu** giúp mỗi khoản chi — do người hay agent đề xuất — **được xét theo
> chính sách, được người có quyền duyệt, và được đối chiếu với sao kê và hoá đơn**.
> Khác với thẻ doanh nghiệp và phần mềm kế toán, **MIMI không giữ tiền của bạn và không cho tiền đi
> khi chưa có người xác nhận.**

### Khẩu hiệu
- Tiếng Việt: **Agent được chi. Bạn giữ quyền quyết.**
- English: **Let agents spend. Keep the final say.**

### Ba trụ thông điệp

| Trụ | Nói gì | Bằng chứng đi kèm |
|---|---|---|
| **An toàn** | Tiền không đi khi chưa có người duyệt; người nhận lạ bị chặn | Luật mặc định chặt; nhật ký không sửa được |
| **Có bằng chứng** | Mỗi khoản chi có lý do, lệnh trả, sao kê và hoá đơn | Mã tham chiếu `MIMIxxxxxx` khớp sao kê |
| **Hợp đường tiền Việt Nam** | Chạy trên VietQR, sao kê ngân hàng, hoá đơn điện tử Tổng cục Thuế | Nghiệm thu liên kết ngân hàng với Casso 19/20 |

### Không nói
- "Ví", "số dư", "chuyển tiền giúp bạn" — MIMI không cầm tiền.
- "Vay", "cấp vốn", "hạn mức tín dụng".
- "AI tự động hoàn toàn" — trái nguyên tắc người xác nhận.
- Con số của Ramp như thể của MIMI; con số khách hàng khi chưa có.

### Giọng
Rõ, chắc, không phô. Nói bằng việc người dùng làm ("duyệt khoản chi"), không bằng tên hệ thống
("webhook"). Con mèo cam là người dẫn đường thân thiện; phần tiền bạc thì nghiêm túc.

---

## 3. Lộ trình phát triển app

Chu kỳ 2 tuần. Mỗi chu kỳ kết thúc bằng một bản chạy thật có bằng chứng.

| Chu kỳ | Thời gian | Việc | Xong khi |
|---|---|---|---|
| **S0 · Dọn nhà** | 15–28/09/2026 | Gỡ Vay ngang hàng, Đầu tư, `thi-truong-so` (**đã làm 14/09**); thanh bên ba khu (**đã làm**); thang bo góc vuông hơn (**đã làm**); trang chủ theo định vị mới; xoay khoá agent và khoá webhook SePay; khoá LLM cho chat | Test, build xanh; trang chủ nói đúng định vị |
| **S1 · Chi phí AI** | 29/09–12/10 | Nối khoá quản trị chỉ-đọc của nhà cung cấp AI → chi phí theo mô hình, người, dự án; ngân sách và cảnh báo vượt; dùng được **không cần nối ngân hàng** (cửa vào miễn phí) | Bảng chi phí AI trên dữ liệu thật của một đối tác thiết kế |
| **S2 · Chống chuyển nhầm** | 13–26/10 | Giữ người nhận mới 24 giờ; cảnh báo đổi số tài khoản nhà cung cấp; duyệt hai người trên ngưỡng | Có test cho cả ba luật; chạy thật một ca |
| **S3 · Duyệt từ điện thoại** | 27/10–09/11 | Thông báo khoản chờ duyệt; màn duyệt một chạm kèm lý do và lịch sử người nhận | Duyệt được trong 30 giây từ thông báo |
| **S4 · Chính sách bằng văn bản** | 10–23/11 | Tải văn bản chính sách → AI đề xuất luật → người xác nhận từng luật; quyết định trích đúng điều khoản; phát hiện tiền ra ngân hàng tới nhà cung cấp AI không qua MIMI | Mỗi quyết định truy về một điều khoản |
| **S5 · Thu đúng hạn** | 24/11–07/12 | Nhắc nợ theo lịch; báo cáo tuổi nợ | Nhắc nợ gửi được và ghi nhật ký |
| **S6 · Chứng từ khớp tiền** | 08–21/12 | Khớp khoản đã chi với hoá đơn điện tử; bộ eval vàng cho agent | Tỷ lệ khớp đo trên dữ liệu thật |
| **Q1/2027** | | Agent công nợ phải trả: gợi ý tài khoản kế toán, tóm tắt cho người duyệt | |
| **Q2/2027** | | Thí điểm lệnh chi qua API ngân hàng đối tác (cần hợp đồng + ý kiến luật sư) | |
| **H2/2027** | | Thị trường thứ hai (ứng viên: Malaysia) | |

---

## 4. Lộ trình ra thị trường

### Khách hàng lý tưởng, theo thứ tự ưu tiên

| # | Ai | Vì sao trước | Người mua |
|---|---|---|---|
| 1 | Công ty 10–200 người **chi nhiều cho AI, phần mềm, quảng cáo** bằng chuyển khoản (agency, studio, startup công nghệ, thương mại điện tử) | Đau rõ nhất: nhiều khoản nhỏ, nhiều người nhận, bắt đầu dùng agent | Giám đốc, kế toán trưởng |
| 2 | **Văn phòng kế toán, đại lý thuế** | Mỗi văn phòng mang theo hàng chục khách; gói riêng đã có | Chủ văn phòng |
| 3 | **Hộ kinh doanh** 1–3 tỷ doanh thu | Nhu cầu chứng từ thuế 2026; giữ làm trụ đỡ | Chủ hộ |

### Các pha

| Pha | Thời gian | Mục tiêu | Cổng qua |
|---|---|---|---|
| **Đối tác thiết kế** | 10–11/2026 | 10 doanh nghiệp nhóm 1 dùng miễn phí, gặp hàng tuần, đổi lấy phản hồi và quyền kể lại | 5 doanh nghiệp dùng mỗi tuần trong 4 tuần liền |
| **Beta trả phí** | 12/2026–01/2027 | Chuyển đối tác thiết kế sang gói Growth | Có doanh nghiệp tự trả tiền |
| **Kênh kế toán** | Q1/2027 | Chương trình đối tác cho văn phòng kế toán | 3 văn phòng đưa khách vào |
| **Hệ sinh thái** | Q2/2027 | Cùng truyền thông với đối tác đường tiền (ngân hàng, Cas, SePay) và thư mục MCP | Có một kênh đối tác mang khách |
| **Malaysia** | H2/2027 | Theo `KE_HOACH_MIMI_CHAU_A.md` giai đoạn 4 | Có đối tác đường tiền tại chỗ |

### Giá — giả thuyết cần kiểm
- **Giữ nguyên bảng giá đang công khai:** Free · Growth 249.000₫/tháng · Kế toán & đại lý thuế (liên hệ).
- Giả thuyết cần đo trong pha đối tác thiết kế: doanh nghiệp nhóm 1 có sẵn lòng trả theo **số agent** hoặc
  theo **khối lượng chi được kiểm soát** không. Chỉ đổi bảng giá khi có dữ liệu từ ít nhất 10 cuộc nói chuyện.

### Chỉ số theo pha
- Kích hoạt: nối ngân hàng **và** có khoản chi đầu tiên được xét trong 7 ngày.
- Giữ chân: số doanh nghiệp có khoản chi được duyệt mỗi tuần.
- Sao Bắc Đẩu: số tiền chi đi qua chính sách MIMI **và** được đối soát có chứng từ, mỗi tháng.

---

## 5. Truyền thông

### Câu chuyện chính
> **AI agent đã biết tiêu tiền. Câu hỏi là: ai cho phép, và bằng chứng ở đâu?**
> Ở Việt Nam, tiền đi bằng chuyển khoản — nhanh, và không lấy lại được. MIMI đặt một lớp kiểm soát
> trước mỗi lần tiền đi, không cầm tiền của bạn.

### Kênh

| Kênh | Nội dung | Nhịp |
|---|---|---|
| LinkedIn của nhà sáng lập | Bài học xây sản phẩm tài chính cho AI ở Việt Nam; con số thật từ quá trình xây | 2 bài/tuần |
| Video ngắn (YouTube Shorts, TikTok) | **Quay màn hình thật**: agent xin chi → chờ duyệt → lệnh VietQR → sao kê về; mèo cam dẫn đường | 1 video/tuần |
| Blog kỹ thuật | "MIMI đối soát sao kê thế nào", "Vì sao agent không được tự chuyển tiền", "Nghiệm thu với Casso: 19/20" | 2 bài/tháng |
| Thư mục MCP, cộng đồng nhà phát triển AI | Hướng dẫn nối MIMI vào Claude, Cursor trong 1 phút | Khi ra mắt, cập nhật theo phiên bản |
| Sự kiện startup, chương trình ươm tạo | Demo trực tiếp trên dữ liệu chạy thật | Theo lịch sự kiện |
| Văn phòng kế toán | Buổi hướng dẫn: giữ chứng từ và duyệt chi cho khách | 1 buổi/tháng từ Q1/2027 |

### Các khoảnh khắc ra mắt
1. **Trang chủ mới + MCP server công khai** — cuối S0.
2. **Chi phí AI miễn phí** — cuối S1: "Bạn chi bao nhiêu cho AI tháng này?" trả lời được trong 5 phút, không cần nối ngân hàng.
3. **"Chống chuyển nhầm"** — cuối S2, gắn với số liệu lừa đảo chuyển khoản có nguồn.
4. **Câu chuyện đối tác thiết kế đầu tiên** — chỉ khi doanh nghiệp đồng ý kể và số liệu lấy từ nhật ký thật.

### Tài sản hình ảnh
- Tự làm, không dùng hình/video của Ramp hay bất kỳ thương hiệu nào khác.
- Mèo cam MIMI trong tư thế dẫn đường; khối vuông vức; màu thương hiệu hiện có.
- Mỗi số trên hình có nguồn, hoặc lấy từ hệ thống đang chạy và ghi rõ là tài khoản demo.

### Luật kiểm trước khi đăng
- [ ] Con số có nguồn hoặc tái lập được trong app?
- [ ] Không có từ trong danh sách "Không nói"?
- [ ] Có ảnh chụp/quay từ sản phẩm thật, không phải dựng?
- [ ] Nếu nhắc khách hàng: đã có đồng ý bằng văn bản?

---

## 6. Rủi ro ra thị trường

| Rủi ro | Cách giữ |
|---|---|
| Nhóm 1 chưa dùng agent đủ nhiều | Giá trị đầu tiên không cần agent: người nhận được phép, duyệt chi, đối soát sao kê |
| Bị hiểu là ví hoặc trung gian thanh toán | "Không nói" nhất quán; trang chủ nói rõ không giữ tiền |
| Phụ thuộc đối tác đọc sao kê | Giữ hai đường độc lập SePay và Cas |
| Hứa quá khả năng | Mốc là mục tiêu; ra mắt chỉ những gì đã chạy thật |

---

## Nguồn

- GASA, *The State of Scams in Southeast Asia 2025* (27/08/2025) — https://gasa.org/knowledge-base/blog/new-study-reveals-63-of-southeast-asians-experienced-scams-in-past-year
- Atradius, *Payment Practices Barometer Asia 2025* — https://atradius.us/knowledge-and-research/reports/b2b-payment-practices-trends-asia-2025
- e-Conomy SEA 2025 (Google, Temasek, Bain), số liệu Việt Nam qua VietNamNet — https://vietnamnet.vn/en/vietnam-s-digital-economy-hits-usd-39-billion-ai-and-e-commerce-drive-growth-2466540.html
- Lịch e-Invoice Malaysia — https://www.cleartax.com/my/en/different-phases-implementation-timelines-einvoicing-malaysia
- Nghiên cứu Ramp và đối thủ vùng — xem nguồn trong `docs/KE_HOACH_MIMI_CHAU_A.md`
- Nghiệm thu Casso 19/20 — `docs/NGHIEM_THU_CASSO.md`
