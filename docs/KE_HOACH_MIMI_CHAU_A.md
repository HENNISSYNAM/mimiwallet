# Kế hoạch tái cấu trúc MIMI — lớp kiểm soát chi tiêu AI cho châu Á

> Lập 14/09/2026. Đầu vào: nghiên cứu Ramp (ramp.com/intelligence, agents.ramp.com, các bản
> công bố 07/2025–06/2026) và trạng thái mã nguồn MIMI cùng ngày. Mọi con số về Ramp là **số
> Ramp tự công bố**, ghi nguồn ở cuối. Mọi mốc trong lộ trình là **mục tiêu**, không phải kết quả.

## 1. Ramp thật sự là gì (tách ba lớp)

| Lớp | Ramp làm gì | Ai sở hữu giấy phép |
|---|---|---|
| Đường tiền | Thẻ Visa, Bill Pay, Treasury | Ngân hàng đối tác (Celtic, Column, Sutton, Lead…) |
| Kiểm soát | Chính sách, hạn mức, duyệt, đối soát, kế toán | Ramp (phần mềm) |
| Agent | Tự xét, tự mã hoá chứng từ, tự tìm tiết kiệm, hỏi người khi không chắc | Ramp (phần mềm) |

Các thế hệ agent (theo thứ tự ra mắt):

| Thời điểm | Sản phẩm | Ramp công bố |
|---|---|---|
| 09/07/2025 | Agents for Controllers | 99% chính xác khi áp chính sách; bắt được gấp 15 lần chi sai chính sách; chỉ 10–15% khoản phải chuyển người |
| 07/10/2025 | Agents for AP | 85% trường kế toán đúng ngay lần đầu; gắn cờ hơn 1 triệu USD hoá đơn gian lận trong 90 ngày |
| 03/2026 | Agent Cards / Ramp for Agents (beta) | Mỗi agent có danh tính, người bảo trợ, ngân sách; thẻ tự hết hạn; mọi hành động truy về agent |
| 29/04/2026 | Agents cho Procurement | Tiết kiệm trung bình 16% chi phí nhà cung cấp/năm; bớt 46 giờ/tháng việc tay |
| 2026 | AI Token Spend Management | Nối Anthropic, OpenAI, Gemini, Cursor; 2.000+ doanh nghiệp dùng |
| 04/06/2026 | Series F | 750 triệu USD, định giá 44 tỷ USD; hơn 70.000 khách hàng; doanh thu năm hoá hơn 1 tỷ USD |

**Nguyên tắc tin cậy Ramp tự viết ra** — đây là phần đáng học nhất, vì nó không phụ thuộc thẻ:

1. Mọi quyết định kèm lý do trích đúng điều khoản chính sách.
2. Không dùng điểm tin cậy dạng %: chỉ ba ngăn **Duyệt / Từ chối / Cần người xem**.
3. Agent được phép nói "không chắc" và chuyển người; các lần chuyển được đếm để tìm lỗ hổng.
4. Người dùng sửa chính sách ngay trong sản phẩm khi không đồng ý với agent.
5. Thanh trượt tự chủ do từng khách đặt; hàng rào tất định (trần tiền, danh sách chặn) nằm trên LLM.
6. Lên dần: gợi ý → tự làm một phần → tự làm hết.
7. Eval như unit test: bộ vàng, ca biên, lỗi người dùng báo biến thành test.
8. **Không đồng nào chuyển khi chưa có người xác nhận.**

## 2. Tư duy từ gốc: vì sao không sao chép nguyên Ramp

**Động cơ doanh thu của Ramp là phí quẹt thẻ.** Châu Á Đông Nam trả tiền bằng chuyển khoản và QR
quốc gia (VietQR, PromptPay, DuitNow, QRIS, PayNow), và các hệ QR này đã nối chéo biên giới —
Ngân hàng Trung ương Thái Lan liệt kê liên kết PromptPay với VietQR, DuitNow, QRIS, KHQR, Lao QR.
Sao chép thẻ là sao chép phần yếu nhất ở thị trường này.

