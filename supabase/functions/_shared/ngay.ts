/**
 * Ngày hợp lệ hay không — một chốt cho mọi chỗ đọc ngày từ nguồn ngoài.
 *
 * Nguồn Công báo dùng 1900-01-01 làm giá trị giữ chỗ; chuỗi rỗng, 0, hay chuỗi không phải ngày cũng
 * từng lọt ra màn hình. Ngày không hợp lệ → null (hiển thị "Chưa xác định"), không bao giờ dựng một
 * ngày từ giá trị mặc định.
 */
export const CHUA_XAC_DINH = 'Chưa xác định';

export function ngayHopLe(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
  if (!m) return null;
  const [nam, thang, ngay] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (nam < 1901 || nam > 2200 || thang < 1 || thang > 12 || ngay < 1 || ngay > 31) return null;
  const d = new Date(Date.UTC(nam, thang - 1, ngay));
  if (d.getUTCMonth() !== thang - 1) return null; // 31/02…
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** dd/mm/yyyy, hoặc "Chưa xác định". */
export function ngayHienThi(v: unknown): string {
  const n = ngayHopLe(v);
  return n ? n.split('-').reverse().join('/') : CHUA_XAC_DINH;
}
