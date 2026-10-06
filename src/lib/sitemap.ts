import { TAT_CA_TRANG } from '@/content/trangNoiDung';
import { TRANG_KHAM_PHA } from '@/content/khamPha';
import { DANH_MUC_CHINH_SACH, TRANG_THONG_TIN } from '@/pages/chinh-sach/danhMuc';

/**
 * SITEMAP (06/10/2026) — một nguồn duy nhất cho mọi trang công khai cần Google lập chỉ mục. Tệp
 * `public/sitemap.xml` được sinh từ hàm này (`scripts/tao-sitemap.ts`), và test `sitemap.test.ts` bắt lệch khi thêm
 * trang mà quên chạy lại. Bản cũ trỏ tên miền `mimiwallet.lovable.app` và chỉ có 3 trang.
 *
 * Không đưa vào: khu đăng nhập (/dashboard/*), trang có noIndex (quên/đặt lại mật khẩu, callback ngân hàng, admin,
 * 404), trang đồng ý OAuth.
 */
export const TEN_MIEN = 'https://www.mimiwallet.online';

interface Muc { duong: string; tanSuat: 'weekly' | 'monthly' | 'yearly'; uuTien: number }

export function danhSachTrangCongKhai(): Muc[] {
  const ds: Muc[] = [
    { duong: '/', tanSuat: 'weekly', uuTien: 1.0 },
    { duong: '/register', tanSuat: 'monthly', uuTien: 0.8 },
    { duong: '/login', tanSuat: 'monthly', uuTien: 0.5 },
    { duong: '/tri-tue-nhan-tao', tanSuat: 'monthly', uuTien: 0.7 },
    { duong: '/khach-hang', tanSuat: 'monthly', uuTien: 0.6 },
    { duong: '/tuyen-dung', tanSuat: 'monthly', uuTien: 0.4 },
    { duong: '/about', tanSuat: 'monthly', uuTien: 0.5 },
    { duong: '/thuong-hieu', tanSuat: 'yearly', uuTien: 0.3 },
    { duong: '/privacy', tanSuat: 'yearly', uuTien: 0.3 },
    { duong: '/terms', tanSuat: 'yearly', uuTien: 0.3 },
    { duong: '/xoa-tai-khoan', tanSuat: 'yearly', uuTien: 0.3 },
  ];
  for (const t of TAT_CA_TRANG) ds.push({ duong: `/${t.loai}/${t.slug}`, tanSuat: 'monthly', uuTien: 0.7 });
  for (const k of TRANG_KHAM_PHA) ds.push({ duong: `/kham-pha/${k.slug}`, tanSuat: 'monthly', uuTien: 0.6 });
  ds.push({ duong: TRANG_THONG_TIN.duong, tanSuat: 'yearly', uuTien: 0.4 });
  for (const c of DANH_MUC_CHINH_SACH) ds.push({ duong: c.duong, tanSuat: 'yearly', uuTien: 0.3 });
  const daCo = new Set<string>();
  return ds.filter((m) => (daCo.has(m.duong) ? false : (daCo.add(m.duong), true)));
}

export function taoSitemapXml(): string {
  const dong = danhSachTrangCongKhai().map((m) =>
    `  <url>\n    <loc>${TEN_MIEN}${m.duong === '/' ? '/' : m.duong}</loc>\n    <changefreq>${m.tanSuat}</changefreq>\n    <priority>${m.uuTien.toFixed(1)}</priority>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${dong.join('\n')}\n</urlset>\n`;
}
