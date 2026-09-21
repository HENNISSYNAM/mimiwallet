import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';
import type { KhoanRa } from './phat-hien.ts';

/**
 * Dựng `KhoanRa` từ hai nguồn: sao kê ngân hàng và khoản chi đã duyệt trong MIMI.
 *
 * Khoản đã duyệt được đưa vào lịch sử vì người nhận có thể đã được trả qua MIMI mà sao kê
 * chưa đồng bộ tới — thiếu nó thì một nhà cung cấp vừa trả hôm qua lại bị báo "người nhận mới".
 */

export interface DongGiaoDich {
  id: string;
  amount: number | string | null;
  type: string | null;
  transaction_date: string;
  counter_account_name: string | null;
  counter_account_number?: string | null;
  merchant_name: string | null;
  payment_reference: string | null;
}

export interface DongYeuCau {
  id: string;
  so_tien: number;
  ten_nguoi_nhan: string | null;
  so_tai_khoan: string | null;
  muc_dich: string | null;
  created_at: string;
  quyet_luc?: string | null;
}

/** Chỉ tiền RA. Tiền vào không phải thứ người dùng có thể bị lừa chuyển đi. */
export function tuGiaoDich(ds: readonly DongGiaoDich[]): KhoanRa[] {
  return ds
    .filter((t) => chieuTien(t) === 'ra')
    .map((t) => ({
      id: t.id,
      so_tien: doLonTien(t),
      ngay: t.transaction_date.slice(0, 10),
      ten_nguoi_nhan: t.counter_account_name ?? t.merchant_name ?? null,
      so_tai_khoan: t.counter_account_number ?? null,
      noi_dung: t.payment_reference ?? null,
    }));
}

export function tuYeuCau(y: DongYeuCau): KhoanRa {
  return {
    id: `yc:${y.id}`,
    so_tien: Number(y.so_tien) || 0,
    ngay: String(y.quyet_luc ?? y.created_at).slice(0, 10),
    ten_nguoi_nhan: y.ten_nguoi_nhan,
    so_tai_khoan: y.so_tai_khoan,
    noi_dung: y.muc_dich,
  };
}
