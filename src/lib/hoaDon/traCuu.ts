/**
 * Tra cứu hoá đơn trên cổng của cơ quan thuế (12/10/2026).
 *
 * MIMI không có quyền kết nối cơ quan thuế, nên không tra hộ. Việc MIMI làm được: mở đúng cổng và đưa sẵn
 * các trường đọc từ tệp XML để người dùng sao chép, rồi tự nhập mã kiểm tra (captcha) trên cổng — MIMI
 * không vượt captcha. Tên các ô trên cổng có thể đổi; danh sách dưới đây là các trường của hoá đơn, không
 * phải bản chụp giao diện cổng.
 */
import type { HoaDonXml } from './docHoaDonXml';

export const CONG_TRA_CUU_HDDT = 'https://hoadondientu.gdt.gov.vn/';

export interface TruongTraCuu { khoa: string; nhan: string; gia_tri: string }

export function truongTraCuu(hd: HoaDonXml): TruongTraCuu[] {
  const ds: [string, string, string | number | null][] = [
    ['mst_ban', 'Mã số thuế người bán', hd.ben_ban.mst],
    ['ky_hieu_mau', 'Ký hiệu mẫu số (loại hoá đơn)', hd.ky_hieu_mau],
    ['ky_hieu', 'Ký hiệu hoá đơn', hd.ky_hieu],
    ['so', 'Số hoá đơn', hd.so],
    ['tong_thue', 'Tổng tiền thuế', hd.tong_thue === null ? null : Math.round(hd.tong_thue)],
    ['tong_thanh_toan', 'Tổng tiền thanh toán', hd.tong_thanh_toan === null ? null : Math.round(hd.tong_thanh_toan)],
  ];
  return ds.filter(([, , v]) => v !== null && v !== '').map(([khoa, nhan, v]) => ({ khoa, nhan, gia_tri: String(v) }));
}
