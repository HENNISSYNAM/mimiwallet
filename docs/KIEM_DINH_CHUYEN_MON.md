# Kiểm định trợ lý MIMI — góc nhìn chuyên môn tài chính

> 24/09/2026. Soi 20 năng lực của trợ lý (`tinh-toan.ts`) bằng con mắt kế toán —
> thuế — xuất nhập khẩu — định lượng. Đây là **đánh giá thiết kế đọc từ mã**,
> không phải kiểm toán. Mọi khẳng định về luật phải đối chiếu lại kho Công báo
> trong chính sản phẩm trước khi dùng cho khách.

## Bốn chỗ làm đúng, nói trước

Những chỗ này hiếm gặp ở sản phẩm cùng loại, nên ghi lại để không ai "tối ưu" mất.

**1. Thứ bậc bằng chứng cho doanh thu là đúng.** `tax-summary` tính doanh thu từ
hoá đơn điện tử của Tổng cục Thuế khi có, chỉ lùi về tiền vào ngân hàng khi
không có — và **nói ra mình đang dùng cơ sở nào** (`basis: "gdt" | "bank"`). Khi
hai nguồn lệch nhau, nó trả cả hai thay vì giấu. Đây là cách một kiểm toán viên
sẽ làm.

**2. Loại chuyển khoản nội bộ trước khi cộng doanh thu.** `revenueExcludingInternal`
với danh sách tài khoản của chính công ty. Không làm bước này là lỗi kinh điển:
chuyển tiền giữa hai tài khoản của mình bị đếm thành doanh thu hai lần.

**3. Không nhận vơ là báo cáo tài chính.** `bao_cao_tai_chinh` tự mô tả: *"Không
phải doanh thu, lợi nhuận hay báo cáo tài chính — MIMI chưa có sổ kế toán."*
Đúng. Dòng tiền ngân hàng không phải báo cáo kết quả kinh doanh.

**4. Chênh giá token không phải lời khuyên đổi model.** `model_re_hon` ghi rõ
chưa đo chất lượng, độ trễ, chi phí gọi lại.

---

## Chỗ nguy hiểm nhất: tiền vào ≠ doanh thu

Khi chưa nối Tổng cục Thuế, MIMI lùi về tiền vào ngân hàng. Nó đã trừ chuyển
khoản nội bộ. Nhưng tiền vào tài khoản còn có những thứ **không phải doanh thu**:

| Tiền vào | Có phải doanh thu | Hiện MIMI |
|---|---|---|
| Chuyển giữa hai tài khoản của mình | Không | **đã loại** |
| Ngân hàng giải ngân khoản vay | Không | *đếm thành doanh thu* |
| Chủ hộ bơm vốn vào | Không | *đếm thành doanh thu* |
| Khách trả lại tiền hàng bị huỷ | Không (hoặc phải giảm trừ) | *đếm thành doanh thu* |
| Tiền đặt cọc sau đó hoàn lại | Không | *đếm thành doanh thu* |
| Bán chịu, tháng sau mới thu | **Có**, nhưng ghi nhận ở kỳ bán | *ghi nhầm kỳ* |

Đây không phải lỗi nhỏ: **con số này quyết định người ta có phải nộp thuế hay
không** (mốc 1 tỷ) và **có còn được chọn cách tính thuế không** (mốc 3 tỷ).

Với chân dung người dùng thật — hộ kinh doanh, ba mẹ lớn tuổi, vừa mở tài khoản —
kịch bản "con cái chuyển tiền vào cho ba mẹ" hoặc "vay ngân hàng mua hàng" là
chuyện thường ngày, và cả hai đều đang bị cộng vào doanh thu.

**Đề nghị:** đừng cố đoán. Thêm một bước hỏi lại. Khi cơ sở là `bank`, MIMI nên
liệt kê các khoản tiền vào lớn và hỏi *"khoản này là bán hàng, hay vay, hay
người nhà chuyển?"* — rồi nhớ câu trả lời. Đó là cách một kế toán làm với khách
mới, và nó biến một con số đoán thành một con số có người xác nhận.

---

## Thuế: thiếu chiều "ngành nghề"

Tỷ lệ % trên doanh thu của hộ kinh doanh **khác nhau theo hoạt động** — phân
phối hàng hoá, dịch vụ, sản xuất, vận tải, cho thuê tài sản đều khác nhau. Và một
hộ có thể có **nhiều hoạt động cùng lúc**, phải tách doanh thu theo từng loại rồi
áp tỷ lệ riêng.

