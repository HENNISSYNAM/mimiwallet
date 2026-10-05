# Đồng bộ thông báo và nhắc thuế (02/10/2026)

Mục tiêu: chuông, Web Push, trang Nhắc thuế, "Việc cần làm" của trợ lý, lịch thuế và độ sẵn sàng khai thuế
cùng nói MỘT hạn, MỘT trạng thái, MỘT câu chữ. Không đổi kết luận thuế nào.

## Tiến độ (cập nhật sau mỗi bước)

- [x] Bước 1. Đọc luồng, lập bản đồ và danh sách lệch (mục 1, 2).
- [ ] Bước 2. Hàm dùng chung `_shared/thong-bao/muc-nhac.ts` + test.
- [ ] Bước 3. Nối chuông/push (`sinh.ts`, `gui.ts`, `thong-bao/index.ts`).
- [ ] Bước 4. Nối "Việc cần làm" (`viec/luu.ts`) và `boi_canh.viec` (`tro-ly`).
- [ ] Bước 5. Trang Nhắc thuế + i18n `tb.*`.
- [ ] Bước 6. Chạy tsc/vitest, ghi kết quả ở mục 5.

## 1. Bản đồ: mỗi nhắc nhở được tạo, lưu, chống trùng và hiển thị ở đâu

| Nguồn | Tạo ở | Lưu | Chống trùng | Hiển thị |
|---|---|---|---|---|
| Lịch thuế của công ty | `_shared/luat/lich-thue.ts` (`lichThue`), đọc dữ liệu ở `luat/doc-lich-thue.ts` (`docLichCongTy`) | Không lưu, tính lại mỗi lần | Không cần | `tax-summary` -> `src/lib/lichThue.ts` -> trang Nhắc thuế; trợ lý (`tro-ly`, năng lực `lich_thue`); cron `thong-bao` |
| Độ sẵn sàng khai thuế | `luat/san-sang-thue.ts` (`sanSangThue`), nằm trong `LichCongTy.sanSang`; có `do_chac_chan`, `ket_luan_phu_thuoc`, `cau_hoi_can_xem` | Không lưu | Không cần | `tax-summary` trả `sanSang`; trợ lý `chuan_bi_han_thue` |
| Thông báo chuông | Cron `thong-bao` (hàm `quet`, mỗi giờ, phút 7) -> `quetCongTy` -> `thongBaoHanThue` (`_shared/thong-bao/sinh.ts`); hạn thuế chỉ dựng trong khung 7-9 giờ VN | Bảng `thong_bao`, mỗi người nhận một dòng (user x company) | `UNIQUE (user_id, company_id, khoa)`; khoá hạn = `han:<khoa mốc>:<hạn>:<số ngày còn>` | `ChuongThongBao` + `DanhSachThongBao` (`src/components/thong-bao`), đọc bảng qua RLS, lọc `loi_thoi_luc IS NULL` và `company_id` hiện tại |
| Web Push | Cùng dòng `thong_bao`; `dayThongBao` (`_shared/thong-bao/gui.ts`) | `thong_bao.da_day_luc`, thiết bị ở `dang_ky_day`, loại tắt ở `cai_dat_thong_bao` | Mỗi dòng đẩy một lần (đánh dấu `da_day_luc`); `tag` của trình duyệt = `khoa.split(':')[0]` | `public/sw.js` (`push`, `notificationclick`); bật/tắt ở `src/lib/thongBao.ts` + `CaiDatThongBao` trên trang Nhắc thuế |
| Việc chờ phản hồi | `nhapTheoDoiDenHan` (`viec/luu.ts`) | Cũng là dòng `thong_bao` (loại `viec`) | khoá `theo_doi:<việc>:<ngày hẹn>`; hẹn dời +3/+7/+14 ngày | Chuông + push |
| "Việc cần làm" (Tổng quan, trợ lý, pet) | `dsViecCanLam` (`viec/luu.ts`): hồ sơ việc + nghĩa vụ trong 14 ngày suy từ lịch + "tiền vào chưa rõ" | Hồ sơ việc ở `ho_so_viec`; nghĩa vụ suy ra lúc đọc | Một việc mở mỗi dấu vân tay (chỉ mục CSDL) | Trang Việc cần làm, trợ lý (`viecUuTien`), pet |
| "Việc cần chú ý hôm nay" (`boi_canh.viec`) | `viecHomNay` (`_shared/tro-ly/tinh-toan.ts`) | Không lưu | `slice(0, 6)` | Màn đầu của trợ lý |
| Khối `boi_canh.thue` | `docThueManDau` (`tro-ly/index.ts`) suy thẳng từ `suyLuan` | Không lưu | Không | Màn đầu của trợ lý |

## 2. Các chỗ lệch đã tìm thấy

