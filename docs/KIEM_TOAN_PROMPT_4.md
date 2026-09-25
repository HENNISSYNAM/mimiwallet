# Kiểm toán trước Prompt 4 — Frontier Financial Copilot

Ngày 25/09/2026. Đối chiếu mã trên `main` (commit `9b2c5e7`, **chưa push**) với 10 mảng Prompt 4 yêu cầu
kiểm toán trước khi làm. Mỗi mảng: CÓ GÌ, THIẾU GÌ, LÀM GÌ.

## Điều kiện tiên quyết chưa đạt

Prompt 4 viết "làm SAU KHI Prompt 3 xong". Chưa xong:

| Việc Prompt 3 | Trạng thái |
|---|---|
| Phase A (nhất quán production) | Xong trong mã, 1531 test xanh. **Chưa deploy function** (lệnh deploy bị bộ kiểm duyệt an toàn chặn, chờ chủ sản phẩm) và **chưa push**. Còn thiếu: gộp trạng thái kết nối ngân hàng. |
| Phase B (smoke test 15 luồng) | Chưa |
| Phase C (thủ tục → nghĩa vụ → hồ sơ việc) | Chưa — **đây là nền Prompt 4 dựng lên trên** ("Do not create a second workflow system") |
| Phase D (lịch, trợ lý, UI) | Một phần: lịch thuế cá nhân hoá, trợ lý hạn thuế đã có |

Quyết định: Phase C của Prompt 3 và mục A (guided journey) của Prompt 4 làm **một lần, một hệ**:
`ho_so_viec` (compliance case) là "chuyện gì đang xảy ra và phải giải quyết", `hanh_trinh` +
`buoc_hanh_trinh` là "các bước để giải quyết". Bước của hồ sơ việc CHÍNH LÀ bước hành trình — không
có bảng `case_steps` riêng.

## 1. Guided compliance

- **Có:** kho thủ tục thuế từ Cổng DVC (`thu_tuc_thue`, `_shared/tro-ly/thu-tuc.ts` chọn thủ tục theo câu
  hỏi); lịch nghĩa vụ cá nhân hoá (`_shared/luat/lich-thue.ts`); trạng thái doanh nghiệp theo MST
  (`doanh-nghiep/trang-thai.ts`, chặn khai thường khi tạm ngừng/chấm dứt).
- **Thiếu:** không có đối tượng "hồ sơ việc" hay "hành trình" nào được lưu. Trợ lý trả lời xong là quên;
  không hỏi từng câu một; không có bước, không có trạng thái chặn/chờ bên ngoài.
- **Làm:** bảng `ho_so_viec`, `hanh_trinh`, `buoc_hanh_trinh` (RLS theo thành viên, chỉ máy chủ ghi);
  mẫu hành trình tất định cho 12 loại; hàm thuần "câu hỏi tiếp theo" chọn đúng một dữ kiện thiếu có ưu tiên cao nhất.

## 2. Financial analysis