Trợ lý hiện có `ChonCachTinhThue` cho người dùng chọn, nhưng tôi không thấy chỗ
nào **tách doanh thu theo hoạt động**. Một quán cà phê bán thêm hàng lưu niệm là
hai tỷ lệ khác nhau.

**Đây là lỗi âm thầm**: kết quả vẫn ra một con số trông hợp lý, và chỉ sai khi cơ
quan thuế kiểm.

---

## Định lượng: con số điểm cho một quyết định ngưỡng

"Doanh thu năm 2026: 8,60 tỷ" khi năm chưa hết là một **phép ngoại suy trình bày
như một sự thật**. Người làm định lượng sẽ hỏi ngay: đây là luỹ kế tới nay, hay
đã quy năm? Nếu quy năm thì bằng cách nào?

Quyết định ở đây là **vượt ngưỡng hay chưa** — một bài toán ngưỡng dưới bất định.
Cách trình bày trung thực hơn:

> *Đã đạt 640 triệu sau 9 tháng. Theo nhịp hiện tại, sẽ chạm mốc 1 tỷ khoảng
> tháng 2 năm sau. Nếu quý 4 bán gấp rưỡi như năm ngoái thì chạm ngay tháng 12.*

Ba câu đó giúp người ta **chuẩn bị**. Một con số 8,6 tỷ chỉ làm người ta hoảng
hoặc yên tâm nhầm.

## Định lượng: ngưỡng bất thường cố định cho mọi quy mô

`SO_LON_TOI_THIEU = 20 triệu`, `BOI_SO_TRUNG_VI = 3`. Với một hộ bán tạp hoá chi
trung bình 2 triệu một lần, một khoản 15 triệu là cực kỳ bất thường — nhưng không
chạm ngưỡng 20 triệu nên **không được cảnh báo**.

Ngưỡng tuyệt đối nên đi kèm ngưỡng tương đối theo quy mô của chính doanh nghiệp
đó. Bội số trung vị đã làm đúng hướng; ngưỡng sàn 20 triệu đang vô hiệu hoá nó
cho nhóm khách nhỏ nhất — vốn là nhóm dễ bị lừa nhất.

---

## Xuất nhập khẩu: chưa với tới được, và biết vì sao

| Cần có | Hiện trạng |
|---|---|
| Đồng tiền trên hoá đơn và giao dịch | **không có cột `currency`** ở `invoices` và `transactions` |
| Tỷ giá quy đổi tại thời điểm giao dịch | không có |
| Số lượng và đơn vị | không bảng nào có |
| Phân biệt thuế suất 0% với không chịu thuế | không có |
| Bộ chứng từ xuất khẩu phải khớp nhau | không có |

Đây không phải lỗi — đây là phạm vi chưa mở. Nhưng **cột `currency` là thứ phải
thêm trước khi có dữ liệu thật**, vì thêm sau là một cuộc dọn dẹp.

---

## Những mảng trợ lý không trả lời được câu nào

Soi 20 năng lực, không có cái nào chạm tới:

| Mảng | Vì sao đáng kể |
|---|---|
| **Lương và bảo hiểm xã hội** | Là chi phí lớn nhất của phần lớn SME, và là nghĩa vụ có hạn nộp |
| **Hàng tồn kho** | Chính bạn đã nêu là hướng nhắm tới |
| **Công nợ phải trả** | Chỉ có phải thu. Một nửa bức tranh |
| **Khấu hao tài sản** | Ảnh hưởng chi phí được trừ |
| **Tạm ứng, hoàn ứng** | Nguồn sai sót thường gặp nhất ở SME |
| **Dự báo dòng tiền** | Trang chủ có nhắc "dự báo 90 ngày", năng lực thì không có |

Bốn mảng đầu là thứ khiến MIMI hiện là **công cụ theo dõi chi tiêu**, chưa phải
**trợ lý tài chính**. Khoảng cách đó là khoảng cách giữa 249.000₫ một tháng và
một khoản phí kế toán thật.

---

## Thứ tự đề nghị

1. **Hỏi lại về các khoản tiền vào lớn** khi cơ sở là `bank`. Rẻ, và sửa đúng con
   số nguy hiểm nhất.
2. **Ngưỡng bất thường theo quy mô**, không chỉ ngưỡng tuyệt đối 20 triệu.
3. **Trình bày ngưỡng thuế theo kiểu tiến độ**, không phải con số ngoại suy.
4. **Tách doanh thu theo hoạt động** trước khi áp tỷ lệ.
5. **Cột `currency`** — làm trước khi có dữ liệu thật.
6. Lương/BHXH là mảng lớn tiếp theo đáng mở, trước tồn kho.
