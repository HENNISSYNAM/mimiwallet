# Ghi kỹ năng — để MIMI học việc lặp lại

> Thiết kế, chưa xây. Viết 24/09/2026 theo yêu cầu "bổ sung record a skill để
> agent học giống Claude".

## Ý tưởng, nói bằng việc của khách hàng

Chị Linh làm sổ cho 15 hộ kinh doanh. Mỗi cuối quý chị làm **đúng một chuỗi việc,
15 lần**: mở từng công ty, lấy hoá đơn từ Tổng cục Thuế, đối chiếu sao kê, lọc ra
khoản chi thiếu chứng từ, rồi soạn tờ khai.

Chuỗi đó không đổi. Chỉ tên công ty đổi.

**Ghi kỹ năng** nghĩa là: chị làm một lần, MIMI ghi lại, đặt tên là "Chốt quý cho
một khách", rồi 14 lần sau chỉ cần chọn khách và bấm chạy.

## MIMI đã có sẵn ba phần tư

Đây không phải tính năng dựng từ số không.

| Đã có | Dùng làm gì cho kỹ năng |
|---|---|
| `nhat_ky_quyet_dinh` — nhật ký chỉ-thêm, **ghi trước khi chạy** | Chính là bản ghi. Không cần thêm cơ chế ghi nào |
| Bộ hành động có giới hạn của `tro-ly` | Từ vựng của kỹ năng. Ghi ở tầng này, không ghi cú bấm chuột |
| `quy_trinh_ai` | Đã có khái niệm "một việc AI làm cho công ty", đã có RLS theo công ty |
| MCP + khoá agent | Đường để agent ngoài gọi kỹ năng |
| `hieu-luc` — version hoá hiệu lực pháp luật | Để kỹ năng cũ không áp luật đã hết hiệu lực |

Bộ hành động hiện có: `hoi`, `boi_canh`, `trang_thai`, `bang_chung`, `bat_thuong`,
`kiem_truoc_khi_chuyen`, `gan_nhan_chi`, `quet_chung_tu`, `luu_chung_tu`,
`xoa_chung_tu`, `xac_nhan`, `ket_qua_quyet_dinh`.

## Ghi ở tầng nào — và vì sao không ghi cú bấm

Cách dễ là ghi lại chuỗi bấm chuột rồi phát lại. **Không làm vậy.** Ba lý do, xếp
theo mức nguy hiểm:

1. **Bấm nhầm chỗ là chuyện tiền.** Một nút dịch sang phải 40 pixel sau lần đổi
   giao diện, và bản phát lại bấm vào nút bên cạnh. Ở app tài chính, nút bên
   cạnh có thể là "Duyệt".
2. **Cú bấm không mang ý định.** "Bấm ô thứ ba" không nói lên "chọn khách hàng
   Xanh Mekong". Sang tháng sau danh sách đổi thứ tự là hỏng.
3. **Không kiểm được.** Một chuỗi toạ độ không đọc được, không rà soát được,
   không giải thích được cho kiểm toán.

Ghi ở tầng **hành động + tham số**: `gan_nhan_chi(giao_dich_id, nhan)` chứ không
phải `click(x=412, y=308)`. Đọc được, sửa được, và kiểm toán được — cùng tiêu
chuẩn mà `nhat_ky_quyet_dinh` đã đặt ra.

## Ba ranh giới không được vượt

### 1. Kỹ năng CHUẨN BỊ, không bao giờ DUYỆT

`xac_nhan` và `ket_qua_quyet_dinh` **không bao giờ được phát lại**.

Đó là hai hành động mang chữ ký của con người. Một kỹ năng tự duyệt được thì
toàn bộ lớp kiểm soát chi của MIMI thành trang trí — và đó đúng là thứ sản phẩm
này tồn tại để chống. Kỹ năng chạy xong phải dừng ở một danh sách "những việc
này đang chờ bạn duyệt", không hơn.

Cùng một ranh giới đã có ở mọi chỗ khác: MIMI không giữ tiền, không chuyển tiền,
không nộp thay. Nay thêm: **không tự duyệt thay**.

### 2. Luật phải tra lại mỗi lần chạy, không được đóng vào kỹ năng

Một kỹ năng ghi tháng 9 mà đóng cứng "ngưỡng 1 tỷ, thuế suất 17%" sẽ vẫn nói vậy
sau khi nghị định đổi. Kỹ năng chỉ được ghi **câu hỏi** ("ngưỡng doanh thu năm
nay là bao nhiêu"), còn câu trả lời do `hieu-luc` tra lại lúc chạy.

Đây là lỗi gần như chắc chắn xảy ra nếu không chặn từ thiết kế, vì đóng cứng
luôn dễ hơn.

### 3. Kỹ năng thuộc về một công ty

RLS đã có. Nhưng phải nói rõ trong thiết kế: một kỹ năng ghi ở công ty A, khi
chạy cho công ty B, **không được mang theo dữ liệu nào của A** — kể cả id giao
dịch, tên khách, số tiền. Chỉ mang theo *hình dạng* của việc.

Phép kiểm bắt buộc: ghi kỹ năng ở công ty A, chạy ở công ty B, không dòng nào của
A xuất hiện. Cùng kiểu với `rls-cheo-cong-ty.sql` đã có.

## Lát cắt đầu tiên nên làm

Không làm cả tính năng. Làm phần nhỏ nhất chứng minh được ý tưởng:

1. **Ghi**: nút "Ghi lại việc này" trong màn Trợ lý. Đang bật thì mỗi hành động
   được thêm vào một bản nháp kỹ năng.
2. **Xem lại và đặt tên**: người dùng thấy danh sách hành động bằng lời thường,
   xoá bước thừa, đặt tên. **Bắt buộc có bước này** — không ai nên lưu một thứ
   mình chưa đọc.
3. **Chạy lại có tham số**: tham số duy nhất ở lát đầu là *công ty*. Đủ để phục
   vụ đúng bài toán của chị Linh.
4. **Dừng trước mọi việc cần duyệt**, hiện danh sách chờ.

Chưa làm ở lát đầu: nhánh rẽ, vòng lặp, lịch chạy tự động, chia sẻ kỹ năng giữa
các công ty.

## Vì sao đáng làm, xét theo bằng chứng đã có

Đợt thử 15 chân dung cho thấy chị Linh **không dùng được MIMI cho 15 khách** vì
đổi công ty phải vào Cài đặt và tải lại trang. Ghi kỹ năng không sửa được chuyện
đó — nhưng nó là lý do khiến việc sửa chuyện đó đáng giá: một kế toán dịch vụ
làm cùng một chuỗi việc hàng chục lần là người hưởng lợi nhiều nhất từ tính năng
này, và cũng là nhóm khách trả tiền đều nhất.

Thứ tự đúng: sửa chuyển công ty trước (A7 trong kế hoạch trải nghiệm), rồi ghi
kỹ năng. Làm ngược lại là ghi một kỹ năng mà bước đầu tiên đã khó chịu.

## Liên hệ với tầm nhìn vượt biên giới

Một kỹ năng là **quy trình nghiệp vụ viết thành dữ liệu**, kèm nhật ký chỉ-thêm
chứng minh nó đã chạy khi nào, ai duyệt. Đó chính là "chứng từ nghiệp vụ" trong
[TAM_NHIN_VUOT_BIEN_GIOI.md](TAM_NHIN_VUOT_BIEN_GIOI.md) — và nó không phụ thuộc
luật Việt Nam. Kỹ năng "đối chiếu bộ chứng từ xuất khẩu" đọc được ở Osaka hay
Singapore y như ở Cần Thơ.
