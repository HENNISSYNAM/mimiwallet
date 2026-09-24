/**
 * Mã số thuế Việt Nam: kiểm hình dạng, và chuẩn hoá trước khi lưu.
 *
 * VÌ SAO TÁCH RA. Quy tắc này trước nằm trong `WelcomeCards.tsx` dưới dạng một
 * hằng cục bộ `TAX_ID_OK`. Khi thêm ô nhập mã số thuế ở trang Cài đặt, chép
 * sang là mời hai bản lệch nhau — và lệch ở đây nghĩa là một màn hình nhận
 * chuỗi mà màn hình kia từ chối, cho cùng một người dùng.
 *
 * HÌNH DẠNG, KHÔNG PHẢI TÍNH ĐÚNG ĐẮN. Mã số thuế doanh nghiệp là 10 chữ số, hoặc
 * 10 chữ số kèm 3 chữ số đơn vị trực thuộc (`0312345678-001`). Hộ kinh doanh và cá
 * nhân dùng số định danh cá nhân 12 chữ số làm mã số thuế từ 01/07/2025 — trước
 * ngày 24/09/2026 hàm này từ chối đúng nhóm khách chính của MIMI, trong khi máy chủ
 * (`tax-lookup`) lại nhận.
 *
 * Đối chiếu với cơ quan thuế nằm ở máy chủ (`_shared/mst/tra-cuu.ts`): lưu mã xong,
 * `to-khai` tra và ghi tên, địa chỉ, loại hình theo đăng ký thuế để MIMI không hỏi
 * lại những điều đó. Hàm ở đây chỉ chặn chuỗi sai hình trước khi gửi đi.
 */

/** Bỏ khoảng trắng, giữ nguyên dấu gạch của phần chi nhánh. */
export function chuanHoaMst(v: string): string {
  return v.replace(/\s/g, '');
}

/** Đúng hình dạng mã số thuế chưa. Không nói gì về việc mã có tồn tại thật. */
export function MST_HOP_LE(v: string): boolean {
  return /^\d{10}(-\d{3})?$|^\d{12}$/.test(chuanHoaMst(v));
}
