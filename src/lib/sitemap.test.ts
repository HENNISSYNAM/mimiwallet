import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { danhSachTrangCongKhai, taoSitemapXml, TEN_MIEN } from './sitemap';

/** public/sitemap.xml phải khớp danh sách trang trong mã — thêm trang thì chạy `npx vite-node scripts/tao-sitemap.ts`. */
describe('sitemap', () => {
  it('tệp public/sitemap.xml khớp với mã', () => {
    expect(readFileSync('public/sitemap.xml', 'utf8').replace(/\r\n/g, '\n')).toBe(taoSitemapXml());
  });
  it('chỉ tên miền chính thức, không có trang đăng nhập hay noIndex', () => {
    const ds = danhSachTrangCongKhai().map((m) => m.duong);
    expect(taoSitemapXml()).not.toContain('lovable.app');
    expect(taoSitemapXml()).toContain(`${TEN_MIEN}/`);
    for (const d of ds) expect(d.startsWith('/dashboard') || ['/admin', '/404', '/quen-mat-khau', '/dat-lai-mat-khau', '/bank/callback'].includes(d)).toBe(false);
    expect(ds).toContain('/chinh-sach/bao-mat');
  });
});
