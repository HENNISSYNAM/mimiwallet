# Công nghệ mới nào giúp khách CHỊU TRẢ TIỀN cho MIMI (06/10/2026)

Câu hỏi duy nhất của tài liệu: công nghệ nào làm tăng **willingness to pay** (WTP) của hộ kinh doanh và doanh nghiệp
siêu nhỏ cho MIMI. Công nghệ hay nhưng không đổi WTP thì không làm lúc này.

## 0. Sự thật hiện tại về WTP

- Bảng tiền về tài khoản MIMI (`tien_ve_mimi`): **0 dòng** từ trước tới nay. 3 hoá đơn gói đang chờ từ 30/09.
- Nghĩa là chưa có bằng chứng ai đã trả tiền. Việc đầu tiên không phải công nghệ mới, mà là: tiền khách chuyển phải
  được ghi nhận (SePay cho tài khoản nhận của công ty) và có 10–15 cuộc hỏi giá với hộ thật.
- Nghiên cứu về phần mềm kế toán cho SME: hai yếu tố quyết định mua là **đáp đúng việc cần làm** và **chi phí**;
  rào cản lớn là cảm giác "phức tạp, đắt". Khách nghiêng về một ứng dụng gom đủ sổ sách, hoá đơn, chi phí, thuế.

## 1. GEO — được AI trích dẫn (ưu tiên CAO: kéo khách, không tốn quảng cáo)

Mới: Generative Engine Optimization (Princeton, IIT Delhi, Georgia Tech, Allen AI — arXiv 11/2023). Tới 2026, một
phần đáng kể câu hỏi mua hàng đi qua ChatGPT Search, Perplexity, Claude, Gemini và Google AI Overviews.

Hiện trạng MIMI (đã kiểm):
- Web là SPA: máy đọc của AI nhận về vỏ HTML gần như trống — **đây là lỗ lớn nhất**.
- Đã sửa 06/10: tiêu đề/mô tả theo định vị thật; thêm `public/llms.txt`.

Việc nên làm:
1. **Dựng sẵn HTML cho trang công khai** (prerender lúc build) — trang chủ, `/chinh-sach/*`, `/tai-nguyen/*`,
   `/kham-pha/*`. Không có bước này thì mọi việc GEO khác gần như vô ích.
2. Trang hỏi–đáp trả lời đúng câu chủ hộ hỏi AI: "doanh thu dưới 1 tỷ có phải nộp thuế 2026?", "bỏ thuế khoán thì
   phải làm gì?", "hạn thông báo doanh thu năm?" — mỗi câu dẫn điều khoản, ngày hiệu lực (kho luật MIMI đã có).
3. Đo: mỗi tháng hỏi 20 câu đó trên ChatGPT/Perplexity/Gemini, đếm số lần MIMI được trích.

Tác động WTP: gián tiếp (kéo đúng người đang lo thuế tới), nhưng rẻ nhất.

## 2. Học máy — độ tin của con số (ưu tiên CAO: lõi của lý do trả tiền)

Mới: phân loại giao dịch SME bằng ML + dữ liệu tổng hợp đạt ~73% đúng toàn bộ, ~90% ở nhóm độ tin cao (arXiv
2508.05425). Ngành ghi nhận ~25% giao dịch bị phân loại sai ở các nhà cung cấp. **Conformal prediction** trả về tập
nhãn có bảo đảm độ phủ; tập càng lớn càng nên chuyển người xem.

MIMI đã có nguyên tắc đúng: "không chắc → không tự kết luận → hỏi đúng 1 câu" (nhận định ngưỡng doanh thu, tiền vào
cần xác nhận). Việc nên làm:
1. Gắn **độ tin đã hiệu chuẩn** cho từng phân loại tiền vào/tiền ra; chỉ tự động khi vượt ngưỡng, còn lại hỏi.
2. Đo và **khoe** con số: "% giao dịch tự khớp không cần sửa" — đây là thứ khách thấy và trả tiền cho.
3. Ghi lại mọi lần chủ hộ sửa nhãn làm dữ liệu học (đã có bảng sự kiện phân loại).

Tác động WTP: trực tiếp — khách trả tiền cho "tờ khai đúng, ít phải sửa", không trả cho "có AI".

## 3. Tài chính mở — dữ liệu ngân hàng đáng tin (ưu tiên TRUNG BÌNH, theo dõi)

Mới: Thông tư 64/2024/TT-NHNN về Open API ngành ngân hàng, hiệu lực 01/03/2025 — khung pháp lý đầu tiên cho bên
thứ ba kết nối dữ liệu ngân hàng khi khách đồng ý.

Hàm ý: về lâu dài MIMI có thể đọc sao kê trực tiếp từ ngân hàng thay vì qua trung gian (Casso/SePay), dữ liệu khó
sửa hơn tệp tải lên. Hiện MIMI đã gắn được nguồn dữ liệu; nên thêm **nhãn độ tin theo nguồn** (liên kết ngân hàng >
webhook > tệp tải lên). Việc thật: hỏi 1–2 ngân hàng về điều kiện làm bên thứ ba theo TT64.

## 4. Blockchain — ĐÃ CÓ phần đáng có, không làm thêm

MIMI đã neo mã băm sổ chứng từ lên Bitcoin qua OpenTimestamps (cây Merkle, chỉ gửi mã băm, tự kiểm được bằng tệp
.ots). Đây là cách dùng blockchain duy nhất có lý cho MIMI: chứng minh chứng từ không bị sửa sau ngày ghi.

Không làm: token, chuỗi riêng, hợp đồng thông minh, ví crypto — không giải nỗi đau nào của chủ hộ và kéo theo rủi ro
pháp lý. Nếu muốn tăng WTP từ phần này: nói nó bằng lời người dùng ("chứng từ đã khoá, sửa là lộ") ở gói trả phí,
rồi hỏi kế toán dịch vụ có trả thêm cho điều đó không. Chưa có bằng chứng họ trả.

## 5. Thứ tự làm

1. Tiền khách trả được ghi nhận (SePay tài khoản công ty) — chặn mọi thứ khác.
2. 10–15 cuộc hỏi giá với hộ thật (Van Westendorp: giá nào rẻ đáng ngờ / hời / bắt đầu đắt / quá đắt).
3. Prerender trang công khai + trang hỏi–đáp thuế có trích dẫn (GEO).
4. Độ tin đã hiệu chuẩn cho phân loại + chỉ số "% tự khớp".
5. Theo dõi TT64 / ngân hàng mở.

## Nguồn

- GEO: https://llmpulse.ai/blog/state-of-geo/ ; https://llmpulse.ai/blog/geo-guide/ ; bài gốc arXiv "GEO: Generative Engine Optimization" (11/2023)
- Phân loại giao dịch SME: https://arxiv.org/pdf/2508.05425 ; https://weareuncapped.com/blog/transaction-categorisation-model-lending-ecommerce
- Giám sát độ bất định LLM bằng conformal prediction: https://aws.amazon.com/blogs/industries/monitoring-llm-uncertainty-in-financial-services-on-aws/
- Open API TT64/2024: https://thoibaotaichinhvietnam.vn/open-api-tao-cu-hich-cho-ngan-hang-mo-phat-trien-he-sinh-thai-fintech-187707.html ; https://luatvietan.vn/chia-se-du-lieu-qua-giao-dien-lap-trinh-ung-dung-mo-open-api-la-gi.html
- Chọn phần mềm kế toán SME: https://ideas.repec.org/a/khe/journl/v9y2017i3p41-45.html ; https://hurdlr.com/embedded-accounting-smb-vertical-software-report
