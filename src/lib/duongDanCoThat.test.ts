import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Mọi đường dẫn `/dashboard/...` được điều hướng tới đều phải có route thật.
 *
 * VÌ SAO CÓ TEST NÀY. Ngày 10/09/2026 gỡ ba mục — Điểm tín dụng, Dấu chân
 * carbon, Học Fintech. `tsc` xanh, `vite build` xanh, không cảnh báo nào. Nhưng
 * còn ba nút vẫn trỏ tới các route đã gỡ: một nút ở Tổng quan, một ở thanh điều
 * hướng di động, một ở trang Vay vốn.
 *
 * Bấm vào là trang trắng. React Router không báo lỗi khi không khớp route nào —
 * nó chỉ không hiện gì. Đây đúng loại lỗi im lặng cả tuần này đã gỡ: màn hình
 * mời người dùng làm một việc không dẫn tới đâu.
 *
 * Không có công cụ nào bắt được vì đường dẫn chỉ là chuỗi ký tự. Nên phải là
 * một phép kiểm riêng.
 */

const goc = join(__dirname, '..', '..');
const thuMucSrc = join(goc, 'src');

function cacFile(dir: string, ra: string[] = []): string[] {
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) cacFile(p, ra);
    else if ((ten.endsWith('.ts') || ten.endsWith('.tsx')) && !ten.includes('.test.')) ra.push(p);
  }
  return ra;
}

function boChuThich(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Đọc các route con của `/dashboard` từ `App.tsx`.
 *
 * Route khai bằng `<Route path="ten" ...>` bên trong route cha `dashboard`, nên
 * đường dẫn đầy đủ là `/dashboard/<ten>`.
 */
export function docRoute(appSrc: string): Set<string> {
  const co = new Set<string>(['/dashboard']);
  for (const m of boChuThich(appSrc).matchAll(/<Route\s+path="([\w-]+)"/g)) {
    co.add(`/dashboard/${m[1]}`);
  }
  return co;
}

/** Các đường dẫn `/dashboard/...` xuất hiện dưới dạng chuỗi trong mã. */
export function docDuongDanDung(src: string): string[] {
  return [...boChuThich(src).matchAll(/['"`](\/dashboard(?:\/[\w-]+)*)['"`]/g)].map((m) => m[1]);
}

describe('bộ dò đường dẫn', () => {
  it('đọc được route con từ App.tsx', () => {
    const co = docRoute('<Route path="invoices" element={<A />} /><Route path="chung-tu" />');
    expect(co.has('/dashboard/invoices')).toBe(true);
    expect(co.has('/dashboard/chung-tu')).toBe(true);
  });

  it('bắt đường dẫn trong navigate và trong Link', () => {
    const nguon = `navigate('/dashboard/credit'); <Link to="/dashboard/fintech">x</Link>`;
    expect(docDuongDanDung(nguon)).toEqual(['/dashboard/credit', '/dashboard/fintech']);
  });

  it('bỏ qua đường dẫn nằm trong chú thích', () => {
    // Chú thích hay nhắc tới route đã gỡ để giải thích vì sao gỡ.
    expect(docDuongDanDung(`// đã gỡ '/dashboard/carbon'`)).toEqual([]);
  });
});

describe('đường dẫn trong mã', () => {
  const coRoute = docRoute(readFileSync(join(goc, 'src', 'App.tsx'), 'utf8'));

  it('App.tsx khai đủ các route đang dùng hằng ngày', () => {
    // Chốt lại để test dưới không xanh giả vì bộ đọc route hỏng.
    for (const d of ['/dashboard/invoices', '/dashboard/chung-tu', '/dashboard/fintech']) {
      expect(coRoute.has(d)).toBe(true);
    }
    expect(coRoute.size).toBeGreaterThan(5);
  });

  it('không nút nào trỏ tới route đã gỡ', () => {
    const sai: string[] = [];

    for (const f of cacFile(thuMucSrc)) {
      const ten = relative(goc, f).split(sep).join('/');
      // `App.tsx` là nơi khai route, không phải nơi dùng.
      if (ten.endsWith('src/App.tsx')) continue;

      for (const d of docDuongDanDung(readFileSync(f, 'utf8'))) {
        if (!coRoute.has(d)) sai.push(`${ten}: trỏ tới ${d} nhưng không có route nào khớp`);
      }
    }

    expect(sai).toEqual([]);
  });

  it('ba route đã gỡ ngày 10/09 không còn được khai', () => {
    for (const d of ['/dashboard/credit', '/dashboard/carbon', '/dashboard/learn']) {
      expect(coRoute.has(d)).toBe(false);
    }
  });
});
