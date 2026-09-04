# Hướng dẫn người mới + Con trỏ AI + Mèo ngừng nháy mắt

Ba việc trong một lần: một tour tương tác cho người dùng lần đầu, một con trỏ chuột tích hợp AI biết gợi ý theo ngữ cảnh và theo từng người dùng, và tắt hiệu ứng nháy mắt của MIMI.

## 1. Tour tương tác cho người mới

Tour chạy tự động ở lần đầu vào Tổng quan, sau đó có thể mở lại bất cứ lúc nào từ nút trợ giúp.

- 6 bước, mỗi bước highlight một vùng thật trên dashboard: thanh bên điều hướng, thẻ "Bắt đầu từ đâu", số dư/dòng tiền, Hóa đơn, Fintech Hub (liên kết ngân hàng), trợ lý AI.
- Lớp phủ tối, khoét sáng đúng phần tử được nói tới, hộp thoại có: tiêu đề, một câu giải thích ngắn, "Tiếp", "Quay lại", "Bỏ qua".
- Cuộn tự động tới phần tử; trên màn hình nhỏ tour dùng bước rút gọn (4 bước) và bỏ các mục chỉ có trên desktop.
- Trạng thái đã xem lưu ở backend theo tài khoản (không chỉ localStorage) để đổi máy vẫn không hỏi lại; có ghi nhận sự kiện bắt đầu/hoàn tất/bỏ qua như các thẻ onboarding hiện có.
- Song ngữ VI/EN qua i18n, đặt trong module onboarding sẵn có.
- Nút "?" ở thanh trên cùng của dashboard để chạy lại tour.

## 2. Con trỏ AI cá nhân hóa

Con trỏ hệ thống được thay bằng con trỏ MIMI: một chấm nhỏ + vòng trễ mượt bám theo chuột, đổi hình dạng khi hover nút, ô nhập, bảng số liệu.

- Bên cạnh con trỏ là một bong bóng gợi ý ngắn (tối đa ~1 dòng), chỉ hiện khi người dùng dừng chuột trên một phần tử "có thể giải thích" hơn ~700ms.
- Nội dung gợi ý do AI sinh thật: gửi ngữ cảnh (tên trang, nhãn phần tử, loại thao tác, các số liệu tóm tắt của doanh nghiệp đang đăng nhập) tới một edge function mới; kết quả được cache theo (trang + phần tử) trong phiên để không gọi lặp.
- Cá nhân hóa: gợi ý dựa trên tình trạng thật của tài khoản (đã liên kết ngân hàng chưa, có hóa đơn quá hạn không, điểm tín dụng, mức độ thành thạo tính từ số lần đã dùng tính năng), cộng thêm tuỳ chọn "mức chi tiết" (ngắn gọn / giải thích kỹ) lưu theo người dùng.
- Bật/tắt trong Cài đặt và bằng nút nhỏ trên thanh trên cùng; mặc định BẬT cho tài khoản mới, TẮT khi hệ thống báo `prefers-reduced-motion` hoặc trên thiết bị cảm ứng (không có hover).
- Không chặn thao tác: con trỏ và bong bóng đều `pointer-events: none`, không can thiệp click.

### Chi phí và giới hạn
Gợi ý gọi model qua Lovable AI nên có giới hạn: tối đa N gợi ý mới mỗi phút mỗi người dùng, cache trong phiên, và im lặng (không hiện gì) khi hết credit thay vì báo lỗi ồn ào — trừ trong Cài đặt sẽ hiện trạng thái rõ ràng.

## 3. Mèo ngừng nháy mắt

Bỏ vòng lặp nháy mắt trong `MimiCat` (biến thể `live`). MIMI vẫn giữ khuôn mặt theo tình hình thật, vẫn phản ứng khi hover/click, vẫn nhắm mắt khi người dùng gõ mật khẩu — chỉ không còn tự chớp mắt định kỳ nữa.

## Chi tiết kỹ thuật

- `src/components/onboarding/TourNguoiMoi.tsx`: tour tự viết (overlay + spotlight bằng `getBoundingClientRect`, Framer Motion), không thêm thư viện mới. Các mốc gắn bằng `data-tour="..."` trên phần tử trong `DashboardLayout`, `DashboardSidebar`, `DashboardOverview`.
- `src/lib/tour.ts` + test: danh sách bước, lọc bước theo màn hình/điều kiện dữ liệu.
- Lưu trạng thái: cột/bảng nhỏ cho tiến trình hướng dẫn theo `user_id`, RLS owner-only + GRANT đầy đủ; ghi sự kiện vào `product_events` như hiện tại.
- `src/components/cursor/ConTroAI.tsx` + `src/hooks/useConTroAI.ts`: theo dõi `pointermove`, phát hiện phần tử có `data-ai-hint`/`aria-label`, debounce, cache, hiển thị bong bóng.
- Edge function `ai-cursor-hint`: nhận ngữ cảnh, gộp với dữ liệu doanh nghiệp (dùng lại `_shared/company.ts`), gọi Lovable AI ở chế độ streaming, trả câu gợi ý ngắn. Xử lý 429/402/403 theo chuẩn gateway.
- `src/index.css`: `cursor: none` chỉ áp dụng khi con trỏ AI đang bật, có fallback trả lại con trỏ hệ thống nếu component lỗi.
- `MimiCat.tsx`: xóa `useEffect` vòng lặp blink và hằng `KHONG_NHAY` liên quan; giữ nguyên `eyesClosed`.
- i18n: bổ sung khóa mới cho tour, bong bóng gợi ý, mục Cài đặt ở cả `vi` và `en`.
