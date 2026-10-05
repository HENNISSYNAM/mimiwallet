// Sinh public/sitemap.xml từ danh sách trang trong mã. Chạy: npx vite-node scripts/tao-sitemap.ts
import { writeFileSync } from 'node:fs';
import { taoSitemapXml } from '../src/lib/sitemap';

writeFileSync(new URL('../public/sitemap.xml', import.meta.url), taoSitemapXml());
console.log('Đã ghi public/sitemap.xml');
