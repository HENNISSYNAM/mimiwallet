# Quầy Tin — Việc cần làm (hạn nộp: tối 26/11/2026, trước hạn 27/11)

## Ngày 20–21/11 — Nền
- [x] 1. Đặc tả: requirements.md, design.md, tasks.md
- [ ] 2. Đo độ trễ webhook trên tài khoản của chính công ty (cần Nam đồng ý đọc số liệu) → chốt `CUA_SO_CHO`
- [ ] 3. Kiểm Bedrock ap-southeast-1: mô hình Nova Lite nhận ảnh qua Converse, id inference profile; Nam tự tạo khoá API
- [x] 4. Luật thuần `_shared/soat-bill/doi-chieu.ts` + `cau-noi.ts` + test (mọi nhánh R2, R2.6, đọc tiền)
- [x] 5. `doc-bill.ts` chuẩn hoá đầu ra mô hình + test (JSON hỏng, thiếu trường, sai kiểu) — 34/34 test qua 20/11

## Ngày 22–23/11 — Soát Bill chạy thật
- [x] 6. `_shared/ai/thi-giac.ts`: Bedrock Converse + dự phòng OpenRouter + test với `goi` giả (8 test)
- [x] 7. Migration `soat_bill` (dry-run OK) + edge function `soat-bill` (soat, kiem_lai, hom_nay, quyet, demo_tien_ve) — deno check OK. CHƯA push/deploy.
- [x] 8. `src/lib/loa.ts` + test; nối loa vào POS (chỉ đọc khi tiền ngân hàng thật đóng đơn)
- [x] 9. `QuayTinPage` (/dashboard/quay-tin): chụp → nén → gửi → màu + đọc to; đèn vàng tự hỏi lại; hàng chờ; 3 test
- [x] 10a. Mở lại trang /dashboard/kiem-truoc-khi-chuyen (khoá công cụ vẫn đóng băng trong kho chung)

## Ngày 24/11 — Soát Chi, hàng chờ, cửa hàng mẫu
- [ ] 10. Mở lại Kiểm trước khi chuyển trong Quầy Tin (bỏ đóng băng), bỏ mọi nút chi tiền
- [ ] 11. Hàng chờ duyệt + nhật ký trong Quầy Tin
- [ ] 12. Cửa hàng mẫu: 3 bill mẫu + giao dịch mẫu; tài khoản thử (Nam tạo)
- [ ] 13. Đưa lên mạng (cần Nam nói "đẩy")

## Ngày 25/11 — Kiểm như giám khảo
- [ ] 14. Bộ 20 bill đo độ chính xác; tsc -p tsconfig.app.json, vitest, deno test, vite build
- [ ] 15. Chạy thử trên điện thoại Android thật + máy tính; sửa lỗi

## Ngày 26/11 — Nộp bài
- [ ] 16. Video ≤ 3 phút (bill giả đỏ → tiền thật xanh → lệnh đổi số tài khoản bị giữ → nhật ký)
- [ ] 17. Slide ≤ 10 trang PDF; hướng dẫn 1 trang A4 PDF
- [ ] 18. README nộp bài (cách chạy, công nghệ, tài sản có sẵn, mã nguồn mở, công cụ AI: Claude Code, Kiro, Amazon Bedrock) + zip
- [ ] 19. Nộp

## Cắt nếu trễ (quyết lúc tối 23/11)
- Agent Soát QR (quét mã dán ở quầy) · AgentCore Runtime/Policy · tổng kết cuối ngày bằng giọng nói
