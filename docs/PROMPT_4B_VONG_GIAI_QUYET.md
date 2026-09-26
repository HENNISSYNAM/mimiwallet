# Prompt 4B — Khép vòng giải quyết việc (26/09/2026)

## A. Kiến trúc trước → sau

**Trước.** `ho_so_viec` có 5 trạng thái (`mo … da_giai_quyet`). Bấm "Đóng việc" với một dòng chữ là `da_giai_quyet` — không phân biệt "bạn nói xong" với "đã được xác nhận". Không có bảng bằng chứng, không có ngày hẹn kiểm lại, lịch không biết gì về việc. Tổng quan, Trợ lý (`viecUuTien`) và pet mỗi nơi tự ghép danh sách của mình. Doanh thu chưa rõ nhóm hoạt động chỉ chặn ở trang Tờ khai, không thành việc nào.

**Sau.**
```
Thủ tục (kho thu_tuc_thue) → Áp dụng (mẫu hành trình) → Nghĩa vụ (lịch thuế) → HỒ SƠ VIỆC → Việc tiếp theo → Bằng chứng / Chờ bên ngoài → Hẹn kiểm lại → Giải quyết
```
Một hồ sơ việc = một dòng `ho_so_viec`, 8 trạng thái, trigger CSDL giữ luật chuyển. Tổng quan, Trợ lý, pet, lịch đọc CÙNG `dsViecCanLam` (`_shared/viec/luu.ts`).

## B. Nguồn sự thật

| Lớp | NGUỒN SỰ THẬT | SUY RA | HIỂN THỊ |
|---|---|---|---|
| Doanh thu | giao dịch ngân hàng / hoá đơn / tự nhập + `revenue_classifications` | `doanh-thu/so-lieu.ts` | Tổng quan, Tờ khai |
| Nhóm hoạt động | `phan_loai_hoat_dong` | `chiaTheoHoatDong` | Tờ khai, việc phân loại |
| Thủ tục | `thu_tuc_thue` (cào từ Cổng DVC) | `chonThuTuc` | Trợ lý, bước "tra thủ tục" |
| Nghĩa vụ / hạn luật | hệ luật + hồ sơ thuế | `lichThue`, `sanSangThue` | Nhắc thuế, Việc cần làm |
| Hồ sơ việc | `ho_so_viec` | — | mọi mặt |
| Bước, dữ kiện | `hanh_trinh.du_kien`, `buoc_hanh_trinh` | `tinhBuoc`, `cauHoiTiepTheo` | chi tiết việc |
| Việc tiếp theo | — | `hanhDongTiepHanhTrinh` (tất định) | Tổng quan, Trợ lý, pet |
| Ngày | cột `han_luat` / `ngay_nen_lam` / `hen_kiem_lai` của `ho_so_viec` | `ngayTuHanhTrinh`, `lichTuViec` | Lịch, chi tiết |
| Bằng chứng | `bang_chung_viec` (chỉ ghi thêm) | — | chi tiết, dòng thời gian |
| Giải quyết | trạng thái `ho_so_viec` | `dieuKienGiaiQuyet` | mọi mặt |
| Dòng thời gian | `nhat_ky_thay_doi` (chỉ ghi thêm) | `dongThoiGian` | chi tiết |

`hanh_trinh.trang_thai` là trạng thái NỘI BỘ của bộ máy bước, không hiển thị.

## C. Tệp đã đổi
- `supabase/migrations/20260926120000_vong_giai_quyet_viec.sql` — trạng thái mới, trigger chuyển, bảng bằng chứng, ba loại ngày, thu hồi quyền ghi thẳng, loại thông báo `viec`.
- `_shared/viec/` (mới): `trang-thai.ts`, `dong-co-viec.ts`, `doanh-thu-viec.ts`, `tra-loi-chat.ts`, `dong-thoi-gian.ts`, `luu.ts`, `chat-viec.ts`, `eval/db-gia-viec.ts`, test.
- `_shared/hanh-trinh/luu.ts` — mở tiếp theo hồ sơ đang mở; không còn tự đóng hồ sơ.
- `_shared/hanh-trinh/mau.ts` — tên việc cụ thể cho từng dữ kiện.
- `_shared/luat/san-sang-thue.ts`, `doc-lich-thue.ts` — trạng thái `bi_chan` khi doanh thu chưa rõ nhóm (hộ kinh doanh).
- `tro-ly/index.ts` — hành động `viec_can_lam`, `viec_doc`, `viec_da_nop`, `viec_phan_hoi`, `viec_huy`; trợ lý làm tiếp việc trước mô hình.
- `to-khai/index.ts` — phân loại / hoàn tác xong thì đồng bộ việc ngay.
- `thong-bao/index.ts` — đồng bộ việc doanh thu, nhắc kiểm phản hồi, dời hẹn sau khi đã ghi thông báo.
- Giao diện: `ViecCanLamPage.tsx`, `components/viec/LichViec.tsx`, `components/viec/ViecCanLamTomTat.tsx` (Tổng quan), `PetMimi.tsx` (đọc `viec_can_lam`, 5 phút/lần, bỏ lượt khi tab ẩn).

