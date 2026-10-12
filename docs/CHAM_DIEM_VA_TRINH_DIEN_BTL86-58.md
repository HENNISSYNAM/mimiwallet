# MIMI — chấm điểm theo đề BTL86-58 và kịch bản trình diễn

Chấm lại ngày 12/10/2026 sau đợt nâng điểm. HEAD: `21ff5b2` (30 commit từ `79c58ec`, **chưa triển khai production** — xem mục 4).

Đề BTL86-58 (Bộ Tư lệnh 86): *Trợ lý số đồng hành cùng hộ kinh doanh và doanh nghiệp nhỏ về thủ tục, thuế và hoá đơn điện tử* — hướng dẫn từng bước đăng ký, nghĩa vụ thuế, hoá đơn điện tử, nhắc hạn và quy định theo loại hình, cá nhân hoá theo ngành nghề, kết nối cơ quan liên quan.

Điểm chấm theo **cái chạy được và có test**, không theo cái đã hứa.

## 1. Bảng điểm theo đề

| Yêu cầu | Trước | Nay | Đang có (bằng chứng) | Còn thiếu để lên 10 |
|---|---|---|---|---|
| Nghĩa vụ thuế | 8,5 | **9** | Doanh thu từ sao kê (loại chuyển nội bộ, hỏi khoản vay) có test đối kháng. **01/TKN-CNKD theo TT 89/2026** (chép bản ký số tr. 365–371, 16 cột, phần B–E, kiểm công thức) — **kỳ năm 2026 đã hết bị chặn**. **05/KK-TNCN theo TT 89/2026** (tr. 307–309) + tính khấu trừ lũy tiến. Chọn mẫu theo ngày cuối kỳ (Điều 100 khoản 1) | Biểu thuế 5 bậc và giảm trừ 15,5/6,2 triệu mới có nguồn thứ cấp; 3 ô mẫu TT89 chép từ bản quét nhoè cần đối chiếu giấy; kỳ năm 2025 chưa soạn được |
| Nhắc hạn và quy định | 8 | **9** | Một lịch thuế cho mọi màn hình; **lưu được câu trả lời** (trả lương, kỳ GTGT, siêu nhỏ, cách nộp TNDN) → lịch tính lại ngay; mốc TNCN quý; GTGT không còn bỏ sót kỳ vừa hết | Tiêu chí "doanh nghiệp siêu nhỏ" chưa có căn cứ trong kho; hạn rơi vào ngày nghỉ chưa tự lùi |
| Hướng dẫn từng bước | 8 | **9** | Con trỏ mèo làm hộ; **nhiều trỏ, mỗi trỏ một agent**; **trỏ tự lập kế hoạch bằng AI** (kiểm hai lớp, không tự bấm nút chạm tiền); tạo agent bằng hội thoại kiểu Telegram | Danh mục đích `data-mimi` còn mỏng ở các trang thuế |
| Cá nhân hoá | 7 | **8,5** | Hồ sơ nghĩa vụ suy từ **mã số thuế** (loại hình, đơn vị trực thuộc, trạng thái, cơ quan thuế); **khai ngành VSIC**, gợi ý nhóm hoạt động cho hộ (người dùng xác nhận) | Bảng mã ngành → nhóm chưa đối chiếu Công báo; chưa cảnh báo ngành có điều kiện (không có nguồn ghép mã) |
| Đăng ký kinh doanh | 2 | **8** | Trang mới: chọn loại hình, hồ sơ và bước nộp có nhãn nguồn; **bộ soạn Mẫu 2/3/4/10 theo TT 121/2026** (thay mẫu TT 68/2025), Mẫu 6/7, mẫu hộ kinh doanh, khung điều lệ; in/PDF; dữ liệu cá nhân chỉ ở trình duyệt | Lệ phí, thời hạn, vài điều Luật Doanh nghiệp mới có nguồn thứ cấp; chưa đọc NĐ 296/2026; chưa xuất .docx |
| Hoá đơn điện tử | 3 | **6,5** | **Kiểm tệp XML hoá đơn** trên máy (trường bắt buộc, cộng tiền số nguyên, có/không chữ ký số, MCCQT, MST người mua, chống XML độc); **nghĩa vụ HĐĐT theo NĐ 254/2026** (thay NĐ 123/2020, NĐ 70/2025); tra cứu nhanh; lưu vào chứng từ | Không xuất / không đọc HĐĐT từ cơ quan thuế (chưa có quyền kết nối); chưa kiểm hợp lệ chữ ký số |
| Kết nối cơ quan | 4 | **6** | **Bộ hồ sơ nộp**: bảng số liệu .xlsx + hướng dẫn nộp đúng cổng theo loại người nộp; danh bạ 8 cổng (đã kiểm HTTP 200); điền hộ lên cổng (bộ chạy tại máy, đối chiếu, bàn giao) | Bộ chuyển cổng thuế thật chưa xác minh; không có TVAN/XML tờ khai/chữ ký số |

**Trung bình theo đề: ≈ 8,0 / 10** (trước: ≈ 5,8).

## 2. Chấm theo năng lực kỹ thuật

