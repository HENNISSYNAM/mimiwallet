/**
 * Chiều tiền của một giao dịch — MỘT định nghĩa cho mọi màn hình và cho MIMI Assistant.
 *
 * Chuyển từ `src/lib/chieuTien.ts` về đây ngày 15/09/2026 để edge function `tro-ly` đọc
 * đúng chiều tiền như các màn hình; `src/lib/chieuTien.ts` giờ chỉ xuất lại file này.
 * File không được import gì để trình duyệt và Deno cùng đọc.
 *
 * VÌ SAO. Bộ đọc ngân hàng (`_shared/bank/bankhub-map.ts`, `sepay-map.ts`) ghi số
 * tiền DƯƠNG và để chiều tiền trong `type`. Tới 15/09/2026 mỗi màn tự hiểu một kiểu:
 *   - Tổng quan: tiền vào khi `type === 'income'`.
 *   - Báo cáo (`bcTaiChinh.ts`) và "doanh thu năm" ở Chứng từ chi phí: tiền vào khi
 *     `type === 'income'` HOẶC `amount > 0`.
 * Vì khoản chi ngân hàng cũng mang số dương, Báo cáo và Chứng từ chi phí cộng MỌI
 * khoản chi vào doanh thu — doanh thu phồng, chi phí gần 0, và con số so với ngưỡng
 * thuế 1 tỷ sai theo. Cùng một công ty, mỗi màn một con số.
 *
 * QUY TẮC. `type` quyết định. Chỉ khi không có `type` hợp lệ (file CSV cũ, dòng mẫu
 * cũ) mới đọc dấu của số tiền. Số 0 hoặc không đọc được thì không có chiều.
 */
export type ChieuTien = 'vao' | 'ra';

export function chieuTien(t: { type?: string | null; amount?: number | string | null }): ChieuTien | null {
  if (t.type === 'income') return 'vao';
  if (t.type === 'expense') return 'ra';
  const so = Number(t.amount);
  if (!Number.isFinite(so) || so === 0) return null;
  return so > 0 ? 'vao' : 'ra';
}

/** Độ lớn khoản tiền, luôn dương — chiều nằm ở `chieuTien`. */
export const doLonTien = (t: { amount?: number | string | null }) => Math.abs(Number(t.amount) || 0);
