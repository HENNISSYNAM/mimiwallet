/**
 * Kiểm dữ liệu cơ sở trước khi ghi (edge function `cong-ty`). Hàm thuần, có test: đây là chỗ một cơ sở sai MST hay một
 * tài khoản gán nhầm làm lệch toàn bộ số hợp nhất.
 */
import type { CachKhaiThue } from './hop-nhat.ts';

export interface CoSoNhap { ten: string; ma_so_thue: string | null; tinh: string | null; khai_thue: CachKhaiThue }

export function docCoSoNhap(b: Record<string, unknown>): { ok: true; v: CoSoNhap } | { ok: false; cau: string } {
  const ten = String(b.ten ?? '').replace(/\s+/g, ' ').trim();
  if (!ten || ten.length > 120) return { ok: false, cau: 'Tên cơ sở dài 1–120 ký tự.' };
  const mstTho = String(b.ma_so_thue ?? '').replace(/\s/g, '');
  const ma_so_thue = mstTho ? mstTho : null;
  if (ma_so_thue && !/^\d{10}(-\d{3})?$/.test(ma_so_thue)) {
    return { ok: false, cau: 'Mã số thuế là 10 số, hoặc 10 số kèm "-xxx" cho đơn vị trực thuộc (ví dụ 0319436143-001).' };
  }
  const tinhTho = String(b.tinh ?? '').trim();
  const khai = String(b.khai_thue ?? 'chua_ro');
  if (!['tap_trung', 'rieng', 'chua_ro'].includes(khai)) return { ok: false, cau: 'Cách khai thuế là tap_trung, rieng hoặc chua_ro.' };
  return { ok: true, v: { ten, ma_so_thue, tinh: tinhTho ? tinhTho.slice(0, 80) : null, khai_thue: khai as CachKhaiThue } };
}

/** MST đơn vị trực thuộc phải cùng 10 số đầu với MST công ty — gõ nhầm sang công ty khác là lỗi hay gặp. */
export function kiemMstCungCongTy(mstCoSo: string | null, mstCongTy: string | null): string | null {
  if (!mstCoSo || !mstCongTy) return null;
  return mstCoSo.slice(0, 10) === mstCongTy.replace(/\D/g, '').slice(0, 10)
    ? null : `Mã số thuế ${mstCoSo} không thuộc công ty này (MST ${mstCongTy}). Đơn vị trực thuộc có cùng 10 số đầu với trụ sở.`;
}

export const chuanSoTaiKhoan = (s: unknown) => String(s ?? '').replace(/\D/g, '');
export const laSoTaiKhoan = (s: string) => /^\d{6,19}$/.test(s);
