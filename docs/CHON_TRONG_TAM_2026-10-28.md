# Chọn MỘT trọng tâm thu tiền — số liệu trước, quyết sau (28/10/2026)

Câu hỏi: tính năng nào của MIMI ra tiền nhất, để tập trung vào đó và đóng băng dần phần còn lại?

Chưa đóng băng gì. Tài liệu này gom số liệu để chủ dự án chốt.

## 1. Số liệu trong MIMI (production, 28/10/2026)

Cách lấy: chỉ đếm tổng hợp, bỏ công ty demo, không đọc nội dung.

| Chỉ số | Giá trị |
|---|---:|
| Công ty không phải demo | 21 (5 tạo trong 30 ngày) |
| Có MST | 1 |
| Xong khảo sát đầu vào | 3 |
| Có giao dịch ngân hàng thật | **1** |
| Kết nối ngân hàng đang chạy | 2 |
| Tải sao kê bằng tệp | 0 |
| Hỏi trợ lý trong 30 ngày | 4 công ty, 10 câu |
| Tờ khai đã soạn / đã xuất | **0 / 0** |
| Phân loại tiền vào | 1 công ty |
| Chứng từ quét | 0 |
| Tạo agent / có yêu cầu chi | 3 / 1 công ty |
| Khai cơ sở (đa cơ sở) | 0 |
| Hoá đơn gói đang chờ trả | 2 |
| Tiền khách đã trả MIMI | **1 lần, 1 ₫** (lần thử) |
| Phiếu khảo sát giá | 1 (0 để lại liên hệ) |

Câu hỏi thật tới trợ lý, xếp theo năng lực:

| Năng lực | Số lần |
|---|---:|
| Thiếu chứng từ | 4 |
| Hoá đơn quá hạn | 3 |
| Nghĩa vụ thuế | 3 |
| Dòng tiền | 2 |
| Kết nối ngân hàng | 2 |
| Báo cáo tài chính | 2 |
| Chuẩn bị hạn thuế | 2 |
| Tra luật | 1 |
| Thủ tục | 1 |

Không có câu nào về agent, chính sách chi, đa cơ sở hay vay vốn.

**Đọc thế nào:**
- Dữ liệu sử dụng **không đủ để chọn trọng tâm**. Chưa có khách trả tiền, chưa có tờ khai nào, chỉ 1 công ty có dữ liệu ngân hàng thật. Nhiều trong 21 công ty có thể là tài khoản thử của chính đội.
- Tín hiệu yếu duy nhất: mấy câu hỏi thật đều nghiêng về **chứng từ – thuế – công nợ**, không nghiêng về agent.

## 2. Số liệu thị trường (tra 28/10/2026, xem nguồn ở mục 6)

| Hướng | Con số chính | Nguồn |
|---|---|---|
| Thuế hộ kinh doanh | Bỏ thuế khoán từ 01/01/2026, mọi hộ tự khai. Bộ Tài chính ước **~2,3 triệu hộ (~90%) không phải nộp thuế** ở ngưỡng 500 triệu. Phần phải nộp vì vậy chỉ khoảng ~10%, và ít hơn nữa nếu ngưỡng thành 1 tỷ (NĐ 141/2026; cần đối chiếu văn bản gốc). Hộ dưới ngưỡng vẫn phải thông báo doanh thu. | voh.com.vn, luatvietnam.vn |
| Giá thuế hộ | Sàn **0 ₫** (KiotViet, MISA eShop ≤ 1 tỷ, phần mềm Nhà nước). Trần: dịch vụ kế toán **300.000 – 1.000.000 ₫/tháng**. | docs/NGHIEN_CUU_CONG_NGHE_WTP_2026-10.md |
| AI agent xin chi | 26% doanh nghiệp VN ứng dụng AI, nhưng **chỉ 8% đã tích hợp vào quy trình**. Không tìm thấy số nào về doanh nghiệp nhỏ dùng agent để chi tiền. Rào cản: thiếu người (55,9%), chi phí (53,3%). | vneconomy (Strand/AWS 2026), doanhnghiephoinhap.vn |
| Kiểm trước khi chuyển | Lừa đảo trực tuyến 2024 ước ~18.900 tỷ ₫ (Hiệp hội An ninh mạng). **Ngân hàng đang làm miễn phí**: NHNN gom kho tài khoản nghi gian lận, BIDV cảnh báo người nhận từ 01/04/2025. Không có số riêng cho lừa đảo đổi số tài khoản nhà cung cấp. | vnbusiness.vn, lsvn.vn |
| Đa cơ sở | **Chưa tìm được** số doanh nghiệp có chi nhánh (Điều tra Doanh nghiệp 2025 có thể có, chưa công bố chi tiết). Mới có một ví dụ do chủ dự án kể (trường 11 cơ sở), chưa có khách thật. | gso.gov.vn (chưa có số) |

