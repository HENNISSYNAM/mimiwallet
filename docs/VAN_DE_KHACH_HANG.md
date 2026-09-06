# Vấn đề của khách, và thước đo cho mọi tính năng

> Viết 04/09/2026 sau khi rà mục chết và tìm ra một checklist dẫn người dùng
> tới trang không làm gì được. Tài liệu này tồn tại để lần sau không phải cãi
> nhau bằng cảm tính về việc nên xây gì.

## Khách là ai, và họ đang gặp chuyện gì

Hộ kinh doanh và doanh nghiệp nhỏ Việt Nam. Từ **01/01/2026 hết thuế khoán** —
họ chuyển từ "đóng một cục do cơ quan thuế ấn định" sang **tự kê khai và tự
chịu trách nhiệm**.

Bốn nhóm theo doanh thu năm: dưới 500 triệu · 500 triệu–3 tỷ · 3–50 tỷ · trên
50 tỷ. Mỗi nhóm một nghĩa vụ khác nhau.

**Hạn gần nhất: kê khai quý III, ngày 31/10/2026.** Quý I (30/04) và quý II
(31/07) đã qua. Ai chưa làm là đang trễ hai kỳ.

## Bốn nỗi đau, theo báo chí và cơ quan thuế

1. **Không có chứng từ chi phí đầu vào.** Không chứng minh được chi phí thì
   không được trừ, và với nhóm trên 3 tỷ là thiệt thẳng vào tiền thuế phải nộp.

2. **Không biết làm sổ sách.** "Tự khai tự chịu trách nhiệm" đòi kiến thức kế
   toán cơ bản mà phần lớn hộ kinh doanh chưa từng cần đến.

3. **Sợ chi phí phần mềm.** Nhiều hộ lo tiền mua thiết bị và phần mềm lên tới
   hàng chục triệu. Đây vừa là nỗi đau vừa là **ràng buộc về giá** cho MIMI.

4. **Hàng không rõ nguồn gốc.** Thiếu hoá đơn đầu vào và bảng kê tồn kho thì
   hàng có thể bị coi là bất hợp pháp khi kiểm tra liên ngành. Đây **không còn
   là chuyện thuế** — nó là chuyện mất hàng.

## Bảy việc họ phải làm, và MIMI làm được mấy việc

| # | Việc | MIMI |
|---|---|---|
| 1 | Rà doanh thu để biết mình thuộc nhóm nào | **Làm tốt nhất.** Đọc sao kê, cộng doanh thu thật, chỉ ra đang ở nhóm nào. `ThresholdClock` đã làm một phần. |
| 2 | Kiểm kê hàng tồn kho lúc chuyển đổi | **Không.** MIMI không thấy kho. |
| 3 | Đăng ký hoá đơn điện tử (dự kiến ≥ 1 tỷ) | **Nhắc được**, không đăng ký hộ được. Biết doanh thu nên biết lúc nào phải nhắc. |
| 4 | Dựng sổ sách (dự kiến > 500 triệu) | **Đây là lõi.** Dựng bộ chi phí từ sao kê ngân hàng. |
| 5 | Cập nhật đăng ký kinh doanh | **Không.** |
| 6 | Mở tài khoản ngân hàng riêng cho kinh doanh | **Phát hiện được.** Nếu sao kê lẫn chi tiêu cá nhân, MIMI thấy ngay — và đó là cảnh báo có giá trị thật. |
| 7 | Kê khai qua eTax Mobile | **Kết xuất số và nhắc hạn được**, không nộp hộ được. |

MIMI mạnh nhất ở **1, 4**, và có phần ở **3, 6, 7**. Cả năm đều xoay quanh một
câu: *đọc sao kê → dựng chi phí → biết mình ở đâu → sẵn số để kê khai.*

## Thước đo

Trước khi xây bất cứ thứ gì, hỏi:

> **Nó có giúp chủ doanh nghiệp chứng minh chi phí và kê khai đúng hạn không?**

Không trả lời được bằng "có" trong một câu thì đừng xây. Và nếu đã xây rồi mà
không trả lời được, thì nó đang chiếm chỗ của thứ trả lời được.

Hai câu hỏi phụ, dùng khi câu trên chưa dứt khoát:

- **Ai chưa dùng MIMI thì hôm nay họ làm việc này bằng cách nào?** Nếu câu trả
  lời là "không làm gì cả" thì đó không phải nỗi đau, đó là ý tưởng.
- **Sai thì họ mất gì?** Mất tiền thuế, mất hàng, bị phạt — đó là nỗi đau thật.
  Mất thời gian là nỗi đau nhẹ. Không mất gì thì không phải nỗi đau.

## Soi thanh điều hướng hiện tại bằng thước đó

| Mục | Trả lời được câu hỏi? |
|---|---|
| Tổng quan | Có — nơi thấy dòng tiền |
| Hoá đơn | Có — chứng từ hai chiều |
| Báo cáo | Có — số để kê khai |
| Fintech Hub | Có — nguồn dữ liệu, và nối cơ quan thuế |
| Cài đặt | Cần thiết |
| Khách hàng | Một phần — khớp tiền khách trả. Nhưng **không thêm được khách**, xem ghi chú trong `batDau.ts` |
| Điểm tín dụng | **Không.** Phục vụ việc vay, mà MIMI không cho vay được |
| Vay ngang hàng | **Không.** Dựng 04/09, chưa có Giấy chứng nhận NHNN |
| Dấu chân carbon | **Không.** Chạy được, nhưng là sản phẩm khác |
| Học Fintech | **Không.** Giáo dục, không phải nỗi đau |

Năm mục đầu phục vụ vấn đề. Năm mục sau không — và **chúng chiếm đúng một nửa
thanh điều hướng của một sản phẩm đang cần người dùng mới hiểu ngay nó làm gì.**

Tiền lệ xử lý đã có từ 17/08: **gỡ khỏi thanh điều hướng, giữ route và dữ liệu.**
Không xoá mã, không xoá bảng, bật lại bằng một dòng. Hồ sơ thi và nhà đầu tư vẫn
xem được qua đường dẫn trực tiếp.

## Thứ nên xây tiếp, theo đúng thước đo

Xếp theo mức độ trả lời câu hỏi chính, không theo mức độ dễ làm:

1. **Đếm ngược tới 31/10/2026** kèm số đã sẵn sàng. Hạn là thật, gần, và ai trễ
   thì mất tiền. Đây là thứ duy nhất trong danh sách có đồng hồ chạy.
2. **Cảnh báo lẫn chi tiêu cá nhân trong tài khoản kinh doanh.** Việc số 6 trong
   bảy việc, và MIMI phát hiện được mà chủ hộ tự làm thì rất khó.
3. **Chỉ ra khoản chi nào chưa có chứng từ.** Nỗi đau số 1. MIMI thấy khoản chi
   trong sao kê, đối chiếu với hoá đơn đã có, và chỉ ra chỗ hụt.
4. **So sánh hai cách tính thuế bằng số thật của họ.** Nhóm 500 triệu–3 tỷ được
   chọn, mà chọn sai thì mất tiền. Đã có trong lời hứa ở trang chủ, cần kiểm lại
   là nó chạy thật.
