# MIMI — chấm điểm theo đề BTL86-58 và kịch bản trình diễn

Ngày: 12/10/2026. HEAD khi viết: `bb5df96` (chưa triển khai production — xem mục 4).

Đề BTL86-58 (Bộ Tư lệnh 86): *Trợ lý số đồng hành cùng hộ kinh doanh và doanh nghiệp nhỏ về thủ tục, thuế và hoá đơn điện tử* — hướng dẫn từng bước đăng ký, nghĩa vụ thuế, hoá đơn điện tử, nhắc hạn và quy định theo loại hình, cá nhân hoá theo ngành nghề, kết nối cơ quan liên quan.

Điểm dưới đây chấm theo **cái đang chạy được và có test**, không theo cái đã hứa. Mỗi điểm kèm bằng chứng trong repo.

## 1. Bảng điểm theo yêu cầu của đề

| Yêu cầu của đề | Điểm /10 | Đang có (bằng chứng) | Thiếu |
|---|---|---|---|
| Nghĩa vụ thuế | **8,5** | Doanh thu từ sao kê: loại chuyển nội bộ, hỏi khoản vay/chưa rõ (`_shared/doanh-thu/`, test đối kháng). Tờ khai hộ 01/TKN-CNKD; **05/KK-TNCN theo TT 89/2026** chép từ bản ký số tr. 307–309, tính khấu trừ lũy tiến 5 bậc (`_shared/thue-tncn/`). Kho văn bản Công báo, trích dẫn có số hiệu | 01/TKN-CNKD **kỳ năm 2026 vẫn chặn**: mẫu TT89 đổi cấu trúc (16 cột, nhóm ngành), chưa dựng lại. Biểu thuế 5 bậc và giảm trừ 15,5/6,2 triệu mới đối chiếu nguồn thứ cấp |
| Nhắc hạn và quy định theo loại hình | **8** | Một lịch thuế dùng chung cho Tổng quan, Nhắc thuế, thông báo (`luat/lich-thue.ts`); trạng thái phải làm / cần xác minh / không áp dụng, có "vì sao" và căn cứ; mốc TNCN quý từ Q3/2026 | Câu trả lời "có trả lương không", "kỳ khai GTGT" chưa lưu được → nhiều mốc DN đứng ở "cần xác minh" |
| Cá nhân hoá | **7** | Hồ sơ nghĩa vụ suy từ **mã số thuế** (loại hình, đơn vị trực thuộc, trạng thái, cơ quan thuế) (`mst/ho-so-mst.ts`); nhóm hoạt động của hộ quyết định tỷ lệ GTGT/TNCN | Chưa có mã ngành VSIC trong hồ sơ; API tra MST không trả ngành và ngày thành lập |
| Hướng dẫn từng bước | **8** | Trợ lý + con trỏ mèo làm hộ trên giao diện; **nhiều trỏ, mỗi trỏ một agent**; **trỏ tự lập kế hoạch bằng AI** có kiểm hai lớp, không tự bấm nút chạm tiền | Danh mục đích `data-mimi` còn ít ngoài trang Agent |
| Hoá đơn điện tử | **3** | Giải thích, nhắc ngưỡng; quét chứng từ bằng camera ra PDF | Không đọc / không xuất hoá đơn điện tử (chưa có quyền kết nối Tổng cục Thuế — đã gỡ 29/09) |
| Đăng ký kinh doanh | **2** | Trợ lý trả lời chung | Chưa có bộ mẫu đăng ký (đã nhận bộ CTCP mẫu của chủ dự án 11/10, chưa dựng). Chưa có hướng dẫn từng bước theo NĐ 168/2025 |
| Kết nối cơ quan | **4** | Điền hộ lên cổng: bộ chạy tại máy, đọc lại, đối chiếu, bàn giao — **chỉ trên biểu mẫu thử**; nút cổng thuế mở đúng đường dẫn | Bộ chuyển cổng thuế thật chưa xác minh; chưa có TVAN (thiếu XML + chữ ký số) |

**Trung bình theo đề: ≈ 5,8 / 10.** Mạnh vượt đề ở thuế, nhắc hạn và kiểm soát; yếu ở hoá đơn điện tử, đăng ký kinh doanh và kết nối cơ quan.

## 2. Chấm theo năng lực kỹ thuật (để trả lời giám khảo kỹ thuật)

| Hạng mục | Điểm /10 | Ghi chú |
|---|---|---|
| Đúng số, không bịa | 9 | Tiền số nguyên; "chưa biết" không thành "bắt buộc"; căn cứ chưa đối chiếu luôn mang nhãn |
| Kiểm thử | 9 | 231 tệp / 2.259 test đạt; test đối kháng doanh thu; 15 ca trình duyệt thật cho điền hộ |
| An toàn hành động | 9 | Agent không giữ/chuyển tiền; luật chi thuần (hạn mức, khung giờ, trần người nhận); trỏ AI chỉ đề xuất trong danh mục |
| Chi phí AI có kiểm soát | 8 | Xu trừ theo **đúng tiền OpenRouter báo đã trừ** (`usage.cost`), hết xu rơi về trả lời mẫu |
| Dữ liệu thật đã chạy | 3 | Theo ghi nhận 29/09: dữ liệu thật rất ít, AI hội thoại hầu như chưa chạy trên production. Cần số liệu mới trước khi trình |