## 3. Chấm theo cùng khung 8 tiêu chí của docs/MANG_TIEM_NANG.md

Điểm là **đánh giá**, không phải số đo. Cột "Đổi nếu" ghi bằng chứng nào làm điểm thay đổi.

| Tiêu chí (trọng số) | Thuế hộ — bán cho hộ | Thuế hộ — bán cho văn phòng kế toán | AI xin chi | Kiểm trước khi chuyển | Đa cơ sở |
|---|---:|---:|---:|---:|---:|
| Quy mô (0,20) | 6 | 5 | 2 | 7 | 3 |
| Thời điểm, tăng trưởng (0,15) | 8 | 8 | 8 | 5 | 5 |
| Nỗi đau, cấp bách (0,15) | 7 | 7 | 3 | 8 | 7 |
| Sẵn lòng trả (0,15) | 3 | 6 | 4 | 3 | 7 |
| Tiếp cận (0,10) | 6 | 7 | 3 | 4 | 3 |
| Khớp năng lực MIMI (0,10) | 9 | 9 | 8 | 6 | 6 |
| Cạnh tranh, giữ chỗ (0,10) | 3 | 3 | 6 | 2 | 3 |
| Rủi ro, cao = ít rủi ro (0,05) | 5 | 5 | 3 | 5 | 5 |
| **Tổng** | **5,95** | **6,05** | **4,50** | **5,25** | **4,90** |

Căn cứ từng ô:
- **Thuế hộ:**
  - Đây là thứ duy nhất máy chủ đang thu phí (gói tháng mở quyền xuất tờ khai).
  - Bắt buộc theo luật, lặp lại mỗi quý.
  - Bán thẳng cho hộ thì vướng giá sàn 0 ₫ của đối thủ.
  - Bán cho văn phòng kế toán thì họ đang thu 300.000 – 1.000.000 ₫/hộ/tháng. Công cụ giúp họ làm nhanh hơn thì họ có lý do trả theo số hộ. Đây cũng là chân dung chính đã chấm 6,6 trong MANG_TIEM_NANG.
- **AI xin chi:**
  - Hợp với bài thi FinTechathon, nhưng thị trường VN chưa có người mua: 8% doanh nghiệp tích hợp AI vào quy trình, agent tự chi tiền còn ít hơn.
  - Chạm tiền nên rủi ro pháp lý cao.
  - Chưa có cách thu phí.
- **Kiểm trước khi chuyển:**
  - Nỗi đau thật và lớn.
  - Nhưng ngân hàng và NHNN đang làm miễn phí, và MIMI chưa có bước xác minh khi nhà cung cấp đổi số tài khoản.
- **Đa cơ sở:**
  - Mỗi khách trả nhiều hơn.
  - Nhưng chưa biết có bao nhiêu khách, bán B2B lâu, và chưa có khách thật nào.

## 4. Khuyến nghị

1. **Trọng tâm tạm (chờ kiểm): "khai thuế từ sao kê", người mua là văn phòng kế toán dịch vụ.** Lấy hộ kinh doanh 1–3 tỷ làm dữ liệu đầu vào.
2. Bốn tổng điểm cách nhau **chưa tới 1,5 điểm** trên thang đánh giá chủ quan. Chênh như vậy không đủ để cắt tính năng ngay. Cần **14 ngày kiểm cầu** trước:

| Phép thử | Đạt nếu | Không đạt thì |
|---|---|---|
| 15 cuộc gọi với văn phòng kế toán dịch vụ (Zalo nhóm kế toán, hội kế toán tỉnh) | ≥ 3 nơi đồng ý chạy thử có trả phí với ≥ 5 hộ mỗi nơi | Thử bán thẳng cho hộ 1–3 tỷ |
| Gửi /khao-sat-gia cho 15–20 chủ hộ thật | ≥ 15 phiếu thì đọc được điểm giá (Van Westendorp) | Dưới 15 phiếu: chỉ coi là tín hiệu |
| Chuyển thử 2.000 ₫ qua SePay để xác nhận tiền khách về được ghi nhận | `tien_ve_mimi` có dòng thật, hoá đơn gói tự chuyển "đã trả" | Sửa trước mọi việc khác |

3. **Sau 14 ngày** (khoảng 11/11/2026), nếu đạt thì đóng băng (ẩn, giữ code và dữ liệu, mở lại được bằng `src/lib/dongBang.ts`):
   - kiểm soát agent và chính sách chi;
   - chi phí AI và model rẻ hơn;
   - đăng ký kinh doanh;
   - đọc báo cáo tài chính;
   - các năng lực trợ lý: lệnh CFO, phương án tài trợ, đa cơ sở;
   - "Kiểm trước khi chuyển" thì bỏ khỏi bộ ghim mặc định nhưng vẫn tìm được trong kho công cụ.

   Đồng thời đổi câu đầu trang giới thiệu. Câu hiện tại ("AI xin chi tiền. Bạn là người quyết.") đang bán thứ không thu tiền.
4. **Đo từ hôm nay**, theo tuần:
   - số công ty có giao dịch thật;
   - số tờ khai soạn và xuất;
   - số hoá đơn gói đã trả;
   - số văn phòng kế toán đang chạy thử.

## 5. Giới hạn của tài liệu này

- 21 công ty chưa tách được tài khoản thử nội bộ khỏi khách thật.
- Số hộ phải nộp thuế ở ngưỡng 1 tỷ chưa có nguồn chính thức. Con số 90% miễn là ở ngưỡng 500 triệu.
- Điểm chấm do người soạn tự đánh giá. Phỏng vấn thật mới đổi được điểm.

## 6. Nguồn

- Bỏ thuế khoán, ~2,3 triệu hộ miễn: https://voh.com.vn/kinh-te/tu-112026-chinh-thuc-bo-thue-khoan-chuyen-sang-ke-khai-thue-642709.html ; https://luatvietnam.vn/tin-van-ban-moi/tu-01-01-2026-ho-kinh-doanh-chinh-thuc-ap-dung-phuong-phap-ke-khai-tu-nop-thue-186-104610-article.html
- Ngưỡng 1 tỷ (cần đối chiếu văn bản gốc): https://luatvietnam.vn/thue-phi-le-phi/thue-ho-kinh-doanh-tren-1-ty-565-105407-article.html ; https://xcyber.vn/ho-kinh-doanh-co-doanh-thu-duoi-1-ty/
- AI ở doanh nghiệp VN: https://vneconomy.vn/gan-245000-doanh-nghiep-viet-nam-dang-ung-dung-ai.htm ; https://doanhnghiephoinhap.vn/chi-phi-va-nhan-su-la-rao-can-lon-khien-doanh-nghiep-nho-va-vua-cham-ung-dung-ai-126773.html
- Lừa đảo, cảnh báo của ngân hàng: https://vnbusiness.vn/cuoi-nam-nhan-dien-cac-hinh-thuc-lua-dao-truc-tuyen-tai-viet-nam.html ; https://lsvn.vn/du-kien-ngan-hang-se-trien-khai-canh-bao-nghi-lua-dao-khi-chuyen-khoan-a158228.html
- Điều tra Doanh nghiệp 2025: https://thoibaotaichinhvietnam.vn/tu-14-tien-hanh-dieu-tra-doanh-nghiep-nam-2025-tren-ca-nuoc-173564.html
- Giá sàn/trần thuế hộ: docs/NGHIEN_CUU_CONG_NGHE_WTP_2026-10.md