**Ramp đứng trên giấy phép của ngân hàng đối tác.** Ở Việt Nam, giữ hoặc chuyển tiền hộ khách là
trung gian thanh toán: cần giấy phép NHNN, vốn tối thiểu 50 tỷ đồng với ví điện tử, thu hộ chi hộ,
cổng thanh toán (Nghị quyết 24/2026/NQ-CP, dẫn chiếu Nghị định 52/2024/NĐ-CP; tra trong kho luật
MIMI). MIMI không có — nên MIMI **không cầm tiền**, đúng như Ramp cũng không tự cầm.

**Thứ Ramp không có ở châu Á: bằng chứng thuế.** Việt Nam có hoá đơn điện tử của Tổng cục Thuế;
Malaysia bắt buộc e-Invoice theo pha (pha 4 cho doanh thu RM1–5 triệu từ 01/01/2026, phạt đầy đủ
từ 01/01/2027). Một khoản chi "đã duyệt, đã trả, có hoá đơn hợp lệ" có giá trị hơn một khoản chi
"đã quẹt thẻ".

## 3. Nêm của MIMI

> **MIMI là lớp kiểm soát chi tiêu cho doanh nghiệp chạy bằng AI, xây trên chuyển khoản–QR và hoá
> đơn điện tử của châu Á, không cầm tiền của khách.**

| Ramp (Mỹ) | MIMI (châu Á) |
|---|---|
| Thẻ ảo cho agent | Lệnh trả VietQR có mã tham chiếu `MIMIxxxxxx` — đã có |
| Phí quẹt thẻ | Thuê bao + phí trên khoản chi được kiểm soát (không phụ thuộc giấy phép) |
| Đối soát sao kê thẻ | Đối soát sao kê chuyển khoản qua SePay / Cas — đã có |
| Thu biên nhận | Kéo hoá đơn điện tử từ Tổng cục Thuế — đã có kết nối |
| Ramp for Agents (beta) | MCP server + API agent, chính sách tất định, nhật ký chỉ thêm — đã chạy |
| Token spend (nối API nhà cung cấp) | Giống vậy **cộng** bắt tiền ra ngân hàng tới nhà cung cấp AI mà không qua MIMI |

Đối thủ cùng vùng: **Aspire** (Singapore, tài khoản doanh nghiệp + thẻ, có MCP beta nối Claude,
ChatGPT, Copilot, Cursor) và **Volopay** (Singapore, thẻ + AP + procurement khắp APAC). Tại Việt
Nam: **VPBank + FINAN + Mastercard** ra mắt thẻ ghi nợ phi vật lý VPBiz FinanONE cho SME ngày
05/08/2026 — thẻ con, quản lý chi theo thời gian thực. Cả ba lấy thẻ và tài khoản làm lõi, đứng
trên giấy phép ngân hàng. MIMI lấy chính sách + chứng từ + agent làm lõi, và có thể nối **vào** các
đường tiền đó thay vì cạnh tranh với chúng.

## 4. Áp thuật toán 5 bước vào chính MIMI

Thứ tự bắt buộc: hỏi lại yêu cầu → **xoá** → đơn giản hoá → tăng tốc → tự động hoá. Tự động hoá
một thứ lẽ ra phải xoá là lỗi đắt nhất.

### 4.1 Hỏi lại yêu cầu
Khách hàng đầu tiên: doanh nghiệp nhỏ và vừa ở Việt Nam **đang trả tiền cho công cụ AI và phần mềm
bằng chuyển khoản**, cần kiểm soát ai được chi, chi cho ai, và có hoá đơn để khấu trừ. Hộ kinh doanh
và bài toán thuế là trụ đỡ, không phải mặt tiền.

### 4.2 Xoá (đề xuất — chờ chủ dự án quyết, cần đọc lại mã trước khi gỡ)

