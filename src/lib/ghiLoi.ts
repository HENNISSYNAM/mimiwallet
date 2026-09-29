import { track } from './track';

/**
 * Ghi lỗi giao diện (29/09/2026) — trước đây người dùng gặp lỗi thì không ai biết.
 *
 * Đi qua đúng đường `track` → `product_events` (first-party, RLS, không SDK bên thứ ba), sự kiện
 * `client_error`. Chỉ người đã đăng nhập ghi được (chính sách RLS của bảng).
 *
 * KHÔNG ĐỂ LỘ DỮ LIỆU: thông điệp lỗi có thể chứa số tiền, số tài khoản, email — mọi dãy từ 3 chữ số trở lên
 * thành "#", email thành "@", cắt 160 ký tự; đường dẫn bỏ query và thay id. Mỗi lỗi giống nhau chỉ ghi một lần
 * mỗi phiên, tối đa 20 lỗi mỗi phiên, để một vòng lặp lỗi không đổ đầy bảng.
 *
 * Đọc: select props, count(*) from product_events where name = 'client_error' group by props order by 2 desc;
 */

export type LoaiLoi = 'window' | 'promise' | 'boundary';

const TOI_DA_MOI_PHIEN = 20;
const daGhi = new Set<string>();

export function lamSachThongDiep(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '@')
    .replace(/\d[\d.,\s]{2,}\d|\d{3,}/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

export function lamSachDuongDan(p: string): string {
  return p
    .split(/[?#]/)[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:so')
    .slice(0, 120);
}

export function ghiLoi(loai: LoaiLoi, loi: unknown): void {
  try {
    const e = loi instanceof Error ? loi : new Error(typeof loi === 'string' ? loi : 'Lỗi không rõ');
    const thongDiep = lamSachThongDiep(e.message || '');
    const trang = typeof window !== 'undefined' ? lamSachDuongDan(window.location.pathname) : '';
    const khoa = `${loai}|${e.name}|${thongDiep}|${trang}`;
    if (daGhi.has(khoa) || daGhi.size >= TOI_DA_MOI_PHIEN) return;
    daGhi.add(khoa);
    track('client_error', { loai, ten: (e.name || 'Error').slice(0, 40), thong_diep: thongDiep, trang });
  } catch {
    // Ghi lỗi không bao giờ được gây lỗi.
  }
}

/** Gắn một lần ở `main.tsx`. */
export function batLoiToanCuc(): void {
  window.addEventListener('error', (ev) => ghiLoi('window', ev.error ?? ev.message));
  window.addEventListener('unhandledrejection', (ev) => ghiLoi('promise', ev.reason));
}

/** Chỉ cho test. */
export function datLaiGhiLoiChoTest(): void {
  daGhi.clear();
}
