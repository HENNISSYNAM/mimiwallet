# Kế hoạch cải thiện trải nghiệm — 24/09/2026

Dựng từ [THU_APP_BANG_AGENT.md](THU_APP_BANG_AGENT.md): 15 chân dung đi qua app
thật, mỗi phát hiện kèm câu chữ nguyên văn trên màn hình.

## Mất khách ở đâu

Đếm theo số người bị chặn, không theo cảm tính về mức độ nghiêm trọng.

| Chỗ mất khách | Số người / 15 | Ai |
|---|---|---|
| **Trang chủ nói với sai người** | 5 | Hạnh, Minh, Siti, Joel, Rahul |
| **Ngôn ngữ nửa vời** | 5 | Priya, Rahul, Min-jun, Aiko, Siti |
| **Con số không truy được nguồn** | 3 | Thu, David, Tuấn |
| **Không có lối vào nếu không có công ty / ngân hàng** | 3 | Siti, Minh, Hạnh |
| **Không đa tiền tệ** | 3 | Joel, Priya, Bopha |
| **Đổi công ty / chi nhánh** | 2 | Linh, Thu |
| **Nút chính chết** | 2 | Minh, Siti |

Chỗ đắt nhất là **trang chủ**: một phần ba số người thử app rời đi trước khi thấy
sản phẩm. Và nó rẻ nhất để sửa — là câu chữ, không phải kiến trúc.

## Ba nhóm việc

### Nhóm A — làm ngay, không cần ai quyết

Đều là lỗi có bằng chứng, cách sửa không có lựa chọn nào khác.

| # | Việc | Bằng chứng | Người |
|---|---|---|---|
| A1 | Nút "Chụp chứng từ" bấm xong mới báo chưa làm được | `toast.info('MIMI chưa bật đọc ảnh chứng từ…')` — `NutQuetChungTu.tsx:66` | Minh |
| A2 | Thẻ "Hoá đơn chờ thanh toán" không bấm được | "₫165.0 tỷ / 1 hoá đơn chưa thu", không dẫn đi đâu | David |
| A3 | Trạng thái kết nối tự mâu thuẫn | Kết nối: "Ngân hàng — Đang chạy · 2 tài khoản đọc sao kê" vs Tổng quan: "Chưa có giao dịch thật nào" | David |
| A4 | "SMS khi giải ngân thành công" cho tính năng chưa có | Cài đặt → Thông báo | Thu |
| A5 | Tin hình sự trên màn hình tiền | "Công an điều tra hàng nghìn giao dịch chuyển khoản: Bắt tạm giam 2 anh em" | Bác Sáu |
| A6 | Chữ 11px ở thanh điều hướng dưới | đo bằng `getComputedStyle` | Bác Sáu |
| A7 | Đổi công ty chỉ có trong Cài đặt | "Đổi công ty thì trang tải lại" | Linh |

### Nhóm B — cần bạn chốt một lựa chọn, rồi làm được ngay

| # | Câu hỏi | Vì sao phải chốt trước |
|---|---|---|
| B1 | **Tên hàm API**: giữ `xem_chinh_sach`, `xin_chi` hay đổi sang tiếng Anh? | Là hợp đồng công khai. Hiện chưa ai tích hợp nên đổi còn miễn phí; sau này mỗi lần đổi là làm hỏng tích hợp của người khác. |
| B2 | **Trang chủ nói với ai?** Doanh nghiệp có agent AI, hay hộ kinh doanh sợ thuế? | Hiện đang nói với nhóm thứ nhất, nhưng 5/15 người rời đi vì không thấy mình trong đó — và sản phẩm bên trong phục vụ nhóm thứ hai rất tốt. |
| B3 | **Thứ tự dịch** 1.765 chỗ chữ viết cứng | Min-jun đo Nhắc thuế và Thư viện chứng từ đều 0% tiếng Hàn. Làm hai màn đó trước, hay làm câu trả lời của Trợ lý trước? |
| B4 | **Phạm vi**: Việt Nam, hay thật sự toàn cầu? | Quyết định này chi phối B1, B3, đa tiền tệ, và cả việc có làm vỏ Android hay không. |

### Nhóm C — việc lớn, cần chia đợt

| # | Việc | Quy mô |
|---|---|---|
| C1 | Lối ghi chi tiền mặt, không cần công ty và không cần ngân hàng | Tính năng mới. Mở ra nhóm Siti và Minh — người bán online, chưa đăng ký. |
| C2 | Đa tiền tệ | Chạm vào hoá đơn, dashboard, bảng giá, báo cáo. |
| C3 | Dịch 1.765 chỗ chữ viết cứng | Chia theo màn, bắt đầu từ màn có lượt xem cao nhất. |
| C4 | Vỏ Android cho Google Play | Chưa có gì: không `android/`, không Capacitor, không TWA, không service worker. |
| C5 | Bộ dữ liệu demo gắn nhãn đàng hoàng | Sau khi dọn dữ liệu thử, demo trung thực hơn nhưng trống rỗng — chị Linh không đánh giá nổi sản phẩm. |
| C6 | Tài khoản demo dùng chung một tài khoản Supabase | Nhiều người bấm cùng lúc có thể bị chặn tần suất. Đúng ngày lên Play là lúc nhiều người bấm nhất. |

## Nguyên tắc rút ra từ đợt thử

**Rà soát mã tìm ra lỗi sai. Đi qua app với một mục tiêu tìm ra lỗi vô dụng.**
Sáu bản vá đầu tiên không cái nào tìm ra bằng đọc mã — tôi đã rà soát trước đó và
bỏ sót cả sáu. Loại thứ hai mới là loại khiến người ta gỡ app.

**Gắn nhãn không thắng nổi bố cục.** Dòng giao dịch thử có nhãn "demo" vẫn khiến
chị Thu hỏi "cái nào đúng đây?", vì một cái nhãn nhỏ đứng cạnh một danh sách to
thì người ta tin danh sách. Muốn loại khỏi con số thì loại khỏi màn hình luôn.

**Cảnh báo phải đứng cạnh thứ nó cảnh báo.** Fintech Hub ghi "điểm tín dụng đang
tính trên dữ liệu demo" trong khi con số 703 nằm ở Tổng quan. Không ai đọc được
cảnh báo ở trang khác.