## 3. Phần "ăn tiền" và phần đã lược

- **Ăn tiền**: tờ khai (hộ + TNCN), nhắc thuế theo MST, kiểm soát chi agent, xu cho AI. Doanh nghiệp có MST tra được **miễn phí trọn đời**; hộ kinh doanh gói tháng; xu mua thêm qua chuyển khoản → SePay → webhook → cộng tự động.
- **Đã lược**: lượt 10.000đ/tờ (ngừng bán), edge function `macro-news`, `elevenlabs-tts`; Khách hàng (CRM) đóng băng.
- **Con số ĐỀ XUẤT chưa chốt**: hạn mức xu 300 / 3.000 / 3.000; số trỏ 1 / 2 / 3; 1 xu = 0,001 USD chi phí token; giá gói xu = chi phí × 2 × 26.500 (1.000 xu = 53.000đ).

## 4. Điều kiện trước khi trình diễn (bắt buộc)

1. Chạy `bash scripts/trien-khai-2026-10-12.sh` (4 migration → 9 function → gỡ 2 function cũ → đẩy web). Chưa chạy thì production **không có** các tính năng mục 5.
2. Tài khoản trình diễn: một **hộ kinh doanh** có sao kê năm 2025 đã phân loại xong (để tờ khai năm 2025 xuất được) và một **doanh nghiệp** có MST tra được (để thấy hồ sơ nghĩa vụ + miễn phí trọn đời + tờ khai TNCN). Không dùng dữ liệu khách thật trên màn hình.
3. Khoá mô hình (OpenRouter) còn tiền; sổ xu của tài khoản trình diễn còn năng lượng.
4. Chạy thử toàn kịch bản một lần trên đúng máy và mạng sẽ trình. Mở sẵn các tab; tắt thông báo hệ điều hành.

## 5. Kịch bản trình diễn 8 phút

| Phút | Màn hình | Nói gì (ý chính) | Dự phòng nếu hỏng |
|---|---|---|---|
| 0:00–0:45 | Trang chủ | Nỗi đau: hộ/DN nhỏ lúng túng nghĩa vụ thuế, dễ sai, dễ phạt. MIMI là trợ lý **làm hộ có kiểm soát**, không chỉ trả lời | — |
| 0:45–2:00 | Nhắc thuế (DN) | Nhập MST là MIMI biết loại hình, cơ quan thuế, trạng thái → hồ sơ nghĩa vụ: phải làm / cần xác minh / không áp dụng, mỗi dòng có căn cứ | Ảnh chụp màn hình đã chuẩn bị |
| 2:00–3:30 | Tờ khai → tab Thuế TNCN | Dán bảng lương 3 người → MIMI tính khấu trừ lũy tiến, ra 05/KK-TNCN **đúng mẫu TT 89/2026**, bản xem trước, in | Tệp bảng lương mẫu sẵn trên máy |
| 3:30–4:30 | Tờ khai hộ kinh doanh | Doanh thu từ sao kê: tiền chuyển nội bộ và khoản vay **không** bị tính là doanh thu → điền mẫu, có căn cứ | Ca có sẵn trong tài khoản trình diễn |
| 4:30–6:00 | Trợ lý | Gõ "Tạo agent tên Bot quảng cáo" → **trỏ mèo** tự đi, gõ tên, dừng ở nút để người bấm. Gõ một câu luật không biết ("chỉ cho tôi chỗ nạp xu") → **trỏ AI tự lập kế hoạch**, kiểm rồi mới chạy | Nếu mô hình chậm: câu theo luật ("tạo agent…") không cần mô hình |
| 6:00–7:00 | Kiểm soát agent | `/taoagent` kiểu Telegram: hạn mức, khung giờ, trần người nhận; nhiều trỏ chạy song song, mỗi trỏ một agent | — |
| 7:00–8:00 | Cài đặt | Năng lượng (xu) bám đúng chi phí AI thật; doanh nghiệp miễn phí trọn đời. Lộ trình: hoá đơn điện tử, đăng ký KD, cổng thuế thật | — |

**Không nói** trong buổi trình: "MIMI đã kết nối cơ quan thuế", "đọc/xuất hoá đơn điện tử", "nộp thay", "đăng ký doanh nghiệp tự động". Chưa có, giám khảo hỏi là lộ.

## 6. Việc tiếp theo theo mức tăng điểm

1. Dựng lại 01/TKN-CNKD theo TT 89 (gỡ chặn kỳ năm 2026) — tăng điểm "nghĩa vụ thuế" và là việc gấp nhất trước kỳ khai đầu 2027.
2. Bộ mẫu đăng ký doanh nghiệp (CTCP từ bộ mẫu đã nhận; TNHH, hộ kinh doanh cần văn bản gốc NĐ 168/2025 + thông tư hướng dẫn) — kéo "đăng ký kinh doanh" từ 2 lên ~7.
3. Lưu câu trả lời "có trả lương / kỳ khai GTGT" để nhắc thuế DN hết "cần xác minh".
4. Bộ chuyển cổng thuế thật cho điền hộ (sau khi quan sát cổng bằng tài khoản thử).
