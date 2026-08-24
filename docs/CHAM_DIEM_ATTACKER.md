# Chấm lại báo cáo Attacker 2026 — vì sao top 20 mà không vào top 5

Lập 24/08/2026. Chấm theo `checklist_cham_diem_du_an.xlsx`: **14 tiêu chí × 5 điểm
= 70**.

Đây là chấm nội bộ, không phải điểm thật của ban giám khảo. Nhưng nó dựa trên
đúng rubric họ dùng, và mọi nhận định đều đối chiếu với báo cáo đã nộp hoặc với
mã nguồn/cơ sở dữ liệu thật.

---

## Điểm tổng: **48/70 ≈ 69%**

| Nhóm | Điểm | Tối đa |
|---|---|---|
| 1. Sự cần thiết & ứng dụng | **17** | 20 |
| 2. Khả thi & tiềm năng | **9** | 20 |
| 3. Đổi mới sáng tạo | **9** | 10 |
| 4. Trình bày & minh chứng | **8** | 10 |
| 5. Năng lực đội ngũ | **5** | 10 |

Hình dạng điểm này giải thích chính xác kết quả top 20 mà không vào top 5:
**kỹ thuật rất mạnh, kinh doanh và đội ngũ rất yếu.** Ở vòng đầu người ta chấm ý
tưởng và công nghệ — MIMI thắng. Vào chung kết trước hội đồng nhà đầu tư, câu hỏi
đổi thành "tiền về bằng đường nào, ai làm" — MIMI không có câu trả lời.

---

## Chi tiết

### 1. Sự cần thiết & ứng dụng — 17/20

| Tiêu chí | Điểm | Lý do |
|---|---|---|
| Xác định vấn đề thực tế | **5** | Không dừng ở "SME thiếu vốn" mà chỉ ra gốc: **thiếu dữ liệu, không phải thiếu vốn**. Mô tả được vòng luẩn quẩn càng nhỏ → càng ít dữ liệu → càng khó vay |
| Dẫn chứng thị trường | **5** | IFC MSME Finance Gap 2025: 21,7 tỷ USD, 62% nhu cầu chưa đáp ứng. VINASME: 80% SME khó tiếp cận tín dụng. Có tên tổ chức, có năm |
| Mô tả lợi ích | **4** | Rõ ràng, nhưng lợi ích cốt lõi được hứa là **"nhận hạn mức vay vốn lưu động"** — thứ đội không cấp được |
| Công nghệ giải quyết trực tiếp vấn đề | **3** | Chấm điểm thay thế đúng là giải trực tiếp. Nhưng **mã hoá hậu lượng tử thì không**: nó bảo vệ dữ liệu, không thu hẹp khoảng cách tín dụng. Giám khảo đọc ra "điểm khác biệt gắn thêm vào" |

### 2. Khả thi & tiềm năng — 9/20 ← **chỗ mất điểm nặng nhất**

| Tiêu chí | Điểm | Lý do |
|---|---|---|
| Xác định nguồn doanh thu | **2** | **Báo cáo không nêu mô hình doanh thu ở bất kỳ đâu.** Không giá, không phí, không tỷ lệ ăn chia. Mục "Mở rộng & tăng trưởng" nói về kênh phân phối, không nói tiền về bằng cách nào |
| Dự kiến chi phí – lợi nhuận | **1** | Chỉ có một câu "hạ tầng serverless chi phí thấp". Không đơn vị kinh tế, không chi phí thu hút khách, không dự phóng |
| Nguồn lực nhân sự – kỹ thuật | **2** | 2 người, bảng thành viên còn **3 dòng trống**. Một người gánh "Product & Full-stack, AI/ML, Bảo mật" |
| Kế hoạch scale | **4** | Ba giai đoạn có mốc thời gian, kênh phân phối qua đối tác thay vì tự xây. Hợp lý |

**Đây là lý do trượt top 5, và nó lớn hơn mọi lý do khác cộng lại.** Cuộc thi tên
là *"ARE YOU AN INNOVATOR? WE'RE YOUR INVESTORS"*. Nộp cho nhà đầu tư một hồ sơ
không có dòng nào về doanh thu thì phần còn lại hay tới đâu cũng khó cứu.

### 3. Đổi mới sáng tạo — 9/10

| Tiêu chí | Điểm | Lý do |
|---|---|---|
| Điểm khác biệt | **4** | Dữ liệu thay thế + giải thích được + hậu lượng tử. Câu "chưa fintech VN nào công khai áp dụng" có rào đón "theo tìm hiểu của nhóm" — đúng cách viết |
| Công nghệ lõi | **5** | Có thật, đã triển khai. ML-KEM-768 chạy thật; mô hình chấm điểm cho ra **ba kết quả khác nhau** (703/628/701) với ba xác suất vỡ nợ khác nhau trong database — chứng minh nó tính chứ không trả hằng số |

### 4. Trình bày & minh chứng — 8/10

| Tiêu chí | Điểm | Lý do |
|---|---|---|
| Prototype / Demo | **5** | Đã deploy production, mã nguồn công khai trên GitHub, 8 hình chụp màn hình thật. Rất mạnh — phần lớn đối thủ ở vòng này chỉ có wireframe |
| Pitch, slide logic | **3** | Báo cáo 26.000 ký tự, đoạn văn dài, đặc chữ. Đọc thì thuyết phục, nhưng **thi chung kết là nói trong vài phút** — mật độ chữ này không chuyển thành slide được |

