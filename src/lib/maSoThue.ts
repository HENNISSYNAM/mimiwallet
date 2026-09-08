/**
 * Mã số thuế Việt Nam: kiểm hình dạng, và chuẩn hoá trước khi lưu.
 *
 * VÌ SAO TÁCH RA. Quy tắc này trước nằm trong `WelcomeCards.tsx` dưới dạng một
 * hằng cục bộ `TAX_ID_OK`. Khi thêm ô nhập mã số thuế ở trang Cài đặt, chép
 * sang là mời hai bản lệch nhau — và lệch ở đây nghĩa là một màn hình nhận
 * chuỗi mà màn hình kia từ chối, cho cùng một người dùng.
 *
 * HÌNH DẠNG, KHÔNG PHẢI TÍNH ĐÚNG ĐẮN. Mã số thuế Việt Nam là 10 chữ số, hoặc
 * 10 chữ số kèm 3 chữ số đơn vị trực thuộc (`0312345678-001`). Hàm này chỉ kiểm
 * hình dạng đó.
 *
 * MIMI **chưa** đối chiếu mã với cơ quan thuế: `tax-lookup` cần
 * `XINVOICE_CLIENT_ID` và `XINVOICE_API_KEY`, cả hai chưa cấu hình nên hàm đó
 * trả 503. Lưu một mã chưa đối chiếu thì không sao — nhưng không màn hình nào
 * được nói là đã xác thực.
 */

/** Bỏ khoảng trắng, giữ nguyên dấu gạch của phần chi nhánh. */
export function chuanHoaMst(v: string): string {
  return v.replace(/\s/g, '');
}

/** Đúng hình dạng mã số thuế chưa. Không nói gì về việc mã có tồn tại thật. */
export function MST_HOP_LE(v: string): boolean {
  return /^\d{10}(-\d{3})?$/.test(chuanHoaMst(v));
}
