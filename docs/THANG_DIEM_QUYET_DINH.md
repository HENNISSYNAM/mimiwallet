# Thang điểm quyết định — khi nào MIMI được làm mà không cần hỏi lại

Chủ dự án giao ngày 24/09/2026: *"bạn đặt ra các thang điểm, nếu quyết định đó điểm cao và đạt chất lượng hãy thực hiện mà không cần hỏi lại"*.

Mỗi quyết định chấm trên 100 điểm, ghi lại cùng kết quả trong báo cáo cuối lượt.

| Tiêu chí | Điểm | Chấm thế nào |
|---|---|---|
| **Giá trị** cho khách hàng và bản chỉ đạo ra mắt (`KIEM_TOAN_RA_MAT.md`) | 0–25 | 25: gỡ đúng một nỗi đau đã có bằng chứng (insight thật, lỗi đo được). 10: hợp lý nhưng chưa có bằng chứng. 0: tính năng trình diễn / nằm trong danh sách "Không làm". |
| **Đảo ngược được** | 0–25 | 25: quay lại được bằng git + deploy lại, không mất dữ liệu. 15: có lưu bản sao trước khi đổi dữ liệu. 0: mất vĩnh viễn. |
| **Bảo mật và trung thực** | 0–20 | 20: thu hẹp bề mặt tấn công hoặc gỡ một khẳng định sai. 10: trung tính. 0: mở thêm đường vào, hoặc nói điều chưa kiểm. |
| **Bằng chứng chất lượng** | 0–20 | 20: test mới cho hành vi mới, toàn bộ test xanh, kiểm kiểu, chạy thử khô, kiểm lại trên production sau khi đưa lên. Mỗi bước thiếu trừ 5. |
| **Chi phí và rủi ro vận hành** | 0–10 | 10: không tốn tiền, không gián đoạn. 0: tốn tiền định kỳ hoặc có thể làm sập luồng chính. |

**Ngưỡng:**
- **≥ 80** và không chạm lằn ranh đỏ → **làm luôn**, báo sau.
- **65–79** → làm nếu đảo ngược được trọn vẹn (tiêu chí 2 = 25), báo rõ lý do điểm thấp.
- **< 65** hoặc chạm lằn ranh đỏ → **hỏi trước**.

**Lằn ranh đỏ — luôn hỏi, bất kể điểm:**
1. Xoá vĩnh viễn dữ liệu của người dùng thật (không có bản lưu trữ).
2. Chuyển tiền, đổi giá bán, đổi điều khoản thu tiền.
3. Gửi tin nhắn / email ra ngoài thay người dùng.
4. Khẳng định pháp lý hoặc tiếp thị chưa được kiểm chứng.
5. Nhập mật khẩu, khoá bí mật của bên thứ ba.
6. Đổi quy tắc tính thuế theo hướng **tự động** giảm số phải khai — mọi khoản trừ phải do người xác nhận từng khoản, và phải ghi vào danh sách chờ kế toán duyệt.
