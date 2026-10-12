/**
 * In và tải tài liệu MIMI — một tiện ích chung thay vì mỗi trang tự gọi `window.print()`.
 *
 * Cách in: phần tử mang lớp `LOP_VUNG_IN` là thứ duy nhất ra giấy (CSS `@media print` trong
 * index.css ẩn thanh bên, thanh đầu trang, nút bấm), khổ A4 lề 15 mm.
 *
 * "Tải PDF" cho tài liệu HTML đi qua hộp in của trình duyệt (chọn "Lưu dưới dạng PDF").
 * Vì sao không chụp DOM thành ảnh rồi ghép PDF: bản đó là ẢNH — chữ không chọn/tìm được, font
 * tiếng Việt vỡ khi rasterize, tệp nặng gấp chục lần; cơ quan thuế và ngân hàng nhận công văn
 * dạng chữ. Trình duyệt tự ghi PDF chữ thật, đúng font, và lấy `document.title` làm tên tệp —
 * nên ta đặt tạm tiêu đề trang thành tên tệp mong muốn rồi trả lại sau khi in.
 */

export const LOP_VUNG_IN = 'vung-in';
export const THUOC_TINH_DANG_IN_VUNG = 'data-in-vung';

/** Tên tệp không dấu, không ký tự lạ: "Đơn tra soát" → "don-tra-soat". */
export function tenTepAnToan(s: string, duPhong = 'tai-lieu-mimi'): string {
  const ra = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return ra || duPhong;
}

/** Hậu tố ngày theo giờ máy người dùng (không phải UTC — in lúc 6 giờ sáng VN vẫn đúng ngày). */
export function ngayTep(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Mở hộp in với tiêu đề tạm là tên tệp. Trên máy tính `print()` chặn tới khi đóng hộp; trên
 * điện thoại thì không — nên trả tiêu đề cũ ở `afterprint`, kèm hẹn giờ phòng trình duyệt không bắn sự kiện.
 */
export function inTaiLieu(tenTep?: string): void {
  if (typeof window === 'undefined' || typeof window.print !== 'function') return;
  const cu = document.title;
  if (tenTep) document.title = tenTep;
  // Đánh dấu đang in VÙNG IN (12/10/2026): trang có cả tờ khai (`.to-khai-giay`) lẫn `.vung-in` thì CSS chỉ cho
  // đúng một loại ra giấy — trước đây cả hai cùng đặt ở đầu trang và in chồng lên nhau.
  document.body.setAttribute(THUOC_TINH_DANG_IN_VUNG, '');
  let daTra = false;
  const tra = () => {
    if (daTra) return;
    daTra = true;
    document.title = cu;
    document.body.removeAttribute(THUOC_TINH_DANG_IN_VUNG);
    window.removeEventListener('afterprint', tra);
  };
  window.addEventListener('afterprint', tra);
  try {
    window.print();
  } finally {
    // Máy tính: print() đã xong khi tới đây. Điện thoại: chờ afterprint, chậm nhất 60 giây.
    window.setTimeout(tra, 60_000);
  }
}

/** Tải một Blob về máy với tên cho trước (PDF quét, CSV…). */
export function taiTep(blob: Blob, ten: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ten;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Thu hồi chậm một nhịp: Safari huỷ tải nếu URL bị thu hồi ngay trong cùng lượt click.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
