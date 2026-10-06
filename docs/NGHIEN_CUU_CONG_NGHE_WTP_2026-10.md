# Công nghệ mới nào giúp khách CHỊU TRẢ TIỀN cho MIMI (06/10/2026)

Câu hỏi duy nhất của tài liệu: công nghệ nào làm tăng **willingness to pay** (WTP) của hộ kinh doanh và doanh nghiệp
siêu nhỏ cho MIMI. Công nghệ hay nhưng không đổi WTP thì không làm lúc này.

## 0. Sự thật hiện tại về WTP

- Bảng tiền về tài khoản MIMI (`tien_ve_mimi`): **0 dòng** từ trước tới nay. 3 hoá đơn gói đang chờ từ 30/09.
- Nghĩa là chưa có bằng chứng ai đã trả tiền. Việc đầu tiên không phải công nghệ mới, mà là: tiền khách chuyển phải
  được ghi nhận (SePay cho tài khoản nhận của công ty) và có 10–15 cuộc hỏi giá với hộ thật.
- Nghiên cứu về phần mềm kế toán cho SME: hai yếu tố quyết định mua là **đáp đúng việc cần làm** và **chi phí**;
  rào cản lớn là cảm giác "phức tạp, đắt". Khách nghiêng về một ứng dụng gom đủ sổ sách, hoá đơn, chi phí, thuế.

## 0b. Mốc giá thị trường (tra 06/10/2026)

| Mốc | Con số | Nguồn |
|---|---|---|
| Sàn: phần mềm sổ sách – thuế cho hộ | **0 ₫** — KiotViet miễn phí phần mềm thuế/kế toán từ 25/09/2025; MISA eShop miễn phí trọn đời cho hộ ≤ 1 tỷ, hộ > 1 tỷ từ 100.000 ₫/tháng; Nhà nước sẽ cấp phần mềm dùng chung miễn phí | misaeshop.vn, sapo.vn, meinvoice.vn |
| Trần: thuê dịch vụ kế toán thuế cho hộ | **300.000 – 1.000.000 ₫/tháng** (có nơi trọn gói 490.000 ₫) | ketoananpha.vn, thue.man.net.vn |
| Nỗi sợ: khai trễ 1–30 ngày | phạt **2–5 triệu ₫** (mức của tổ chức; hộ kinh doanh chịu mức của cá nhân, thấp hơn) — NĐ 125/2020 sửa bởi NĐ 310/2025 | thuvienphapluat.vn |

**Kết luận:** "xuất tờ khai" là hàng miễn phí ở đối thủ — bán lượt 10.000 ₫/tờ khó có người trả. Điểm khách chịu trả
nằm giữa sàn 0 ₫ và trần 300.000–1.000.000 ₫: MIMI phải bán **phần việc của người kế toán** mà phần mềm miễn phí
không làm — tự đối chiếu sao kê (không cần máy bán hàng), chỉ khoản thiếu chứng từ, không để trễ hạn. Hai nhóm đáng
thử trước: hộ **1–3 tỷ** (bắt buộc khai, chứng từ chi phí có tác dụng khi tính theo thu nhập) và **văn phòng kế toán
dịch vụ** (đang thu 300.000–1.000.000 ₫/hộ; công cụ giúp họ làm nhanh hơn thì họ trả theo số hộ).

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

## 6. Đo điểm giá thật — khảo sát /khao-sat-gia

Trang `https://www.mimiwallet.online/khao-sat-gia?nguon=<kênh>` (không cần đăng nhập, không lập chỉ mục). Gửi cho 15–20
chủ hộ thật, ghi kênh vào `nguon` (vd `zalo_cho_ben_thanh`). Hỏi: doanh thu, cách thu tiền, đang ghi sổ bằng gì, đang
trả kế toán bao nhiêu, việc nào đáng trả tiền nhất, và 4 mức giá Van Westendorp. Dòng `nguon = 'kiem_thu'` là thử nghiệm
— loại ra.

Đọc kết quả (SQL editor, service role): bảng dưới cho bốn đường cong theo giá; điểm giá tối ưu (OPP) là nơi "quá rẻ"
cắt "quá đắt", điểm thờ ơ (IPP) là nơi "hời" cắt "bắt đầu đắt", khoảng chấp nhận nằm giữa hai điểm cắt còn lại.

```sql
with d as (select * from khao_sat_gia where coalesce(nguon,'') <> 'kiem_thu'),
     n as (select count(*)::numeric c from d),
     g as (select generate_series(0, 1000000, 10000) gia)
select g.gia,
  round(100 * (select count(*) from d where gia_qua_re >= g.gia) / nullif(n.c,0)) as qua_re,
  round(100 * (select count(*) from d where gia_hoi >= g.gia) / nullif(n.c,0)) as hoi,
  round(100 * (select count(*) from d where gia_bat_dau_dat <= g.gia) / nullif(n.c,0)) as bat_dau_dat,
  round(100 * (select count(*) from d where gia_qua_dat <= g.gia) / nullif(n.c,0)) as qua_dat
from g, n order by g.gia;
```

Cắt thêm theo `nhom_doanh_thu` và `viec_dang_tien` để biết nhóm nào trả cho việc nào. Dưới 15 câu trả lời thì chỉ
đọc như tín hiệu, không chốt giá.

## Nguồn

- GEO: https://llmpulse.ai/blog/state-of-geo/ ; https://llmpulse.ai/blog/geo-guide/ ; bài gốc arXiv "GEO: Generative Engine Optimization" (11/2023)
- Phân loại giao dịch SME: https://arxiv.org/pdf/2508.05425 ; https://weareuncapped.com/blog/transaction-categorisation-model-lending-ecommerce
- Giám sát độ bất định LLM bằng conformal prediction: https://aws.amazon.com/blogs/industries/monitoring-llm-uncertainty-in-financial-services-on-aws/
- Open API TT64/2024: https://thoibaotaichinhvietnam.vn/open-api-tao-cu-hich-cho-ngan-hang-mo-phat-trien-he-sinh-thai-fintech-187707.html ; https://luatvietan.vn/chia-se-du-lieu-qua-giao-dien-lap-trinh-ung-dung-mo-open-api-la-gi.html
- Giá phần mềm hộ kinh doanh: https://www.misaeshop.vn/?p=35633 ; https://www.sapo.vn/bao-chi-noi-ve-sapo/SAPO-dong-hanh-cung-ho-kinh-doanh-chuyen-doi-mo-hinh-ke-khai-thue-a2779.html ; https://www.misaeshop.vn/30625/ho-kinh-doanh-can-lam-gi-khi-bo-thue-khoan-len-ke-khai/
- Phí dịch vụ kế toán cho hộ: https://ketoananpha.vn/dich-vu-ke-toan-thue-ho-kinh-doanh.html ; https://thue.man.net.vn/dich-vu-ke-toan-thue-gia-re/
- Mức phạt khai trễ: https://thuvienphapluat.vn/hoi-dap-phap-luat/cap-nhat-muc-phat-cham-nop-to-khai-thue-nam-2026-day-du-chi-tiet-138093970.html
- Chọn phần mềm kế toán SME: https://ideas.repec.org/a/khe/journl/v9y2017i3p41-45.html ; https://hurdlr.com/embedded-accounting-smb-vertical-software-report