- **Có:** `tinh-toan.ts` — chi phí tháng, dòng tiền 6 tháng, báo cáo dòng tiền (ghi rõ "không phải báo cáo
  tài chính"), tiết kiệm, bất thường; `_shared/doanh-thu/so-lieu.ts` là một nguồn doanh thu.
- **Thiếu:** không có phân tích chênh lệch (variance) hai kỳ; không tách FACT / INFERENCE / UNKNOWN; câu
  "doanh thu tăng mà tiền giảm" không có năng lực trả lời.
- **Làm:** năng lực `phan_tich_chenh_lech` theo khuôn QUESTION → DATA USED → KEY NUMBERS → DRIVERS →
  RISKS → WHAT NEEDS REVIEW → NEXT ACTION → SOURCES, mỗi câu gắn nhãn sự thật / suy luận / chưa biết.

## 3. Invoice

- **Có:** `invoices` (tự lập, có `is_synthetic`), `gdt_invoices` (của Tổng cục Thuế, `invoice_status` số),
  đối soát tiền về ↔ hoá đơn (`doi-soat/cham-diem.ts`, `ledger/receivables.ts`), QR thu tiền.
- **Thiếu:** không có vòng đời chung — hai bảng hai cách ghi trạng thái; không có luồng "hoá đơn sai MST".
- **Làm:** hàm `vongDoiHoaDon()` quy mọi nguồn về 10 trạng thái Prompt 4 (ưu tiên trạng thái GDT); hành
  trình `invoice_correction` hỏi đúng dữ kiện thiếu (đã gửi người mua chưa, đã kê khai chưa).

## 4. Tax readiness

- **Có:** lịch thuế một nguồn (`doc-lich-thue.ts`) cho Tổng quan, Nhắc thuế, trợ lý, thông báo.
- **Thiếu:** chưa có đối tượng `tax_readiness` gộp lịch + doanh thu đã/chưa phân loại + giấy tờ thiếu.
- **Làm:** mở rộng `LichCongTy` thành `SanSangThue` (hàm thuần, cùng một chỗ), mọi màn đọc nó.

## 5. Procedure

- **Có:** `thu_tuc_thue` (danh mục cổng, có mẫu tờ khai, căn cứ), `luat/to-khai.ts` chặn mẫu đã bị thay.
- **Thiếu:** chưa có sổ mẫu biểu chính thức (form registry) có hiệu lực/phiên bản; chưa có danh bạ cơ quan
  đã xác minh; chưa phát hiện xung đột nguồn (thủ tục cũ hơn luật).
- **Làm:** `mau_bieu_chinh_thuc` và `co_quan` chỉ nạp từ nguồn đã có trong kho (không bịa URL, SĐT, địa chỉ);
  mẫu nào chưa đối chiếu thì `needs_review`, hành động hệ trọng bị chặn khi phiên bản chưa chắc.

## 6. Artifacts

- **Có:** ảnh chứng từ (kho riêng tư `chung-tu`), sổ cái chứng từ chống sửa (`so_cai_chung_tu`,
  `neo_thoi_gian`), soạn 3 loại giấy tờ **trên trình duyệt** (`src/lib/giayTo.ts`) — không lưu lại.
- **Thiếu:** không có thư viện tài liệu; giấy tờ soạn xong mất khi đóng trang; không có phiên bản.
- **Làm:** `tai_lieu` + `phien_ban_tai_lieu` bất biến (ký/nộp/được chấp nhận thì không ghi đè — trigger chặn),
  băm nội dung, nhãn DRAFT / MIMI-GENERATED / OFFICIAL TEMPLATE; trình dựng ở máy chủ.

## 7. Assistant memory

- **Có:** `hoi_thoai_tro_ly` (nhật ký), `lich_su` gửi kèm từ trình duyệt (vài lượt gần nhất).
- **Thiếu:** không có ngữ cảnh làm việc có cấu trúc (hồ sơ việc đang mở, dữ kiện đã biết/thiếu).
- **Làm:** `NguCanhLamViec` dựng từ hành trình đang mở + dữ kiện đã xác nhận, gửi cho mô hình thay vì dồn lịch sử.

## 8. Tool orchestration

- **Có — và tốt:** mỗi năng lực khai `can: NguonCan[]`, `docDuLieu` chỉ đọc đúng nguồn cần; mô hình chọn
  công cụ qua `mo_ta`; không có mô hình thì `y-dinh.ts` định tuyến tất định.
- **Thiếu:** không có công cụ tài liệu, hành trình, đối soát theo câu hỏi.
- **Làm:** thêm năng lực vào cùng bảng `NANG_LUC`, không dựng bộ điều phối thứ hai.

## 9. Evals

- **Có:** `_shared/eval/harness.ts` chấm tất định (ý định, số liệu, trích dẫn, hành động không an toàn),
  `bo-ca.ts` 17 ca / mục tiêu 300.
- **Thiếu:** không có trường "kết luận cấm", "bằng chứng mong đợi"; không có định dạng golden case có trạng thái duyệt.
- **Làm:** mở rộng `CaEval` với `ket_luan_cam`, `bang_chung_mong_doi`; định dạng golden case có
  `human_review_status`; thêm ca cho 10 câu bắt buộc của Prompt 4 mục 40.

## 10. AI provider abstraction

- **Có:** một cổng cứng (`ai.gateway.lovable.dev`), một mô hình cứng (`google/gemini-3-flash-preview`) trong
  `tro-ly/mo-hinh.ts`.
- **Thiếu:** không có tầng nhà cung cấp; không định tuyến theo loại việc; không ghi chi phí/độ trễ mỗi lần gọi.
- **Làm:** `_shared/ai/nha-cung-cap.ts` — giao diện chung (tin nhắn, công cụ, kết quả chuẩn hoá), bộ chuyển
  cho cổng hiện tại; bảng định tuyến theo `muc_dich` (y_dinh / trich_xuat / dien_dat / phan_tich); ghi
  provider, model, mục đích, độ trễ, token. Không đổi nhà cung cấp đang chạy khi chưa có eval so sánh.

## Không làm (Prompt 4 mục 41)

Nộp TVAN tự động, ký tự động, nộp thuế, chi hộ, trích nợ tự động, bảng lương, kho hàng, kế toán kép,
fine-tune. Không dùng dữ liệu khách thật làm bộ huấn luyện.
