/**
 * Bàn phím số của màn POS — hàm thuần, để test không phải bấm qua giao diện.
 *
 * Giữ số tiền dạng chuỗi chữ số (đồng). Phím "000" vì ở Việt Nam giá luôn tròn nghìn: gõ "35" "000" là 35.000 ₫.
 */
export type PhimSo = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | 'xoa' | 'xoa_het';

/** 10 tỷ đồng — trùng trần ở máy chủ (`_shared/pos/ban-hang.ts`). */
export const TOI_DA_SO_TIEN = 10_000_000_000;

export function bamPhim(hienTai: string, phim: PhimSo): string {
  if (phim === 'xoa_het') return '';
  if (phim === 'xoa') return hienTai.slice(0, -1);
  if (!hienTai && (phim === '0' || phim === '000')) return '';
  const moi = hienTai + phim;
  return Number(moi) > TOI_DA_SO_TIEN ? hienTai : moi;
}

export const soTienTuChuoi = (s: string) => (s ? Number(s) : 0);

/** "35000" → "35.000" — cách người Việt đọc tiền. */
export function dinhDangDong(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