### 5. Năng lực đội ngũ — 5/10

| Tiêu chí | Điểm | Lý do |
|---|---|---|
| Phân công vai trò | **2** | Hai người cho một sản phẩm tín dụng. **Không có ai chuyên rủi ro tín dụng** — mà chính báo cáo thừa nhận cần "mở rộng đội ngũ chuyên môn về rủi ro tín dụng" |
| Thuyết trình – phản biện | **3** | Không đánh giá được từ văn bản. Để mức trung tính |

---

## Ba vấn đề chí mạng, xếp theo mức độ

### 1. Không có mô hình doanh thu

Đã nói ở trên. Đây là lỗ hổng lớn nhất.

### 2. Hứa cho vay mà không có giấy phép

Báo cáo hứa "ứng vốn hoá đơn" (invoice factoring) và "nhận hạn mức vay vốn lưu
động". Cả hai là **hoạt động có điều kiện**, cần giấy phép tổ chức tín dụng.

Hội đồng cuộc thi tài chính sẽ hỏi câu này trong ba mươi giây đầu. Báo cáo có nêu
cần "một tổ chức tín dụng được cấp phép để thí điểm cho vay" ở phần nguồn lực,
nhưng nó nằm sâu trong mục V, sau khi phần đầu đã hứa chắc nịch.

### 3. Chưa có pháp nhân

Báo cáo ghi *"Tổ chức: Cá nhân/nhóm khởi nghiệp – chưa thành lập pháp nhân"*, và
để trống toàn bộ khối thông tin pháp nhân. Với cuộc thi do nhà đầu tư tổ chức,
đây là rào cản thực tế: **không ai rót vốn vào một nhóm người.**

---

## Điều báo cáo làm ĐÚNG, đáng giữ nguyên

Ba chỗ này hiếm và nên giữ khi viết lại:

**Khai báo thẳng giới hạn.** Báo cáo tự nói hệ số mô hình là expert-elicited chứ
chưa huấn luyện trên dữ liệu vỡ nợ, rằng eKYC khuôn mặt/OTP đang mô phỏng, rằng
dữ liệu ngân hàng trong MVP là mô phỏng. Đó là cách viết tạo được lòng tin, và
nó khớp với ghi chú trong `scoring.ts:42`.

**Số liệu có nguồn.** IFC 2025, VINASME, quyết định 231/QĐ-KNST có số hiệu và
ngày. Kiểm được.

**Minh chứng vận hành thật.** Điểm 701 và PD 34,1% trong báo cáo **đối chiếu đúng
với dòng dữ liệu trong `credit_score_snapshots`** (701 / 0,34053). Không phải số
dựng. Rất ít hồ sơ ở vòng này chứng minh được điều đó.

---

## Nếu nộp lại hôm nay, ba lỗ hổng đã khác hẳn

Đây mới là phần đáng chú ý: **cả ba vấn đề chí mạng đều đã được xử lý sau khi
nộp**, không phải bằng cách viết lại hồ sơ mà bằng cách đổi sản phẩm.

| Vấn đề tháng 7 | Hiện trạng 24/08/2026 |
|---|---|
| Không có mô hình doanh thu | **Có, và đang chạy.** Thuê bao 149.000đ/249.000đ mỗi tháng, thu qua chuyển khoản kèm mã tham chiếu, QR VietQR dựng tại chỗ, cron đối soát 10 phút/lần đã chạy thật (200 OK) |
| Hứa cho vay không giấy phép | **Đã bỏ toàn bộ.** Điều khoản sử dụng nay ghi rõ ba dòng "không phải tổ chức tín dụng / không phải trung gian thanh toán / không phải đại lý thuế" |
| Chưa có pháp nhân | **CÔNG TY CỔ PHẦN CLI NUTRIX**, MST 0319436143, cấp 11/03/2026 |

Và định vị đã đổi từ "cho vay SME" sang **"chứng từ chi phí cho kê khai thuế"** —
bám vào một thay đổi pháp luật có thật (bỏ thuế khoán từ 01/01/2026) thay vì một
khoảng trống tín dụng mà đội không được phép lấp.

Vài con số khác cũng đã đổi: **24 unit test → 269**. Nghiệm thu tích hợp ngân
hàng thật với Casso/BankHub **14/20 case**, dữ liệu thật trong hệ thống gồm 2.435
giao dịch và 68 khách hàng doanh nghiệp.

---

## Khuyến nghị cho lần nộp sau

1. **Mở đầu bằng doanh thu, không phải bằng công nghệ.** Nhà đầu tư đọc ba đoạn
   đầu rồi quyết định có đọc tiếp không. Câu đầu nên là ai trả tiền, trả bao
   nhiêu, vì sao.
2. **Không hứa thứ cần giấy phép.** Ranh giới hẹp nhưng hợp pháp mạnh hơn phạm vi
   rộng mà không được phép làm.
3. **Bổ sung người, hoặc nói thẳng đang thiếu ai.** Hai người mà ba dòng bỏ trống
   trông tệ hơn hai người kèm một câu "đang tìm chuyên gia rủi ro tín dụng".
4. **Giữ nguyên kỷ luật minh chứng.** Đây là thứ mạnh nhất của hồ sơ. Đừng đổi.
5. **Tách bản đọc và bản nói.** 26.000 ký tự để thẩm định hồ sơ; vài phút trình
   bày cần một bản khác hẳn.