| Hạng mục | Vị trí | Lý do |
|---|---|---|
| Vay ngang hàng | `/dashboard/p2p`, `P2PLendingPage.tsx` | Lệch lõi; rủi ro pháp lý tín dụng |
| Đầu tư | `/dashboard/dau-tu`, `DauTuPage.tsx` | Lệch lõi |
| Tin vĩ mô, thị trường số | functions `macro-news`, `thi-truong-so` | Không phục vụ kiểm soát chi |
| Giọng đọc | function `elevenlabs-tts` | Không phục vụ kiểm soát chi |
| Bảng M2M cũ | `device_wallets`, `device_rules`, `m2m_transactions` | Mô hình "số dư giả" đã bỏ |

### 4.3 Đơn giản hoá — bốn khu, một thanh bên

| Khu | Gộp từ | Tương đương Ramp |
|---|---|---|
| **Agent & chính sách** | `tac-tu`, MCP, API | Controllers + Ramp for Agents |
| **Chi & lệnh trả** | Yêu cầu chi, người nhận được phép, VietQR | Bill Pay (không cầm tiền) |
| **Hoá đơn & chứng từ** | `chung-tu`, `invoices`, `clients`, kéo hoá đơn Tổng cục Thuế | AP + thu biên nhận |
| **Sổ & đối soát** | Fintech Hub, `reports`, thuế | Accounting + close |

Chi phí AI là một bảng trong khu Agent & chính sách, không phải khu riêng.

### 4.4 Tăng tốc
Chu kỳ 2 tuần; mỗi chu kỳ kết thúc bằng một bản chạy thật có bằng chứng (như nghiệm thu Casso),
không bằng slide.

### 4.5 Tự động hoá — lên dần như Ramp
Gợi ý → tự làm phần rủi ro thấp → tự làm hết trong trần. Không bước nào qua được "tiền chuyển khi
chưa có người xác nhận" cho tới khi có Payment Initiation của ngân hàng đối tác.

## 5. Lộ trình (mục tiêu)

| Giai đoạn | Thời gian | Việc | Cổng qua |
|---|---|---|---|
| 0 · Dọn nhà | 15–28/09/2026 | Xoá mục 4.2 sau khi duyệt; thanh bên bốn khu; landing mới; xoay khoá agent và khoá webhook SePay; cấu hình khoá LLM cho chat | App chỉ còn bốn khu; test, build xanh |
| 1 · Agent kiểm soát | 29/09–31/12/2026 | Chính sách từ PDF → luật tất định (người xác nhận); ba ngăn quyết định kèm trích điều khoản; thanh trượt tự chủ theo agent; bộ eval vàng; bảng chi phí AI (API nhà cung cấp + bắt tiền ra ngân hàng tới nhà cung cấp AI); khớp khoản `da_chi` với hoá đơn điện tử; đối soát trên đường Cas | 3 doanh nghiệp dùng thật; mọi quyết định có lý do truy được |
| 2 · Agent công nợ | Q1/2027 | Hoá đơn Tổng cục Thuế vào → gợi ý mã tài khoản kế toán; cảnh báo nhà cung cấp đổi số tài khoản; tóm tắt cho người duyệt | Tỷ lệ gợi ý được chấp nhận đo trên dữ liệu thật |
| 3 · Bỏ bước trả tay | Q2/2027 | Thí điểm Payment Initiation qua một ngân hàng đối tác; ý kiến luật sư về mô hình | Có hợp đồng ngân hàng + ý kiến pháp lý |
| 4 · Thị trường thứ hai | H2/2027 | Chọn theo tiêu chí: bắt buộc hoá đơn điện tử + QR quốc gia + đối tác đọc sao kê. Ứng viên đầu: Malaysia (MyInvois, DuitNow) | Có đối tác đường tiền tại chỗ |

