# Kiểm soát agent nâng cao — học được gì, làm gì, để gì

12/10/2026. Phạm vi chốt: **trọng tâm** — tạo agent bằng hội thoại kiểu BotFather, và hai luật mới (khung giờ, trần theo người nhận). Không chép mã của dự án nào; chỉ học mẫu thiết kế.

## Ý áp dụng cho MIMI

| # | Ý | Nguồn | Trạng thái |
|---|---|---|---|
| 1 | Bộ luật trả ba kết quả ALLOW / DENY / ESCALATE, không xử lý tiền | [pyagentgate (PyPI)](https://pypi.org/project/pyagentgate/) | Đã có từ trước (`tu_dong_duyet` / `tu_choi` / `cho_duyet`) |
| 2 | Giới hạn theo giờ trong ngày (time-of-day) | pyagentgate | **Đã làm**: `khungGioChi` + mã `NGOAI_KHUNG_GIO`, giờ VN, khung qua đêm được; tuỳ chọn `ngoaiKhungGio` = chờ duyệt (mặc định) hoặc từ chối |
| 3 | Trần theo đối tượng nhận, không chỉ trần tổng | pyagentgate (merchant caps), [Intercept](https://intercept.policylayer.com/) | **Đã làm**: `hanMucMoiNguoiNhanThang` + mã `VUOT_HAN_MUC_NGUOI_NHAN` (theo agent, tháng giờ VN, là trần nên từ chối) |
| 4 | Cấu hình hỏng thì giữ trạng thái an toàn, không mở cửa | Intercept (config sai bị từ chối, giữ bản cũ) | **Đã làm**: máy chủ chặn khung giờ sai khuôn khi lưu; đọc thấy khung hỏng thì đóng chặt (mọi khoản thành ngoài giờ) |
| 5 | Tạo bot bằng hội thoại từng bước, lệnh `/newbot`, danh sách lệnh `/setcommands`, nút inline thay vì gõ | [Telegram: BotFather](https://core.telegram.org/bots/features#botfather), [Bot API — InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup) | **Đã làm**: `TaoAgentHoiThoai` — xem dưới |
| 6 | "Shadow mode": chạy luật mới chỉ ghi nhật ký, chưa chặn, để thử trên lưu lượng thật | Intercept | Backlog |
| 7 | Chặn theo danh mục/từ khoá (blocklist) | pyagentgate, Intercept (`default: deny`) | Backlog: danh sách đen người nhận + từ khoá mục đích |
| 8 | Velocity theo nhiều cửa sổ (giờ/ngày) | pyagentgate (velocity, cooldown) | Có trần/giờ; **backlog**: trần số khoản/ngày |

Ghi chú nguồn: ý về pyagentgate và Intercept đọc từ trang PyPI và trang/blog của PolicyLayer (vendor tự mô tả), chưa đọc mã, chưa kiểm giấy phép. Không tải được github.com/Theoddalex/agentpay và github.com/L1AD/agent-spending-controls (404 / bị chặn) và core.telegram.org (bị chặn) trong phiên này — phần Telegram dựa trên tài liệu Bot API đã biết, đường dẫn để người đọc tự kiểm.

## Đã làm

- **Hội thoại** (`src/components/tac-tu/TaoAgentHoiThoai.tsx`, logic thuần ở `hoiThoai.ts`), nằm ở tab Agents. `/taoagent [tên]` → tên → nhóm chi (chọn nhiều) → hạn mức mỗi lần/ngày/tháng → ngưỡng cần duyệt → chỉ trả người nhận đã duyệt? → trần mỗi người nhận/tháng → khung giờ → (ngoài giờ thì sao) → hết hạn → tóm tắt → nút **Tạo agent**. Mỗi câu có nút gợi ý; gõ tay được (`500k`, `2tr`, `8-20 t2-t6`). `/quaylai` sửa câu trước, `/huy` thôi. Lệnh khác: `/danhsach`, `/hanmuc`, `/tamdung`, `/batlai`, `/thuhoi`, `/khoamoi`, `/trogiup` (bí danh `/newbot`, `/cancel`, `/help`).
- Cuối cùng chỉ gọi hành động máy chủ sẵn có: `tao_tac_tu` → `luu_chinh_sach`; `doi_trang_thai`; `xoay_khoa`. Thu hồi và khoá mới dừng ở nút xác nhận có tên agent. Khoá không in vào chat — đi lên khung "Khoá mới" của trang, hiện một lần. Lưu chính sách lỗi sau khi đã tạo agent: nói rõ agent đang ở chính sách mặc định chặt nhất, có nút lưu lại (không tạo agent thứ hai).
- **Bộ luật** (`_shared/tac-tu/chinh-sach.ts`): hai trường tuỳ chọn mới + hai mã lý do, giữ "từ chối thắng chờ duyệt" và "gom đủ lý do". Case vàng G01–G08, H07–H10.
- **Máy chủ** `luu_chinh_sach`: kiểm `khung_gio_chi`, `ngoai_khung_gio`, `han_muc_moi_nguoi_nhan_thang`; không gửi = giữ nguyên (màn Chính sách chi cũ không xoá mất). `xem_chinh_sach` của agent trả thêm ba trường (chỉ thêm, không đổi tên).
- **Migration** `20261011090000_tac_tu_khung_gio_tran_nguoi_nhan.sql` — **chưa áp**.

## Backlog

1. **Hai người duyệt** cho khoản trên ngưỡng thứ hai. Mô hình duyệt hiện là một bước (`cho_duyet` → `da_duyet`, một `nguoi_quyet`); làm đúng cần cột người duyệt thứ nhất, luật "người thứ hai khác người thứ nhất", sửa `duyet`, màn hình "1/2 đã duyệt", và công ty một người thì không bật được. Không làm nửa vời.
2. Danh sách đen người nhận / từ khoá mục đích (mã `NGUOI_NHAN_BI_CHAN`, `MUC_DICH_BI_CHAN` — từ chối).
3. Trần số khoản mỗi ngày (bên cạnh `soYeuCauMoiGio`).
4. Shadow mode cho luật mới.
5. Màn Chính sách chi (`ChinhSachChiPage`) chưa có ô cho khung giờ và trần người nhận — hiện chỉ đặt được qua hội thoại; `types.ts` chưa có ba cột mới (sinh lại sau khi áp migration).
6. `moTaKhungGio` viết tiếng Việt; tóm tắt khung giờ ở giao diện EN/KO/ZH vẫn hiện "thứ Hai…".
