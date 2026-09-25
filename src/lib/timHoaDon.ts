/**
 * Một cách so khớp cho MỌI chỗ tìm hoá đơn (ô tìm đầu trang, ô tìm trong trang, `?q=`).
 *
 * Trước 25/09/2026 trang dùng `includes` trên chuỗi thô: "MH-260903" tìm được, còn " mh260903 ",
 * "MH 260903" hay "song hong" (không dấu) thì ra 0 kết quả. Người dùng gõ kiểu nào cũng phải ra.
 *
 * Số hoá đơn và mã (id) trong CSDL là HAI thứ khác nhau: hàm này chỉ khớp số hoá đơn và tên khách;
 * mọi thao tác sau khi tìm (mở QR, xem chi tiết) dùng NGUYÊN bản ghi hoá đơn đã tìm được, không
 * tra lại bằng chuỗi người dùng gõ.
 */

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Chuẩn hoá để so: bỏ dấu, chữ thường, gom khoảng trắng. */
export function chuanHoaChuoiTim(s: string | null | undefined): string {
  return boDau(s ?? '').replace(/\s+/g, ' ').trim();
}

/** Bản "chỉ chữ và số": để "MH-260903", "mh 260903", "MH260903" là một. */
const chiChuSo = (s: string) => chuanHoaChuoiTim(s).replace(/[^a-z0-9]/g, '');

export interface HoaDonTimDuoc {
  invoice_number: string;
  client_name: string;
}

export function khopHoaDon(hd: HoaDonTimDuoc, tuKhoa: string | null | undefined): boolean {
  const q = chuanHoaChuoiTim(tuKhoa);
  if (!q) return true;
  const qGon = chiChuSo(q);
  const so = chuanHoaChuoiTim(hd.invoice_number);
  const khach = chuanHoaChuoiTim(hd.client_name);
  if (so.includes(q) || khach.includes(q)) return true;
  // Chỉ so dạng "chỉ chữ số" khi từ khoá còn đủ dài — tránh "1" khớp mọi hoá đơn.
  return qGon.length >= 3 && (chiChuSo(so).includes(qGon) || chiChuSo(khach).includes(qGon));
}