**Kiến trúc cho châu Á từ giai đoạn 1:** tách ba cổng nối — `DuongTien` (VietQR/SePay/Cas → DuitNow,
PromptPay…), `HoaDon` (Tổng cục Thuế → MyInvois…), `LuatThue` theo quốc gia. Bộ luật chính sách,
nhật ký và đối soát theo mã tham chiếu dùng chung.

## 6. Đo bằng gì

- **Sao Bắc Đẩu:** số tiền chi của agent **đi qua chính sách MIMI và được đối soát có chứng từ** mỗi tháng.
- Tỷ lệ tự quyết (không phải chuyển người) và tỷ lệ bị người đảo ngược.
- Tỷ lệ khớp sao kê tự động; thời gian từ duyệt tới `da_chi`.
- Tỷ lệ khoản `da_chi` có hoá đơn hợp lệ.

## 7. Rủi ro

| Rủi ro | Cách giữ |
|---|---|
| Vượt ranh giới giấy phép | Không số dư, không tự chuyển; mọi thay đổi đường tiền qua luật sư |
| Phụ thuộc đối tác đọc sao kê | Hai đường độc lập (SePay + Cas) đã chạy; giữ cả hai |
| Agent sai | Hàng rào tất định trên LLM; eval vàng; ba ngăn quyết định |
| Con số không kiểm được | Mọi số trong app và tài liệu kèm nguồn — xem kỷ luật số liệu |
| Dữ liệu cá nhân | Đồng ý theo Nghị định 13/2023/NĐ-CP đã ghi; định danh chỉ đọc một lần (case 18) |

## 8. Hình ảnh và video

Không dùng hình, video của Ramp (bản quyền, thương hiệu). Học **cách kể**, tự làm tài sản:

- Quay màn hình thật: agent gọi `xin_chi` qua MCP → chờ duyệt → lệnh VietQR → sao kê về → `da_chi`.
- Con mèo cam "MIMI làm hộ" dẫn đường trong video demo.
- Sơ đồ ba lớp (đường tiền / kiểm soát / agent) và bảng Ramp ↔ MIMI ở mục 3.
- Mỗi con số trên hình lấy từ nhật ký thật của MIMI, không lấy số của Ramp.

## Nguồn

- Ramp Intelligence — https://ramp.com/intelligence
- Ramp Agents (07/2025) — https://ramp.com/blog/ramp-agents-announcement
- Ramp: xây agent đáng tin — https://builders.ramp.com/post/how-to-build-agents-users-can-trust
- Ramp for Agents — https://agents.ramp.com/
- Kiểm soát chi cho agent — https://ramp.com/blog/ai-agent-spending-controls
- AI Token Spend — https://ramp.com/ai-cost-monitoring
- Agents for AP (07/10/2025) — https://www.prnewswire.com/news-releases/ramp-launches-agents-for-ap-to-automate-accounts-payable-302576975.html
- Procurement agents (29/04/2026) — https://www.prnewswire.com/news-releases/ramp-launches-fleet-of-ai-agents-across-its-procurement-platform-302756657.html
- Series F (04/06/2026) — https://techcrunch.com/2026/06/04/ramp-raises-750m-at-44b-valuation-as-investors-hunger-for-fintechs-with-an-ai-story/
- Aspire MCP — https://aspireapp.com/mcp
- Volopay APAC — https://thepaypers.com/fintech/news/volopay-expands-expense-management-suite-across-apac
- VPBiz FinanONE (05/08/2026) — https://vnexpress.net/vpbank-finan-va-mastercard-ra-mat-the-ghi-no-phi-vat-ly-cho-doanh-nghiep-5106374.html
- Liên kết QR xuyên biên giới của Thái Lan — https://www.bot.or.th/en/financial-innovation/digital-finance/digital-payment/cross-border-payment.html
- Lịch e-Invoice Malaysia — https://www.cleartax.com/my/en/different-phases-implementation-timelines-einvoicing-malaysia
- Nghị quyết 24/2026/NQ-CP — https://congbao.chinhphu.vn/van-ban/nghi-quyet-so-24-2026-nq-cp-469471.htm