## D. CSDL
- `ho_so_viec.trang_thai` ∈ needs_information, ready_to_act, in_progress, waiting_external, needs_review, resolved_user_confirmed, resolved_system_verified, cancelled.
- Chỉ mục duy nhất `ho_so_viec_mot_dang_mo (company_id, dau_van_tay)` cho việc đang mở; `hanh_trinh_mot_moi_ho_so`.
- Trigger `ho_so_viec_kiem_chuyen`: không đổi danh tính; đóng rồi không sửa; xong-theo-bạn cần bằng chứng ≥ user_confirmed; xác-minh cần bằng chứng system_verified; phien_ban tăng mỗi lần sửa.
- `bang_chung_viec`: UNIQUE (ho_so_viec_id, khoa_trung); CHECK người dùng không ghi được system_verified; chỉ ghi thêm; cùng công ty với hồ sơ.

## E. RLS
Thành viên chỉ ĐỌC việc/bằng chứng của công ty mình. `INSERT/UPDATE/DELETE/TRUNCATE` thu hồi khỏi `anon`, `authenticated` trên ho_so_viec, hanh_trinh, buoc_hanh_trinh, bang_chung_viec, nhat_ky_thay_doi. Mọi ghi qua edge function (service role, đã kiểm vai trò).

## F. Kiểm thử

| Kiểm | Kết quả |
|---|---|
| E2E tạm ngừng kinh doanh (`_shared/viec/e2e.test.ts`) | PASS |
| E2E doanh thu 951.983.000đ | PASS |
| Hỏi lại ý định / hai nơi mở cùng lúc → một hồ sơ | PASS |
| "Tôi đã nộp" hai lần / cùng lúc → một bằng chứng | PASS |
| Ba tiến trình đồng bộ doanh thu cùng lúc → một việc | PASS |
| Chờ bên ngoài → nhắc +3 → +7 ngày, không nhắc trùng | PASS |
| Bạn xác nhận ≠ hệ thống xác minh (máy trạng thái, UI, DB) | PASS |
| Mất dữ liệu doanh thu không tự đóng việc | PASS |
| Hôm nay theo giờ Việt Nam (18:30 UTC = ngày hôm sau) | PASS |
| Ràng buộc + RLS trên CSDL thật, 24 mục (`supabase/tests/vong_giai_quyet_viec.sql`, rollback) | PASS 24/24 |
| Trang Việc cần làm, Lịch việc, Tổng quan, pet | PASS |

Chạy lại kiểm CSDL: `npx supabase db query --linked -f supabase/tests/vong_giai_quyet_viec.sql` (kết thúc bằng RAISE nên mọi thay đổi bị huỷ; đọc dòng `KET_QUA=`).

## G. Hai bài kiểm bắt buộc
- Tạm ngừng kinh doanh: **PASS** (tầng máy chủ + giao diện; trên CSDL giả mô phỏng đúng ràng buộc, ràng buộc thật kiểm riêng).
- Doanh thu 951.983.000đ: **PASS** (cùng điều kiện).
- Chưa chạy trên production vì các function chưa được deploy.

## H. Kiểm sự thật
1. UI chắc chắn hơn dữ liệu? Không: "bạn xác nhận" luôn gắn nhãn "MIMI chưa kiểm được"; ngày khuyên không gắn "Hạn pháp lý".
2. Hai nguồn sự thật? Không: trạng thái việc chỉ đổi ở `dongBoTrangThaiViec` / `dongBoViecDoanhThu`.
3. Đường tạo trùng? Chặn ở CSDL (chỉ mục duy nhất, khoá bằng chứng).
4. Dữ liệu giả trong đường chạy thật? Không thấy (Math.random chỉ ở chú thích / hiệu ứng).
5. Client ghi trạng thái có thẩm quyền? Không (quyền ghi đã thu hồi).
6. Lỗ RLS? Không trong 24 mục đã kiểm.
7. Chạy đua? Ghi có điều kiện theo `phien_ban`, đọc lại khi lệch.

## I. Còn thiếu thật (không phải danh sách ước)
- MIMI chưa có nguồn chính thức để XÁC MINH kết quả thủ tục (tra trạng thái hồ sơ trên cổng) → việc thủ tục chỉ đóng được ở mức "theo xác nhận của bạn".
- Tải tệp bằng chứng (biên nhận PDF) chưa có ô tải lên riêng trong việc; hiện nhận mã hồ sơ / số văn bản.
- Hạn chính thức của thủ tục tạm ngừng chưa đọc máy được từ kho thủ tục → chỉ có "ngày MIMI khuyên".
- Doanh thu tiền mặt (ngoài ngân hàng): chỉ vào được qua "tự nhập" ở Tờ khai; màn hình đã nói rõ MIMI chỉ thấy tiền qua ngân hàng và hoá đơn.