| # | Lệch | Mức | Xử lý |
|---|---|---|---|
| L1 | Chuông không bao giờ báo "cần xem": khi `ket_luan_phu_thuoc` thì lịch chỉ có mốc `can_xac_minh` không hạn, `thongBaoHanThue` bỏ qua mốc không hạn, nên người dùng không nhận câu hỏi nào. Cron cũng không đọc `sanSang`. | Cao | Sửa (bước 3) |
| L2 | "Việc cần làm" cũng không có mục "cần xem" khi doanh thu chưa chắc; chỉ có dòng "Xác nhận N khoản tiền vào chưa rõ" nói "đang được tính như doanh thu" (nghe như chắc chắn). | Cao | Sửa (bước 4) |
| L3 | `boi_canh.viec` (Việc cần chú ý hôm nay) KHÔNG có hạn thuế nào, cũng không có câu hỏi "cần xem"; hạn chỉ có ở khối `boi_canh.thue` (suy riêng từ `suyLuan`, nguồn thứ ba). | Cao | Sửa phần `viec` (bước 4); khối `thue` ghi ở mục 4 |
| L4 | Ba cách viết một hạn: chuông "Còn N ngày: <tên>" / "Hôm nay là hạn: <tên>"; Việc cần làm "Chuẩn bị: <tên>" (mốc `can_xac_minh` không có câu hỏi vẫn bị viết như việc chắc chắn) + "Hạn pháp lý: dd/mm/yyyy"; trợ lý "Xác minh: <tên> — <câu hỏi>". | Trung bình | Dùng chung một hàm dựng câu |
| L5 | Cửa sổ báo khác nhau: chuông 14/10/5/1/0 ngày, Việc cần làm 0-14 ngày, `viecUuTien` 0-7 ngày, Nhắc thuế hiện hết. | Thấp | Một hằng số `NGAY_BAO_TRUOC` cho chuông và Việc cần làm |
| L6 | Thông báo hạn đã đăng vẫn hiện ở chuông sau khi mốc đó không còn đúng (đã qua hạn, mốc chuyển thành "không áp dụng" khi doanh thu/hồ sơ đổi, hoặc kết luận lại thành "phụ thuộc phần chưa rõ"). Chuông chỉ lọc `loi_thoi_luc`, mà không ai đặt cột này cho hạn thuế (trừ migration một lần). | Cao | Sửa: cron đánh dấu `loi_thoi_luc` (không xoá) |
| L7 | Thông báo `theo_doi:<việc>:<hẹn>` vẫn hiện sau khi việc đã xong/huỷ hoặc không còn chờ phản hồi. | Trung bình | Sửa như L6 |
| L8 | `tag` của push cho mọi hạn thuế đều là `han`: hai hạn cùng lúc (ví dụ GTGT và quyết toán) thay nhau trên màn hình khoá, người dùng chỉ thấy cái sau. | Trung bình | Sửa: tag = khoá hạn bỏ số ngày còn (mốc 14 -> 10 -> 5 vẫn thay nhau, hạn khác nhau thì song song) |
| L9 | Người đã bị gỡ khỏi công ty vẫn nhận push cho dòng `thong_bao` đã ghi trước khi bị gỡ (trong cửa sổ 2 ngày): `dayThongBao` không kiểm lại thành viên. | Cao (rò số liệu công ty) | Sửa: chỉ đẩy khi người nhận vẫn là thành viên của đúng công ty của dòng |
| L10 | Trang Nhắc thuế: khi `ket_luan_phu_thuoc` mục "Ngưỡng doanh thu" vẫn viết "Đã vượt X" / "Còn X" như chắc chắn, và đầu trang không hề nói câu hỏi cần xem (chỉ "Chưa có việc thuế nào có hạn MIMI biết chắc"). `tax-summary` đã trả `sanSang` nhưng trang bỏ qua. | Cao | Sửa (bước 5) |
| L11 | Trang Nhắc thuế gọi `tax-summary` hai lần (một lần qua `useLichThue`, một lần trực tiếp), hai bản có thể lệch nhau vài giây. Hai hàm không dùng (`ngay`, `conLaiChu`) còn sót. | Thấp | Gộp: dùng `sanSang` từ cùng phản hồi; bỏ hàm thừa |
| L12 | Bảng `thong_bao` có RLS `user_id = auth.uid()` chứ không kiểm còn là thành viên công ty: người đã bị gỡ vẫn đọc được các dòng cũ của công ty nếu gọi thẳng bảng. | Cao | KHÔNG sửa được ở đây (cần migration, đã cấm). Ghi ở mục 4 |
| L13 | Chuông chỉ đọc thông báo của công ty đang chọn; số chưa đọc của công ty khác không hiện. Cài đặt loại thông báo (`cai_dat_thong_bao`) theo người dùng, không theo công ty. | Thấp | Giữ, ghi nhận (cố ý: số liệu mỗi công ty tách riêng) |
| L14 | Chưa có khái niệm "đã nộp/đã xong" cho mốc thuế trong lịch: mốc đã nộp vẫn được nhắc đến hết hạn. | Trung bình | KHÔNG sửa: đổi nghĩa vụ/trạng thái thuế. Ghi ở mục 4 |
| L15 | Múi giờ: `homNay` ở mọi nơi tính theo giờ VN (`lucGioVietNam`, `homNayVN`, `tax-summary`: cộng 7 giờ); `iso(lucVN)` trong cron đọc trường "địa phương" của một `Date` đã dựng từ trường VN nên đúng ở mọi máy. Không thấy lệch ngày. Chỉ có `NhacThuePage` dùng `new Date().getFullYear()` (giờ trình duyệt) làm tiêu đề khi chưa có dữ liệu: sai vài giờ vào đêm giao thừa với máy khác múi giờ. | Thấp | Dùng năm của phản hồi; không cần sửa thêm |
| L16 | `docLichCongTy` không truyền `kyKhaiGtgt`, `sieuNho`, `phuongPhapTndn` cho `lichThue`: doanh nghiệp luôn bị hỏi lại các câu này dù đã có thể đã trả lời. Ảnh hưởng nhắc thuế của doanh nghiệp ở mọi bề mặt như nhau (nhất quán nhưng thiếu). | Trung bình | KHÔNG sửa: đổi mốc/hạn thuế. Ghi ở mục 4 |

## 3. Cách sửa (nguồn duy nhất)

Xem mục 5 sau khi xong.

## 4. Để lại (kèm lý do)

Xem mục 5 sau khi xong.

## 5. Kết quả

Chưa chạy.