| Hạng mục | Điểm | Ghi chú |
|---|---|---|
| Đúng số, không bịa | 9 | Tiền số nguyên; "chưa biết" không thành "bắt buộc"; nguồn thứ cấp luôn có nhãn; văn bản mới (TT 89, TT 121, NĐ 254) đọc từ bản ký số |
| Kiểm thử | 9,5 | 231 tệp / 2.299 test đạt; tsc sạch; build đạt; 17/17 edge function qua deno check |
| An toàn hành động | 9 | Agent không giữ/chuyển tiền; luật chi thuần (hạn mức, khung giờ, trần người nhận); **đối soát chi agent đã nối vào mọi đường ghi giao dịch**; trỏ AI chỉ đề xuất trong danh mục |
| Chi phí AI có kiểm soát | 9 | Xu trừ theo đúng `usage.cost` OpenRouter báo đã trừ; giá gói xu tính từ chi phí token; mua qua chuyển khoản → SePay → đối soát tự động |
| Gọn | 8,5 | Đợt dọn gỡ ~2.800 dòng mã chết, 17 ảnh, 3 edge function, 1 gói npm; trang CRM đóng băng đã gỡ |
| Dữ liệu thật đã chạy | 3 | Chưa có số liệu dùng thật mới; toàn bộ đợt này **chưa lên production** |

## 3. Phần ăn tiền và con số chờ chốt

- Doanh nghiệp có MST tra được: **miễn phí trọn đời**. Hộ kinh doanh: gói tháng. Ngừng bán lượt 10.000đ/tờ.
- Xu mua thêm qua chuyển khoản; trả gói giữa tháng nhận ngay hạn mức xu.
- **ĐỀ XUẤT chờ chủ chốt**: hạn mức xu 300 / 3.000 / 3.000; số trỏ 1 / 2 / 3; 1 xu = 0,001 USD chi phí token; giá gói xu = chi phí × 2 × 26.500 (1.000 xu = 53.000đ).

## 4. Điều kiện trước khi trình diễn (bắt buộc)

1. `bash scripts/trien-khai-2026-10-12.sh` — **5 migration → 11 function → gỡ 3 function cũ → đẩy web**. Chưa chạy thì production **không có** các tính năng mục 1.
2. Tài khoản trình diễn: một **hộ kinh doanh** có sao kê năm 2026 đã phân loại; một **doanh nghiệp** có MST tra được. Một tệp bảng lương mẫu và một tệp XML hoá đơn mẫu (`src/lib/hoaDon/__mau__/hop-le.xml`). Không dùng dữ liệu khách thật trên màn hình.
3. Khoá OpenRouter còn tiền; sổ xu tài khoản trình diễn còn năng lượng.
4. Chạy thử toàn kịch bản một lần trên đúng máy và mạng sẽ trình.

## 5. Kịch bản trình diễn 8 phút

| Phút | Màn hình | Ý chính | Dự phòng |
|---|---|---|---|
| 0:00–0:40 | Trang chủ | Nỗi đau: thủ tục, thuế, hoá đơn — dễ sai, dễ phạt. MIMI là trợ lý **làm hộ có kiểm soát** | — |
| 0:40–1:40 | Đăng ký kinh doanh | 3 câu hỏi → loại hình; điền bảng hỏi → in Giấy đề nghị theo **TT 121/2026** | Bộ soạn chạy hoàn toàn trên trình duyệt, không cần mạng tới máy chủ |
| 1:40–2:40 | Nhắc thuế (doanh nghiệp) | Nhập MST → hồ sơ nghĩa vụ; bấm "có trả lương" → mốc 05/KK-TNCN thành "phải làm" ngay | Ảnh chụp chuẩn bị sẵn |
| 2:40–3:50 | Tờ khai → Thuế TNCN | Dán bảng lương → 05/KK-TNCN **đúng mẫu TT 89/2026** → bộ hồ sơ nộp: bảng số liệu + hướng dẫn nộp đúng cổng | Tệp bảng lương mẫu |
| 3:50–4:40 | Tờ khai hộ | Năm 2026, mẫu **TT 89 mới**: tiền chuyển nội bộ và khoản vay **không** bị tính là doanh thu | Ca có sẵn |
| 4:40–5:30 | Hoá đơn | Thả tệp XML → MIMI kiểm trường, cộng tiền, chữ ký số, MST; nghĩa vụ HĐĐT theo **NĐ 254/2026** | Tệp XML mẫu |
| 5:30–6:50 | Trợ lý + Kiểm soát agent | Gõ "Tạo agent tên Bot quảng cáo" → trỏ mèo làm; câu lạ → **trỏ AI tự lập kế hoạch**; `/taoagent` kiểu Telegram, khung giờ, trần người nhận; nhiều trỏ chạy song song | Câu theo luật không cần mô hình |
| 6:50–8:00 | Cài đặt | Xu bám đúng chi phí AI; doanh nghiệp miễn phí trọn đời. Lộ trình: kết nối cổng thuế, xuất HĐĐT qua nhà cung cấp | — |

**Không nói**: "đã kết nối cơ quan thuế", "xuất hoá đơn điện tử", "nộp thay", "chữ ký số hợp lệ". Chưa có.

## 6. Việc tiếp theo theo mức tăng điểm

1. **Triển khai production** (mục 4) và có số liệu dùng thật — điểm "dữ liệu thật" là điểm yếu nhất.
2. Nạp vào kho luật bản gốc TT 89/2026, NĐ 254/2026, TT 121/2026, TT 91/2026, Luật Thuế TNCN 2025, NQ 110/2025 — chuyển các nhãn "nguồn thứ cấp" thành "đã đối chiếu".
3. Bộ chuyển "điền hộ" cho mẫu 01/TKN-CNKD TT89 và quan sát cổng thuế thật bằng tài khoản thử.
4. HĐĐT: hợp tác một nhà cung cấp hoá đơn để xuất hộ (không cần kết nối Tổng cục Thuế trực tiếp).
5. Đối chiếu 3 ô chép từ bản quét nhoè của mẫu TT 89 với bản giấy.
