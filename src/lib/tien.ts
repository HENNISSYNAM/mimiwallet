/**
 * TIỀN VND — MỘT CHỖ DUY NHẤT cho định dạng, cộng, so sánh ở giao diện (29/09/2026).
 *
 * Trước đây có ít nhất 13 hàm định dạng rời rạc với 4 kiểu viết ("1.000 ₫", "1.000đ", "₫1.000", "1.000
 * đồng"), và hàm nào cũng chỉ nhận `number`. Backend gửi tổng lớn dưới dạng CHUỖI số nguyên (`TienVND =
 * number | string`) khi vượt Number.MAX_SAFE_INTEGER; đổi chuỗi đó qua Number là mất đồng lẻ mà không báo.
 *
 * Quy tắc:
 *   - Thiếu dữ liệu → "—", KHÔNG BAO GIỜ là 0.
 *   - Chuỗi số nguyên → BigInt. Number → làm tròn tới đồng.
 *   - Cộng/so sánh: số an toàn thì cộng số; có chuỗi hoặc vượt ngưỡng an toàn thì cộng BigInt và trả chuỗi.
 *   - Một kiểu viết trên giao diện: "1.000.000 ₫". Văn bản gửi cơ quan nhà nước viết "1.000.000 đồng".
 */
export type TienVND = number | string;

const SO_NGUYEN = /^-?\d+$/;
const DINH_DANG = new Intl.NumberFormat('vi-VN');

/** Chuỗi số nguyên hợp lệ, hoặc số hữu hạn. Còn lại (chuỗi chữ, NaN, Infinity, null) là "không có số". */
export function laTien(v: unknown): v is TienVND {
  return (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && SO_NGUYEN.test(v));
}

/** Về BigInt để cộng/so sánh chính xác. Number làm tròn tới đồng trước. */
export function sangBigInt(v: TienVND): bigint {
  return typeof v === 'string' ? BigInt(v) : BigInt(Math.round(v));
}

/** Kết quả BigInt → Number nếu còn an toàn, không thì chuỗi (đúng hợp đồng TienVND). */
export function tuBigInt(b: bigint): TienVND {
  return b <= BigInt(Number.MAX_SAFE_INTEGER) && b >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(b) : b.toString();
}

/** Chỉ phần số: "1.000.000". Thiếu dữ liệu → "—". */
export function soTien(v: TienVND | null | undefined): string {
  if (!laTien(v)) return '—';
  return typeof v === 'string' ? DINH_DANG.format(BigInt(v)) : DINH_DANG.format(Math.round(v));
}

/** "1.000.000 ₫" — kiểu viết duy nhất trên giao diện. */
export function dinhDangTien(v: TienVND | null | undefined): string {
  const s = soTien(v);
  return s === '—' ? s : `${s} ₫`;
}

/** "1.000.000 đồng" — cho văn bản gửi ngân hàng, cơ quan thuế (viết chữ, không ký hiệu). */
export function dinhDangTienVanBan(v: TienVND | null | undefined): string {
  const s = soTien(v);
  return s === '—' ? s : `${s} đồng`;
}

/** Cộng một dãy tiền. Bỏ qua phần tử không phải số (thiếu dữ liệu không được biến thành 0 rồi cộng lén). */
export function congTien(ds: ReadonlyArray<TienVND | null | undefined>): TienVND {
  let coChinhXac = false;
  let tongSo = 0;
  for (const v of ds) {
    if (!laTien(v)) continue;
    if (typeof v === 'string' || !Number.isSafeInteger(Math.round(v))) { coChinhXac = true; break; }
    tongSo += Math.round(v);
    if (!Number.isSafeInteger(tongSo)) { coChinhXac = true; break; }
  }
  if (!coChinhXac) return tongSo;
  let b = 0n;
  for (const v of ds) if (laTien(v)) b += sangBigInt(v);
  return tuBigInt(b);
}

/** So sánh để sắp xếp (âm / 0 / dương), không ép chuỗi về Number. */
export function soSanhTien(a: TienVND, b: TienVND): number {
  const x = sangBigInt(a); const y = sangBigInt(b);
  return x < y ? -1 : x > y ? 1 : 0;
}
