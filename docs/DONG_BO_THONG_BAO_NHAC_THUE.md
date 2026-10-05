# Đồng bộ thông báo và nhắc thuế (02/10/2026)

Mục tiêu: chuông, Web Push, trang Nhắc thuế, "Việc cần làm" của trợ lý, lịch thuế và độ sẵn sàng khai thuế
cùng nói MỘT hạn, MỘT trạng thái, MỘT câu chữ. Không đổi kết luận thuế nào.

## Tiến độ (cập nhật sau mỗi bước)

- [x] Bước 1. Đọc luồng, lập bản đồ và danh sách lệch (mục 1, 2).
- [x] Bước 2. Hàm dùng chung `_shared/thong-bao/muc-nhac.ts` + test.
- [x] Bước 3. Nối chuông/push (`sinh.ts`, `gui.ts`, `thong-bao/index.ts`).
- [x] Bước 4. Nối "Việc cần làm" (`viec/luu.ts`) và `boi_canh.viec` (`tro-ly`).
- [x] Bước 5. Trang Nhắc thuế + i18n `tb.*`.
- [x] Bước 6. Chạy tsc/vitest, ghi kết quả ở mục 5.

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

`supabase/functions/_shared/thong-bao/muc-nhac.ts` (hàm thuần, Deno + trình duyệt cùng đọc) dựng MỘT mục nhắc:
khoá ổn định (`<khoá mốc>:<hạn>` hoặc `can_xem:<khoá câu hỏi>`), tiêu đề ("Còn N ngày: <tên>" / "Hôm nay là hạn:
<tên>"), hạn, trạng thái (`phai_lam` / `can_xac_minh` / `can_xem`), nội dung, việc tiếp (động từ đứng đầu), đúng
một câu hỏi, mức độ, đường dẫn. Khi `sanSang.ket_luan_phu_thuoc` có thêm đúng MỘT mục "cần xem" lấy
`sanSang.cau_hoi_can_xem` (từ `luat/san-sang-thue.ts`), đứng đầu. Không lọc thêm mốc nào: lịch đã là kết luận thuế
(khi doanh thu cắt ngưỡng, `lich-thue.ts` tự bỏ nghĩa vụ phụ thuộc ngưỡng) — lọc thêm là đổi kết luận.

| # | Sửa ở đâu |
|---|---|
| L1 | `thongBaoHanThue(lich, sanSang, homNay)` (`sinh.ts`) dựng từ `mucNhacTuLich`; cron truyền `l.sanSang`. Mục "cần xem" khoá `can_xem:<năm>:<khoá câu hỏi>`, đường dẫn `/dashboard/nhac-thue#can-xem`. |
| L2 | `dsViecCanLam` (`viec/luu.ts`) dùng `mucNhacTuLich(..., { trongNgay: NGAY_BAO_TRUOC })`: có mục `can_xem` (một câu hỏi, "Trả lời: …"). Có câu hỏi cần xem thì bỏ dòng "Xác nhận N khoản tiền vào chưa rõ" (giống `sanSang.viec_tiep`, không hỏi hai lần); khi còn dòng đó thì nói "MIMI đang tạm tính …", không nói như chắc chắn. |
| L3 | `viecHomNay` (`tro-ly/tinh-toan.ts`) thêm tối đa 3 mục thuế từ cùng hàm (khoá `thue:…`, có `duong_dan`); `boi_canh` đọc thêm nguồn `lich_thue`. `ViecCanChuY.tsx` dùng `duong_dan` của mục nếu có. |
| L4 | Chuông, push, Việc cần làm, "cần chú ý hôm nay", `viecUuTien` cùng tiêu đề/câu hỏi từ `muc-nhac.ts`; bỏ "Chuẩn bị: <tên>" và "Xác minh: <tên> — …". |
| L5 | `NGAY_BAO_TRUOC = MOC_NHAC_HAN[0]` (14) cho chuông, Việc cần làm, "cần chú ý hôm nay". `viecUuTien` giữ 7 ngày vì nghĩa là "tuần này". |
| L6 | `danhDauNhacLoiThoi` (`gui.ts`) + `thongBaoNhacLoiThoi` (`muc-nhac.ts`): đặt `loi_thoi_luc` (không xoá) khi hạn đã qua, mốc biến khỏi lịch/không áp dụng, đổi giữa phải làm và cần xác minh (đọc từ câu chữ đã lưu), hoặc câu hỏi cần xem đã khác/không còn. Dòng người dùng đã xử lý giữ nguyên. Cron gọi trước khi ghi nhắc mới, chỉ khi lịch đọc thành công. |
| L7 | Cùng hàm: `theo_doi:<việc>:<hẹn>` lỗi thời khi việc không còn `waiting_external`, hoặc đã có lời nhắc ngày hẹn mới hơn cho cùng việc. |
| L8 | `theThongBao(khoa)`: hạn thuế = khoá bỏ số ngày còn (14 → 10 → 5 của một hạn thay nhau, hai hạn khác nhau cùng hiện); cần xem = nguyên khoá. |
| L9 | `dayThongBao` đọc `thanh_vien_cong_ty` và chỉ đẩy khi `user_id` còn là thành viên của đúng `company_id` của dòng; dòng đã lỗi thời không đẩy. |
| L10 | Trang Nhắc thuế: khối "cần xem" (id `can-xem`) hỏi đúng câu đó, nút "Trả lời ngay" tới nơi ghi câu trả lời; ngưỡng nào máy chủ báo `chua_chac` (và `ket_luan_phu_thuoc`) thì viết "Chưa chắc — cần bạn xem một khoản" thay cho "Đã vượt / Còn". |
| L11 | Trang đọc một lần qua `useLichThue` (phản hồi giữ nguyên ở `tomTat`, có `sanSang`); bỏ `ngay`, `conLaiChu`, lời gọi thứ hai. |
| L15 | Tiêu đề ngưỡng dùng năm của phản hồi; chưa có dữ liệu thì không in năm. |
| i18n | Chuỗi trang Nhắc thuế ở `src/i18n/modules/tb.{vi,en,ko,zh}.ts`, đăng ký trong `src/i18n/index.ts`. |

Bài kiểm mới: `thong-bao/muc-nhac.test.ts`, thêm ở `thong-bao/gui.test.ts` (thành viên, lỗi thời, tag), `viec/e2e.test.ts`
(Việc cần làm), `tro-ly/han-thue.test.ts` (cần chú ý hôm nay, việc ưu tiên), `src/pages/NhacThuePage.test.tsx`.
Hai bài cũ của `gui.test.ts` hỏng vì bản nháp: dữ liệu giả thiếu `company_id` và bảng thành viên (dòng thật luôn
có; đã thêm, không nới điều kiện), và `the: 'han'` đổi thành `the: 'han:2026-q3'` (kỳ vọng cũ chính là lỗi L8).

## 4. Để lại (kèm lý do)

- L12 (RLS `thong_bao` không kiểm còn là thành viên): cần migration — bị cấm trong việc này.
- L13: giữ (cố ý, số liệu mỗi công ty tách riêng).
- L14 (mốc đã nộp vẫn nhắc), L16 (`docLichCongTy` chưa truyền `kyKhaiGtgt`, `sieuNho`, `phuongPhapTndn`): đổi
  nghĩa vụ/trạng thái thuế — ngoài phạm vi "không đổi kết luận thuế".
- Khối `boi_canh.thue` (`docThueManDau`) vẫn suy thẳng từ `suyLuan`: đổi nó là đổi cách màn đầu nói nghĩa vụ; giờ
  hạn và câu hỏi đã có ở `boi_canh.viec` từ cùng nguồn với chuông.
- Đánh dấu lỗi thời chạy cùng lượt nhắc hạn (7–9 giờ VN): một nhắc đã qua hạn có thể còn trên chuông vài giờ đầu ngày.
- "Cần xem" khoá theo năm + câu hỏi: cùng một câu hỏi đã trả lời rồi lại xuất hiện trong cùng năm thì không báo chuông
  lần hai (vẫn hiện ở Việc cần làm, trợ lý và trang Nhắc thuế).
- Mục `tien_vao` của Việc cần làm vẫn trỏ `/dashboard` (màn trợ lý), trong khi hàng đợi tiền vào nằm ở
  `/dashboard/cashflow` — không đổi ở đây vì ngoài phạm vi; trang Nhắc thuế đã trỏ đúng.
- `cauConLai` (`src/lib/lichThue.ts`) vẫn trả chuỗi tiếng Việt, dùng chung ba màn — chưa chuyển sang i18n.
- Câu chữ của thông báo (chuông/push) do máy chủ ghi bằng tiếng Việt, như mọi thông báo khác.

## 5. Kết quả

Chạy 06/10/2026 trên nhánh `dong-bo/thong-bao` (từ main 5440245):

- `npx tsc --noEmit -p tsconfig.app.json`: sạch.
- `npx vitest run --maxWorkers=2`: 217/217 tệp, 2085/2085 bài đạt. Vitest báo 10 lỗi không bắt được (unhandled) từ
  `src/components/layout/ThanhBen.test.tsx` (mock `@/lib/congTyDangDung` thiếu `idCongTyDangDung`, `supabase.auth` không
  mock) và `src/pages/DashboardOverview.test.tsx` — hai tệp và các component đó không bị việc này đụng tới; xem báo cáo.
- Kết luận thuế không đổi: `luat/*`, `doanh-thu/*` không sửa dòng nào; mọi bài của hệ luật, lịch, sẵn sàng khai thuế
  và bộ đối kháng doanh thu vẫn đạt.

