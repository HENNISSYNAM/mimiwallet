# Học cách MoMo thiết kế (momo.vn, đọc ngày 20/11/2026)

Đo trực tiếp trên trang (màu, cỡ chữ, bo góc, khoảng cách lấy từ CSS đang chạy). Mục đích: học **hệ thống**, không chép nhận diện.
MIMI giữ màu cam mèo của mình; không dùng hồng MoMo, không dùng font, hình minh hoạ hay tên tính năng của họ.

## 1. Hệ màu: một màu thương hiệu, còn lại là trung tính "pha" màu đó

| Vai trò | MoMo | Ghi chú |
|---|---|---|
| Thang thương hiệu | `--mobase-pink-50 … 900` (10 bậc), chính `#EB2F96`, nút `#D42A87` | Mọi sắc độ đều có tên, không dùng mã lẻ |
| Chữ chính | `#1C171A` | Đen pha hồng, không phải đen thuần |
| Chữ phụ | `#796B73`, `#574D53` | Xám pha hồng |
| Viền / vạch | `#E5E5E5`, `#E7E4E6` | |
| Nền khối xen kẽ | `#FFFFFF` → `#F5F4F5` → `#FAF9FA` | Phân tách khối bằng **nền**, không bằng đường kẻ |
| Nền nhấn nhẹ | `#FEF1F9` (pink-50), `rgba(216,45,139,0.1)` | Thẻ nổi bật, chip đang chọn |

Tỷ lệ thật trên trang: khoảng 1.700 phần tử chữ đen pha hồng, khoảng 100 chỗ dùng hồng. **Màu thương hiệu < 5% bề mặt.**

## 2. Chữ

- Font riêng: Trust Sans (thân), Trust Display (tiêu đề khối).
- Thang dùng thật: 12 / 14 / 15 / 16 / 20 / 30 px. Tiêu đề khối 30/36 đậm 700 **màu thương hiệu, căn giữa**; phụ đề 20/28 xám dưới tiêu đề.
- Thân chữ 16; nhãn nhỏ 12; tên mục trong lưới 12–13.
- Nhấn bằng **độ đậm** (600/700), không thêm cỡ chữ mới.

## 3. Hình khối

| Thành phần | Thông số |
|---|---|
| Nút chính | Nền thương hiệu, chữ trắng 14/700 **VIẾT HOA**, đệm 6×20, bo 24 (viên thuốc), không đổ bóng |
| Chip / tab lọc | Bo tròn hẳn (9999px); chip đang chọn có viền + nền nhấn nhẹ; tab đang chọn chữ màu thương hiệu + gạch chân |
| Thẻ tin | Bo 6–8px, ảnh trên, tiêu đề đậm 2–3 dòng, nhãn danh mục chữ hoa nhỏ màu thương hiệu + thời gian |
| Khối nổi bật | Bo 16–24px, nền nhấn nhẹ |
| Bóng | Rất nhẹ: `rgba(0,0,0,.02–.1)`; phần lớn bề mặt **phẳng** |
| Độ rộng nội dung | 1024–1152px, căn giữa |
| Khoảng cách | Lưới cách 20–24px; khối đệm trên 40–48px |

## 4. Bố cục trang chủ (thứ tự khối)

1. Thanh trên trắng: logo, 6 mục menu có mũi tên, ô tìm kiếm bo tròn.
2. Băng chuyền (carousel) chiến dịch theo mùa, minh hoạ 3D, một nút "KHÁM PHÁ NGAY".
3. **Lưới dịch vụ**: tab theo nhóm nhu cầu ("MoMo đề xuất", "Tài chính - Bảo hiểm"…), dưới là hàng chip tính năng.
4. Khối tính năng nổi bật: ảnh điện thoại + 4 gạch đầu dòng có dấu tích + 1 nút.
5. "Có gì mới": tab lọc + 4 thẻ tin.
6. "Ưu đãi nóng": 3 thẻ ưu đãi có con số cụ thể.
7. Định vị AI: lưới 2 cột 8 lợi ích, mỗi lợi ích một biểu tượng tròn nền nhạt.
8. Hướng dẫn mở tài khoản: các bước đánh số.
9. Blog: tab + thẻ bài.
10. Bảo mật: tên chứng chỉ cụ thể (PCI DSS, GlobalSign).
11. Khung nổi góc phải: mã QR tải app + ưu đãi người mới (bám theo khi cuộn).

Nhịp: **khối nền trắng ↔ khối nền xám nhạt xen kẽ**; mỗi khối = tiêu đề căn giữa màu thương hiệu + phụ đề xám + nội dung + tối đa một nút.

## 5. Ngôn từ

- Định vị một câu: "Không chỉ là ví điện tử, MoMo nay là Trợ Thủ Tài Chính với AI".
- Lợi ích thay vì tính năng: "để bạn làm được nhiều hơn với tiền".
- Tên tính năng như đồ vật, viết hoa từng chữ: "Quỹ Nhóm", "Ví Trả Sau", "Trợ Thủ Tiền Mặt".
- Nút luôn là động từ + "NGAY".
- Ưu đãi có con số và hành động: "Mời thêm 1 bạn, nhận thêm 50.000đ".
- Gọi "bạn"; câu ngắn; dấu chấm than tiết chế.

## 6. Áp vào MIMI (đề xuất, chưa làm)

| MoMo | MIMI |
|---|---|
| Thang hồng 10 bậc | Thang **cam mèo** 10 bậc quanh `#E07B24`; trung tính đen/xám **pha cam** |
| Hồng < 5% bề mặt | Cam chỉ cho nút, chữ nhấn, nhãn; nền trắng/kem xen kẽ |
| Tiêu đề khối căn giữa màu thương hiệu | Giữ, dùng font hiện có của MIMI |
| Nút viên thuốc VIẾT HOA + NGAY | Nút viên thuốc; chữ thường dễ đọc hơn cho chủ hộ lớn tuổi ("Khai thuế ngay") |
| "Trợ Thủ Tài Chính với AI" | "Trợ thủ khai thuế cho hộ kinh doanh" — đúng việc MIMI làm thật |
| Bằng chứng "hàng triệu chủ xe" | **Chỉ dùng số có thật**; chưa có số người dùng lớn thì dùng bằng chứng khác (ví dụ trang demo cửa hàng mẫu) |
| Chứng chỉ PCI DSS, GlobalSign | Chỉ nêu điều MIMI có thật: đối tác ngân hàng mở có hợp đồng, mã hoá, không giữ tiền |
| Lưới dịch vụ theo nhóm nhu cầu | Lưới theo việc của chủ hộ: Khai thuế · Bán hàng · Sổ tiền · Chứng từ |
