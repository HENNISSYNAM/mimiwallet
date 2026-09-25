/**
 * Xuất CSV — một cách cho mọi nút "Xuất" (25/09/2026).
 *
 * Trước đây mỗi trang tự `join(',')`:
 *   - tên khách "Công ty A, chi nhánh 2" đẩy lệch mọi cột sau nó;
 *   - ô bắt đầu bằng = + - @ bị Excel chạy như công thức (CSV injection) — tên khách do người ngoài
 *     đặt được, nên đây là lỗ bảo mật chứ không chỉ lỗi hiển thị;
 *   - không có BOM, Excel đọc tiếng Việt thành ký tự rác.
 */
export type O = string | number | boolean | null | undefined;

/** Một ô: trung hoà công thức, bọc ngoặc kép khi cần. Số giữ nguyên để bảng tính cộng được. */
export function oCsv(v: O): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function lapCsv(cot: string[], dong: O[][]): string {
  return '﻿' + [cot.map(oCsv).join(','), ...dong.map((d) => d.map(oCsv).join(','))].join('\r\n');
}

/** Tải tệp về máy người dùng. Trả số dòng đã xuất để màn hình nói lại cho người dùng. */
export function taiCsv(tenTep: string, cot: string[], dong: O[][]): number {
  const url = URL.createObjectURL(new Blob([lapCsv(cot, dong)], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = tenTep;
  a.click();
  URL.revokeObjectURL(url);
  return dong.length;
}
